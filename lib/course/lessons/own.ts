/**
 * YOUR OWN SENTENCES, KEPT AS REVIEW CARDS (B1 on, docs/43-lessons.md §11.2).
 *
 * A sentence the learner wrote on a writing evening comes back in review with
 * one word taken out: `Ma kolisin eelmisel aastal ____, sest mu naine sai seal
 * tööd.` (Tartu). The sentence is the learner's and the word taken out is a
 * spelling the lesson taught, as the lesson spells it. The writing evening's
 * own uses come first, since those are what the part was for; then anything
 * else taught that evening; then any spelling the ledger holds, so a sentence
 * built on last week's words still earns its card.
 *
 * A TAUGHT SPELLING IS NOT A RIGHT ANSWER ON ITS OWN, which is the fault this
 * file had. `Me sõime kook eile.` gapped `kook`, a word the course taught, in
 * a sentence that needs `kooki`, so the deck drilled the wrong case into the
 * one table nobody repairs. This module cannot judge the case and does not
 * try: a sentence reaches it only once the dictionary's reading of it found
 * nothing (`checkLessonText`, `keepLessonSentences`) and the learner ticked it
 * as one they are sure of. What it can still get wrong is which word the
 * spelling is and what the card prints, and both are decided here:
 *
 *   - The headword is the one every lesson that taught the spelling agrees on
 *     (`headwordsOf`). `tuli` is the fire in A1 and "he came" in A2, so it is
 *     claimed twice and gapped never, which is `familiesOf`'s rule for a gap
 *     in a lesson. The first claim used to win, so `Ta tuli tuba sisse.` was
 *     filed under the fire.
 *   - The cue is the gap card's ladder (`ownCue`, `lib/srs/cards.ts`): the
 *     headword and its meaning, then the meaning alone where the headword is
 *     the answer, then nothing. It used to be the headword always, so
 *     `____ ema elab Tartus.` was cued "minu, my".
 *
 * Pure: no React, no Prisma, no clock. `lib/progress/ownSentences.ts` writes
 * the cards.
 */
import { BLANK, mentions } from "@/lib/estonian/cloze";
import { lessonHead } from "../lessonHeads";
import { tonightSpellings } from "./fade";
import { familiesOf, unfold, wordsOf, type Ledger } from "./ledger";
import type { LessonSpec } from "./types";

/** The most sentences one draft keeps, so one evening cannot flood a deck. */
export const MOST_KEPT = 8;

/**
 * The most sentences of a draft the dictionary reads one by one. The longest
 * writing task asks for a hundred words, and a B1 sentence runs to five words
 * or more, so this reads the whole of any text a task asks for. A test holds
 * it to the longest `least` there is.
 */
export const MOST_READ = 24;

/** Shorter than this and a piece of a draft is not read as a sentence. */
const SENTENCE_WORDS = 3;

/** Every piece of a draft between two stops, as the learner wrote it, however short. */
export function piecesOf(text: string): string[] {
  return (text.normalize("NFC").match(/[^.!?]+[.!?]*/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => wordsOf(s).length > 0);
}

/** The sentences of a draft, as the learner wrote them, with their punctuation. */
export function sentencesOf(text: string): string[] {
  return piecesOf(text).filter((s) => wordsOf(s).length >= SENTENCE_WORDS);
}

export interface OwnCard {
  readonly sentence: string;
  /** The sentence with one word taken out. */
  readonly front: string;
  /** That word, as the learner wrote it and the lesson taught it. */
  readonly answer: string;
  /** The word it is a form of, which is the card's dictionary entry. */
  readonly lemma: string;
}

/**
 * For each taught spelling, lower-cased, the headword it is a form of, or null
 * where two headwords claim it. Every claim counts rather than the first: a
 * single-word item claims its own spelling for the entry `lessonHead` resolves
 * it to, and every spelling the ledger builds or names under a verb or a stem
 * (`familiesOf`) claims it for that word.
 */
export type Headwords = ReadonlyMap<string, string | null>;

export function headwordsOf(course: readonly LessonSpec[], taught: Ledger): Headwords {
  const claims = new Map<string, Map<string, string>>();
  const claim = (spelling: string, lemma: string) => {
    const low = spelling.toLocaleLowerCase("et");
    const held = claims.get(low) ?? claims.set(low, new Map()).get(low)!;
    const key = lemma.toLocaleLowerCase("et");
    if (!held.has(key)) held.set(key, lemma);
  };
  for (const lesson of course) {
    for (const item of lesson.teaches.flatMap(unfold)) {
      const words = wordsOf(item.et);
      // A phrase's words are covered only together, so none of them is a headword's spelling here.
      if (words.length !== 1) continue;
      claim(words[0]!.raw, lessonHead(item));
    }
  }
  for (const [lemma, spellings] of familiesOf(taught).forms) {
    for (const spelling of spellings) claim(spelling, lemma);
  }
  const out = new Map<string, string | null>();
  for (const [spelling, lemmas] of claims) out.set(spelling, lemmas.size === 1 ? [...lemmas.values()][0]! : null);
  return out;
}

/**
 * What the card says under the gap: the gap card's own ladder. The headword
 * and its meaning, then the meaning alone wherever the headword would print
 * the answer, then nothing, since a word spelled alike in both languages has
 * the answer sitting in the English too.
 */
export function ownCue(answer: string, lemma: string, translation: string | null): string | null {
  const asked = translation ? [`${lemma}, ${translation}`, translation] : [lemma];
  return asked.find((line) => !mentions(line, answer)) ?? null;
}

/** A card's sentence in three pieces, the word it takes out in the middle, for a screen marking it in place. */
export function markedOf(card: OwnCard): { before: string; answer: string; after: string } | null {
  const at = card.front.indexOf(BLANK);
  return at < 0 ? null : { before: card.front.slice(0, at), answer: card.answer, after: card.front.slice(at + BLANK.length) };
}

/**
 * WHICH OF THE SENTENCES A LEARNER TICKED MAY BE KEPT: only one the
 * dictionary read and found nothing in, once each, and no more than a draft
 * keeps. `read` is the dictionary's reading of those very sentences, done on
 * the server again rather than taken from the screen, so a sentence with a
 * finding cannot be posted past the checklist that would not let it be ticked.
 */
export function keptOf(
  ticked: readonly string[],
  read: readonly { readonly sentence: string; readonly findings: readonly unknown[] }[],
): string[] {
  const clean = new Set(read.filter((r) => r.findings.length === 0).map((r) => r.sentence));
  return [...new Set(ticked)].filter((s) => clean.has(s)).slice(0, MOST_KEPT);
}

/**
 * The card one sentence earns, or null. `taught` is everything the course has
 * taught through this lesson, so a spelling outside it is never an answer, and
 * `heads` is `headwordsOf` over the same course, worked out once by the caller.
 */
export function ownCardFor(
  sentence: string,
  lesson: LessonSpec,
  taught: Ledger,
  heads: Headwords,
): OwnCard | null {
  const words = wordsOf(sentence);
  if (words.length < SENTENCE_WORDS) return null;
  const uses = new Set((lesson.write?.uses ?? []).flatMap((u) => wordsOf(u.et).map((w) => w.low)));
  const tonight = tonightSpellings(lesson);
  const rank = (low: string) => (uses.has(low) ? 0 : tonight.has(low) ? 1 : 2);
  const count = new Map<string, number>();
  for (const w of words) count.set(w.low, (count.get(w.low) ?? 0) + 1);
  const candidates = words
    .map((w, i) => ({ ...w, i, lemma: heads.get(w.low) ?? null }))
    .filter((w): w is typeof w & { lemma: string } =>
      // Four letters or more, so the gap is a word somebody has to recall rather than {ja} or {on}.
      w.low.length >= 4 && taught.spellings.has(w.low) && w.lemma !== null
      // Once, where it stands, so the answer is not left standing beside its own gap.
      && count.get(w.low) === 1)
    .sort((a, b) => rank(a.low) - rank(b.low)
      // A form of a word before the word itself, since then the cue can name the word.
      || Number(a.low === a.lemma.toLocaleLowerCase("et")) - Number(b.low === b.lemma.toLocaleLowerCase("et"))
      || a.i - b.i);
  const pick = candidates[0];
  if (!pick) return null;
  const match = [...sentence.matchAll(/\p{L}+/gu)][pick.i]!;
  const at = match.index ?? 0;
  const front = sentence.slice(0, at) + BLANK + sentence.slice(at + match[0].length);
  return { sentence, front, answer: pick.raw, lemma: pick.lemma };
}
