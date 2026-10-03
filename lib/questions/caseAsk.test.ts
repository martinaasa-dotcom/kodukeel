import { describe, expect, it } from "vitest";
import { caseAskFor, type CaseAskWord } from "./caseAsk";

const house: CaseAskWord = {
  lemma: "maja",
  translation: "house",
  semanticTypes: "koht_hoone",
  forms: [
    { formType: "NOM_SG", morphCode: null, value: "maja" },
    { formType: "GEN_SG", morphCode: null, value: "maja" },
    { formType: "PART_SG", morphCode: null, value: "maja" },
  ],
};

const always = () => 0;

describe("a case ask for a word card inside the module", () => {
  it("asks a case the module has read, by what it means", () => {
    const ask = caseAskFor(house, ["INESSIVE"], null, 0.5, always)!;
    expect(ask.caseKey).toBe("INESSIVE");
    expect(ask.ask).toContain("in the house");
    expect(ask.answer).toBe("majas");
  });

  it("asks nothing where no case has been read, and never a case that has not", () => {
    expect(caseAskFor(house, [], null, 0.5, always)).toBeNull();
    for (let i = 0; i < 20; i++) {
      const ask = caseAskFor(house, ["INESSIVE", "ELATIVE"], null, 0.5, () => (i % 10) / 10)!;
      expect(["INESSIVE", "ELATIVE"]).toContain(ask.caseKey);
    }
  });

  it("leads with tonight's case on the share it is given, and not otherwise", () => {
    expect(caseAskFor(house, ["INESSIVE", "ELATIVE"], "ELATIVE", 0.5, always)!.caseKey).toBe("ELATIVE");
    expect(caseAskFor(house, ["INESSIVE", "ELATIVE"], "ELATIVE", 0, always)!.caseKey).toBe("INESSIVE");
  });

  it("never asks a form spelled like the word itself", () => {
    // `kallis` has the genitive `kalli`, so its seesütlev is the word again.
    const dear: CaseAskWord = {
      lemma: "kallis", translation: "dear", semanticTypes: null,
      forms: [
        { formType: "NOM_SG", morphCode: null, value: "kallis" },
        { formType: "GEN_SG", morphCode: null, value: "kalli" },
        { formType: "PART_SG", morphCode: null, value: "kallist" },
      ],
    };
    expect(caseAskFor(dear, ["INESSIVE"], null, 0.5, always)).toBeNull();
  });

  it("does not put a person in the inside cases", () => {
    const man: CaseAskWord = {
      lemma: "mees", translation: "man", semanticTypes: "inimene",
      forms: [
        { formType: "NOM_SG", morphCode: null, value: "mees" },
        { formType: "GEN_SG", morphCode: null, value: "mehe" },
        { formType: "PART_SG", morphCode: null, value: "meest" },
      ],
    };
    expect(caseAskFor(man, ["INESSIVE"], null, 0.5, always)).toBeNull();
    expect(caseAskFor(man, ["ADESSIVE"], null, 0.5, always)?.answer).toBe("mehel");
  });

  it("asks no place case of a word the dictionary has not said is a being or a thing", () => {
    // Taught as "acquaintance", classified by the adjective's sense.
    const acquaintance: CaseAskWord = {
      lemma: "tuttav", translation: "acquaintance", semanticTypes: "omadus",
      forms: [
        { formType: "NOM_SG", morphCode: null, value: "tuttav" },
        { formType: "GEN_SG", morphCode: null, value: "tuttava" },
        { formType: "PART_SG", morphCode: null, value: "tuttavat" },
      ],
    };
    expect(caseAskFor(acquaintance, ["INESSIVE", "ADESSIVE"], null, 0.5, always)).toBeNull();
    expect(caseAskFor({ ...acquaintance, semanticTypes: null }, ["INESSIVE"], null, 0.5, always)).toBeNull();
    expect(caseAskFor(acquaintance, ["COMITATIVE"], null, 0.5, always)?.answer).toBe("tuttavaga");
  });
});
