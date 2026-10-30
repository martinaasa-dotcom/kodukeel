import { cachedBlob, cachedClip, rememberClip } from "./clipCache";
import { CLEAN, type Condition } from "./conditions";
import { needsMixer, playThrough, stopMixed } from "./mixer";
import { sequence } from "./sequence";
import { stretch } from "./stretch";
import { DEFAULT_PACE, SLOWEST, SLOW_OF_NORMAL, type Pace } from "./pace";
import { decodeWav, encodeWav16, normaliseLoudness } from "./wav";
import { nativeClip, nativeFor, nativeUrl, type NativeClip } from "./native";

/**
 * One clip, fetched once.
 *
 * `Speak` and the pairs round each carried their own copy of "look in the
 * cache, otherwise POST to /api/tts and remember the blob", and a third copy
 * was about to be written for prefetching the next card. Three copies of a
 * cache key is where two of them stop agreeing about what is in it: a voice
 * added to the key in one place and not another would play the wrong voice
 * from cache and look like the setting not saving.
 *
 * So the key is built here, once, from everything that changes the clip: the
 * text and the voice. The server hashes the same two. The rate it is played
 * at and the room it is heard in are made in the browser after the fetch, so
 * neither is part of the clip's key; a clip already stretched to a rate is
 * remembered under its own key beside it, in the same bounded cache.
 *
 * Browser only, since it mints object URLs. Never throws on a play that the
 * browser refuses; a clip that could not be fetched rejects, which is the one
 * outcome a caller has to act on.
 */
export interface ClipRequest {
  readonly text: string;
  readonly slow?: boolean;
  readonly voice?: string;
  /**
   * How it is delivered: the rate, the room, the line. Clean when absent,
   * which is what every screen that has not asked gets. `slow` wins over a
   * condition's own speed, because "play it slowly" is the learner's request
   * and the condition is the round's.
   */
  readonly condition?: Condition;
  /**
   * A CEILING, NOT A RATE: a screen that wants a gentler play than the
   * everyday one, for a learner writing down what they hear. Read as the
   * slower of it and this learner's own pace, because a fixed 0.8 handed to
   * somebody whose everyday play is 0.6 would be the dictation speeding up.
   * Ignored where `slow` or a condition already decides the rate.
   */
  readonly rate?: number;
  /**
   * How fast this learner hears Estonian, off their own level (lib/audio/pace.ts).
   * Published once by the shell and read by every speaker button and every
   * prefetch inside it; absent is `DEFAULT_PACE`, which is what a screen
   * outside the shell gets.
   */
  readonly pace?: Pace;
  /**
   * A native speaker's recording may stand in for the synthetic voice where
   * one says this text (`lib/audio/native.ts`). Set by a speaker button the
   * screen left on the learner's own voice; a screen that chose a voice, a
   * conversation's cast or the listening round's rotating speakers, leaves it
   * off and keeps the voice it chose.
   */
  readonly native?: boolean;
  /**
   * This recording and no other, by id, at its own speed: for a screen about
   * sounds, where the clip is the point and the learner's pace is not.
   */
  readonly nativeId?: string;
}

/** The recording a request plays, where a person's recording answers for it. */
export function nativeTake(request: ClipRequest): NativeClip | null {
  if (request.nativeId) return nativeClip(request.nativeId);
  if (!request.native) return null;
  return nativeFor(request.text, { slow: request.slow });
}

/**
 * EVERY RATE IS THE SAME CLIP, STRETCHED HERE, WITH THE PITCH HELD.
 *
 * A slow play used to be a second clip, asked of the speech service at speed
 * 0.6. TartuNLP applies that number inside its acoustic model, as a duration
 * regulator: every phoneme's predicted length is multiplied and the extra
 * frames are copies, then the vocoder renders them. Measured on the live
 * service, the pitch does not move (240 Hz against 237) and the speech gets
 * 1.6 times longer, and what a learner hears is every vowel held flat and a
 * buzz under it. That is what a neural model does when asked to say
 * something no speaker ever said that slowly.
 *
 * The second version handed the one clip to the browser's `playbackRate` with
 * `preservesPitch`, and that was reported as stretched and robotic too: the
 * browser stretches every part of the word by the same amount, so a `t`
 * becomes a smeared double click and an `s` takes on a hum, and which
 * algorithm does it is the browser's to change in a release, so two phones
 * gave two answers. `lib/audio/stretch.ts` is the third version and the one
 * that holds: the stretch is done on the decoded samples, in this file's one
 * caller of it, and it spends the slowing on the vowels and the pauses, which
 * is where a person spends it, and leaves the consonants at the length they
 * were. Pitch, formants and voice are the recording's own throughout,
 * because every output sample is one of the recording's.
 *
 * AND HOW FAST THE EVERYDAY PLAY IS, IS A FACT ABOUT THE LEARNER. It was one
 * number for everybody, 0.9 of the recording from the first evening to C1, and
 * it was reported as too fast to be clear: true at A1, false at B2, so there
 * was no single number to correct it to. `lib/audio/pace.ts` is the ladder, off
 * the level the app already holds, and `rateFor` below is the one place a
 * request turns into a rate.
 *
 * The rates are of the recording, not of one another, so a condition's
 * `speed` in `lib/audio/conditions.ts` still says what it always said.
 */

/**
 * The rate a whole sentence is read at when somebody has to write it down.
 *
 * The dictation in the level check was reported as far too fast at the
 * recording's own pace, where a learner has to hold four words in their head
 * long enough to type them. A ceiling rather than a rate, since `rateFor` reads
 * it as the slower of it and the learner's own pace: careful for anybody whose
 * everyday play is faster than this, and never a speed-up for anybody slower.
 */
export const LEARNING_RATE = 0.8;

/**
 * One clip per word and voice. The rate is not in the key, because a rate
 * changes how the clip is played and never which clip it is.
 */
export function clipKey(request: ClipRequest): string {
  const take = nativeTake(request);
  if (take) return `native|${take.id}`;
  return `${request.text}|${request.voice ?? ""}`;
}

/**
 * The rate this request plays at, as a fraction of the recording.
 *
 * The learner's own pace is the base and the round's condition is a multiplier
 * over it, which is the ordering the pace ladder needs: a condition used to be
 * a fraction of the *recording*, so "at speed" was 1.3 whoever was listening,
 * and an A1 learner whose everyday play is 0.6 met one clip in five at more
 * than twice their own pace. That reads as the app forgetting the setting
 * rather than as a hard delivery. Multiplied instead, "at speed" is thirty
 * percent faster than however this learner hears Estonian, which is what the
 * condition was for: the receptionist will not slow down, and she is not
 * reading from a different table either.
 *
 * A caller's own rate is a ceiling on the base rather than a rate, so a screen
 * asking for a gentler play cannot speed anybody up. `slow` is the learner
 * pressing a button and wins outright, and `playClip` hears it in a quiet room
 * for the same reason.
 *
 * AND THE SLOW BUTTON IS A STEP DOWN FROM WHATEVER IS ALREADY PLAYING, NOT
 * FROM THE LEARNER'S RAW PACE. It used to be `pace.slow` outright, which is
 * `SLOW_OF_NORMAL` of `pace.normal` and nothing else: on the level check's
 * dictation, which caps the everyday play at `LEARNING_RATE` (0.8), a B2
 * learner's pace.normal is 1, so the everyday play there was already 0.8 and
 * the slow button played at 0.72, one tenth slower. That is not a control
 * anybody can hear working, and it was reported as sounding identical. The
 * slow rate is a fraction of the *base this request actually plays at*
 * (after the caller's own ceiling), so the button is always a real step down
 * from whatever the learner just heard, floored at `SLOWEST` as before.
 */
export function rateFor(request: ClipRequest): number {
  // A PERSON'S RECORDING AT THE SPEED IT WAS SAID, WHERE THAT IS THE POINT. A
  // clip asked for by id is on a screen about sounds, where `kapp` against
  // `kapis` is a difference in how long a consonant is held, and the stretch
  // leaves consonants at their length while it slows the vowels: slowed, the
  // contrast the screen is teaching would shrink. And a slow take recorded
  // slowly is already slow, so stretching it again takes it twice as far as
  // anybody asked.
  if (request.nativeId) return 1;
  if (request.slow && nativeTake(request)?.slow) return 1;
  const pace = request.pace ?? DEFAULT_PACE;
  const base = request.rate !== undefined ? Math.min(request.rate, pace.normal) : pace.normal;
  if (request.slow) return Math.max(SLOWEST, base * SLOW_OF_NORMAL);
  return base * (request.condition?.speed ?? 1);
}

/** A clip in hand: the url an element plays and the bytes behind it. */
export interface HeldClip {
  readonly url: string;
  readonly blob: Blob;
}

/**
 * The clip as the service sent it, from the page cache or the network.
 *
 * Both halves are returned because a `blob:` url cannot be fetched under the
 * page's Content Security Policy (`connect-src 'self'`): the bytes for the
 * stretch and for the mixer's decoder have to come from the blob itself. The
 * first browser suite to run this caught it as a page error, which is what
 * that check exists for.
 */
export async function fetchClip(request: ClipRequest): Promise<HeldClip> {
  const key = clipKey(request);
  const url = cachedClip(key);
  const blob = url ? cachedBlob(key) : null;
  if (url && blob) return { url, blob };
  const take = nativeTake(request);
  const synthetic = () => fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: request.text,
      ...(request.voice ? { voice: request.voice } : {}),
    }),
  });
  // A recording that will not load falls back to the synthesizer, where the
  // synthesizer was the alternative: a word heard in the other voice beats a
  // speaker button that removes itself. A clip asked for by id has no other
  // voice that says the same thing, so it fails as itself.
  let res = take ? await fetch(nativeUrl(take.id)).catch(() => null) : await synthetic();
  if (take && !request.nativeId && (!res || !res.ok)) res = await synthetic();
  if (!res || !res.ok) throw new Error(String(res?.status ?? "offline"));
  const fetched = await res.blob();
  return { url: rememberClip(key, fetched), blob: cachedBlob(key) ?? fetched };
}

/**
 * The clip at `rate`, stretched here and remembered beside the original, so
 * a replay and a prefetch cost no work at all. A clip this cannot read, which
 * the route only ever sends when it could not read it either, plays as it
 * came rather than not at all.
 */
export async function stretchedClip(request: ClipRequest, rate: number): Promise<HeldClip> {
  const source = await fetchClip(request);
  if (rate === 1) return source;
  const key = `${clipKey(request)}|r${rate}`;
  const url = cachedClip(key);
  const blob = url ? cachedBlob(key) : null;
  if (url && blob) return { url, blob };
  let out: Uint8Array;
  try {
    out = encodeWav16(stretch(decodeWav(new Uint8Array(await source.blob.arrayBuffer())), rate));
  } catch {
    return source;
  }
  const made = new Blob([out.buffer as ArrayBuffer], { type: "audio/wav" });
  return { url: rememberClip(key, made), blob: cachedBlob(key) ?? made };
}

/**
 * Warms the cache for a clip about to be wanted, at the rate it will be
 * wanted at, and says nothing if it cannot. The next card's word is fetched
 * and stretched while this one is being answered, so pressing the speaker on
 * it is instant rather than a round trip to a speech service and a pass over
 * the samples.
 */
export function prefetchClip(request: ClipRequest): void {
  if (typeof window === "undefined" || !request.text.trim()) return;
  void stretchedClip(request, rateFor(request)).catch(() => undefined);
}

/**
 * THE NATIVE SPEAKER'S RECORDINGS, FETCHED BEFORE ANYBODY PRESSES THEM.
 *
 * A letter's name is under a second long, and a spelled word is a run of
 * them a breath apart, so a letter that has to come over the network first
 * starts half a second late while the one before it, already heard, starts at
 * once. That unevenness was reported as letters with a gap in front of some
 * and none in front of others. This reads each file once into the browser's
 * own cache, and the service worker's where there is one (both keep a
 * recording under its versioned url for good), so every later play is a read
 * from the device. Not the clip cache: that holds two dozen clips and the
 * alphabet is thirty-two. Says nothing where it cannot.
 */
const warmed = new Set<string>();
export function warmNative(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  for (const id of ids) {
    if (warmed.has(id)) continue;
    warmed.add(id);
    void fetch(nativeUrl(id))
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
      .catch(() => warmed.delete(id));
  }
}

/**
 * A CLIP THE BROWSER REFUSED TO AUTOPLAY IS NOT A CLIP THAT FAILED.
 *
 * Every browser blocks `HTMLAudioElement.play()` on a page the reader has not
 * touched yet, and rejects it with a `NotAllowedError`. The clip is in hand,
 * the service answered, and the same call on a press will be allowed: it is a
 * fact about the gesture, not about the audio.
 *
 * `components/Speak.tsx` knew that and said so in a comment. The minimal-pairs
 * round did not: it wrapped the fetch and the play in one `try` and set
 * `audioFailed` on either, and that state replaces the whole drill with "No
 * audio, no drill. It runs on TartuNLP and needs a connection." The round
 * autoplays on mount, which is the no-gesture case by construction, so on
 * every phone and every Safari a learner opening the drill was told their
 * connection was the problem, given a button back to Today, and never shown
 * the 80px play button sitting behind that screen which would have worked.
 * A failure that misnames its cause sends the reader to the wrong place, which
 * is the rule `scripts/test-restore.mjs` has a paragraph about.
 *
 * So the distinction lives here, once, and both callers read it. `blocked`
 * means "ask for a press"; anything else throws and is a real absence.
 */
/** `stopped`: a Stop was pressed while the clip was still on its way, so nothing was said. */
export type PlayOutcome = "played" | "blocked" | "stopped";

/**
 * THE LONGEST CLIP THAT PLAYS ON ITS OWN (WCAG 2.2, 1.4.2 Audio Control).
 *
 * Audio that starts by itself and lasts more than three seconds needs a way to
 * stop it, and a clip played as a card appears has none beyond the page. So an
 * unasked play is held to under three seconds of sound: a longer clip is not
 * played, and the caller hears `blocked`, which already means "leave the
 * button to be pressed". A word and a short sentence are well under it; a
 * dialogue line read slowly is the case it catches. Measured on the clip as it
 * will play, after the stretch, so a slow pace is counted at its own length.
 * A line the learner chose to hear rather than read is not held to it: that is
 * sound they asked for, and turning the voice mode off is the way to stop it.
 */
export const AUTOPLAY_MAX_SECONDS = 3;

/**
 * How long a WAV clip plays, in seconds, or null where the bytes are not a WAV
 * this can read. Read off the header and the data chunk, not by decoding.
 */
export function wavSeconds(bytes: Uint8Array): number | null {
  try {
    const pcm = decodeWav(bytes);
    return pcm.rate > 0 ? pcm.samples.length / pcm.rate : null;
  } catch {
    return null;
  }
}

/**
 * Whether a clip nobody asked for may play: only one known to be under
 * `AUTOPLAY_MAX_SECONDS`. A clip whose length cannot be read waits for a
 * press, which is the safe side of a rule about sound starting by itself.
 */
export function mayAutoplay(seconds: number | null): boolean {
  return seconds !== null && seconds < AUTOPLAY_MAX_SECONDS;
}

/*
  WHETHER ANYTHING IS BEING SAID ALOUD RIGHT NOW, so a screen can wait for it.

  A conversation used to hand the learner the other side's line and, in the
  same breath, cover it with the scene moving on, so the line was cut off
  while it was still being spoken and the sentence about the move arrived on
  top of it. `untilQuiet` is how the conversation waits for the voice to
  finish before it moves (`components/scene/SceneSession.tsx`).

  A clip counts from the moment it is asked for, because the fetch and the
  stretch are part of the wait somebody hears as silence before the word, to
  the moment it ends, is paused, fails or is refused. A play that never says
  it ended is what the caller's cap is for.
*/
let inFlight = 0;
let onQuiet: Array<() => void> = [];
const speakingListeners = new Set<(speaking: boolean) => void>();

function beginSpeech(): () => void {
  inFlight += 1;
  if (inFlight === 1) for (const listener of speakingListeners) listener(true);
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    inFlight -= 1;
    if (inFlight > 0) return;
    for (const listener of speakingListeners) listener(false);
    const waiting = onQuiet;
    onQuiet = [];
    for (const resume of waiting) resume();
  };
}

/**
 * Whether the app is saying something aloud, and a way to hear when that
 * changes. The microphone stays closed while it is, so it never listens to the
 * app's own voice (docs/41-fifth-batch.md, D14): `components/speech/` reads
 * this, and a call-mode turn opens the microphone when it goes quiet.
 */
export function isSpeaking(): boolean {
  return inFlight > 0;
}

export function onSpeakingChange(listener: (speaking: boolean) => void): () => void {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

/**
 * Resolves once no clip is being fetched or played, or after `capMs`,
 * whichever comes first. Resolves at once when nothing is playing.
 */
export function untilQuiet(capMs: number): Promise<void> {
  if (inFlight === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, capMs);
    onQuiet.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** The clip playing through an element, so a screen's Stop can end it mid-line rather than after it. */
let playing: HTMLAudioElement | null = null;
/*
  How many times Stop has been pressed. A line still being fetched when Stop
  is pressed has no element yet to pause, so a play notes this count when it
  starts and, finding it moved once its clip arrives, does not play at all.
*/
let stops = 0;

/** Ends the clip in the air, through the element or the mixer, and any line still on its way. */
export function stopClip(): void {
  stops += 1;
  playing?.pause();
  playing = null;
  stopMixed();
}

export async function playClip(
  request: ClipRequest,
  { unasked = false, chosen = false }: { unasked?: boolean; chosen?: boolean } = {},
): Promise<PlayOutcome> {
  const end = beginSpeech();
  const asked = stops;
  try {
    const clip = await stretchedClip(request, rateFor(request));
    // Stopped while it was on its way: the line is not said after the press that asked for quiet.
    if (stops !== asked) {
      end();
      return "stopped";
    }
    // `chosen` is a line the learner asked to hear rather than read (a voice
    // mode in a conversation, `Speak`'s `insist`), which is not unasked sound.
    if (unasked && !chosen && !mayAutoplay(wavSeconds(new Uint8Array(await clip.blob.arrayBuffer())))) {
      end();
      return "blocked";
    }
    // The rate is already in the clip; the room is the mixer's job. A slow
    // play is heard in a quiet room, because it was asked for by somebody who
    // wants to hear the word and not the café.
    const condition = request.slow ? CLEAN : (request.condition ?? CLEAN);
    if (needsMixer(condition)) {
      const outcome = await playThrough(await clip.blob.arrayBuffer(), condition, { unasked, cancelled: () => stops !== asked });
      end();
      return outcome;
    }
    // The element rather than a buffer source for the plain case, on purpose:
    // an element plays through a phone's silent switch and a Web Audio graph
    // does not, and a learner who pressed the speaker asked to hear it.
    // Stopped while the length was being read: still not said.
    if (stops !== asked) {
      end();
      return "stopped";
    }
    const audio = new Audio(clip.url);
    playing = audio;
    for (const event of ["ended", "pause", "error"] as const) {
      audio.addEventListener(event, () => { if (playing === audio) playing = null; end(); }, { once: true });
    }
    try {
      await audio.play();
    } catch (error) {
      end();
      if (unasked && error instanceof DOMException && error.name === "NotAllowedError") {
        return "blocked";
      }
      // A Stop that paused the element before play() settled is that Stop, not a failure to play.
      if (stops !== asked && error instanceof DOMException && error.name === "AbortError") return "stopped";
      throw error;
    }
    return "played";
  } catch (error) {
    end();
    throw error;
  }
}

/**
 * RECORDINGS SAID ONE AFTER ANOTHER AS ONE CLIP, which is how a word is
 * spelled out letter by letter (`components/sounds/useSpeller.ts`).
 *
 * Each recording is fetched (from the device, once `warmNative` has run),
 * the run is joined by `sequence` with exactly the silence asked for between
 * them, and the result plays as one element: one start, so no letter waits
 * on the browser more than another. What comes back says where each
 * recording sits in time, so a screen can light each one off `currentTime`.
 * At the recordings' own speed, like every clip asked for by id.
 */
export interface PlayingSequence {
  readonly audio: HTMLAudioElement;
  readonly spans: readonly { readonly from: number; readonly to: number }[];
  stop(): void;
  /** Settles when the run has finished or was stopped; rejects where it could not play. */
  readonly ended: Promise<void>;
}

export async function playNativeSequence(
  items: readonly { readonly id: string; readonly text: string; readonly gapAfterMs: number }[],
): Promise<PlayingSequence> {
  const end = beginSpeech();
  let url: string | null = null;
  try {
    const clips = await Promise.all(items.map((item) => fetchClip({ text: item.text, nativeId: item.id })));
    const pieces = await Promise.all(clips.map(async (clip, i) => ({
      pcm: decodeWav(new Uint8Array(await clip.blob.arrayBuffer())),
      gapAfterMs: items[i]!.gapAfterMs,
    })));
    const joined = sequence(pieces);
    const made = URL.createObjectURL(new Blob([encodeWav16(joined.pcm).buffer as ArrayBuffer], { type: "audio/wav" }));
    url = made;
    const audio = new Audio(made);
    let finish: () => void = () => undefined;
    const ended = new Promise<void>((resolve) => {
      finish = () => {
        end();
        URL.revokeObjectURL(made);
        resolve();
      };
    });
    for (const event of ["ended", "pause", "error"] as const) audio.addEventListener(event, finish, { once: true });
    await audio.play();
    return { audio, spans: joined.spans, ended, stop: () => audio.pause() };
  } catch (error) {
    end();
    if (url) URL.revokeObjectURL(url);
    throw error;
  }
}

/** A stretch of a recording somebody opened, playing, and the way to stop it. */
export interface PlayingRecording {
  stop(): void;
  /** Settles when the piece has finished, was stopped, or was refused; rejects where it could not play at all. */
  readonly ended: Promise<PlayOutcome>;
}

/** Silence written either side of a piece of a recording, so its first sound is not swallowed opening the stream. */
export const RECORDING_LEAD_S = 0.12;
const RECORDING_TRAIL_S = 0.25;
/** The fade over each cut edge, so a piece cut out of the middle of a recording does not click. */
const RECORDING_FADE_S = 0.008;

/**
 * A PIECE OF A RECORDING THE LEARNER OPENED, PLAYED AT THEIR OWN PACE
 * (docs/41-fifth-batch.md, VB-12).
 *
 * A voice message is somebody talking at a native speed, which is the whole
 * reason to slow it down, and the slowing is the one every clip in the app
 * gets: `rateFor` reads the learner's pace and `stretch` spends it on the
 * vowels and the pauses. So this is `playClip` for samples already in hand:
 * nothing is fetched, nothing is sent, and the stretched copy lives exactly as
 * long as the play does. The level is brought to the app's own, because a
 * message recorded on a phone at arm's length is quieter than anything else
 * the learner hears here. `asItWas` plays the recording at its own speed.
 */
export function playRecording(
  piece: { readonly samples: Float32Array; readonly rate: number },
  request: { readonly pace?: Pace; readonly slow?: boolean; readonly asItWas?: boolean },
): PlayingRecording {
  const end = beginSpeech();
  const speed = request.asItWas ? 1 : rateFor({ text: "", pace: request.pace, slow: request.slow });
  const lead = Math.round(piece.rate * RECORDING_LEAD_S);
  const trail = Math.round(piece.rate * RECORDING_TRAIL_S);
  const fade = Math.min(Math.round(piece.rate * RECORDING_FADE_S), Math.floor(piece.samples.length / 2));
  const padded = new Float32Array(lead + piece.samples.length + trail);
  padded.set(piece.samples, lead);
  for (let i = 0; i < fade; i++) {
    const gain = i / fade;
    padded[lead + i] = (padded[lead + i] ?? 0) * gain;
    const back = lead + piece.samples.length - 1 - i;
    padded[back] = (padded[back] ?? 0) * gain;
  }
  let audio: HTMLAudioElement | null = null;
  let stopped = false;
  const ended = (async (): Promise<PlayOutcome> => {
    let url: string | null = null;
    try {
      // A turn first, so the press that asked is drawn as playing before the
      // stretch takes the main thread, and a stop pressed in between is heard.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (stopped) return "played";
      const out = encodeWav16(stretch(normaliseLoudness({ rate: piece.rate, samples: padded }), speed));
      if (stopped) return "played";
      url = URL.createObjectURL(new Blob([out.buffer as ArrayBuffer], { type: "audio/wav" }));
      const element = new Audio(url);
      audio = element;
      await new Promise<void>((resolve, reject) => {
        for (const event of ["ended", "pause"] as const) element.addEventListener(event, () => resolve(), { once: true });
        element.addEventListener("error", () => reject(new Error("the recording would not play")), { once: true });
        element.play().catch(reject);
      });
      return "played";
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") return "blocked";
      throw error;
    } finally {
      if (url) URL.revokeObjectURL(url);
      end();
    }
  })();
  return {
    stop() {
      stopped = true;
      audio?.pause();
    },
    ended,
  };
}

/**
 * WHAT THE RECOGNIZER HEARD, READ BACK IN A NATIVE VOICE, AND KEPT NOWHERE.
 *
 * The Speaking round's read-back (docs/41-fifth-batch.md VB-5): `heard`, the
 * model's own words, non-words and all, said by TartuNLP so a learner hears
 * what came across. That text is the learner's, so it takes none of the
 * caches every other clip goes through: the route's shared store is skipped
 * (`?transient=1`), the service worker passes it by, and the bytes are played
 * from an object URL that is released the moment the play ends. Never repaired
 * first: reading the non-word as written is the whole point of it.
 *
 * Played at the learner's own pace like every other clip, through the one
 * stretch, and counted as the app speaking so the microphone waits (D14).
 */
export async function playHeard(request: ClipRequest): Promise<PlayOutcome> {
  const end = beginSpeech();
  let url: string | null = null;
  const release = () => {
    end();
    if (url) URL.revokeObjectURL(url);
    url = null;
  };
  try {
    const res = await fetch("/api/tts?transient=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: request.text, ...(request.voice ? { voice: request.voice } : {}) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const fetched = await res.blob();
    const rate = rateFor(request);
    let blob: Blob = fetched;
    if (rate !== 1) {
      try {
        const out = encodeWav16(stretch(decodeWav(new Uint8Array(await fetched.arrayBuffer())), rate));
        blob = new Blob([out.buffer as ArrayBuffer], { type: "audio/wav" });
      } catch {
        blob = fetched;
      }
    }
    url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    for (const event of ["ended", "pause", "error"] as const) audio.addEventListener(event, release, { once: true });
    try {
      await audio.play();
    } catch (error) {
      release();
      if (error instanceof DOMException && error.name === "NotAllowedError") return "blocked";
      throw error;
    }
    return "played";
  } catch (error) {
    release();
    throw error;
  }
}
