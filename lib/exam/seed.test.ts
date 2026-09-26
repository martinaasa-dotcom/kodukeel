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

describe("a numbered paper's seed", () => {
  it("round-trips a number and a part, and keeps the moment", async () => {
    const { numberedSeed, numberedOf, drawKeyOf, PAPERS_PER_LEVEL } = await import("./seed");
    const whole = numberedSeed(7, null, NOW);
    const reading = numberedSeed(7, "reading", NOW);
    expect(numberedOf(whole)).toEqual({ number: 7, part: null });
    expect(numberedOf(reading)).toEqual({ number: 7, part: "reading" });
    expect(seedIssuedAt(reading, NOW)?.getTime()).toBe(NOW.getTime());
    // What decides the questions is the number, not the moment or the part.
    expect(drawKeyOf(whole)).toBe("set-7");
    expect(drawKeyOf(numberedSeed(7, "speaking", new Date(NOW.getTime() - 86_400_000)))).toBe("set-7");
    expect(() => numberedSeed(0, null, NOW)).toThrow();
    expect(() => numberedSeed(PAPERS_PER_LEVEL + 1, null, NOW)).toThrow();
    expect(numberedOf(`p${PAPERS_PER_LEVEL + 1}-${NOW.getTime().toString(36)}`)).toBeNull();
  });

  it("leaves every random seed drawn on itself, as it always was", async () => {
    const { numberedOf, drawKeyOf } = await import("./seed");
    for (const seed of ["suite", "k3j9x0a1", "containment-result", freshSeed(NOW, () => 0.5)]) {
      expect(numberedOf(seed)).toBeNull();
      expect(drawKeyOf(seed)).toBe(seed);
    }
  });

  it("never issues a random seed that reads as a numbered one", async () => {
    const { numberedOf } = await import("./seed");
    // A draw that comes out as "p7" in base 36 is the one shape that could.
    const p7 = (parseInt("p7", 36) / 36 ** 2);
    const seed = freshSeed(NOW, () => p7);
    expect(numberedOf(seed)).toBeNull();
  });
});
