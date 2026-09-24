import { describe, expect, it } from "vitest";
import { restoredEntry } from "./restoredEntry";
import { parseExamples } from "./examples";

const forged = {
  id: "lex-1",
  lemma: "blorptuba",
  pos: "NOUN",
  translation: "a made-up room",
  cefr: "A1",
  provenance: "EKILEX",
  ekilexWordId: 123,
  semanticTypes: "in_elukutse",
  definition: "Eesti keeles kirjutatud seletus.",
  examples: JSON.stringify([
    { et: "Blorptuba on väga suur ja ilus.", source: "EKILEX" },
    { et: "Me elame blorptoas koos.", en: "We live in it together.", source: "SEED" },
    { et: "Ma lähen blorptuppa kohe.", source: "EKILEX" },
  ]),
  forms: [
    { formType: "NOM_SG", value: "blorptuba" },
    { formType: "GEN_SG", value: "blorptoa" },
    { formType: "EKILEX:SgIn", value: "blorptoas", morphCode: "SgIn" },
    { formType: "NOM_SG", value: "blorptuba" },
  ],
};

describe("restoredEntry", () => {
  it("marks every restored sentence as the learner's own and caps them as addExample does", () => {
    const entry = restoredEntry(forged, "owner-1");
    const examples = parseExamples(entry!.lexeme.examples);
    expect(examples).toHaveLength(2);
    expect(examples.every((e) => e.source === "USER")).toBe(true);
  });

  it("keeps only principal parts, so no form claims to be Ekilex's", () => {
    const entry = restoredEntry(forged, "owner-1");
    expect(entry!.forms).toEqual([
      { formType: "NOM_SG", value: "blorptuba" },
      { formType: "GEN_SG", value: "blorptoa" },
    ]);
  });

  it("carries none of the Institute's columns, and is attributed to whoever restored it", () => {
    const entry = restoredEntry(forged, "owner-1")!;
    expect(Object.keys(entry.lexeme).sort()).toEqual([
      "cefr", "editedBy", "examples", "government", "gradation", "gradationNote",
      "id", "lemma", "pos", "provenance", "translation",
    ]);
    expect(entry.lexeme.provenance).toBe("USER");
    expect(entry.lexeme.editedBy).toBe("owner-1");
  });

  it("works the gradation out from the stems rather than reading it off the file", () => {
    const entry = restoredEntry({ ...forged, gradation: "NONE" }, "owner-1")!;
    expect(entry.lexeme.gradation).toBe("QUALITATIVE");
  });

  it("refuses a row that names no word", () => {
    expect(restoredEntry({ id: "x", pos: "NOUN" }, "o")).toBeNull();
    expect(restoredEntry({ lemma: "tuba", pos: "NOUN", translation: "room" }, "o")).toBeNull();
  });
});
