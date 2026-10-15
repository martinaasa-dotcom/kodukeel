import { describe, expect, it } from "vitest";
import { englishMatch, englishVariants, glossHeads, looksEnglish, normaliseEnglish } from "./english";

describe("englishVariants", () => {
  it.each([
    // The reported query: Ekilex files the word as a plural, so the gloss is.
    ["championship", "championships"],
    ["championships", "championship"],
    ["houses", "house"],
    ["cities", "city"],
    ["city", "cities"],
    ["boxes", "box"],
    ["churches", "church"],
    ["people", "person"],
    ["children", "child"],
    ["running", "run"],
    ["swimming", "swim"],
    ["liked", "like"],
    ["hoping", "hope"],
    ["studied", "study"],
    ["colour", "color"],
    ["color", "colour"],
    ["organise", "organize"],
    ["centre", "center"],
  ])("reads %s as also %s", (query, shape) => {
    expect(englishVariants(query)).toContain(shape);
  });

  it("puts the query first, as typed", () => {
    expect(englishVariants("To Run")[0]).toBe("run");
  });

  it("does not strip an s that is not a plural", () => {
    expect(englishVariants("glass")).not.toContain("glas");
    expect(englishVariants("bus")).not.toContain("bu");
    expect(englishVariants("news")).not.toContain("new");
  });

  it("inflects the last word of a phrase and keeps the rest", () => {
    expect(englishVariants("post offices")).toContain("post office");
  });
});

describe("normaliseEnglish and looksEnglish", () => {
  it("drops the article and the infinitive marker", () => {
    expect(normaliseEnglish("  To   Swim ")).toBe("swim");
    expect(normaliseEnglish("a house")).toBe("house");
  });

  it("reads an Estonian letter as not English", () => {
    expect(looksEnglish("championship")).toBe(true);
    expect(looksEnglish("sõna")).toBe(false);
    expect(looksEnglish("x")).toBe(false);
  });
});

describe("englishMatch", () => {
  it("finds the plural gloss from the singular query, and the other way round", () => {
    expect(englishMatch("championship", "championships")).toBe("first");
    expect(englishMatch("championships", "championship")).toBe("first");
  });

  it("says whether it was the sense the entry leads with", () => {
    expect(englishMatch("wives", "woman, wife")).toBe("later");
    expect(englishMatch("running", "to run")).toBe("first");
  });

  it("matches whole senses, not words inside them", () => {
    // "house" is inside "lighthouse" and "a house of cards"; neither is the word.
    expect(englishMatch("house", "lighthouse")).toBeNull();
    expect(englishMatch("cat", "category")).toBeNull();
  });

  it("reads a gloss's senses past slashes, qualifiers and articles", () => {
    expect(glossHeads("color/colour")).toEqual(["color", "colour"]);
    expect(glossHeads("competition (a contest)")).toEqual(["competition"]);
    expect(glossHeads("a run")).toEqual(["run"]);
  });
});
