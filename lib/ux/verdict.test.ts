import { describe, expect, it } from "vitest";
import {
  OPTION_CLASS, VERDICT_CLASS, VERDICT_INK, optionState, verdictLine, verdictOfCheck, verdictOfMark, verdictOfRating,
} from "./verdict";

/**
 * The vocabulary and the two readings into it. The classes are checked against
 * the stylesheet by `scripts/test-invariants.ts`; what is checked here is that
 * the readings land where the palette says they should.
 */
describe("the verdict vocabulary", () => {
  it("has three words and three option states, each with its own class", () => {
    expect(new Set(Object.values(VERDICT_CLASS)).size).toBe(3);
    expect(new Set(Object.values(OPTION_CLASS)).size).toBe(3);
    expect(Object.keys(VERDICT_INK).sort()).toEqual(Object.keys(VERDICT_CLASS).sort());
  });

  it("writes every verdict in an ink, never in a fill", () => {
    for (const ink of Object.values(VERDICT_INK)) expect(ink).toMatch(/-ink\)$/);
  });

  it("reads the four ratings as miss, nearly, recall, recall", () => {
    expect(verdictOfRating(1)).toBe("wrong");
    expect(verdictOfRating(2)).toBe("nearly");
    expect(verdictOfRating(3)).toBe("right");
    expect(verdictOfRating(4)).toBe("right");
  });

  it("reads a slip as nearly, the way countsAsRecalled does", () => {
    expect(verdictOfCheck({ verdict: "correct" })).toBe("right");
    expect(verdictOfCheck({ verdict: "diacritics" })).toBe("nearly");
    expect(verdictOfCheck({ verdict: "typo" })).toBe("nearly");
    expect(verdictOfCheck({ verdict: "form" })).toBe("nearly");
    expect(verdictOfCheck({ verdict: "wrong" })).toBe("wrong");
  });

  it("paints a miss most of the way there as nearly, and a far miss as missed", () => {
    expect(verdictOfCheck({ verdict: "wrong", close: true })).toBe("nearly");
    expect(verdictOfCheck({ verdict: "wrong", close: false })).toBe("wrong");
    expect(verdictOfMark({ right: false, rating: 1, close: true })).toBe("nearly");
    expect(verdictOfMark({ right: false, rating: 1 })).toBe("wrong");
    expect(verdictOfMark({ right: false, rating: 2 })).toBe("nearly");
    expect(verdictOfMark({ right: true, rating: 2 })).toBe("right");
  });

  it("lights the answer whoever pressed what", () => {
    expect(optionState(true, true)).toBe("right");
    expect(optionState(true, false)).toBe("right");
    expect(optionState(false, true)).toBe("wrong");
    expect(optionState(false, false)).toBe("other");
  });
});

describe("verdictLine", () => {
  it("says the verdict once where the note already opens on it", () => {
    expect(verdictLine("Not quite", "Not quite, it's “aadressini”")).toEqual({
      strong: "Not quite", rest: ", it's “aadressini”",
    });
  });

  it("leads with the head and a stop where the note opens some other way, or there is none", () => {
    expect(verdictLine("Nearly", "That is the seesütlev.")).toEqual({ strong: "Nearly.", rest: " That is the seesütlev." });
    expect(verdictLine("That's it", null)).toEqual({ strong: "That's it.", rest: "" });
  });
});
