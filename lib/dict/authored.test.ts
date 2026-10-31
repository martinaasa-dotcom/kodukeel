import { describe, expect, it } from "vitest";
import { authoredFor, authoredRows, isAuthored } from "@/lib/dict/authored";
import { checkAuthored } from "../../scripts/lib/authoredCheck";
import { PROGRAMMES, taughtThrough } from "@/lib/course";

describe("the sentences written for a beginner", () => {
  /*
    The rules are `lib/dict/authored.ts`'s, asked row by row. A row that
    breaks one is a row a beginner would be shown with a word in it nobody
    taught them, or with no English, or with no form of the word it is filed
    under, and every one of those is what these sentences exist to prevent.
  */
  it("breaks no rule, on any row", () => {
    const faults = checkAuthored().map(({ row, why }) => `${row[0]}: ${row[1]} (${why})`);
    expect(faults).toEqual([]);
  });

  /*
    A floor, because a table emptied by a bad merge passes the check above
    with nothing in it, and the screens then fall back to meeting every A1
    word alone, which looks exactly like a table that was never written.
  */
  /*
    Counted on the words the lessons teach rather than on the table's length:
    the day C1 became lessons, the 100 rows filed under words only the old C1
    units taught were dropped, since no evening teaches those words now, and
    a length that included them was measuring the units. Measured then: 231
    rows filed under a word the A1 lessons teach, and 308 through A2.
  */
  it("covers the A1 and A2 lessons, rather than passing on an empty table", () => {
    const through = (level: string) => {
      const last = PROGRAMMES.filter((p) => p.level === level).at(-1)!;
      const taught = new Set(taughtThrough(last, last.days.length - 1));
      return authoredRows().filter(([lemma]) => taught.has(lemma)).length;
    };
    expect(through("A1")).toBeGreaterThanOrEqual(231);
    expect(through("A2")).toBeGreaterThanOrEqual(308);
  });

  /*
    The checker is only worth its rows if it can fail. Each of these breaks one
    rule and nothing else, on a real word, and each has to be reported.
  */
  it("reports a word the course has not taught by that evening", () => {
    const [fault] = checkAuthored([["ema", "Minu ema elab Tallinnas ja töötab haiglas.", "My mother lives in Tallinn."]]);
    expect(fault?.why).toMatch(/not taught/);
  });

  it("reports a sentence carrying no form of its own word", () => {
    const [fault] = checkAuthored([["isa", "Ema elab siin.", "Mom lives here."]]);
    expect(fault?.why).toMatch(/no form of isa/);
  });

  it("reports an English line with Estonian in it, and a missing one", () => {
    expect(checkAuthored([["isa", "Isa elab siin.", "Dad lives here."]])).toEqual([]);
    expect(checkAuthored([["isa", "Isa elab siin.", "Dad lives here, õ."]])[0]?.why)
      .toMatch(/Estonian letter/);
    expect(checkAuthored([["isa", "Isa elab siin.", " "]]).map((f) => f.why))
      .toContain("no English line");
  });

  it("reports a fragment, and a sentence Ekilex already recorded", () => {
    expect(checkAuthored([["isa", "Isa elab", "Dad lives."]])[0]?.why).toMatch(/naturalSentence/);
    expect(checkAuthored([["kes", "Kes see on?", "Who is that?"]])[0]?.why).toMatch(/already recorded/);
  });

  it("hands a screen its sentences marked as written, never as recorded", () => {
    const [first] = authoredFor("ema", "SEED");
    expect(first).toBeDefined();
    expect(isAuthored(first!)).toBe(true);
    expect(first!.en).toBeTruthy();
    expect(authoredFor("no such word", "SEED")).toEqual([]);
  });

  it("gives a learner's own row of the same spelling nothing, and the seed's and Ekilex's the lot", () => {
    const seeded = authoredFor("ema", "SEED");
    expect(seeded.length).toBeGreaterThan(0);
    expect(authoredFor("ema", "EKILEX")).toEqual(seeded);
    // `Lexeme` is unique on (lemma, pos), so a hand-added `ema` is a different word.
    expect(authoredFor("ema", "USER")).toEqual([]);
    expect(authoredFor("ema", "AI")).toEqual([]);
    // A provenance nobody has named is refused rather than trusted.
    expect(authoredFor("ema", "")).toEqual([]);
  });
});
