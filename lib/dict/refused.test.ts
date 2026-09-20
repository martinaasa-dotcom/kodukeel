import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import ENGLISH from "@/prisma/data/example-english.json";
import { parseExamples, serialiseExamples, usableExamples, mayFillEnglish } from "./examples";
import { REFUSED_SENTENCES, isRefusedSentence, refusalFor } from "./refused";
import { refusedSentenceCards } from "@/lib/srs/retire";
import { BLANK } from "@/lib/estonian/cloze";

const column = (sentences: string[]) =>
  JSON.stringify(sentences.map((et) => ({ et, en: "x", source: "EKILEX" })));

describe("a sentence somebody has refused", () => {
  it("is refused whatever spacing and case it reaches the column in", () => {
    expect(isRefusedSentence("Ega ma temaks ole.")).toBe(true);
    expect(isRefusedSentence("  ega  ma   temaks ole.  ")).toBe(true);
    expect(isRefusedSentence("Tema oskab kõike.")).toBe(false);
  });

  it("never comes out of the column, which is the gate every screen reads", () => {
    const read = parseExamples(column(["Ega ma temaks ole.", "Tema oskab kõike."]));
    expect(read.map((e) => e.et)).toEqual(["Tema oskab kõike."]);
  });

  it("is refused again on a list that never went through the column", () => {
    const fresh = [
      { et: "Ega ma temaks ole.", source: "EKILEX" as const },
      { et: "Tema oskab kõike.", source: "EKILEX" as const },
    ];
    expect(usableExamples(fresh).map((e) => e.et)).toEqual(["Tema oskab kõike."]);
  });

  it("carries a reason long enough to be one", () => {
    for (const entry of REFUSED_SENTENCES) {
      expect(entry.et.trim()).not.toBe("");
      expect(entry.why.trim().split(/\s+/).length).toBeGreaterThanOrEqual(6);
      expect(refusalFor(entry.et)?.why).toBe(entry.why);
    }
  });

  /*
    The harvest drops a refused usage on the way out, so this only holds until
    somebody re-harvests, and it is deliberately not a staleness check: an
    entry this file can no longer find in the shipped data is still a refusal,
    and requiring it to be deleted would hand the sentence back. What is
    checked is that nothing else ships an English line for one, since a line
    nobody may read is a line nobody is checking.
  */
  it("ships no English line", () => {
    const table: Record<string, string> = ENGLISH;
    for (const entry of REFUSED_SENTENCES) {
      expect(table[entry.et]).toBeUndefined();
    }
  });

  it("is the reason the harvested file is not edited by hand", () => {
    // The one in the file today, quoted so the next reader knows why the
    // generated data still carries a sentence no screen draws.
    const tema = HARVESTED.find((w) => w.lemma === "tema");
    expect(tema).toBeDefined();
    for (const usage of tema?.usages ?? []) {
      if (!isRefusedSentence(usage)) continue;
      expect(parseExamples(column([usage]))).toEqual([]);
    }
  });
});

describe("the cards already cut from one", () => {
  const card = (front: string, back: string) => ({
    id: "c1", ownerId: "o1", front, back, targetCase: "TRANSLATIVE",
    lexeme: { lemma: "tema" },
  });

  it("is named by the sentence put back together", () => {
    const named = refusedSentenceCards([card(`Ega ma ${BLANK} ole.`, "temaks")]);
    expect(named.map((r) => r.sentence)).toEqual(["Ega ma temaks ole."]);
  });

  it("is named where either of two accepted spellings fills the gap", () => {
    const named = refusedSentenceCards([card(`Ega ma ${BLANK} ole.`, "temasse / temaks")]);
    expect(named).toHaveLength(1);
  });

  it("leaves a card cut from a sentence nobody refused alone", () => {
    expect(refusedSentenceCards([card(`Tema oskab ${BLANK}.`, "kõike")])).toEqual([]);
  });

  it("leaves a bare ask alone, which is the third rule's to name", () => {
    expect(refusedSentenceCards([card("tema → kelleks?", "temaks")])).toEqual([]);
  });
});

describe("an English line a reviewer took off", () => {
  it("is told apart from one nobody has filled in yet", () => {
    expect(mayFillEnglish({ et: "a", source: "EKILEX" })).toBe(true);
    expect(mayFillEnglish({ et: "a", en: null, enRefused: true, source: "EKILEX" })).toBe(false);
    expect(mayFillEnglish({ et: "a", en: "b", source: "EKILEX" })).toBe(false);
  });

  it("survives being written back to the column", () => {
    const stored = serialiseExamples([{ et: "Tema oskab kõike.", en: null, enRefused: true, source: "EKILEX" }]);
    expect(parseExamples(stored)[0]?.enRefused).toBe(true);
  });
});
