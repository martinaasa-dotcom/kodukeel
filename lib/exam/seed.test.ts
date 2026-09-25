import { describe, expect, it } from "vitest";
import { freshSeed, seedIssuedAt } from "./seed";

const NOW = new Date("2026-09-25T12:00:00Z");

describe("a paper's seed", () => {
  it("carries the moment it was issued, to the millisecond", () => {
    const seed = freshSeed(NOW, () => 0.123456789);
    expect(seedIssuedAt(seed, NOW)?.getTime()).toBe(NOW.getTime());
  });

  it("reads a seed with no moment in it as none, which is the older reading", () => {
    expect(seedIssuedAt("suite", NOW)).toBeNull();
    expect(seedIssuedAt("k3j9x0a1", NOW)).toBeNull();
    expect(seedIssuedAt("containment-result", NOW)).toBeNull();
  });

  it("refuses a moment in the future, so a typed seed cannot pin to one", () => {
    const later = freshSeed(new Date(NOW.getTime() + 60_000), () => 0.5);
    expect(seedIssuedAt(later, NOW)).toBeNull();
  });

  it("refuses a moment before any paper here was sat", () => {
    expect(seedIssuedAt(`abc-${(1000).toString(36).padStart(6, "0")}`, NOW)).toBeNull();
  });

  it("stays short enough for a URL and inside the 64 the page accepts", () => {
    expect(freshSeed(NOW).length).toBeLessThanOrEqual(24);
  });
});
