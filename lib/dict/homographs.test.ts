import { describe, expect, it } from "vitest";
import DATA from "@/prisma/data/homographs.json";
import { homographCorpus } from "@/scripts/lib/homographCorpus";
import { HOMOGRAPHS, homographsFrom, lendable, sentenceKey } from "./homographs";

/*
  The reading is Vabamorf's and is built offline (`npm run homographs`), so
  what this file can hold is that it is current, that it reads the words that
  produced it the way it was built to, and that the rule over it refuses in
  the right direction.
*/
describe("the shipped homograph reading", () => {
  it("was built over the sentences the dictionary ships", () => {
    const corpus = homographCorpus();
    expect(
      DATA.corpus.digest,
      "the shipped sentences have moved since prisma/data/homographs.json was built: run `npm run homographs`",
    ).toBe(corpus.digest);
    expect(DATA.corpus.words).toBe(corpus.words.length);
  });

  it("knows the postpositions and the homographs that were being lent", () => {
    for (const spelling of ["jooksul", "otsas", "küljes", "kätte", "suhtes", "nimel", "õel", "veeres", "kahjuks"]) {
      expect(HOMOGRAPHS.spellings.has(spelling), spelling).toBe(true);
    }
  });

  it("leaves alone a form the language gives to one word", () => {
    for (const spelling of ["hommikul", "koju", "laual", "külas", "tööl", "turul"]) {
      expect(HOMOGRAPHS.spellings.has(spelling), spelling).toBe(false);
    }
  });

  it("reads a spelling in its own sentence", () => {
    expect(HOMOGRAPHS.reading("Aastasadade jooksul kujunenud kultuur.", "jooksul")).toEqual(["jooksul"]);
    expect(HOMOGRAPHS.reading("Õpin ülikoolis arstiks.", "arstiks")).toEqual(["arst"]);
    // A capital in the middle of a sentence is a name, so the town is not "kill!".
    expect(HOMOGRAPHS.reading("Rong väljub Tapa jaamast kell 12.00.", "tapa")).not.toContain("tapma");
    // And the first word's capital is not, so this is the forest and not the surname Mets.
    expect(HOMOGRAPHS.reading("Metsast saadavad hüved.", "metsast")).toEqual(["mets"]);
  });

  it("folds a verb's own participle into the verb", () => {
    // `mängivad` is "they play" and the plural of `mängiv`, and both are `mängima`.
    expect(HOMOGRAPHS.spellings.has("mängivad")).toBe(false);
  });
});

describe("lendable", () => {
  const homographs = homographsFrom({
    homographs: ["jooksul"],
    readings: { [`${sentenceKey("Aastasadade jooksul kujunenud kultuur.")}|jooksul`]: "jooksul" },
  });

  it("lends a spelling the language gives to one word", () => {
    expect(lendable(homographs, "Ta jooksis kiiresti.", "jooksis", "jooksma")).toBe(true);
  });

  it("lends an ambiguous spelling only to the word the sentence means", () => {
    expect(lendable(homographs, "Aastasadade jooksul kujunenud kultuur.", "jooksul", "jooks")).toBe(false);
    expect(lendable(homographs, "Aastasadade jooksul kujunenud kultuur.", "jooksul", "jooksul")).toBe(true);
  });

  it("refuses an ambiguous spelling in a sentence nobody read", () => {
    expect(lendable(homographs, "Võistluse jooksul sadas.", "jooksul", "jooks")).toBe(false);
  });
});

describe("sentenceKey", () => {
  it("is the same for a sentence however it is cased or padded", () => {
    expect(sentenceKey("  Aastasadade jooksul kujunenud kultuur. ")).toBe(sentenceKey("aastasadade JOOKSUL kujunenud kultuur."));
    expect(sentenceKey("Aastasadade jooksul kujunenud kultuur.")).toMatch(/^[0-9a-f]{12}$/);
    expect(sentenceKey("Ta võitis.")).not.toBe(sentenceKey("Ta võttis."));
  });
});
