/**
 * THE WORDS AT THE END OF AN EVENING, SPELLED THE WAY A CARD SPELLS THEM.
 *
 * A day's `words` are the dictionary's headwords, and a phrase is headed the
 * way it is written as a sentence: `Tere hommikust!`, `Head aega!`, `Palun`.
 * Every screen that teaches a word runs it through `plainPhrase`, so a learner
 * meets `tere hommikust` on the card. The recap printed the headwords raw, so
 * one row read `tere` beside `Tere hommikust!` and `Palun` beside `aitäh`,
 * which looks like a rendering fault rather than two kinds of entry.
 *
 * Which lemmas are phrases is read off the three places that write one: the
 * course syllabus, the hand-typed phrases the seed loads, and the lessons'
 * own entries. A word a phrase cleans down to twice (`Aitäh!` and `aitäh` in
 * one evening) is said once.
 *
 * Pure: no React, no Prisma, no clock.
 */

import { plainPhrase } from "@/lib/copy/values";
import { courseWords } from "@/lib/collections/syllabus";
import { PHRASES } from "@/prisma/data/other";
import { lessonEntries } from "./lessonHeads";

const PHRASE_LEMMAS: ReadonlySet<string> = new Set([
  ...courseWords().filter((w) => w.pos === "PHRASE").map((w) => w.lemma),
  ...PHRASES.map(([lemma]) => lemma),
  ...lessonEntries().filter((e) => e.pos === "PHRASE").map((e) => e.lemma),
]);

/** A headword as the recap shows it: a phrase without its sentence capital or its `!`. */
export function recapWord(lemma: string): string {
  const phrase = PHRASE_LEMMAS.has(lemma) || /!\s*$/.test(lemma);
  return plainPhrase(lemma, phrase ? "PHRASE" : null);
}

/** The evening's words cleaned, once each, in the order they were taught. */
export function recapWords(lemmas: readonly string[]): string[] {
  const out: string[] = [];
  for (const lemma of lemmas) {
    const word = recapWord(lemma);
    if (word.length > 0 && !out.includes(word)) out.push(word);
  }
  return out;
}
