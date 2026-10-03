import { describe, expect, it } from "vitest";

import { stemsFromParts } from "@/lib/estonian/derive";
import { caseIndex } from "@/lib/estonian/whichCase";
import type { Example } from "./examples";
import { recordsCase } from "./recorded";

const kool = caseIndex(stemsFromParts({
  NOM_SG: "kool", GEN_SG: "kooli", PART_SG: "kooli", ILL_SG_SHORT: "kooli",
}));
const said = (et: string, via?: string[]): Example => ({ et, source: "EKILEX", ...(via ? { via } : {}) });

describe("recordsCase", () => {
  it("takes a sentence holding the form", () => {
    expect(recordsCase(kool, "INESSIVE", ["koolis"], [said("Laps on koolis.")], [])).toBe(true);
    expect(recordsCase(kool, "ILLATIVE", ["kooli", "koolisse"], [said("Ta läks koolisse.")], [])).toBe(true);
  });

  it("does not take a spelling the word wears in another case too", () => {
    // `kooli` is the genitive and the partitive as well as the short illative,
    // so a sentence using it records nothing about "into the school".
    expect(recordsCase(kool, "ILLATIVE", ["kooli", "koolisse"], [said("Kooli direktor tuli.")], [])).toBe(false);
  });

  it("takes a loan only on the spelling it was lent for", () => {
    const loan = said("Kõik koolis olid väsinud ja koolist läks igaüks koju.", ["koolist"]);
    expect(recordsCase(kool, "ELATIVE", ["koolist"], [], [loan])).toBe(true);
    expect(recordsCase(kool, "INESSIVE", ["koolis"], [], [loan])).toBe(false);
  });

  it("takes nothing from no sentences", () => {
    expect(recordsCase(kool, "INESSIVE", ["koolis"], [], [])).toBe(false);
  });
});
