/**
 * A TURN DRAWN AS A ROW OF BARS, ON A TIME SCALE TWO ROWS CAN SHARE.
 *
 * The comparison on a speaking screen plays the learner's own turn and then
 * the native line (`components/speech/CompareVoices.tsx`), and draws both: a
 * row of bars per voice, one bar per slice of time, so a turn said twice as
 * slowly is drawn twice as long and the stresses sit where they were said.
 * Estonian carries meaning in how long a sound is held, so the length of the
 * row is the one thing on that screen a learner can read off a picture. It is
 * a drawing of loudness and nothing else: no bar is ever colored for being
 * right or wrong (ADR-018).
 *
 * The silence either side of the speech is left out of the drawing, since a
 * second of quiet before somebody starts says nothing about how they said it,
 * and `start` says where the drawing begins so a playhead can be timed to it.
 */
export interface WaveBars {
  /** Each bar's height, nought to one, loudest slice of the turn at one. */
  readonly bars: readonly number[];
  /** Seconds into the audio where the first bar begins. */
  readonly start: number;
  /** Seconds of audio each bar covers. */
  readonly step: number;
  /** Seconds of speech drawn, first bar to last. */
  readonly seconds: number;
}

/** How finely the speech is sliced before it is drawn: ten milliseconds, the frame every other reading here uses. */
const FRAME_S = 0.01;
/** A frame quieter than this, against the loudest, is the silence round the speech. */
const QUIET = 0.08;
/** Quieter than this, against the loudest, is room rather than a quiet sound at the edge of a word. */
const KEEP = 0.03;
/** The shortest a bar may be drawn, so a quiet consonant is a mark rather than a gap. */
const FLOOR = 0.12;

/** The speech in a turn: where it starts and ends, in seconds, and how loud each frame of it is. */
export function speechFrames(samples: Float32Array, rate: number, quiet = QUIET): { start: number; end: number; levels: number[] } | null {
  const size = Math.max(1, Math.round(rate * FRAME_S));
  const levels: number[] = [];
  for (let at = 0; at < samples.length; at += size) {
    let sum = 0;
    const end = Math.min(samples.length, at + size);
    for (let i = at; i < end; i++) sum += samples[i]! * samples[i]!;
    levels.push(Math.sqrt(sum / Math.max(1, end - at)));
  }
  const loudest = Math.max(0, ...levels);
  if (loudest <= 0) return null;
  const first = levels.findIndex((l) => l >= loudest * quiet);
  let last = levels.length - 1;
  while (last > first && levels[last]! < loudest * quiet) last--;
  if (first === -1) return null;
  return { start: first * FRAME_S, end: (last + 1) * FRAME_S, levels: levels.slice(first, last + 1).map((l) => l / loudest) };
}

/**
 * The speech of a turn as `perSecond` bars a second, each the loudest frame
 * in its slice. Two rows drawn at one `perSecond` are on one time scale, which
 * is what `barsPerSecond` decides for a pair.
 */
export function waveBars(samples: Float32Array, rate: number, perSecond: number): WaveBars | null {
  const speech = speechFrames(samples, rate);
  if (!speech) return null;
  const seconds = speech.end - speech.start;
  const count = Math.max(1, Math.round(seconds * perSecond));
  const per = speech.levels.length / count;
  const bars: number[] = [];
  for (let b = 0; b < count; b++) {
    const from = Math.floor(b * per);
    const to = Math.max(from + 1, Math.floor((b + 1) * per));
    let peak = 0;
    for (let f = from; f < to && f < speech.levels.length; f++) peak = Math.max(peak, speech.levels[f]!);
    bars.push(Math.max(FLOOR, Math.min(1, Math.sqrt(peak))));
  }
  return { bars, start: speech.start, step: seconds / count, seconds };
}

/** Bars a second for a set of turns drawn side by side: as fine as reads well, and the longest never past `most` bars. */
export function barsPerSecond(seconds: readonly number[], most: number, finest = 22): number {
  const longest = Math.max(0, ...seconds);
  if (longest <= 0) return finest;
  return Math.min(finest, most / longest);
}

/**
 * The turn with the quiet either side of the speech cut down to a breath, for
 * playing back beside the native line. A turn holds whatever the microphone
 * heard until the engine closed it, often seconds of room after the last
 * word, and played as it was that is a wait before the comparison's second
 * half that has nothing in it. Nothing inside the speech is touched.
 */
export function speechOnly(samples: Float32Array, rate: number, before = 0.15, after = 0.3): Float32Array {
  // A lower floor than the drawing's, so a word-final s or h, which is quiet, is kept whole.
  const speech = speechFrames(samples, rate, KEEP);
  if (!speech) return samples;
  const from = Math.max(0, Math.floor((speech.start - before) * rate));
  const to = Math.min(samples.length, Math.ceil((speech.end + after) * rate));
  return to > from ? samples.subarray(from, to) : samples;
}
