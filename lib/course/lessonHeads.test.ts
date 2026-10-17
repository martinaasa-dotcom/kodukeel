import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { PHRASES } from "@/prisma/data/other";
import { LESSONS } from "./lessons";
import { lessonEntries, lessonHeads } from "./lessonHeads";

/*
  EVERY LESSON ITEM BECOMES A CARD OF SOMETHING THE SEED WRITES.

  A fifth of A1 had no dictionary entry behind it, so finishing a lesson
  handed the deck nothing for it and it was never asked again.
*/
const HEADWORDS = new Set([...HARVESTED.map((w) => w.lemma), ...PHRASES.map(([lemma]) => lemma)]);
const EXPANDED = new Set(
  (JSON.parse(readFileSync(join(process.cwd(), "prisma/data/expanded.json"), "utf8")) as { lemma: string }[])
    .map((e) => e.lemma),
);
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

  it("takes a short pronoun, a plural and a one-word phrase to their headwords", () => {
    const all = new Set(LESSONS.flatMap((l) => lessonHeads(l)));
    for (const head of ["mina", "sina", "tema", "meie", "teie", "nemad", "king", "tere"]) {
      expect(all.has(head), head).toBe(true);
    }
    for (const spelling of ["ma", "sa", "kingad", "Tere!"]) expect(all.has(spelling), spelling).toBe(false);
  });

  it("keeps a whole phrase and a chunk as the lesson says them", () => {
    expect(OWN.has("Tere päevast!")).toBe(true);
    expect(OWN.has("hommikul")).toBe(true);
    expect(ENTRIES.find((e) => e.lemma === "Tere päevast!")?.pos).toBe("PHRASE");
  });
});
