import { describe, expect, it } from "vitest";
import { mergeNearby, nearbyEntries, NEARBY_LIMIT, shortGloss, type NearbyEntry } from "./nearby";

const entry = (lemma: string, translation: string, cefr: string | null = "A1", pos = "NOUN"): NearbyEntry =>
  ({ lemma, translation, pos, cefr });

/*
  A small dictionary carrying every shape the dead end has a rule for. Read
  against the shipped one while it was written (`championship`, `pois`,
  `houses`, `running`, `kohvimasin` and a dozen more), and these are the cases
  that went wrong on the way.
*/
const DICT: NearbyEntry[] = [
  entry("meistrivõistlused", "championships", "B2"),
  entry("võistlus", "competition (a contest)", "A2"),
  entry("maja", "house"),
  entry("hiir", "mouse"),
  entry("täi", "louse", "B1"),
  entry("hobune", "horse"),
  entry("jooksma", "to run", "A1", "VERB"),
  entry("ning", "and (joining the last of a list)", "A2", "CONJUNCTION"),
  entry("poiss", "boy"),
  entry("põis", "bladder", "B2"),
  entry("õis", "flower", "B1"),
  entry("köis", "rope", "B1"),
  entry("padi", "pillow, cushion"),
  entry("kohv", "coffee"),
  entry("masin", "machine"),
  entry("raamatukogu", "library"),
  entry("naine", "woman, wife"),
  entry("ilus", "beautiful"),
];

const lemmas = (query: string) => nearbyEntries(query, DICT).map((n) => n.lemma);

describe("nearbyEntries", () => {
  it("finds the plural gloss for the reported query", () => {
    const [first] = nearbyEntries("championship", DICT);
    expect(first).toEqual({ lemma: "meistrivõistlused", gloss: "championships", why: "english" });
  });

  it("offers only the English answer once there is one", () => {
    // `houses` is a letter from mouse, louse and horse; `running` ends on `ning`.
    expect(lemmas("houses")).toEqual(["maja"]);
    expect(lemmas("running")).toEqual(["jooksma"]);
  });

  it("forgives a slip in a long English word, never in a short one", () => {
    expect(lemmas("beatiful")).toContain("ilus");
    expect(lemmas("hause")).not.toContain("maja");
  });

  it("leads with what somebody who heard it would write", () => {
    // `pois` is one letter from õis and köis and is what `poiss` sounds like.
    const out = lemmas("pois");
    expect(out.indexOf("poiss")).toBeLessThan(out.indexOf("õis"));
    expect(out.indexOf("poiss")).toBeLessThan(out.indexOf("köis"));
    expect(lemmas("pati")[0]).toBe("padi");
  });

  it("forgives a letter dropped from a long word", () => {
    expect(lemmas("raamatukgu")[0]).toBe("raamatukogu");
  });

  it("offers the parts of a compound it has both ends of, the head first", () => {
    expect(lemmas("kohvimasin")).toEqual(["masin", "kohv"]);
    expect(lemmas("meistrivõistlus")).toContain("võistlus");
  });

  it("offers no first part for a string that merely starts like a word", () => {
    // `kohvxyzqwerty` starts with `kohv` and ends on nothing.
    expect(lemmas("kohvxyzqwerty")).toEqual([]);
  });

  it("offers nothing for a string nothing is near", () => {
    expect(nearbyEntries("kontrollimatusonaxyz", DICT)).toEqual([]);
  });

  it("never offers the query back", () => {
    expect(lemmas("poiss")).not.toContain("poiss");
  });

  it("is the same row every time, and no longer than the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(`pois${"ab"[i % 2]}${i}`, "x"));
    const a = nearbyEntries("pois", [...DICT, ...many]);
    const b = nearbyEntries("pois", [...many, ...DICT].reverse());
    expect(a).toEqual(b);
    expect(a.length).toBeLessThanOrEqual(NEARBY_LIMIT);
  });
});

describe("shortGloss and mergeNearby", () => {
  it("keeps two senses of a gloss", () => {
    expect(shortGloss("spouse, husband or wife, partner")).toBe("spouse, husband or wife");
  });

  it("merges in order, each lemma once", () => {
    const merged = mergeNearby([
      [{ lemma: "a", gloss: null, why: "translation" }],
      [{ lemma: "a", gloss: "x", why: "spelling" }, { lemma: "b", gloss: null, why: "spelling" }],
    ]);
    expect(merged.map((n) => [n.lemma, n.why])).toEqual([["a", "translation"], ["b", "spelling"]]);
  });
});
