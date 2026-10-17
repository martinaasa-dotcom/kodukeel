import { describe, expect, it } from "vitest";
import { splitChant, type ChantRow } from "./chant";
import { derivedVerbForms } from "@/lib/estonian/conjugate";
import { SUBJECT_PRONOUN } from "@/lib/scenes/lexicon";
import { shippedDictionary } from "@/scripts/lib/dictionary";

/*
  Real lines only: every form here is the dictionary's, either stored or
  derived off its stored first person by `derivedVerbForms`, and every pronoun
  is the dictionary's own nominative row. A chant typed out in this file would
  be this file writing Estonian (ADR-005).
*/
const DICTIONARY = shippedDictionary();

function entry(lemma: string) {
  const found = DICTIONARY.find((e) => e.lemma === lemma);
  if (!found) throw new Error(`${lemma} is not in the shipped dictionary`);
  return found;
}

/** The table's rows, first person first, each with every nominative spelling its pronoun has. */
const ROWS: ChantRow[] = Object.keys(SUBJECT_PRONOUN).map((lemma) => {
  const e = entry(lemma);
  const spellings = e.extraForms.filter((f) => f.code === "SgN" || f.code === "PlN").map((f) => f.value);
  return [...new Set([lemma, ...spellings])];
});
/** The short pronoun, which is how a class chants it. */
const SHORT = ROWS.map((row) => [...row].sort((a, b) => a.length - b.length)[0]!);

function present(lemma: string): string[] {
  const e = entry(lemma);
  const forms = derivedVerbForms({ lemma, pres1sg: e.parts.PRES_1SG });
  return ["IndPrSg1", "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3"].map(
    (code) => forms.find((f) => f.morphCode === code)!.value,
  );
}

describe("splitChant", () => {
  it("has a short and a long spelling for every person, read off the dictionary", () => {
    expect(ROWS).toHaveLength(6);
    for (const row of ROWS) expect(row.length).toBeGreaterThanOrEqual(2);
  });

  for (const verb of ["lugema", "tulema", "elama", "rääkima", "tegema"]) {
    it(`cuts a chant of ${verb} said with its pronouns into its rows`, () => {
      const forms = present(verb);
      const said = forms.map((form, i) => `${SHORT[i]} ${form}`).join(" ");
      expect(splitChant(said, ROWS)).toEqual(forms);
    });
  }

  it("reads the recognizer's own shape: capitals and commas", () => {
    const forms = present("lugema");
    const said = forms.map((form, i) => `${SHORT[i]} ${form}`).join(", ");
    expect(splitChant(said.charAt(0).toUpperCase() + said.slice(1) + ".", ROWS)).toEqual(forms);
  });

  it("puts a row said out of order where it belongs", () => {
    const forms = present("tulema");
    const order = [0, 2, 1, 3, 5, 4];
    const said = order.map((i) => `${SHORT[i]} ${forms[i]}`).join(" ");
    expect(splitChant(said, ROWS)).toEqual(forms);
  });

  it("leaves a row empty where its pronoun was not heard", () => {
    const forms = present("elama");
    const said = forms.map((form, i) => (i === 3 ? "" : `${SHORT[i]} ${form}`)).join(" ");
    const out = splitChant(said, ROWS);
    expect(out[3]).toBeNull();
    expect(out.filter((v) => v !== null)).toHaveLength(5);
  });

  it("reads the long pronouns too", () => {
    const forms = present("lugema");
    const said = forms.map((form, i) => `${Object.keys(SUBJECT_PRONOUN)[i]} ${form}`).join(" ");
    expect(splitChant(said, ROWS)).toEqual(forms);
  });

  it("reads a chant with no pronouns in order, one word a row", () => {
    const forms = present("rääkima");
    expect(splitChant(forms.join(" "), ROWS)).toEqual(forms);
  });

  it("fills nothing where a chant with no pronouns has the wrong number of words", () => {
    const forms = present("rääkima");
    const fewer = forms.slice(0, 5).join(" ");
    expect(splitChant(fewer, ROWS).every((v) => v === null)).toBe(true);
  });

  it("takes the later of a row said twice, which is a learner putting it right", () => {
    const forms = present("lugema");
    const said = `${SHORT[1]} ${forms[0]} ${SHORT[1]} ${forms[1]}`;
    expect(splitChant(said, ROWS)[1]).toBe(forms[1]);
  });

  it("hears nothing in nothing", () => {
    expect(splitChant("", ROWS).every((v) => v === null)).toBe(true);
  });
});
