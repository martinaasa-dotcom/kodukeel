import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { fold } from "@/lib/estonian/fold";
import { formsOf } from "@/lib/scenes/lexicon";
import { ALWAYS_READ, checkSentence, type CheckEntry, type Finding } from "./sentenceCheck";

/*
  The course's own dictionary stands in for the database, and every form it
  holds stands in for the forms list, which is what the server hands the check.
*/
const ENTRIES: CheckEntry[] = HARVESTED.map((w) => ({
  lemma: w.lemma, pos: w.pos, cefr: w.cefr, parts: w.parts, extraForms: w.extraForms, usages: [],
  government: w.government, semanticTypes: w.semanticTypes.join(" "),
}));
const SPELLINGS = new Set(ENTRIES.flatMap((e) => formsOf(e)));
const exact = (word: string) => SPELLINGS.has(word);

/**
 * The entries a sentence needs, which is what the server reads: the headwords
 * of its words, a dropped diacritic folded the way the forms list folds it,
 * and the fixed few.
 */
function entriesFor(...texts: string[]): CheckEntry[] {
  const said = new Set(texts.flatMap((t) => (t.match(ESTONIAN_WORD) ?? []).map((w) => fold(w.toLowerCase()))));
  return ENTRIES.filter((e) => ALWAYS_READ.includes(e.lemma) || formsOf(e).some((f) => said.has(fold(f))));
}

function check(text: string, model = ""): readonly Finding[] {
  return checkSentence(text, entriesFor(text, model), exact, model).findings;
}

describe("checkSentence", () => {
  it("finds the object in the plain form, the reported sentence", () => {
    const findings = check("Tere! Ma soovin raamatukogukaart osta.", "Ma soovin raamatukogukaarti.");
    expect(findings).toEqual([
      { kind: "object", word: "raamatukogukaart", verb: "osta", partitive: "raamatukogukaarti", genitive: "raamatukogukaardi" },
    ]);
  });

  it("offers only the partitive where the verb's object is partitive, or the clause is negative", () => {
    const wants = check("Ma soovin raamatukogukaart.");
    expect(wants).toHaveLength(1);
    expect(wants[0]).toMatchObject({ kind: "object", genitive: null, partitive: "raamatukogukaarti" });
    const no = check("Ma ei osta raamatukogukaart.");
    expect(no[0]).toMatchObject({ kind: "object", genitive: null });
  });

  it("says nothing about correct sentences", () => {
    for (const text of [
      "Tere! Ma soovin raamatukogukaarti.",
      "Ma soovin raamatukogukaardi osta.",
      "Ma soovin raamatukogukaarti osta.",
      "Ma olen õpetaja.",
      "Mulle meeldib kohv.",
      "Ma ei tea.",
      "Ma tahan osta.",
      "Ma elan Tallinnas.",
      "Ma ootasin tund aega.",
      "Kas sa tuled homme?",
      "Tom elab Tartus.",
    ]) {
      expect(check(text), text).toEqual([]);
    }
  });

  it("finds a verb in the wrong person", () => {
    expect(check("Ma soovib kohvi.")).toEqual([{ kind: "person", word: "soovib", subject: "ma", right: "soovin" }]);
  });

  it("finds a person ending after ei", () => {
    expect(check("Ma ei soovin kohvi.")).toEqual([{ kind: "negative", word: "soovin", right: "soovi" }]);
  });

  it("finds the dictionary form where a person belongs", () => {
    expect(check("Ma tulema homme.")).toEqual([{ kind: "dictionaryForm", word: "tulema", subject: "ma", right: "tulen" }]);
  });

  it("finds the ma-infinitive after a verb that takes the da-infinitive", () => {
    expect(check("Ma tahan ostma kohvi.")).toEqual([{ kind: "infinitive", word: "ostma", after: "tahan", right: "osta" }]);
  });

  it("finds a misspelling and offers the word meant", () => {
    expect(check("Ma soovin raamatukogukaarri.", "Ma soovin raamatukogukaarti.")).toEqual([
      { kind: "spelling", word: "raamatukogukaarri", suggestion: "raamatukogukaarti", diacritics: false },
    ]);
    expect(check("Ma joon kohvi ja tee, aitah.")).toEqual([
      { kind: "spelling", word: "aitah", suggestion: "aitäh", diacritics: true },
    ]);
  });

  it("finds a noun in its plain form after a number or before a postposition", () => {
    expect(check("Ma soovin kaks kook.")).toEqual([{ kind: "count", word: "kook", after: "kaks", right: "kooki" }]);
    expect(check("Raamat on laud peal.")).toEqual([{ kind: "postposition", word: "laud", before: "peal", right: "laua" }]);
  });

  it("says the word needs an ending, and not which, where the verb records no object", () => {
    expect(check("Ma lähen pood.")).toEqual([{ kind: "object", word: "pood", verb: "lähen", partitive: null, genitive: null }]);
  });

  it("leaves alone what it cannot settle", () => {
    for (const text of [
      // A command takes its object in the plain form.
      "Osta raamat!",
      "Palun pane aken kinni.",
      // A second clause with a subject of its own.
      "Ma joon kohvi ja poiss joob teed.",
      // A time said in the plain form, and a number counted.
      "Ma ootan sind iga päev.",
      "Kokku kaks eurot.",
      "Kell on viis.",
      // A word in quotation marks is mentioned, not used.
      "Ma ei ütle „pool”.",
      // A pronoun compared rather than a subject.
      "Ta on sama pikk kui mina.",
    ]) {
      expect(check(text), text).toEqual([]);
    }
  });

  it("keeps the learner's capital on a suggestion", () => {
    expect(check("Aitah!")).toEqual([{ kind: "spelling", word: "Aitah", suggestion: "Aitäh", diacritics: true }]);
  });

  it("counts the words it read", () => {
    expect(checkSentence("Tere! Ma soovin kohvi.", entriesFor("Tere! Ma soovin kohvi."), exact).words).toBe(4);
  });
});
