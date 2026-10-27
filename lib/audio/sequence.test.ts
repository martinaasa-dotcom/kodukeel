import { describe, expect, it } from "vitest";
import { KEEP_LEAD_MS, KEEP_TRAIL_MS, pieceToLight, sequence } from "./sequence";
import { LEAD_MS, TRAIL_MS, trimSilence, type Pcm } from "./wav";

const RATE = 22_050;

/**
 * A clip shaped the way every native recording is: a tone, padded by
 * `trimSilence`. The tone sits on whole frames of the trim's own, so the trim
 * keeps no sliver of silence inside a frame the tone shares and the edges
 * below can be asserted to the sample rather than to a frame.
 */
const FRAME = Math.round(RATE / 100);
function letter(ms: number, hz = 220): Pcm {
  const n = Math.round((RATE * ms) / 1000 / FRAME) * FRAME;
  const from = 20 * FRAME;
  const raw = new Float32Array(from + n + 20 * FRAME);
  for (let i = 0; i < n; i++) raw[from + i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / RATE);
  return trimSilence({ rate: RATE, samples: raw });
}

/** Where sound is, as [first, last] sample indices of each run louder than a whisper. */
function soundRuns(samples: Float32Array): [number, number][] {
  const runs: [number, number][] = [];
  const quiet = Math.round(RATE * 0.03);
  let start = -1;
  let lastLoud = -1;
  samples.forEach((v, i) => {
    if (Math.abs(v) < 0.01) {
      if (start >= 0 && i - lastLoud > quiet) {
        runs.push([start, lastLoud]);
        start = -1;
      }
      return;
    }
    if (start < 0) start = i;
    lastLoud = i;
  });
  if (start >= 0) runs.push([start, lastLoud]);
  return runs;
}

describe("sequence", () => {
  const pieces = [
    { pcm: letter(300), gapAfterMs: 220 },
    { pcm: letter(250, 330), gapAfterMs: 650 },
    { pcm: letter(350, 440), gapAfterMs: 999 },
  ];
  const { pcm, spans } = sequence(pieces);
  const runs = soundRuns(pcm.samples);

  it("keeps every piece's sound, whole, in order", () => {
    expect(runs).toHaveLength(3);
    expect(spans).toHaveLength(3);
    const lengths = runs.map(([a, b]) => (b - a + 1) / RATE);
    [0.3, 0.25, 0.35].forEach((want, i) => expect(lengths[i]).toBeCloseTo(want, 2));
  });

  it("leaves the gap asked for between two sounds, plus each side's kept seam", () => {
    const gaps = runs.slice(1).map(([a], i) => (a - runs[i]![1]) / RATE);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toBeCloseTo((220 + KEEP_LEAD_MS + KEEP_TRAIL_MS) / 1000, 2);
    expect(gaps[1]).toBeCloseTo((650 + KEEP_LEAD_MS + KEEP_TRAIL_MS) / 1000, 2);
  });

  it("opens and closes on the ordinary padding, and the last gap is not written", () => {
    expect(runs[0]![0] / RATE).toBeCloseTo((LEAD_MS + KEEP_LEAD_MS) / 1000, 2);
    expect((pcm.samples.length - 1 - runs[2]![1]) / RATE).toBeCloseTo((TRAIL_MS + KEEP_TRAIL_MS) / 1000, 2);
  });

  it("says where each sound is, so a screen can light it", () => {
    spans.forEach((span, i) => {
      expect(span.from).toBeCloseTo(runs[i]![0] / RATE, 2);
      expect(span.to).toBeCloseTo(runs[i]![1] / RATE, 2);
    });
  });

  it("refuses pieces at two rates rather than playing one at the wrong speed", () => {
    expect(() => sequence([{ pcm: letter(100), gapAfterMs: 0 }, { pcm: { rate: 44_100, samples: new Float32Array(10) }, gapAfterMs: 0 }])).toThrow();
  });
});

describe("which letter is lit", () => {
  const spans = [{ from: 0.1, to: 0.4 }, { from: 0.5, to: 0.51 }, { from: 0.6, to: 0.9 }, { from: 1.0, to: 1.3 }];

  it("lights the letter the play position is inside, and nothing in a gap", () => {
    expect(pieceToLight(spans, 0.2, -1)).toBe(0);
    expect(pieceToLight(spans, 0.45, 0)).toBe(-1);
    expect(pieceToLight(spans, 0.7, 2)).toBe(2);
  });

  it("never skips a letter shorter than a frame", () => {
    // Frames at 0.2 and 0.7 straddle the second letter, which lasts 10ms.
    const order: number[] = [];
    let lit = -1;
    for (const now of [0.2, 0.7, 0.72, 1.1, 1.4]) {
      const index = pieceToLight(spans, now, lit);
      if (index > lit) lit = index;
      if (index >= 0 && order.at(-1) !== index) order.push(index);
    }
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it("catches up one letter a frame when several were missed", () => {
    expect(pieceToLight(spans, 1.1, -1)).toBe(0);
    expect(pieceToLight(spans, 1.1, 0)).toBe(1);
    expect(pieceToLight(spans, 1.1, 2)).toBe(3);
  });
});
