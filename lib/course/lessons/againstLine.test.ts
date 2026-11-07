import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { fold } from "@/lib/estonian/fold";
import { formsOf } from "@/lib/scenes/lexicon";
import { type CheckEntry } from "./sentenceCheck";
import { againstLine, gradeOf, type LineAsk } from "./againstLine";

/* The course's own dictionary stands in for the database, as in `sentenceCheck.test.ts`. */
const ENTRIES: CheckEntry[] = HARVESTED.map((w) => ({
  lemma: w.lemma, pos: w.pos, cefr: w.cefr, parts: w.parts, extraForms: w.extraForms, usages: [],
  government: w.government, semanticTypes: w.semanticTypes.join(" "),
}));
const GLOSSES = new Map(HARVESTED.map((w) => [w.lemma, w.gloss] as const));

function entriesFor(...texts: string[]): CheckEntry[] {
  const said = new Set(texts.flatMap((t) => (t.match(ESTONIAN_WORD) ?? []).map((w) => fold(w.toLowerCase()))));
  return ENTRIES.filter((e) => formsOf(e).some((f) => said.has(fold(f))));
}

function compare(typed: string, line: string, more: Partial<LineAsk> = {}) {
  return againstLine(typed, { lines: [line], ownDetails: false, ...more }, entriesFor(typed, line, ...(more.lines ?? [])), GLOSSES).differences;
}

describe("againstLine", () => {
  it("names the tense where the verb is the line's in another time (the reported card)", () => {
    const d = compare("Ma koristan kööki", "Ma koristasin kööki.", { ownDetails: true });
    expect(d).toEqual([expect.objectContaining({ kind: "form", word: "koristan", right: "koristasin", axes: ["tense"] })]);
  });

  it("names a small word swapped for another (the reported card)", () => {
    const d = compare("Ma lugesin raamatu ära", "Ma lugesin raamatu läbi.", { ownDetails: true });
    expect(d).toEqual([expect.objectContaining({ kind: "swap", word: "ära", right: "läbi" })]);
  });

  it("names the object's ending, whole thing or still going", () => {
    const d = compare("Ma koristasin köögi", "Ma koristasin kööki.");
    expect(d).toEqual([expect.objectContaining({ kind: "form", word: "köögi", right: "kööki", axes: ["case"] })]);
  });

  it("names a no the line does not have, and a no left out", () => {
    expect(compare("Ma ei koristanud kööki", "Ma koristasin kööki.")).toContainEqual(expect.objectContaining({ kind: "negation", youSaidNo: true }));
    expect(compare("Ma koristasin kööki", "Ma ei koristanud kööki.")).toContainEqual(expect.objectContaining({ kind: "negation", youSaidNo: false }));
  });

  it("says nothing where the answer is the line, an alternative, or drops the pronoun", () => {
    expect(compare("Ma koristasin kööki.", "Ma koristasin kööki.")).toEqual([]);
    expect(compare("Koristasin kööki", "Ma koristasin kööki.")).toEqual([]);
    expect(compare("Lugesin selle läbi", "Ma lugesin raamatu läbi.", { lines: ["Ma lugesin raamatu läbi.", "Lugesin selle läbi."] })).toEqual([]);
  });

  it("lets a learner's own noun stand on a card about them, and reads its case", () => {
    expect(compare("Ma koristasin tuba", "Ma koristasin kööki.", { ownDetails: true })).toEqual([]);
    expect(compare("Ma koristasin toa ära", "Ma koristasin köögi ära.", { ownDetails: true })).toEqual([]);
  });

  it("reads a story told back about somebody else in the third person", () => {
    const told = againstLine("Ta parandas autot", { lines: ["Eile hommikul parandasin ma autot."], ownDetails: false, aboutThem: true }, entriesFor("Ta parandas autot", "Eile hommikul parandasin ma autot."), GLOSSES);
    expect(told.differences.filter((d) => d.kind === "form" || d.kind === "person")).toEqual([]);
    const mine = againstLine("Ma parandasin autot", { lines: ["Eile hommikul parandasin ma autot."], ownDetails: false, aboutThem: true }, entriesFor("Ma parandasin autot", "Eile hommikul parandasin ma autot."), GLOSSES);
    expect(mine.differences).toContainEqual(expect.objectContaining({ kind: "person", word: "ma", right: "ta" }));
  });

  it("grades in four steps", () => {
    expect(gradeOf([], [], 3)).toBe("right");
    expect(gradeOf([{ kind: "synonym", word: "a", right: "b" }], [], 3)).toBe("right");
    expect(gradeOf([{ kind: "missing", right: "x", meant: null }], [], 3)).toBe("asked");
    expect(gradeOf([], [{ kind: "person" }], 3)).toBe("slip");
    expect(gradeOf([], [{ kind: "spelling" }, { kind: "spelling" }], 3)).toBe("unclear");
  });
});

describe("nearestLine and toldSentences", () => {
  it("finds the story line a sentence is about", async () => {
    const { nearestLine, toldSentences } = await import("./againstLine");
    const story = ["Eile hommikul parandasin ma autot.", "Auto on ikka veel katki.", "Aga õhtul lugesin ma raamatu läbi."];
    const entries = entriesFor(...story, "Ta luges raamatu läbi");
    expect(nearestLine("Ta luges raamatu läbi", story, entries)).toBe(2);
    expect(nearestLine("Tere", story, entries)).toBeNull();
    expect(toldSentences("Ta parandas autot. Õhtul luges ta raamatu läbi!\nHomme koristavad nad")).toHaveLength(3);
  });
});
