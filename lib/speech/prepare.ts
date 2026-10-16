import { SPEECH_SETTINGS as S } from "./settings";

/**
 * A FINISHED TURN, MADE INTO WHAT THE MODEL HEARS BEST.
 *
 * `docs/39-speech.md` sections 3.5 and 3.6 measured four things done to a
 * recording before it is decoded, and this is all four, in the order they
 * have to happen: raise a quiet recording, squeeze the pauses inside it, trim
 * the silence at its edges, and put back exactly the silence the model wants
 * in front and behind. The live text decoded while somebody speaks is not
 * prepared; only the final reading is (section 3.1).
 *
 * Pure and at 16 kHz: the capture side has already resampled
 * (`lib/speech/resample.ts`), so a native app runs exactly this too.
 */

/** The loudest sample's magnitude. */
export function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]!);
    if (v > peak) peak = v;
  }
  return peak;
}

/** A quiet recording raised to the measured peak; a loud one returned untouched. */
export function normalize(samples: Float32Array): Float32Array {
  const peak = peakOf(samples);
  if (peak === 0 || peak >= S.quietPeak) return samples;
  const gain = S.normalizePeak / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i]! * gain;
  return out;
}

/**
 * Which frames are speech, read against the clip's own loudest frame rather
 * than an absolute level, so a quiet microphone and a loud one agree.
 */
export function loudFrames(samples: Float32Array, rate: number = S.sampleRate): boolean[] {
  const size = Math.max(1, Math.round(rate * S.frameSeconds));
  const count = Math.ceil(samples.length / size);
  const energy = new Float64Array(count);
  let loudest = 0;
  for (let f = 0; f < count; f++) {
    let sum = 0;
    const end = Math.min(samples.length, (f + 1) * size);
    for (let i = f * size; i < end; i++) sum += samples[i]! * samples[i]!;
    energy[f] = sum / Math.max(1, end - f * size);
    if (energy[f]! > loudest) loudest = energy[f]!;
  }
  if (loudest === 0) return Array.from({ length: count }, () => false);
  const floor = loudest * 10 ** (S.pauseFloorDb / 10);
  return Array.from(energy, (e) => e >= floor);
}

/**
 * Every pause inside the turn longer than the measured length is cut to the
 * measured length, keeping the part that follows the word so no syllable is
 * clipped; the silence before the first word and after the last is cut away,
 * to be replaced by `pad`.
 */
export function squeezePauses(samples: Float32Array, rate: number = S.sampleRate): Float32Array {
  const size = Math.max(1, Math.round(rate * S.frameSeconds));
  const loud = loudFrames(samples, rate);
  const first = loud.indexOf(true);
  if (first === -1) return new Float32Array(0);
  const last = loud.lastIndexOf(true);
  const keepAfter = Math.round(S.keepAfterWordSeconds / S.frameSeconds);
  const over = Math.round(S.pauseOverSeconds / S.frameSeconds);
  const to = Math.round(S.pauseToSeconds / S.frameSeconds);

  const pieces: Array<[number, number]> = [];
  let start = Math.max(0, first - 2);
  let f = first;
  while (f <= last) {
    if (loud[f]) { f++; continue; }
    let g = f;
    while (g <= last && !loud[g]) g++;
    const quiet = g - f;
    if (quiet > over) {
      pieces.push([start, f + Math.max(to, Math.min(keepAfter, quiet))]);
      start = g;
    }
    f = g;
  }
  pieces.push([start, Math.min(loud.length, last + 1 + keepAfter)]);

  let length = 0;
  for (const [a, b] of pieces) length += Math.min(samples.length, b * size) - a * size;
  const out = new Float32Array(Math.max(0, length));
  let at = 0;
  for (const [a, b] of pieces) {
    const from = a * size;
    const until = Math.min(samples.length, b * size);
    if (until <= from) continue;
    out.set(samples.subarray(from, until), at);
    at += until - from;
  }
  return out;
}

/** The measured silence in front and behind. */
export function pad(samples: Float32Array, rate: number = S.sampleRate): Float32Array {
  const lead = Math.round(rate * S.leadSeconds);
  const tail = Math.round(rate * S.tailSeconds);
  const out = new Float32Array(lead + samples.length + tail);
  out.set(samples, lead);
  return out;
}

/** All of it, in order: what a finished turn becomes before the final decoding. */
export function prepareTurn(samples: Float32Array, rate: number = S.sampleRate): Float32Array {
  return pad(squeezePauses(normalize(samples), rate), rate);
}

/** Seconds of speech in a prepared turn, without the padding, which is what a turn's length is reported as. */
export function spokenSeconds(samples: Float32Array, rate: number = S.sampleRate): number {
  return squeezePauses(samples, rate).length / rate;
}
