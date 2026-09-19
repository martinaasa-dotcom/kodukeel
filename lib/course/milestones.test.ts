import { describe, expect, it } from "vitest";

import { ladderWordsAt, wordsLeftAt } from "./milestones";

describe("how far the next stop is", () => {
  /*
    The weekly letter printed `total - known` under a sentence saying how far
    the *next stop* is, so somebody at A1 aiming for B1 read the distance to B1
    beside the word A2. The letter's whole value is that its numbers are
    specific and true, so a number that is confidently wrong is worse there
    than on a chart somebody can squint at.
  */
  it("counts what is left of that stop, not what is left of the climb", () => {
    const half = wordsLeftAt({ level: "A1", pct: 50, state: "here" });
    expect(half).toBe(Math.ceil(ladderWordsAt("A1") / 2));
    // And it is a fact about A1 alone: aiming further does not change it.
    expect(half).toBeLessThan(ladderWordsAt("A1") + ladderWordsAt("A2"));
  });

  it("is nought for a stop already behind them", () => {
    expect(wordsLeftAt({ level: "A1", pct: 100, state: "passed" })).toBe(0);
  });

  it("never says a stop they have not reached is nought words away", () => {
    // Rounding is what makes this reachable: 99.9 percent of a level floors to
    // zero, and "0 words away" from a stop that has not arrived reads as a bug.
    expect(wordsLeftAt({ level: "A1", pct: 99.99, state: "here" })).toBeGreaterThanOrEqual(1);
    expect(wordsLeftAt({ level: "A1", pct: 0, state: "ahead" })).toBe(ladderWordsAt("A1"));
  });
});
