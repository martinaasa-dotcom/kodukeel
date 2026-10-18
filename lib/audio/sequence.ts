import { FADE_MS, LEAD_MS, TRAIL_MS, type Pcm } from "./wav";

/**
 * SEVERAL CLIPS AS ONE, WITH THE SILENCE BETWEEN THEM SAID EXACTLY.
 *
 * A spelled word is a run of letter names a breath apart, and it was played
 * as a run of separate clips: each one a new audio element, each with a start
 * the browser takes its own time over, so measured in a browser the same
 * word came out with gaps of 2.1, 1.4, 1.35 and 1.3 seconds between letters
 * that are each under a second long. Uneven gaps are the one thing a listener
 * writing letters down notices, and it was reported as some letters starting
 * at once and others after half a second.
 *
 * So the letters are joined here into one clip and played once. Every clip
 * written by `trimSilence` carries exactly `LEAD_MS` of padding in front of
 * its first sound and `TRAIL_MS` behind its last, so the padding can be cut
 * by arithmetic rather than measured again: what is kept of it is `KEEP_LEAD_MS`
 * and `KEEP_TRAIL_MS`, which hold the seam's fade and a letter's natural fall,
 * and the gap a caller asks for is written as true silence between. The
 * whole run gets the ordinary lead and trail, so its first sound is not
 * swallowed opening the stream and its last is not cut off closing it.
 *
 * Pure: samples in, samples and the span each piece occupies out, so the
 * screen can light each letter off the play position.
 */

/** What is kept of a clip's own padding: the fade at the seam, with room to spare. */
export const KEEP_LEAD_MS = 30;
export const KEEP_TRAIL_MS = 90;

export interface Piece {
  readonly pcm: Pcm;
  /** Silence written after this piece and before the next, in milliseconds. */
  readonly gapAfterMs: number;
}

export interface Sequence {
  readonly pcm: Pcm;
  /** Where each piece's sound starts and ends in the joined clip, in seconds. */
  readonly spans: readonly { readonly from: number; readonly to: number }[];
}

const samplesOf = (rate: number, ms: number) => Math.max(0, Math.round((rate * ms) / 1000));

export function sequence(pieces: readonly Piece[]): Sequence {
  const rate = pieces[0]?.pcm.rate ?? 22_050;
  if (pieces.some((p) => p.pcm.rate !== rate)) throw new Error("Every piece of a sequence has to be at one rate.");
  const cutLead = samplesOf(rate, LEAD_MS - KEEP_LEAD_MS);
  const cutTrail = samplesOf(rate, TRAIL_MS - KEEP_TRAIL_MS);
  const bodies = pieces.map(({ pcm }) => {
    const { samples } = pcm;
    // A clip shorter than its own padding was not written by `trimSilence`;
    // it is kept whole rather than cut to nothing.
    if (samples.length <= cutLead + cutTrail) return samples;
    return samples.subarray(cutLead, samples.length - cutTrail);
  });
  const lead = samplesOf(rate, LEAD_MS);
  const trail = samplesOf(rate, TRAIL_MS);
  const gaps = pieces.map((p, i) => (i < pieces.length - 1 ? samplesOf(rate, p.gapAfterMs) : 0));
  const total = lead + bodies.reduce((n, b) => n + b.length, 0) + gaps.reduce((n, g) => n + g, 0) + trail;
  const out = new Float32Array(total);
  const keepLead = samplesOf(rate, KEEP_LEAD_MS);
  const keepTrail = samplesOf(rate, KEEP_TRAIL_MS);
  const spans: { from: number; to: number }[] = [];
  let at = lead;
  bodies.forEach((body, i) => {
    out.set(body, at);
    // The kept padding is already silence with the clip's own fade in it, so
    // the sound is the body less those two edges.
    spans.push({ from: (at + Math.min(keepLead, body.length)) / rate, to: (at + Math.max(0, body.length - keepTrail)) / rate });
    at += body.length + (gaps[i] ?? 0);
  });
  // A seam fade on each cut edge, in case a clip's padding was not silent.
  const fade = samplesOf(rate, FADE_MS);
  let edge = lead;
  bodies.forEach((body, i) => {
    const n = Math.min(fade, Math.floor(body.length / 2));
    for (let k = 0; k < n; k++) {
      out[edge + k] = (out[edge + k] ?? 0) * (k / n);
      const back = edge + body.length - 1 - k;
      out[back] = (out[back] ?? 0) * (k / n);
    }
    edge += body.length + (gaps[i] ?? 0);
  });
  return { pcm: { rate, samples: out }, spans };
}
