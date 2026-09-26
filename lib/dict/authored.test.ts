import { describe, expect, it } from "vitest";
import { authoredFor, authoredRows, isAuthored } from "@/lib/dict/authored";
import { checkAuthored } from "../../scripts/lib/authoredCheck";

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
  it("covers the A1 course, rather than passing on an empty table", () => {
    expect(authoredRows().length).toBeGreaterThanOrEqual(480);
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
    const [fault] = checkAuthored([["isa", "Ema töötab täna.", "Mum is working today."]]);
    expect(fault?.why).toMatch(/no form of isa/);
  });

  it("reports an English line with Estonian in it, and a missing one", () => {
    expect(checkAuthored([["isa", "Isa töötab täna siin.", "Dad is working here today."]])).toEqual([]);
    expect(checkAuthored([["isa", "Isa töötab täna siin.", "Dad works here, õ."]])[0]?.why)
      .toMatch(/Estonian letter/);
    expect(checkAuthored([["isa", "Isa töötab täna siin.", " "]]).map((f) => f.why))
      .toContain("no English line");
  });

  it("reports a fragment, and a sentence Ekilex already recorded", () => {
    expect(checkAuthored([["isa", "Isa töötab", "Dad works."]])[0]?.why).toMatch(/naturalSentence/);
    expect(checkAuthored([["kes", "Kes see on?", "Who is that?"]])[0]?.why).toMatch(/already recorded/);
  });

  it("hands a screen its sentences marked as written, never as recorded", () => {
    const [first] = authoredFor("isa");
    expect(first).toBeDefined();
    expect(isAuthored(first!)).toBe(true);
    expect(first!.en).toBeTruthy();
    expect(authoredFor("no such word")).toEqual([]);
  });
});
