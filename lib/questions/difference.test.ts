import { describe, expect, it } from "vitest";

import { registerContrast } from "./difference";

// The dictionary's own claim of which spelling is which pronoun, the way
// `pronounSpellings` reads it off the stored forms. Spellings stand in for the
// real ones so this file stays free of Estonian letters it does not need.
const SPELLINGS = new Map([
  ["sa", "sina"], ["sina", "sina"], ["sul", "sina"],
  ["te", "teie"], ["teie", "teie"], ["teil", "teie"],
  ["ma", "mina"], ["me", "meie"],
]);
const pronounOf = (s: string) => SPELLINGS.get(s) ?? null;

describe("registerContrast", () => {
  it("names the informal and the polite you where that is all that differs", () => {
    const pair = registerContrast("kas sa raagid inglise keelt?", "kas te raagite inglise keelt?", pronounOf);
    expect(pair).toEqual([
      { spelling: "sa", register: "informal" },
      { spelling: "te", register: "polite" },
    ]);
  });

  it("reads either way round", () => {
    const pair = registerContrast("Kas teil on aega?", "Kas sul on aega?", pronounOf);
    expect(pair?.map((n) => n.register)).toEqual(["polite", "informal"]);
  });

  it("says nothing where the two use the same you", () => {
    expect(registerContrast("kas sa tuled", "kas sina tuled", pronounOf)).toBeNull();
  });

  it("says nothing where the words that differ are not a you", () => {
    expect(registerContrast("ma tulen", "me tuleme", pronounOf)).toBeNull();
    expect(registerContrast("aitah", "tanan", pronounOf)).toBeNull();
  });

  it("says nothing where only one side names a you", () => {
    expect(registerContrast("kas sa tuled", "kas tuled", pronounOf)).toBeNull();
  });
});
