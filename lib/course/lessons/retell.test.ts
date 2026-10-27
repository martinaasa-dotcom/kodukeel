import { describe, expect, it } from "vitest";
import { pointsHeard } from "./retell";

describe("a retelling", () => {
  const retell = {
    points: [
      { en: "the roof", any: ["katus", "katuse"] },
      { en: "it was fixed", any: ["oli parandatud"] },
    ],
  };

  it("lights a point on any of its words, whole and in any case", () => {
    expect(pointsHeard(retell, "Katus oli katki.")).toEqual([true, false]);
    expect(pointsHeard(retell, "nad parandasid katuse ära")).toEqual([true, false]);
  });

  it("asks a phrase to stand together, and a word to be the whole word", () => {
    expect(pointsHeard(retell, "see oli juba parandatud")).toEqual([false, false]);
    expect(pointsHeard(retell, "katus oli parandatud")).toEqual([true, true]);
    expect(pointsHeard(retell, "katusel")).toEqual([false, false]);
  });
});
