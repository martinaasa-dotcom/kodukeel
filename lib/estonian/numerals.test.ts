import { describe, expect, it } from "vitest";
import { headwordsOfExactForm } from "@/lib/dict/forms";
import { cardinal, ordinal, ordinalParts, said, type NumeralCase } from "./numerals";

/*
  THE CHECK THAT MAKES THE RULE SAFE (ADR-005 amendment 8).

  Every number from 1 to 2100, in every form the number endings mode uses,
  and each word of each form asked of the shipped forms list (Ekilex and
  Vabamorf, guessing off): is this spelling a form of the headword it is
  meant to be? A cardinal's words are lined up with its plain words, so
  `kahekümnel` has to be a form of `kakskümmend`; an ordinal's last word with
  the plain ordinal, so `teisel` has to be a form of `teine` and
  `kahetuhandendal` of `kahetuhandes`.
*/

const TOP = 2100;
const CARDINAL_CASES: readonly NumeralCase[] = ["GEN", "ADE", "ELA", "TER"];
const ORDINAL_CASES: readonly NumeralCase[] = ["NOM", "GEN", "ADE", "ELA", "TRA"];

const cache = new Map<string, string[]>();
async function headwords(word: string): Promise<string[]> {
  const hit = cache.get(word);
  if (hit) return hit;
  const found = await headwordsOfExactForm(word);
  cache.set(word, found);
  return found;
}

async function expectFormOf(word: string, headword: string, where: string): Promise<void> {
  const found = await headwords(word);
  expect(found, `${where}: "${word}" is not a form of "${headword}" in the forms list (found: ${found.join(", ") || "nothing"})`)
    .toContain(headword);
}

describe("the forms a number takes", () => {
  it("say the examples a course gives, word for word", () => {
    expect(said(cardinal(17, "NOM"))).toBe("seitseteist");
    expect(said(cardinal(17, "GEN"))).toBe("seitsmeteistkümne");
    expect(said(ordinal(17, "ADE"))).toBe("seitsmeteistkümnendal");
    expect(said(ordinal(1992, "ADE"))).toBe("tuhande üheksasaja üheksakümne teisel");
    expect(said(ordinal(1992, "ELA"))).toBe("tuhande üheksasaja üheksakümne teisest");
    expect(said(ordinal(1992, "GEN"))).toBe("tuhande üheksasaja üheksakümne teise");
    expect(said(ordinal(1992, "TRA"))).toBe("tuhande üheksasaja üheksakümne teiseks");
    expect(said(cardinal(1992, "NOM"))).toBe("tuhat üheksasada üheksakümmend kaks");
    expect(said(ordinal(2000, "ADE"))).toBe("kahetuhandendal");
    expect(said(ordinal(2024, "ADE"))).toBe("kahe tuhande kahekümne neljandal");
    expect(said(ordinal(1900, "ADE"))).toBe("tuhande üheksasajandal");
    expect(said(ordinal(21, "ADE"))).toBe("kahekümne esimesel");
    expect(said(ordinal(3, "ADE"))).toBe("kolmandal");
    expect(said(ordinal(90, "ADE", "pl"))).toBe("üheksakümnendatel");
    expect(said(cardinal(3, "TER"))).toBe("kolmeni");
    expect(said(cardinal(25, "TER"))).toBe("kahekümne viieni");
    expect(said(cardinal(25, "ADE"))).toBe("kahekümnel viiel");
  });

  it("lay a year out as the chips the round offers, plain beside needed", () => {
    expect(ordinalParts(1992, "ADE")).toEqual([
      { plain: "tuhat", needed: "tuhande" },
      { plain: "üheksasada", needed: "üheksasaja" },
      { plain: "üheksakümmend", needed: "üheksakümne" },
      { plain: "kaks", needed: "teisel" },
    ]);
    expect(ordinalParts(2000, "ADE")).toEqual([{ plain: "kaks tuhat", needed: "kahetuhandendal" }]);
    expect(ordinalParts(2024, "ELA")).toEqual([
      { plain: "kaks tuhat", needed: "kahe tuhande" },
      { plain: "kakskümmend", needed: "kahekümne" },
      { plain: "neli", needed: "neljandast" },
    ]);
    for (const n of [1801, 1900, 1918, 1944, 1991, 2000, 2004, 2011, 2020, 2029]) {
      for (const c of ORDINAL_CASES) {
        expect(ordinalParts(n, c).map((p) => p.needed).join(" ")).toBe(said(ordinal(n, c)));
      }
    }
  });

  it("are every one a form of the right headword, for every number from 1 to 2100", { timeout: 120_000 }, async () => {
    let checked = 0;
    for (let n = 1; n <= TOP; n += 1) {
      const plain = cardinal(n, "NOM");
      for (const c of CARDINAL_CASES) {
        const words = cardinal(n, c);
        expect(words.length, `${n} ${c}`).toBe(plain.length);
        for (const [i, word] of words.entries()) {
          await expectFormOf(word, plain[i]!, `${n} cardinal ${c}`);
          checked += 1;
        }
      }
      const ordinalPlain = ordinal(n, "NOM");
      const lastPlain = ordinalPlain[ordinalPlain.length - 1]!;
      for (const c of ORDINAL_CASES) {
        const words = ordinal(n, c);
        expect(words.length, `${n} ordinal ${c}`).toBe(ordinalPlain.length);
        for (const [i, word] of words.entries()) {
          const head = i === words.length - 1 ? lastPlain : plain[i]!;
          await expectFormOf(word, head, `${n} ordinal ${c}`);
          checked += 1;
        }
      }
    }
    // A floor, so a loop that stopped producing words cannot pass on nothing.
    expect(checked).toBeGreaterThan(TOP * 15);
  });

  it("make the decades, every ten from 20 to 90 and 2000, as forms the list holds", async () => {
    for (const n of [20, 30, 40, 50, 60, 70, 80, 90, 2000]) {
      const words = ordinal(n, "ADE", "pl");
      const head = ordinal(n, "NOM");
      await expectFormOf(words[words.length - 1]!, head[head.length - 1]!, `${n} plural`);
    }
  });
});
