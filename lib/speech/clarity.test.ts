import { describe, expect, it } from "vitest";
import { clarityOf, lightUp, lineWords } from "./lightUp";
import { reconcile } from "./reconcile";
import type { RawTurn } from "./engine";

function turn(greedy: string, beam = greedy): RawTurn {
  const d = (text: string) => ({ text, tokens: [], timestamps: [], logProbs: [] });
  return { greedy: d(greedy), beam: d(beam), seconds: 1 };
}

/** A reading where every word was heard as itself, the way most native turns arrive. */
function plain(text: string) {
  return text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, heard: w }));
}

describe("how each word of a line came across", () => {
  it("is clear where the word was heard exactly as spelled, whatever its case and punctuation", () => {
    const line = lineWords("Aitäh, kõik on hästi.");
    expect(clarityOf(line, plain("aitäh kõik on hästi")).clarity).toEqual(["clear", "clear", "clear", "clear"]);
  });

  it("is close where the word lit only through the folds an English ear makes, and says what was heard", () => {
    // `üks` heard as `uks` (the umlaut) and `kuus` as `kus` (the length): both light, neither is the spelling.
    const line = lineWords("üks kuus");
    const got = clarityOf(line, plain("uks kus"));
    expect(got.clarity).toEqual(["close", "close"]);
    expect(got.heardAs).toEqual(["uks", "kus"]);
    expect(lightUp(line, "uks kus")).toEqual([true, true]);
  });

  it("is missing where the word was not heard at all", () => {
    expect(clarityOf(lineWords("tere hommikust"), plain("tere")).clarity).toEqual(["clear", "missing"]);
  });

  it("calls a word the dictionary repaired close, because what was heard was not the word", () => {
    // `ode` is not a form the dictionary holds, and the line could hold `õde`, so the reading repairs it.
    const hearing = reconcile(turn("ode"), { known: (w) => w === "õde", expect: new Set(["õde"]) });
    expect(hearing.understood).toBe("õde");
    const got = clarityOf(lineWords("õde"), hearing.words);
    expect(got.clarity).toEqual(["close"]);
    expect(got.heardAs).toEqual(["ode"]);
  });

  it("lights exactly the words lightUp lights, on every reading", () => {
    const cases: [string, string][] = [
      ["Kas see on kõik?", "kas see on koik"],
      ["– Aitäh!", "aitäh"],
      ["Üks minut, palun.", "palun üks minut"],
      ["Tere, kuidas läheb?", "tere kuidas"],
      ["kool kool", "kool"],
      ["Head aega!", ""],
    ];
    let compared = 0;
    for (const [text, heard] of cases) {
      const line = lineWords(text);
      const lit = clarityOf(line, plain(heard)).clarity.map((c) => c !== "missing");
      expect(lit, `${text} / ${heard}`).toEqual(lightUp(line, heard));
      compared += 1;
    }
    expect(compared).toBe(cases.length);
  });

  it("gives a mark that opens the line the state of the first word", () => {
    expect(clarityOf(lineWords("– Aitäh!"), plain("aitah")).clarity).toEqual(["clear", "close"]);
    expect(clarityOf(lineWords("– Aitäh!"), plain("")).clarity).toEqual(["missing", "missing"]);
  });
});
