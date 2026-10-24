import { LIMIT_REACHED } from "@/lib/copy/values";
import { createHash } from "node:crypto";
import { after } from "next/server";

import { type AudioSource, readAudio, writeAudio } from "@/lib/audio/store";
import { singleFlightTagged } from "@/lib/cache/singleFlight";
import { recordUsage, authoriseCall, releaseReservation } from "@/lib/usage/ledger";
import { DEFAULT_VOICE, voiceFrom, VOICES } from "@/lib/audio/voice";
import { clipForStore } from "@/lib/audio/wav";
import { spokenText } from "@/lib/audio/say";
import { reportError } from "@/lib/observability/report";
import { clip } from "@/lib/copy/clip";
import { isOff } from "@/lib/usage/switches";

/**
 * ESTONIAN READ ALOUD, FOR EITHER DOOR.
 *
 * The body of `/api/tts`, which `POST /api/v1/tts` calls too (D2 and D5 in
 * docs/44-sixth-batch.md): the same store, the same in-flight joining, so one
 * clip asked by a browser and a phone at the same moment is one request to
 * TartuNLP, and the same ledger. Each door keeps its own limiter in front of
 * this, on the same key (`clipLimitKey`) and the same allowance, so a learner
 * asking on both doors spends one budget.
 *
 * A word's pronunciation never changes, so each clip is fetched once per
 * cache lifetime and then served from disk. That also keeps review sessions
 * working with audio when the network is gone, and keeps us a polite
 * consumer of a free academic service.
 */

const TARTU_NLP = "https://api.tartunlp.ai/text-to-speech/v2";
const MAX_CHARS = 400;

/*
  How much of a free academic service one learner may use in a minute.

  TartuNLP is run by the University of Tartu and asks nothing of us, which is
  exactly why it gets a cap rather than nothing: the whole point of the disk
  cache below is to be a polite consumer of it, and a retry loop with a
  slightly different string each time walks straight past a cache.

  A hundred and twenty is far above real use and far below abuse. Reviewing
  with audio on plays roughly one clip a card, and the fastest anybody clears
  a card is a few seconds, so a real session lands nearer twenty; a script
  reaches this inside a second. The charge is per learner rather than per
  address, so a classroom on one school network is twenty-five allowances
  rather than one. See lib/security/rateLimit.ts.
*/
export const SPEECH_PER_MINUTE = 120;

/*
  A READ-BACK OF WHAT WAS HEARD, WHICH NOBODY ELSE MAY EVER BE SERVED.

  The Speaking round plays `heard` back in a native voice (docs/41-fifth-batch.md
  VB-5): the words the recognizer wrote down, non-words and all, so a learner
  hears what came across. That text is the learner's, and the store above is
  content-addressed, shared by every learner and named by the text, so a
  read-back may not touch it: nothing is read from it, nothing is written to it,
  and no in-flight request is shared. It is asked of TartuNLP each time, which
  `lib/legal/recipients.ts` already names as receiving "a phrase you asked to
  hear read aloud", so no recipient is added.

  Metered per learner like a miss, because it is one, and on a smaller shared
  allowance of its own: a read-back follows a turn somebody said, which is a
  few seconds of talking each, so twenty a minute is far above real use.
*/
export const HEARD_PER_MINUTE = 20;

/**
 * The shared limiter's key for a clip, the same on both doors so a learner
 * asking from a browser and a phone spends one allowance. `bucket` is the
 * limiter's own (`bucketForOwner`, or `bucketForRequest` where nobody could
 * be named).
 */
export function clipLimitKey(bucket: string, transient: boolean): string {
  return `${transient ? "tts-heard" : "tts"}:${bucket}`;
}

/*
  ONE REQUEST UPSTREAM PER CLIP, HOWEVER MANY PEOPLE ASK AT ONCE.

  A cache that is only consulted before the call and only written after it has
  a gap exactly as wide as the call itself, and that gap is where the traffic
  is: a class of twenty-five starting the same unit together asks for the same
  word inside the same second, every one of them misses, and the free service
  we are trying to be polite to gets twenty-five identical requests. The same
  thing happens to one learner whose card renders a word and its example
  sentence side by side, and to one learner with the app open on a phone and a
  laptop.

  The mechanism used to be a `Map` and a `finally` written out here. It moved
  to lib/cache/singleFlight.ts when the dictionary turned out to need exactly
  the same thing: a second copy of this is where the `finally` gets dropped and
  a bad minute upstream is remembered as a failure until the next deploy.
*/

/**
 * What shape a stored clip is, as part of its key.
 *
 * The store is content-addressed, shared across every instance and every
 * learner, and prunes nothing, so a clip written under an old key is served
 * for ever. Anything that changes what is kept, rather than what is said, has
 * to move this or the fix reaches new phrases only.
 *
 * A CONSTANT BECAUSE THE COMMENT AND THE KEY HAD ALREADY COME APART. The pass
 * that trims by frame, caps the pauses and levels by loudness says in its own
 * message that "the route's cache key and the worker's cache version both
 * move", and its whole diff here was one comment line: the worker went to v4
 * and the key stayed at v3. So every phrase spoken before it kept the 390ms of
 * vocoder hiss that pass measured, while the worker bump made every phone
 * throw away its local copy and fetch the stale one again. Two spellings of
 * one version is one spelling too many.
 *
 * v5 was the pass that made the lead a guarantee rather than a ceiling: a clip
 * carries exactly `LEAD_MS` of silence in front of its first sound instead of
 * up to that much of whatever the recording happened to have, which measured
 * anywhere from 40 ms to 370 ms across thirty words.
 *
 * v6 is the pass that stopped asking the service for a fragment. A word is sent
 * with a full stop on it now (lib/audio/say.ts), which is a different request
 * and so a different clip: measured over twenty words in six voices, the loud
 * body of the word comes back 1.13 times as long. Every clip stored under v5
 * was asked for the old way. The browser's own copy is keyed on the request
 * body rather than on this, and the client still sends the bare word, so
 * `public/sw.js` has to move with it or a phone goes on serving the fragment it
 * already holds.
 */
const CLIP_SHAPE = "v6";

/** Where a clip came from: one of the stores, a request this caller joined, a request it made, or a read-back. */
export type ClipSource = AudioSource | "joined" | "upstream" | "transient";

export type ClipRefusal =
  | "invalid"
  | "auth_unavailable"
  | "rate_limited"
  | "switched_off"
  | "upstream";

export type ClipOutcome =
  | { ok: true; audio: Buffer; source: ClipSource }
  | { ok: false; refusal: ClipRefusal; status: number; message: string; reason?: string; retryAfterSec?: number };

/**
 * One clip, asked for by whoever the door named.
 *
 * `ownerId` is null only on the web's door, where a caller the auth service
 * could not answer for still gets a stored clip: the middleware lets that
 * state through deliberately. `body` is the parsed request, checked here.
 * The door has already counted the caller against its limiter.
 */
export async function speakClip(input: { ownerId: string | null; body: unknown; transient: boolean }): Promise<ClipOutcome> {
  const { ownerId, transient } = input;
  if (transient && !ownerId) {
    return refuse("auth_unavailable", 503, "We couldn't check who was asking. Try again in a moment.", 30);
  }
  /*
    The read-back follows a turn somebody said, so it is a microphone's, and
    `PAID_OFF=speech` takes every microphone away (docs/41-fifth-batch.md D15).
    A clip of a word on a card is not: it is read aloud with the speech switch
    off as it always was.
  */
  if (transient && isOff("speech")) {
    return refuse("switched_off", 503, "This installation has speaking switched off.");
  }

  let text: string;
  let voice: string | null = null;
  {
    /*
      No speed. There used to be one, forwarded to the model, and it is gone
      on purpose: TartuNLP applies it inside the acoustic model as a duration
      regulator, so a "slow" clip was every phoneme held 1.6 times longer on
      repeated frames, at the same pitch, which is the flat, buzzing stretch
      a learner reported. Slow is a fact about playback now, not about the
      clip: lib/audio/clip.ts plays the one clip slower with the pitch held.
      One clip per word rather than two also halves what is asked of a free
      service and what the caches hold.
    */
    const body = (typeof input.body === "object" && input.body !== null ? input.body : {}) as { text?: unknown; voice?: unknown };
    if (typeof body.text !== "string" || !body.text.trim()) {
      return refuse("invalid", 400, "There's nothing to say out loud.");
    }
    /*
      Finished, rather than as typed. TartuNLP reads sentences, and a bare
      headword with no stop on it is a fragment to its front end, which renders
      it as one: measured, the word itself comes back an eighth shorter, which
      is the "the word is incomplete" a learner reported. `spokenText` moves
      punctuation and never a letter, and the store is keyed on what comes out
      of it, so the cache and the request cannot come apart.
    */
    text = spokenText(clip(body.text.trim(), MAX_CHARS));
    /*
      The learner's chosen voice, checked against the allowlist rather than
      passed to a third party as typed. A value that is not one of ours is
      the deployment's default, never an error, because the request carries
      it on behalf of a setting the learner may have set on another day.
    */
    if (typeof body.voice === "string" && VOICES.some((v) => v.id === body.voice)) voice = voiceFrom(body.voice);
  }

  const speaker = voice ?? voiceFrom(process.env.TTS_SPEAKER ?? DEFAULT_VOICE);
  if (transient && ownerId) return readBack(ownerId, text, speaker);
  const hash = createHash("sha256").update(`${CLIP_SHAPE}|${text}|${speaker}`).digest("hex");
  // Content-addressed and shared across instances and users: a clip fetched
  // once is available to everybody, forever. See lib/audio/store.ts.
  const cached = await readAudio(hash).catch(() => null);
  if (cached) return { ok: true, audio: cached.body, source: cached.from };

  /*
    A MISS IS METERED, BECAUSE A MISS COSTS SOMETHING.

    A miss makes a request of TartuNLP, a free academic service this app
    promises to be a polite consumer of, and writes a WAV into storage that
    nothing prunes, on a key space of any text a client cares to send, so it
    goes through `ALLOWANCE.TTS` in the ledger. A hit and a joiner are free:
    neither asks anybody for anything.

    AND A MISS WITH NOBODY TO CHARGE IS REFUSED RATHER THAN WAVED THROUGH.
    A caller the auth service could not answer for still gets a bucket and
    still gets a stored clip; taking somebody's audio away over a bad minute at
    Supabase is worse than the alternative. What may not follow from it is
    spending. `lib/usage` has no off switch and fails closed, so this fails
    closed too: what is already stored still plays, and a new clip waits for
    somebody the meter can name.
  */
  if (!ownerId) {
    return refuse("auth_unavailable", 503, "We don't have that clip yet, and we couldn't check who was asking. Try again in a moment.", 30);
  }
  const decision = await authoriseCall(ownerId, "TTS");
  if (!decision.allowed) {
    return { ok: false, refusal: "rate_limited", status: 429, message: decision.message ?? LIMIT_REACHED, reason: decision.reason, retryAfterSec: decision.retryAfterSeconds };
  }

  try {
    /*
      Whoever gets here first fetches; everybody who arrives while that is in
      flight is handed the same promise. Which of the two this caller was
      still matters below, so it is asked for rather than thrown away.
    */
    const { value: audio, joined } = await singleFlightTagged(
      `tts:${hash}`, () => speak(text, speaker, hash),
    );
    // TartuNLP is free, so this costs nothing; it is recorded to show how
    // heavily the app leans on somebody else's goodwill. Passing an explicit
    // zero matters: the speaker name would otherwise price as an unknown model.
    //
    // A joiner is not recorded, for the same reason a cache hit above is not:
    // this row counts requests actually made of TartuNLP, and a joiner made
    // none. Counting them would tighten the speech allowance by the size of
    // whatever burst the deduplication just absorbed.
    const joinerBooking = joined ? decision.reservation : undefined;
    if (joinerBooking) {
      // A joiner made no request of anybody, so it hands its booking back.
      after(() => releaseReservation(joinerBooking));
    }
    if (!joined) {
      after(() => recordUsage({
        ownerId, kind: "TTS", provider: "tartunlp", model: speaker,
        inputTokens: text.length, outputTokens: 0, costMicros: 0,
        reservation: decision.reservation,
      }));
    }
    return { ok: true, audio, source: joined ? "joined" : "upstream" };
  } catch (error) {
    // Nothing was spoken, so the booking goes back: a learner must not spend
    // their day's allowance on a minute when TartuNLP was down.
    const booking = decision.reservation;
    if (booking) after(() => releaseReservation(booking));
    return upstreamFailed(error);
  }
}

function refuse(refusal: ClipRefusal, status: number, message: string, retryAfterSec?: number): ClipOutcome {
  return { ok: false, refusal, status, message, ...(retryAfterSec ? { retryAfterSec } : {}) };
}

function upstreamFailed(error: unknown): ClipOutcome {
  const status = error instanceof SpeechError ? error.status : 503;
  const message =
    status === 502 ? "The speech service couldn't read that out." : "We couldn't reach the speech service.";
  return refuse("upstream", status, message);
}

/**
 * One read-back of what the recognizer heard: metered, never cached, never
 * stored. The request was checked and the learner's limit counted by the door.
 */
async function readBack(ownerId: string, text: string, speaker: string): Promise<ClipOutcome> {
  const decision = await authoriseCall(ownerId, "TTS");
  if (!decision.allowed) {
    return { ok: false, refusal: "rate_limited", status: 429, message: decision.message ?? LIMIT_REACHED, reason: decision.reason, retryAfterSec: decision.retryAfterSeconds };
  }
  try {
    const audio = await speak(text, speaker, null);
    after(() => recordUsage({
      ownerId, kind: "TTS", provider: "tartunlp", model: speaker,
      inputTokens: text.length, outputTokens: 0, costMicros: 0,
      reservation: decision.reservation,
    }));
    return { ok: true, audio, source: "transient" };
  } catch (error) {
    const booking = decision.reservation;
    if (booking) after(() => releaseReservation(booking));
    return upstreamFailed(error);
  }
}

class SpeechError extends Error {
  constructor(readonly status: number) {
    super(`speech service ${status}`);
  }
}

/**
 * Fetch one clip and write it to the cache. Throws SpeechError, never a Response.
 * A null hash is a read-back of what the learner said, which is never kept.
 */
async function speak(
  text: string,
  speaker: string,
  hash: string | null,
): Promise<Buffer> {
  let upstream: Response;
  try {
    upstream = await fetch(TARTU_NLP, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, speaker }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SpeechError(503);
  }

  if (!upstream.ok) throw new SpeechError(502);

  const raw = new Uint8Array(await upstream.arrayBuffer());
  // Nothing to play is a failed answer, not a clip; the booking goes back.
  if (raw.byteLength === 0) throw new SpeechError(502);
  const prepared = clipForStore(raw);
  if (prepared.error) {
    reportError(prepared.error, { at: "tts/prepare", extra: { bytes: raw.byteLength } });
  }
  const audio = Buffer.from(prepared.audio);
  // Never throws: a failed cache write is a slower next play. And only a clip
  // this route could read is kept, since the store answers before the service.
  // A read-back of what the learner said is never kept (`readBack`).
  if (hash === null) return audio;
  if (prepared.keep) await writeAudio(hash, audio);
  return audio;
}
