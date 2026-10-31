import { describe, expect, it } from "vitest";
import { EMPTY_LEDGER, NAMES, teach } from "./ledger";
import { DERIVATION_SUFFIXES, WORK_OUT_OPTIONS, isDerivable, workOutProblems } from "./workOut";
import type { Taught, WorkOut } from "./types";

/**
 * WORK IT OUT IS ASKED ONLY OF A WORD WHOSE PARTS HAVE BEEN TAUGHT, AND THE
 * CHECK IS MECHANICAL OVER THE AUTHOR'S SPLIT (docs/43-lessons.md §13.6).
 * Each rule is asked both ways: the honest item passes, and the item broken
 * in exactly that one way names the fault.
 */
const ITEMS: Taught[] = [
  { kind: "word", et: "laps", en: "child" },
  { kind: "form", et: "laste", of: "laps", en: "of the children" },
  { kind: "word", et: "aed", en: "garden" },
  { kind: "form", et: "aia", of: "aed", en: "of the garden" },
  { kind: "word", et: "koht", en: "place" },
  { kind: "verb", et: "ehitama", first: "ehitan", en: "to build", firstEn: "I build" },
  { kind: "form", et: "ehita", of: "ehitama", en: "build (the stem)" },
  { kind: "word", et: "on", en: "is" },
  { kind: "word", et: "meie", en: "our" },
  { kind: "word", et: "tütrel", en: "the daughter has" },
  { kind: "word", et: "nüüd", en: "now" },
  { kind: "word", et: "hea", en: "good" },
];
const taught = teach(EMPTY_LEDGER, ITEMS, 1, ["present", "derivation"]);

const place: WorkOut = {
  sentence: { et: "Meie tütrel on nüüd lasteaiakoht.", en: "Our daughter has a kindergarten place now." },
  word: "lasteaiakoht",
  parts: ["laste", "aia", "koht"],
  means: "a place at a kindergarten",
  options: ["a place at a kindergarten", "a children's playground", "a garden shop"],
};
const builder: WorkOut = {
  sentence: { et: "Ehitaja on hea.", en: "The builder is good." },
  word: "Ehitaja",
  parts: ["Ehita", "ja"],
  means: "a builder",
  options: ["a builder", "a building", "to build"],
};

describe("work it out", () => {
  it("accepts a compound of taught spellings and a stem with a suffix of the derivation table", () => {
    expect(workOutProblems(place, taught, NAMES)).toEqual([]);
    expect(workOutProblems(builder, taught, NAMES)).toEqual([]);
    expect(isDerivable(place, taught)).toBe(true);
    expect(isDerivable(builder, taught)).toBe(true);
    expect(DERIVATION_SUFFIXES.has("ja")).toBe(true);
    expect(WORK_OUT_OPTIONS).toBe(3);
  });

  it("refuses it before the derivation pattern is explained", () => {
    const early = teach(EMPTY_LEDGER, ITEMS, 1, ["present"]);
    expect(workOutProblems(place, early, NAMES).join(" ")).toMatch(/before the derivation pattern/);
  });

  it("refuses a split that is not the word", () => {
    const off = { ...place, parts: ["laste", "aia", "kohad"] };
    expect(workOutProblems(off, taught, NAMES).join(" ")).toMatch(/are not "lasteaiakoht"/);
    expect(isDerivable(off, taught)).toBe(false);
  });

  it("refuses a part nobody has taught, in the middle or at the end", () => {
    const middle = { ...place, word: "lastemetsakoht", parts: ["laste", "metsa", "koht"], sentence: { ...place.sentence, et: "Meie tütrel on nüüd lastemetsakoht." } };
    expect(workOutProblems(middle, taught, NAMES).join(" ")).toMatch(/part "metsa" is not a taught spelling/);
    const end = { ...place, word: "lasteaiamaja", parts: ["laste", "aia", "maja"], sentence: { ...place.sentence, et: "Meie tütrel on nüüd lasteaiamaja." } };
    expect(workOutProblems(end, taught, NAMES).join(" ")).toMatch(/last part "maja" is neither a taught spelling nor a derivation suffix/);
    expect(isDerivable(middle, taught)).toBe(false);
    expect(isDerivable(end, taught)).toBe(false);
  });

  it("lets a suffix stand last only: a suffix in the middle is a part nobody taught", () => {
    const inside = { ...builder, word: "Ehitajakoht", parts: ["Ehita", "ja", "koht"], sentence: { et: "Ehitajakoht on hea.", en: "x" } };
    expect(workOutProblems(inside, taught, NAMES).join(" ")).toMatch(/part "ja" is not a taught spelling/);
  });

  it("refuses a word one part long, and a word that is taught already", () => {
    expect(workOutProblems({ ...place, word: "koht", parts: ["koht"], sentence: { ...place.sentence, et: "Meie tütrel on nüüd koht." } }, taught, NAMES).join(" "))
      .toMatch(/split into 1 part.*taught already/);
  });

  it("works out one word to a sentence: anything else untaught is refused, and so is the word standing twice or not at all", () => {
    const more = { ...place, sentence: { ...place.sentence, et: "Meie tütrel on nüüd uus lasteaiakoht." } };
    expect(workOutProblems(more, taught, NAMES).join(" ")).toMatch(/also uses uus/);
    const twice = { ...place, sentence: { ...place.sentence, et: "Meie tütrel on lasteaiakoht, nüüd hea lasteaiakoht." } };
    expect(workOutProblems(twice, taught, NAMES).join(" ")).toMatch(/stands 2 times/);
    const absent = { ...place, sentence: { ...place.sentence, et: "Meie tütrel on nüüd koht." } };
    expect(workOutProblems(absent, taught, NAMES).join(" ")).toMatch(/stands 0 times/);
  });

  it("asks three meanings, the right one among them once", () => {
    expect(workOutProblems({ ...place, options: ["a place at a kindergarten", "a garden shop"] }, taught, NAMES).join(" ")).toMatch(/has 2 options/);
    expect(workOutProblems({ ...place, options: ["a toy", "a children's playground", "a garden shop"] }, taught, NAMES).join(" ")).toMatch(/is not one of its options/);
    expect(workOutProblems({ ...place, options: ["a place at a kindergarten", "a garden shop", "a garden shop"] }, taught, NAMES).join(" ")).toMatch(/option twice/);
  });
});
