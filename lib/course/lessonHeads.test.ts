import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { PHRASES } from "@/prisma/data/other";
import { shippedDictionary } from "@/scripts/lib/dictionary";
import { LESSONS } from "./lessons";
import { lessonEntries, lessonHeads } from "./lessonHeads";

/*
  EVERY LESSON ITEM BECOMES A CARD OF SOMETHING THE SEED WRITES.

  A fifth of A1 had no dictionary entry behind it, so finishing a lesson
  handed the deck nothing for it and it was never asked again.
*/
const HEADWORDS = new Set([...HARVESTED.map((w) => w.lemma), ...PHRASES.map(([lemma]) => lemma)]);
/* Everything the seed writes, from the one assembly of it (`scripts/lib/dictionary.ts`). */
const EXPANDED = new Set(shippedDictionary().map((e) => e.lemma));
const ENTRIES = lessonEntries(EXPANDED);
const OWN = new Set(ENTRIES.map((e) => e.lemma));

describe("the dictionary entry a lesson item is a card of", () => {
  it("is a headword the dictionary holds or an entry of the lesson's own, for every item", () => {
    let checked = 0;
    for (const lesson of LESSONS) {
      for (const head of lessonHeads(lesson)) {
        checked += 1;
        expect(HEADWORDS.has(head) || EXPANDED.has(head) || OWN.has(head), `${lesson.id}: ${head}`).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it("never writes an entry beside one the built dictionary already heads", () => {
    expect(ENTRIES.length).toBeGreaterThan(20);
    for (const entry of ENTRIES) {
      expect(HEADWORDS.has(entry.lemma), entry.lemma).toBe(false);
      expect(EXPANDED.has(entry.lemma), entry.lemma).toBe(false);
      expect(entry.translation.trim(), entry.lemma).not.toBe("");
      expect(entry.translation, entry.lemma).not.toMatch(/[{}]/);
    }
  });

  it("takes a short pronoun and a one-word phrase to their headwords", () => {
    const all = new Set(LESSONS.flatMap((l) => lessonHeads(l)));
    for (const head of ["mina", "sina", "tema", "meie", "teie", "nemad", "tere"]) {
      expect(all.has(head), head).toBe(true);
    }
    for (const spelling of ["ma", "sa", "ta", "me", "te", "nad", "Tere!"]) expect(all.has(spelling), spelling).toBe(false);
  });

  /*
    And a form whose headword no lesson has taught yet stays as the lesson
    says it: lesson 3 teaches "my" and "your" a lesson before "you", so a
    card of `sina` there would ask a word nobody had been shown.
  */
  it("keeps a form whose headword is not taught yet as the lesson says it", () => {
    const three = LESSONS.find((l) => l.id === "a1-03-name")!;
    const heads = lessonHeads(three);
    expect(heads).toContain("minu");
    expect(heads).not.toContain("mina");
    expect(heads).not.toContain("sina");
  });

  it("keeps a whole phrase and a chunk as the lesson says them", () => {
    expect(OWN.has("Tere päevast!")).toBe(true);
    expect(OWN.has("hommikul")).toBe(true);
    expect(ENTRIES.find((e) => e.lemma === "Tere päevast!")?.pos).toBe("PHRASE");
  });
});
