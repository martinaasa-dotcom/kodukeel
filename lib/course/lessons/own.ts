/**
 * YOUR OWN SENTENCES, KEPT AS REVIEW CARDS (B1 on, docs/43-lessons.md §11.2).
 *
 * A sentence the learner wrote on a writing evening comes back in review with
 * one word taken out and its headword as the cue: `Ma kolisin eelmisel aastal
 * ____, sest mu naine sai seal tööd.` (Tartu). The sentence is the learner's
 * and the word taken out is a spelling the lesson taught, as the lesson spells
 * it, so the answer is never Estonian the app made up (ADR-005): only a word
 * they wrote exactly as it was taught is ever gapped. The writing evening's
 * own uses come first, since those are what the part was for; then anything
 * else taught that evening; then any spelling the ledger holds, so a sentence
 * built on last week's words still earns its card.
 *
 * Pure: no React, no Prisma, no clock. `lib/progress/ownSentences.ts` writes
 * the cards.
 */
import { BLANK } from "@/lib/estonian/cloze";
import { tonightSpellings } from "./fade";
import { unfold, wordsOf, type Ledger } from "./ledger";
import type { LessonSpec } from "./types";

/** The most sentences one draft keeps, so one evening cannot flood a deck. */
export const MOST_KEPT = 8;

/** The sentences of a draft, as the learner wrote them, with their punctuation. */
export function sentencesOf(text: string): string[] {
  return (text.normalize("NFC").match(/[^.!?]+[.!?]*/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => wordsOf(s).length >= 3);
}

export interface OwnCard {
  readonly sentence: string;
  /** The sentence with one word taken out. */
  readonly front: string;
  /** That word, as the learner wrote it and the lesson taught it. */
  readonly answer: string;
  /** The word it is a form of, which is the card's cue and its dictionary entry. */
  readonly lemma: string;
}

/** For each taught spelling, the headword it is a form of. */
function headwordOf(lessons: readonly LessonSpec[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const lesson of lessons) {
    for (const item of lesson.teaches.flatMap(unfold)) {
      for (const w of wordsOf(item.et)) {
        if (!out.has(w.low)) out.set(w.low, item.kind === "form" ? item.of : item.kind === "phrase" ? item.et : item.et);
      }
    }
  }
  return out;
}

/**
 * The card one sentence earns, or null. `taught` is everything the course has
 * taught through this lesson, so a spelling outside it is never an answer.
 */
export function ownCardFor(
  sentence: string,
  lesson: LessonSpec,
  taught: Ledger,
  course: readonly LessonSpec[],
): OwnCard | null {
  const words = wordsOf(sentence);
  if (words.length < 3) return null;
  const uses = new Set((lesson.write?.uses ?? []).flatMap((u) => wordsOf(u.et).map((w) => w.low)));
  const tonight = tonightSpellings(lesson);
  const heads = headwordOf(course);
  const rank = (low: string) => (uses.has(low) ? 0 : tonight.has(low) ? 1 : 2);
  const candidates = words
    .map((w, i) => ({ ...w, i }))
    // Four letters or more, so the gap is a word somebody has to recall rather than {ja} or {on}.
    .filter((w) => w.low.length >= 4 && taught.spellings.has(w.low) && heads.has(w.low))
    .sort((a, b) => rank(a.low) - rank(b.low) || a.i - b.i);
  const pick = candidates[0];
  if (!pick) return null;
  // The word taken out once, where it stands, and nowhere else in the sentence.
  if (words.filter((w) => w.low === pick.low).length !== 1) return null;
  const match = [...sentence.matchAll(/\p{L}+/gu)][pick.i]!;
  const at = match.index ?? 0;
  const front = sentence.slice(0, at) + BLANK + sentence.slice(at + match[0].length);
  const lemma = heads.get(pick.low)!;
  return { sentence, front, answer: pick.raw, lemma };
}
