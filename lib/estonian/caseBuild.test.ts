import { describe, expect, it } from "vitest";
import { DEMO_STEMS } from "@/lib/collections/demoWords";
import { toWalkWord } from "./caseBuild";
import type { CaseSubject } from "./caseQuestion";

const stems = (lemma: string) => DEMO_STEMS.find((w) => w.lemma === lemma)!;
const subject = (lemma: string): CaseSubject => {
  const w = stems(lemma);
  return { lemma: w.lemma, semanticTypes: w.semanticTypes, nomSg: w.nomSg };
};
const walk = (lemma: string, translation = "") =>
  toWalkWord(lemma, translation, stems(lemma), subject(lemma), []);

const rowFor = (lemma: string, key: string) =>
  walk(lemma).derived.find((f) => f.key === key)!;

describe("toWalkWord", () => {
  it("splits a word into the three that are stored and the eleven that follow", () => {
    const word = walk("raamat");
    expect(word.principal.map((p) => p.key))
      .toEqual(["NOMINATIVE", "GENITIVE", "PARTITIVE"]);
    expect(word.derived).toHaveLength(11);
    expect(word.genitive).toBe("raamatu");
  });

  it("calls a form regular only where the ending really reaches it", () => {
    // The screen lights the ending on these, so being wrong here would light
    // letters that are not an ending.
    const inessive = rowFor("raamat", "INESSIVE");
    expect(inessive.stored).toBe(false);
    expect(inessive.value).toBe("raamatus");
  });

  it("marks the one no ending reaches as the dictionary's own", () => {
    // `tuppa` is not `toa` plus `sse`, and the screen says so rather than
    // teaching `toasse` as the answer.
    const illative = rowFor("tuba", "ILLATIVE");
    expect(illative.value).toBe("tuppa");
    expect(illative.stored).toBe(true);
    expect(illative.alsoRight).toBe("toasse");
  });

  it("never asks the reader for a form no rule reaches", () => {
    // A question whose answer is stored is a question about memory rather
    // than about the pattern this screen is teaching.
    expect(rowFor("tuba", "ILLATIVE").askable).toBe(false);
    expect(rowFor("raamat", "INESSIVE").askable).toBe(true);
  });

  it("never asks a person where something is inside them", () => {
    // `mees` is a person, so Estonian puts it in the outside trio and
    // `caseFits` is the one reader of that. See lib/estonian/caseQuestion.ts.
    expect(rowFor("mees", "INESSIVE").askable).toBe(false);
    expect(rowFor("mees", "ELATIVE").askable).toBe(false);
    expect(rowFor("mees", "ILLATIVE").askable).toBe(false);
    expect(rowFor("mees", "ADESSIVE").askable).toBe(true);
    expect(rowFor("mees", "ALLATIVE").askable).toBe(true);
  });

  it("asks a person with the pronoun for a person", () => {
    expect(rowFor("mees", "ADESSIVE").question).toBe("kellel?");
    expect(rowFor("raamat", "ADESSIVE").question).toBe("millel?");
  });

  it("carries what the word means wearing each ending", () => {
    // The half a learner can cash in the moment the ending arrives. The
    // frames are lib/estonian/caseReading.ts; what is checked here is that a
    // row is handed one, and handed the reading for the kind of word it is.
    const row = (lemma: string, gloss: string, key: string) =>
      toWalkWord(lemma, gloss, stems(lemma), subject(lemma), [])
        .derived.find((f) => f.key === key)!;
    expect(row("raamat", "book", "ABLATIVE").reading).toBe("off the book");
    expect(row("mees", "man, husband", "ABLATIVE").reading).toBe("from the man");
    expect(row("mees", "man, husband", "INESSIVE").reading).toBeNull();
  });

  it("says nothing about meaning where the dictionary gave no gloss", () => {
    // The seeded stems carry no gloss, because a gloss invented beside them
    // would be the one authored column written by the wrong hand. The screen
    // prints nothing where there is nothing.
    expect(rowFor("raamat", "INESSIVE").reading).toBeNull();
  });

  it("never asks for one of the three that are stored", () => {
    for (const form of walk("raamat").principal) expect(form.askable).toBe(false);
  });

  it("lends a word its own sentence only where that sentence holds the form", () => {
    const word = toWalkWord("raamat", "book", stems("raamat"), subject("raamat"), [
      { et: "Ma loen raamatus olevat luuletust.", en: null, source: "EKILEX" },
      { et: "Tere!", en: null, source: "EKILEX" },
    ]);
    const inessive = word.derived.find((f) => f.key === "INESSIVE")!;
    expect(inessive.sentence?.et).toBe("Ma loen raamatus olevat luuletust.");
    expect(word.derived.find((f) => f.key === "COMITATIVE")?.sentence).toBeNull();
  });
});
