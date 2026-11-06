import { describe, expect, it } from "vitest";
import { nameAcross, nameSpelling, type EntryForms } from "./nameForm";

const nimi: EntryForms = {
  lemma: "nimi", pos: "NOUN",
  forms: [{ value: "nimi", formType: "NOM_SG" }, { value: "nime", formType: "GEN_SG" }, { value: "nime", formType: "PART_SG" }],
};
const raamat: EntryForms = {
  lemma: "raamat", pos: "NOUN",
  forms: [{ value: "raamat", formType: "NOM_SG" }, { value: "raamatu", formType: "GEN_SG" }, { value: "raamatut", formType: "PART_SG" }],
};
const kohtama: EntryForms = {
  lemma: "kohtama", pos: "VERB",
  forms: [{ value: "kohtama", formType: "INF_MA" }, { value: "kohtan", formType: "PRES_1SG" }, { value: "kohtasin", formType: "PAST_1SG" }],
};

describe("naming the form a question asks for", () => {
  it("names a spelling that is two cases at once as both, never one of them guessed", () => {
    const named = nameSpelling(nimi, "nime");
    expect(named?.en).toMatch(/^omastav \(.+\) or osastav \(.+\)$/);
    expect(named?.ru).toContain(" или ");
    expect(named?.uk).toContain(" або ");
  });

  it("names one case where only one spells it that way", () => {
    expect(nameSpelling(raamat, "raamatut")?.en).toMatch(/^osastav/);
    expect(nameSpelling(raamat, "raamatus")?.en).toMatch(/^seesütlev/);
  });

  it("names a verb's stored and derived persons", () => {
    expect(nameSpelling(kohtama, "kohtasin")?.en).toMatch(/^lihtminevik/);
    expect(nameSpelling(kohtama, "kohtab")?.en).toMatch(/^olevik/);
  });

  it("lets the question's own English choose among the cases the dictionary allows, and never add one", () => {
    expect(nameSpelling(nimi, "nime", "the name, as an object")?.en).toMatch(/^osastav/);
    expect(nameSpelling(nimi, "nime", "of the name")?.en).toMatch(/^omastav/);
    // "into" points at a case `nime` is not, so both it is stay named.
    expect(nameSpelling(nimi, "nime", "into the name")?.en).toMatch(/ or /);
  });

  it("names a plural case off the same table", () => {
    const withPlural: EntryForms = { ...raamat, forms: [...raamat.forms, { value: "raamatute", formType: "GEN_PL" }] };
    expect(nameSpelling(withPlural, "raamatutes")?.en).toMatch(/^mitmuse seesütlev/);
  });

  it("gives the headword and a spelling it cannot place no name", () => {
    expect(nameSpelling(nimi, "nimi")).toBeNull();
    expect(nameSpelling(nimi, "qqq")).toBeNull();
  });

  it("names nothing where two entries under one headword disagree", () => {
    const other: EntryForms = { lemma: "raamat", pos: "NOUN", forms: [{ value: "raamatut", formType: "GEN_SG" }] };
    expect(nameAcross([raamat], "raamatut")?.en).toMatch(/^osastav/);
    expect(nameAcross([raamat, other], "raamatut")).toBeNull();
  });
});
