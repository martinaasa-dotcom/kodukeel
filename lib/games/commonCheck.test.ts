import { describe, expect, it } from "vitest";
import {
  CHECK_TRIES, checkDirectionFrom, checkOutcome, checkOutcomeFrom, checkRangeFrom, checkRating, needsWorkFirst, toGoOver, wordsIn,
  type LastCheck,
} from "./commonCheck";

describe("checkRating", () => {
  it("keeps the marker's grade on the first go", () => {
    expect(checkRating(3, 0)).toBe(3);
    expect(checkRating(2, 0)).toBe(2);
  });

  it("is never better than Hard on the second go", () => {
    expect(checkRating(3, 1)).toBe(2);
    expect(checkRating(2, 1)).toBe(2);
    expect(checkRating(1, 1)).toBe(1);
  });

  it("gives a word two goes", () => {
    expect(CHECK_TRIES).toBe(2);
  });
});

describe("checkOutcome", () => {
  it("is right only for a clean hit first time", () => {
    expect(checkOutcome("correct", 0)).toBe("RIGHT");
    expect(checkOutcome("correct", 1)).toBe("NEARLY");
    expect(checkOutcome("diacritics", 0)).toBe("NEARLY");
    expect(checkOutcome("typo", 0)).toBe("NEARLY");
    expect(checkOutcome("wrong", 0)).toBe("MISSED");
    expect(checkOutcome("form", 0)).toBe("MISSED");
  });

  it("never lets the browser's count raise an outcome", () => {
    expect(checkOutcome("wrong", -5)).toBe("MISSED");
    expect(checkOutcome("diacritics", -5)).toBe("NEARLY");
  });
});

describe("reading stored values back", () => {
  it("takes only the values it writes", () => {
    expect(checkDirectionFrom("EN_ET")).toBe("EN_ET");
    expect(checkDirectionFrom("en-et")).toBeNull();
    expect(checkOutcomeFrom("MISSED")).toBe("MISSED");
    expect(checkOutcomeFrom("missed")).toBeNull();
    expect(checkOutcomeFrom(3)).toBeNull();
  });
});

describe("needsWorkFirst", () => {
  const last: Record<string, LastCheck | undefined> = {
    a: { outcome: "RIGHT", at: 300 },
    b: { outcome: "MISSED", at: 100 },
    c: undefined,
    d: { outcome: "NEARLY", at: 200 },
    e: { outcome: "RIGHT", at: 50 },
    f: { outcome: "MISSED", at: 400 },
  };

  it("puts misses, then near misses, then new words, then the oldest right ones", () => {
    const ordered = needsWorkFirst(["a", "b", "c", "d", "e", "f"], (w) => last[w]);
    expect(ordered).toEqual(["b", "f", "d", "c", "e", "a"]);
  });

  it("keeps every word", () => {
    const words = Object.keys(last);
    expect(needsWorkFirst(words, (w) => last[w]).sort()).toEqual([...words].sort());
  });

  it("calls a miss or a near miss one to go over, and nothing else", () => {
    expect(Object.keys(last).filter((w) => toGoOver(last[w]))).toEqual(["b", "d", "f"]);
  });
});

describe("the ranges", () => {
  const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
  const last = (w: string): LastCheck | undefined =>
    w === "w3" ? { outcome: "MISSED", at: 1 } : w === "w70" ? { outcome: "NEARLY", at: 1 } : w === "w4" ? { outcome: "RIGHT", at: 1 } : undefined;

  it("splits the hundred into the most common fifty and the next fifty", () => {
    expect(wordsIn("most", words, last)).toEqual(words.slice(0, 50));
    expect(wordsIn("next", words, last)).toEqual(words.slice(50));
    expect(wordsIn("all", words, last)).toEqual(words);
  });

  it("holds only the words to go over, from the whole list", () => {
    expect(wordsIn("missed", words, last)).toEqual(["w3", "w70"]);
  });

  it("reads a range off the address and nothing else", () => {
    expect(checkRangeFrom("next")).toBe("next");
    expect(checkRangeFrom(["missed"])).toBe("missed");
    expect(checkRangeFrom("1")).toBeNull();
  });
});
