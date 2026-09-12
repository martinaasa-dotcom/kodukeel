import { cachedBlob, cachedClip, rememberClip } from "./clipCache";
import { CLEAN, type Condition } from "./conditions";
import { needsMixer, playThrough } from "./mixer";
import { stretch } from "./stretch";
import { DEFAULT_PACE, type Pace } from "./pace";
import { decodeWav, encodeWav16 } from "./wav";

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
export function clipKey({ text, voice }: ClipRequest): string {
  return `${text}|${voice ?? ""}`;
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
 */
export function rateFor(request: ClipRequest): number {
  const pace = request.pace ?? DEFAULT_PACE;
  if (request.slow) return pace.slow;
  const base = request.rate !== undefined ? Math.min(request.rate, pace.normal) : pace.normal;
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
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: request.text,
      ...(request.voice ? { voice: request.voice } : {}),
    }),
  });
  if (!res.ok) throw new Error(String(res.status));
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
export type PlayOutcome = "played" | "blocked";

export async function playClip(
  request: ClipRequest,
  { unasked = false }: { unasked?: boolean } = {},
): Promise<PlayOutcome> {
  const clip = await stretchedClip(request, rateFor(request));
  // The rate is already in the clip; the room is the mixer's job. A slow
  // play is heard in a quiet room, because it was asked for by somebody who
  // wants to hear the word and not the café.
  const condition = request.slow ? CLEAN : (request.condition ?? CLEAN);
  if (needsMixer(condition)) return playThrough(await clip.blob.arrayBuffer(), condition, { unasked });
  // The element rather than a buffer source for the plain case, on purpose:
  // an element plays through a phone's silent switch and a Web Audio graph
  // does not, and a learner who pressed the speaker asked to hear it.
  const audio = new Audio(clip.url);
  try {
    await audio.play();
  } catch (error) {
    if (unasked && error instanceof DOMException && error.name === "NotAllowedError") {
      return "blocked";
    }
    throw error;
  }
  return "played";
}
