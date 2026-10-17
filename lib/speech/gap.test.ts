import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { linesFor, type SheetItem } from "@/lib/games/workbook";
import type { FlashWord } from "@/lib/games/flash";
import { whichGap, wordInGap } from "./lightUp";
import { core } from "./reconcile";

/**
 * THE WORD SAID IN A GAP, ON THE WORKBOOK'S OWN LINES (VB-8).
 *
 * Töövihik takes a line read aloud with the gap filled, and the word between
 * the words before and after the gap goes into the box. These tests read the
 * lines the page actually deals, cut from the shipped harvest by `linesFor`,
 * and say them back the way a recognizer writes them down: lower case, no
 * punctuation. Nothing here is Estonian typed for the test; every sentence
 * is one a lexicographer recorded.
 */

function shipped(lemma: string): FlashWord {
  const entry = HARVESTED.find((w) => w.lemma === lemma);
  if (!entry) throw new Error(`${lemma} is not in the harvest`);
  return {
    lexemeId: `lex-${lemma}`,
    lemma: entry.lemma,
    translation: entry.gloss,
    pos: entry.pos,
    semanticTypes: null,
    forms: [
      ...Object.entries(entry.parts).map(([formType, value]) => ({ formType, value: value as string })),
      ...entry.extraForms.map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
    ],
    examples: entry.usages.map((et) => ({ et, en: "An English line.", source: "EKILEX" as const })),
  };
}

/** A recognizer's spelling of a sentence: words, lower case, no punctuation. */
function asHeard(sentence: string): string {
  return sentence.split(/\s+/).map(core).filter(Boolean).join(" ");
}

/** Whether the word next to the gap, either side, is a figure rather than a word. */
function besideFigure(line: SheetItem): boolean {
  const left = words(line.before).map(core).filter(Boolean);
  const right = words(line.after).map(core).filter(Boolean);
  const figure = (w: string | undefined) => w !== undefined && !/\p{L}/u.test(w);
  return figure(left[left.length - 1]) || figure(right[0]);
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** The lines the page deals for every course noun and verb, which is the whole of what a gap can be. */
const LINES: SheetItem[] = HARVESTED
  .filter((w) => w.pos === "NOUN" || w.pos === "VERB")
  .flatMap((w) => linesFor(shipped(w.lemma)));

describe("wordInGap on the workbook's own lines", () => {
  it("has real lines to read", () => {
    expect(LINES.length).toBeGreaterThan(500);
  });

  it("finds the answer in a line read back whole, on every line it can align", () => {
    const wrong = LINES.filter((line) => {
      const got = wordInGap(words(line.before), words(line.after), asHeard(line.sentence));
      const expected = besideFigure(line) ? null : core(line.answer);
      return (got === null ? null : got.toLocaleLowerCase("et")) !== expected;
    });
    expect(wrong.map((l) => l.sentence)).toEqual([]);
  });

  it("leaves the box empty where a figure stands beside the gap", () => {
    // A recognizer writes a number out in words, so `300` beside the gap is no landmark.
    const figured = LINES.filter(besideFigure);
    expect(figured.length).toBeGreaterThan(0);
    for (const line of figured) {
      expect(wordInGap(words(line.before), words(line.after), asHeard(line.sentence))).toBeNull();
    }
  });

  it("never fills the box from a line where the words around the gap were not said", () => {
    let asked = 0;
    for (const line of LINES.slice(0, 200)) {
      const before = words(line.before);
      const after = words(line.after);
      if (before.length === 0 || after.length === 0 || besideFigure(line)) continue;
      asked++;
      // The learner stops at the gap: nothing after it was heard.
      expect(wordInGap(before, after, asHeard(line.before))).toBeNull();
    }
    expect(asked).toBeGreaterThan(50);
  });

  it("takes a misheard word in the gap as heard, for Check to mark", () => {
    let asked = 0;
    for (const line of LINES.slice(0, 200)) {
      const before = words(line.before);
      const after = words(line.after);
      if (after.length === 0 || besideFigure(line)) continue;
      asked++;
      const heard = asHeard(`${line.before} ${line.cue} ${line.after}`);
      expect(wordInGap(before, after, heard)?.toLocaleLowerCase("et")).toBe(core(line.cue).toLocaleLowerCase("et"));
    }
    expect(asked).toBeGreaterThan(50);
  });
});

describe("whichGap on a page of the workbook's own lines", () => {
  const usable = LINES.filter((l) => !besideFigure(l));

  it("finds which line was read, and its word, whichever line of a page it is", () => {
    let asked = 0;
    for (let start = 0; start + 4 <= Math.min(usable.length, 400); start += 4) {
      const page = usable.slice(start, start + 4);
      for (const line of page) {
        asked++;
        const got = whichGap(page, asHeard(line.sentence));
        expect(got?.id).toBe(line.id);
        expect(got?.word.toLocaleLowerCase("et")).toBe(core(line.answer));
      }
    }
    expect(asked).toBeGreaterThan(300);
  });

  it("does not put a reading of one line into the box that has the caret", () => {
    const page = usable.slice(0, 4);
    const read = page[2]!;
    expect(whichGap(page, asHeard(read.sentence), page[0]!.id)?.id).toBe(read.id);
  });

  it("fills nothing from a few words that match no line", () => {
    const page = usable.slice(0, 4);
    expect(whichGap(page, "jah")).toBeNull();
    expect(whichGap(page, "")).toBeNull();
  });
});
