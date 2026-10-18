import { describe, expect, it } from "vitest";
import { barsPerSecond, speechFrames, speechOnly, waveBars } from "./waveBars";

const RATE = 16_000;

/** Silence, a tone, silence: seconds of each. */
function turn(before: number, speech: number, after: number, level = 0.5): Float32Array {
  const out = new Float32Array(Math.round((before + speech + after) * RATE));
  const from = Math.round(before * RATE);
  const to = from + Math.round(speech * RATE);
  for (let i = from; i < to; i++) out[i] = level * Math.sin((2 * Math.PI * 220 * i) / RATE);
  return out;
}

describe("waveBars", () => {
  it("draws the speech and leaves the silence round it out", () => {
    const bars = waveBars(turn(0.5, 1, 2), RATE, 10)!;
    expect(bars.start).toBeCloseTo(0.5, 1);
    expect(bars.seconds).toBeCloseTo(1, 1);
    expect(bars.bars).toHaveLength(10);
    for (const h of bars.bars) expect(h).toBeGreaterThan(0.9);
  });

  it("puts a slower turn on a longer row at the same scale", () => {
    const short = waveBars(turn(0, 1, 0), RATE, 12)!;
    const long = waveBars(turn(0, 2, 0), RATE, 12)!;
    expect(long.bars.length).toBe(short.bars.length * 2);
  });

  it("keeps a quiet slice a mark rather than a gap", () => {
    const samples = turn(0, 1, 0);
    for (let i = 0; i < RATE / 2; i++) samples[i]! *= 0.1;
    const bars = waveBars(samples, RATE, 10)!;
    expect(Math.min(...bars.bars)).toBeGreaterThanOrEqual(0.12);
  });

  it("has nothing to draw where nothing was said", () => {
    expect(waveBars(new Float32Array(RATE), RATE, 10)).toBeNull();
    expect(speechFrames(new Float32Array(0), RATE)).toBeNull();
  });
});

describe("barsPerSecond", () => {
  it("keeps the longer of two voices inside the most bars there is room for", () => {
    expect(barsPerSecond([1, 4], 26)).toBeCloseTo(6.5);
    expect(barsPerSecond([0.5, 1], 26)).toBe(22);
    expect(barsPerSecond([0, 0], 26)).toBe(22);
  });
});

describe("speechOnly", () => {
  it("cuts the room after the last word down to a breath and keeps the speech whole", () => {
    const trimmed = speechOnly(turn(1, 1, 3), RATE);
    expect(trimmed.length / RATE).toBeCloseTo(0.15 + 1 + 0.3, 1);
    const kept = waveBars(trimmed, RATE, 10)!;
    expect(kept.seconds).toBeCloseTo(1, 1);
  });

  it("keeps a quiet ending a drawing would leave out", () => {
    const samples = turn(0.5, 1, 2);
    // A word-final s: a fifth of a second at a twentieth of the loudest.
    for (let i = Math.round(1.5 * RATE); i < Math.round(1.7 * RATE); i++) samples[i] = 0.025 * Math.sin(i);
    const trimmed = speechOnly(samples, RATE);
    expect(trimmed.length / RATE).toBeGreaterThan(0.15 + 1.2 + 0.25);
  });

  it("hands back a turn with nothing in it as it was", () => {
    const quiet = new Float32Array(RATE);
    expect(speechOnly(quiet, RATE)).toBe(quiet);
  });
});
