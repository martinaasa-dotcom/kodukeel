/**
 * Slower, in the browser, the way a person is slower.
 *
 * A slow play is the one clip played at a lower rate with the pitch held. The
 * first version handed that to the browser's own `playbackRate`, and it was
 * reported as stretched and robotic anyway, for two reasons that are worth
 * keeping apart.
 *
 * THE BROWSER STRETCHES EVERYTHING BY THE SAME AMOUNT. A person speaking slowly
 * does not: vowels get longer, the pauses between words get much longer, and
 * the consonants stay where they were, because a `t` is a burst of air and a
 * slow `t` is not a longer burst, it is the same burst after a longer wait.
 * Multiply a plosive by 1.4 and you get a smeared double click; multiply a
 * fricative and the noise takes on a hum at the grain rate. That is the
 * "robotic" in the report, and no setting on the element reaches it, since
 * the element knows nothing about where the consonants are.
 *
 * AND WHAT THE BROWSER USES IS NOBODY'S CHOICE. Chrome has one algorithm,
 * Firefox another, Safari a third, and the grain size, the search width and
 * how each handles a transient are theirs to change in a release. A slow
 * play that sounds different on two phones is two answers to how slow is
 * done, which is the fault this module's one caller exists to prevent.
 *
 * So the stretch is done here, on the decoded samples, before the element
 * plays them. It is WSOLA, waveform-similarity overlap-add: short Hann
 * windows of the recording are laid down at a fixed output hop, and each one
 * is taken from wherever in a small neighborhood of its nominal input
 * position lines up best with the tail of the window before it. Because
 * every output sample is a sample of the recording, the pitch, the formants
 * and the voice are exactly the recording's own; only how long each part
 * lasts changes. The rate is not uniform: a short analysis pass marks each
 * ten milliseconds as silence, a transient, noise or a steady sound, and the
 * stretch is spent on the steady sounds and the pauses, not on the
 * transients, with the speech coming out at exactly the rate asked for.
 *
 * Pure. Float32Array in, Float32Array out, no Web Audio and no DOM, which is
 * what lets it be unit tested and measured against the real clips in Node.
 * `lib/audio/clip.ts` is the one caller, asserted, for the reason `new Audio(`
 * has one home: a second stretch is a second answer.
 */

export interface Samples {
  readonly rate: number;
  readonly samples: Float32Array;
}

/** How a slice of the clip is classified, which decides how much of the stretch it carries. */
export type Segment = "padding" | "silence" | "transient" | "noise" | "steady";

/*
  HOW MUCH OF THE SLOWING EACH KIND OF SOUND CARRIES.

  Relative weights, scaled so the speech comes out at the rate asked for.
  A transient carries none, since a burst is a burst at any speed. A pause
  carries the most, because a pause is what a slow speaker actually adds. A
  fricative carries less than a vowel: `s` and `h` do lengthen in slow speech,
  but a noise grain repeated too often acquires a pitch of its own, so they
  are given about half a vowel's share. The lead-in and the tail carry none,
  since a longer wait before the word starts is not a slower word.
*/
export const SEGMENT_WEIGHT: Readonly<Record<Segment, number>> = {
  padding: 0,
  silence: 1.6,
  transient: 0,
  noise: 0.5,
  steady: 1,
};

/** The analysis frame, in seconds. Ten milliseconds is about one pitch period of a low male voice. */
export const FRAME_S = 0.01;
/** A window of about thirty milliseconds holds three or four pitch periods, which is what WSOLA needs. */
export const WINDOW_S = 0.03;
/** How far either side of the nominal position a window may be taken from. */
export const SEARCH_S = 0.008;
/** A frame this far under the clip's own peak is silence. About -40 dB. */
const SILENCE_SHARE = 0.01;
/** A rise in amplitude of this much over the recent level is an onset. About 8 dB. */
const ONSET_RATIO = 2.5;
/** How many frames after an onset stay unstretched: the burst and its release. */
const TRANSIENT_FRAMES = 3;
/**
 * Frames whose energy sits mostly above about 4 kHz are noise rather than
 * voice: a vowel at 230 Hz scores under 0.1 here and an `s` over 0.4.
 */
const NOISE_SHARE = 0.25;

function rms(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) {
    const v = samples[i] ?? 0;
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, to - from));
}

/** The first-difference signal's energy share: high for hiss and bursts, low for a vowel. */
function highShare(samples: Float32Array, from: number, to: number): number {
  let total = 0;
  let high = 0;
  for (let i = Math.max(1, from); i < to; i++) {
    const v = samples[i] ?? 0;
    const d = v - (samples[i - 1] ?? 0);
    total += v * v;
    high += d * d;
  }
  // The difference of a sine at frequency f has amplitude 2 sin(pi f / rate);
  // dividing by four puts a 3 kHz tone at 22 kHz near 0.5.
  return total === 0 ? 0 : high / (4 * total);
}

/**
 * What each frame of the clip is. Exported for the tests and for the
 * measurement script; the stretch reads it through `stretchMap`.
 */
export function classify({ rate, samples }: Samples): Segment[] {
  const frame = Math.max(1, Math.round(rate * FRAME_S));
  const count = Math.ceil(samples.length / frame);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i] ?? 0));
  const floor = peak * SILENCE_SHARE;

  const energy: number[] = [];
  const hiss: number[] = [];
  for (let f = 0; f < count; f++) {
    const from = f * frame;
    const to = Math.min(samples.length, from + frame);
    energy.push(rms(samples, from, to));
    hiss.push(highShare(samples, from, to));
  }

  const out: Segment[] = new Array<Segment>(count).fill("steady");
  let hold = 0;
  let previous = floor;
  for (let f = 0; f < count; f++) {
    const e = energy[f] ?? 0;
    const onset = e >= floor && e > previous * ONSET_RATIO;
    if (onset) hold = TRANSIENT_FRAMES;
    if (e < floor) out[f] = "silence";
    else if (hold > 0) out[f] = "transient";
    else if ((hiss[f] ?? 0) > NOISE_SHARE) out[f] = "noise";
    else out[f] = "steady";
    if (hold > 0) hold--;
    // A frame's energy is compared with the loudest recent one, so a vowel
    // swelling over three frames is one onset rather than three.
    previous = Math.max(e, previous * 0.6, floor);
  }

  // The lead-in and the tail: a longer wait is not a slower word, so the
  // silence before the first sound and after the last is marked as the padding
  // it is, and `stretchMap` leaves it exactly as long as it was.
  let first = 0;
  while (first < count && out[first] === "silence") first++;
  let last = count - 1;
  while (last > first && out[last] === "silence") last--;
  for (let f = 0; f < first; f++) out[f] = "padding";
  for (let f = last + 1; f < count; f++) out[f] = "padding";
  return out;
}

/**
 * For each analysis frame, the factor its length is multiplied by, chosen so
 * the weights above are honored and the speech itself, from its first sound to
 * its last, comes out at exactly `1 / rate` times its length. The
 * padding either side keeps its length: the word is slower, the wait for it
 * is not. A word that is all transient, which is a click and nothing else, is
 * stretched uniformly, since there is nothing to spend the slowing on.
 *
 * The factor is floored at a half, which only ever binds when playing faster:
 * a pause may be cut to half but not to nothing, or two words run together.
 */
export function stretchMap(segments: readonly Segment[], rate: number): number[] {
  const factor = 1 / rate;
  const inner = segments.filter((s) => s !== "padding");
  const total = inner.reduce((sum, s) => sum + SEGMENT_WEIGHT[s], 0);
  const scale = total === 0 ? 0 : inner.length / total;
  return segments.map((s) => {
    if (s === "padding") return 1;
    if (total === 0) return factor;
    return Math.max(0.5, 1 + (factor - 1) * SEGMENT_WEIGHT[s] * scale);
  });
}

/**
 * The clip at `speed`, of the recording, pitch held. 1 returns the samples untouched.
 * Faster is the same operation with the map below one, and a transient is
 * kept whole in that direction too.
 */
export function stretch(clip: Samples, speed: number): Samples {
  if (speed === 1 || clip.samples.length === 0) return clip;
  const { rate, samples } = clip;
  const frame = Math.max(1, Math.round(rate * FRAME_S));
  const map = stretchMap(classify(clip), speed);

  // Where each analysis frame lands in the output, cumulatively, so an output
  // position can be turned back into the input position it should read from.
  const outStarts: number[] = [0];
  for (let f = 0; f < map.length; f++) {
    const inLen = Math.min(frame, samples.length - f * frame);
    outStarts.push((outStarts[f] ?? 0) + inLen * (map[f] ?? 1));
  }
  const outLength = Math.round(outStarts[map.length] ?? samples.length / speed);
  let cursor = 0;
  const inputAt = (out: number): number => {
    while (cursor + 1 < map.length && (outStarts[cursor + 1] ?? 0) <= out) cursor++;
    while (cursor > 0 && (outStarts[cursor] ?? 0) > out) cursor--;
    const start = outStarts[cursor] ?? 0;
    const span = (outStarts[cursor + 1] ?? start) - start;
    const within = span > 0 ? (out - start) / span : 0;
    return cursor * frame + within * Math.min(frame, samples.length - cursor * frame);
  };

  const window = Math.max(4, Math.round(rate * WINDOW_S) & ~1);
  /*
    A CLIP SHORTER THAN ONE ANALYSIS WINDOW IS RETURNED UNSTRETCHED.
    Every real word clip is padding plus speech and is comfortably longer
    than a 30ms window, so this never fires on anything TartuNLP has ever
    sent back. It is here because `lastStart` below is clamped to zero for
    such a clip while the search loop still reads a full window's worth of
    samples from wherever it lands, which would read past the end of the
    array. A short word played slowly is worth more without this guard than
    a garbled one is with it, so the safe fallback is the plain recording at
    its own rate rather than a corrupted stretch.
  */
  if (samples.length < window) return clip;
  const hop = window / 2;
  const search = Math.round(rate * SEARCH_S);
  const hann = new Float32Array(window);
  for (let i = 0; i < window; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / window);
  /*
    THE FIRST WINDOW HAS NOTHING TO OVERLAP, SO IT CARRIES ITS OWN OPENING.

    Two Hann windows a half-window apart sum to one, which is what makes the
    overlap-add transparent, and the first window in the output has no
    predecessor to sum with: its rising half stood alone, so the opening hop
    of every stretched clip was faded in from silence. Fifteen milliseconds is
    not much and it is exactly where a word-initial consonant lives, and it
    only stayed inaudible because `trimSilence` happened to leave more lead
    than that in front of the word. A fade that is invisible because of what
    another module happened to do is a fault waiting for the day it does
    something else. The rising half is held at full gain instead, so the first
    hop sums to one like every other.
  */
  const opening = new Float32Array(hann);
  for (let i = 0; i < window / 2; i++) opening[i] = 1;

  const out = new Float32Array(outLength + window);
  const lastStart = Math.max(0, samples.length - window);
  const segments = classify(clip);
  /*
    A WINDOW OVER A BURST IS COPIED STRAIGHT THROUGH, WITH NO SEARCH.

    The search below picks, for each window, the nearby input position that
    joins most smoothly onto the window before it, which is what makes a
    stretched vowel one continuous sound. Over a consonant burst it does the
    opposite: two overlapping windows can each find the burst at slightly
    different offsets, and the sum is the burst twice, a few milliseconds
    apart, which is the smear a slow play used to have. Measured on a synthetic
    click: three milliseconds long in the clip, eight in the stretched copy.
    So while a window would cover a transient frame it is taken from exactly
    one hop after the window before it, which reproduces the recording sample
    for sample through the burst, and the search resumes on the vowel.
  */
  const transientAt = (from: number): boolean => {
    const a = Math.floor(from / frame);
    const b = Math.min(segments.length - 1, Math.floor((from + window - 1) / frame));
    for (let f = a; f <= b; f++) if (segments[f] === "transient") return true;
    return false;
  };
  let previous = -1; // The input position the last window was actually taken from.
  for (let o = 0; o + hop <= out.length; o += hop) {
    const nominal = Math.round(inputAt(Math.min(o, outLength)));
    const nominalPosition = Math.min(nominal, lastStart);
    let position = nominalPosition;
    if (previous >= 0 && transientAt(nominal)) {
      position = Math.min(previous + hop, lastStart);
    } else if (previous >= 0) {
      /*
        The natural continuation of the last window is the segment one hop on
        from where it was taken. Of the candidates near the nominal position,
        the one that lines up with it best is the one that joins without a
        seam. Coarse first, then refined, since every third sample says where
        the peak is and the rest say exactly where. Every index below stays
        inside the array by construction, so the loops read it directly: this
        is the hot path, and a phone runs it on every slow press.
      */
      const target = Math.min(previous + hop, lastStart);
      const lo = Math.max(0, nominal - search);
      const hi = Math.min(lastStart, nominal + search);
      // What the new window has to sit on top of. Its own energy is what says
      // whether there is a phase here to get wrong at all: see the fallback
      // below the search.
      let targetEnergy = 0;
      for (let i = 0; i < window; i++) {
        const t = samples[target + i] as number;
        targetEnergy += t * t;
      }
      let best = -Infinity;
      let bestAt = Math.min(Math.max(lo, nominal), hi);
      for (let c = lo; c <= hi; c += 3) {
        let dot = 0;
        let energy = 0;
        for (let i = 0; i < window; i += 3) {
          const a = samples[c + i] as number;
          dot += a * (samples[target + i] as number);
          energy += a * a;
        }
        const score = energy === 0 ? 0 : dot / Math.sqrt(energy);
        if (score > best) {
          best = score;
          bestAt = c;
        }
      }
      best = -Infinity;
      const coarse = bestAt;
      for (let c = Math.max(lo, coarse - 2); c <= Math.min(hi, coarse + 2); c++) {
        let dot = 0;
        let energy = 0;
        for (let i = 0; i < window; i++) {
          const a = samples[c + i] as number;
          dot += a * (samples[target + i] as number);
          energy += a * a;
        }
        const score = energy === 0 ? 0 : dot / Math.sqrt(energy);
        if (score > best) {
          best = score;
          bestAt = c;
        }
      }
      /*
        A MATCH THAT IS OUT OF PHASE IS NOT A MATCH, AND TWO OF THEM CANCEL.

        The score above is the projection of a candidate onto the tail of the
        window before it, and it can be negative: every candidate in the search
        neighborhood is then in antiphase with what it has to be added to, and
        taking the least bad one lays a window down that cancels rather than
        continues. Measured over thirty real TartuNLP clips as the worst dip
        against the level a hop either side of it, the recordings' own deepest
        being 9 dB and a consonant closure: 206 dB at the rate the level check
        reads a dictation sentence at, 41 dB at 0.72, 20 dB at the slow button's
        own rate.

        WHERE THEY SIT IS WORTH SAYING, because it is not where a learner's
        report about a word being cut off would put them. Every one of those dips
        is in the last ten or twenty milliseconds of a word's release, at a point
        the signal is already 25 dB down: it is the overlap-add running out of
        content rather than a syllable going missing, and inside the body of the
        word the old code was within 12 dB of the recordings' own throughout.
        So this is an artifact being removed rather than the truncation that was
        reported, which `lib/audio/wav.ts` answers instead.

        A search whose every candidate is in antiphase falls back to the natural
        continuation, which is the segment one hop on from the last window. That
        is the one position that cannot cancel: the overlap is then the recording
        against itself, sample for sample, since it is what the recording
        actually does next. After it, no rate from 1 down to 0.5 dips more than
        13 dB inside the body of a word, against the recordings' own 9.6.

        A SCORE THAT IS MERELY UNCONVINCING COUNTS, AND THAT WAS MEASURED RATHER
        THAN REASONED. A window laid over a consonant closure can be nearly
        orthogonal to what is under it rather than opposed, and adding it still
        removes most of what is there: holding out only for a strictly negative
        score left the worst dip at 30 dB, and requiring a normalised
        correlation above a threshold instead was tried at nine values and was
        worse at every one of them, erratically, because what the search can
        find within eight milliseconds is not a quantity there is a good cut-off
        in. Anything that is not positively in phase takes the continuation.

        WHERE THERE IS NOTHING UNDER THE WINDOW, THE MAP WINS INSTEAD. Silence
        has no phase to be on the wrong side of, and the continuation walks the
        cursor forward a whole hop per window where the map wants a fraction of
        one, so through a pause the cursor runs ahead and eats the very thing it
        was lengthening. `stretch.test.ts` caught that as the gap between a
        burst and its vowel coming out two frames short of the stretch it asked
        for. Exact silence rather than a floor, deliberately: a floor put the
        vocoder's own hiss and a quiet fricative on the same side of the line
        and cancelled the fricative, and the only clips with true zeros inside
        them are synthetic ones, so a real recording always takes the rule
        above.
      */
      position = targetEnergy === 0 ? nominalPosition : best > 0 ? bestAt : target;
    }
    const span = Math.min(window, out.length - o);
    const shape = o === 0 ? opening : hann;
    for (let i = 0; i < span; i++) {
      out[o + i] = (out[o + i] as number) + (samples[position + i] as number) * (shape[i] as number);
    }
    previous = position;
  }
  return { rate, samples: out.subarray(0, outLength) };
}
