import { describe, expect, it } from "vitest";
import { AUTOPLAY_MAX_SECONDS, mayAutoplay, wavSeconds } from "./clip";
import { encodeWav16 } from "./wav";

const clip = (seconds: number, rate = 22050) => encodeWav16({ rate, samples: new Float32Array(Math.round(seconds * rate)) });

describe("a clip nobody asked for (WCAG 1.4.2)", () => {
  it("reads a clip's length off its own samples", () => {
    expect(wavSeconds(clip(1.5))).toBeCloseTo(1.5, 3);
    expect(wavSeconds(clip(2, 44100))).toBeCloseTo(2, 3);
  });

  it("plays on its own only under three seconds", () => {
    expect(AUTOPLAY_MAX_SECONDS).toBe(3);
    expect(mayAutoplay(wavSeconds(clip(0.6)))).toBe(true);
    expect(mayAutoplay(wavSeconds(clip(2.9)))).toBe(true);
    expect(mayAutoplay(wavSeconds(clip(3)))).toBe(false);
    expect(mayAutoplay(wavSeconds(clip(4.2)))).toBe(false);
  });

  it("waits for a press where the length cannot be read", () => {
    expect(wavSeconds(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(mayAutoplay(null)).toBe(false);
  });
});
