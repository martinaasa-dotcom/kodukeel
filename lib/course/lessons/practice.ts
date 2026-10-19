/**
 * PRACTICE, AND THE REVIEW AFTER IT: BUILT FROM THE LEDGER, SO THEY CANNOT ASK
 * ANYTHING ELSE (docs/43-lessons.md §1, steps 4 and 6).
 *
 * Recognize first, then produce. Every new word and phrase is met once more
 * as a question about its meaning, by ear for a phrase and by eye for a word,
 * and then asked for from its English. The wrong options are the English of
 * other things the learner has been taught, today's first, so a beginner on
 * their first evening chooses between greetings they met five minutes ago
 * rather than between glosses of words nobody has shown them. Nothing here is
 * typed by hand, and `lessons.test.ts` still asks every item it builds whether
 * it is covered, rather than trusting that it is.
 *
 * A check-in teaches nothing new, so its practice is the last few lessons'
 * words mixed, which is what a check-in is for.
 *
 * THE REVIEW STEP is older lessons' words, by ear and by eye. Once lessons
 * are the course it is the review queue held to the ledger, which grades;
 * while lessons are in preview it is this, and grades nothing.
 *
 * TYPING IS MARKED HERE, NOT BY `checkAnswer`, and for one reason: that
 * marker splits an answer on its commas, because a dictionary gloss is a list,
 * so `Aeglasemalt, palun.` would accept `palun` on its own. A phrase is one
 * answer. The slip rule is the app's own, though: a dropped õ or ä is nearly,
 * and a letter out is nearly only from eight letters up, which is
 * `lib/estonian/answer.ts`'s measured floor, because below it a letter out is
 * as often another word (`mina` and `sina`).
 *
 * Pure: no React, no Prisma, no clock. Seeded, so a reload asks the same
 * questions in the same order.
 */

import { editDistance, nearMiss } from "@/lib/estonian/answer";
import { fold } from "@/lib/estonian/fold";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { estonianIn, unfold, wordsOf, type Asked, type Ledger } from "./ledger";
import type { LessonSpec } from "./types";

/** What practice asks about: a verb is already its two spellings here. */
type Taught = Asked;
import type { Verdict } from "@/lib/ux/verdict";

export type PracticeItem =
  /** Heard, then which English it means. For a phrase. */
  | { readonly kind: "hear"; readonly et: string; readonly options: readonly string[]; readonly answer: string }
  /** Read, then which English it means. For a word. */
  | { readonly kind: "pick"; readonly et: string; readonly options: readonly string[]; readonly answer: string }
  /**
   * The English, then the Estonian typed or said. `accept` is every taught
   * spelling with the same English, since `mina` and `ma` both answer "I".
   */
  | { readonly kind: "type"; readonly en: string; readonly answer: string; readonly accept: readonly string[] };

/** Longest answer a learner is asked to produce whole, in words. */
export const TYPE_UP_TO_WORDS = 4;

/** How many older words the review step goes over. */
export const REVIEW_ITEMS = 6;

/** How many of the last lessons a check-in mixes. */
export const CHECKIN_REACH = 4;

/**
 * At most this many recognize questions and this many to produce, so the step
 * stays the five minutes the plan gives it. A lesson teaching more than that
 * (the six persons, long and short, are twelve words) asks a different
 * selection each lesson id, and every word is on the Words step whatever this
 * picks.
 */
export const RECOGNISE_AT_MOST = 10;
export const PRODUCE_AT_MOST = 6;

/** Options under a recognize question, the answer included. */
const OPTIONS = 4;

const sameEnglish = (a: string, b: string) => a.toLocaleLowerCase("en") === b.toLocaleLowerCase("en");

/**
 * Whether a meaning spells its own answer: `ole` glossed "{ei ole} is not"
 * puts the word being asked for inside the question, or inside the right
 * option, and a question nobody can get wrong measures nothing. Such an item
 * is still on the Words step; it is just never asked about.
 */
export function meaningShows(item: Taught): boolean {
  const asked = new Set(wordsOf(item.et).map((w) => w.low));
  return estonianIn(item.en).some((et) => wordsOf(et).some((w) => asked.has(w.low)));
}

/**
 * Three wrong meanings for `item`, from what has been taught, today's first.
 * Never a meaning equal to the answer's, since two right options are a trick.
 */
function optionsFor(item: Taught, pool: readonly Taught[], random: () => number): string[] {
  const wrong: string[] = [];
  for (const other of pool) {
    if (wrong.length >= OPTIONS - 1) break;
    if (other.et === item.et || sameEnglish(other.en, item.en)) continue;
    // An option quoting the word on screen points at itself, right or wrong.
    if (wordsOf(item.et).some((w) => estonianIn(other.en).some((et) => wordsOf(et).some((o) => o.low === w.low)))) continue;
    if (wrong.some((w) => sameEnglish(w, other.en))) continue;
    wrong.push(other.en);
  }
  return shuffle([item.en, ...wrong], random);
}

/** A recognize question for one item: by ear for a phrase, by eye for a word. */
function recognise(item: Taught, pool: readonly Taught[], random: () => number): PracticeItem {
  const options = optionsFor(item, pool, random);
  return wordsOf(item.et).length > 1
    ? { kind: "hear", et: item.et, options, answer: item.en }
    : { kind: "pick", et: item.et, options, answer: item.en };
}

/** The pool options are drawn from: today's items, then the most recent first. */
function poolFor(tonight: readonly Taught[], before: Ledger): Taught[] {
  return [...tonight, ...[...before.items].reverse().map((d) => d.item)];
}

/**
 * `list` with whatever stands nearest `item` in it first: a lesson keeps its
 * kinds together, so a da-form is asked among da-forms and a weekday among
 * weekdays, and the right answer is never the only one of its kind.
 */
function nearestFirst(item: Taught, list: readonly Taught[]): Taught[] {
  const at = list.indexOf(item);
  if (at < 0) return [...list];
  return list.map((other, i) => ({ other, far: Math.abs(i - at) })).sort((a, b) => a.far - b.far).map(({ other }) => other);
}

/**
 * The pool for one older item, with the lesson that taught it first: on a
 * check-in or in the review, "five" is asked among the other numbers rather
 * than among whatever the last lesson happened to teach, which would make the
 * right answer the only number on the screen.
 */
function neighboursFirst(item: Taught, before: Ledger, rest: readonly Taught[]): Taught[] {
  const at = before.items.findIndex((d) => d.item === item);
  if (at < 0) return [...rest];
  const taughtIn = before.items[at]!.lesson;
  // Nearest in the Words list first, which is where a lesson keeps its kinds together.
  const same = before.items
    .map((d, i) => ({ d, far: Math.abs(i - at) }))
    .filter(({ d }) => d.lesson === taughtIn)
    .sort((a, b) => a.far - b.far)
    .map(({ d }) => d.item);
  return [...same, ...rest];
}

/** What today's practice goes over: today's new things, or for a check-in the last few lessons'. */
export function practiceSubjects(lesson: LessonSpec, before: Ledger): Taught[] {
  if (lesson.teaches.length > 0) return lesson.teaches.flatMap(unfold);
  const since = lesson.n - CHECKIN_REACH;
  return before.items.filter((d) => d.lesson >= since).map((d) => d.item);
}

/** One item per English meaning, keeping the first, so "I" is not asked twice. */
function onePerMeaning(items: readonly Taught[]): Taught[] {
  const out: Taught[] = [];
  for (const item of items) if (!out.some((o) => sameEnglish(o.en, item.en))) out.push(item);
  return out;
}

/** A produce question, taking every taught spelling with the same English. */
function produce(item: Taught, pool: readonly Taught[]): PracticeItem {
  const accept = [...new Set([item.et, ...pool.filter((o) => sameEnglish(o.en, item.en)).map((o) => o.et)])];
  return { kind: "type", en: item.en, answer: item.et, accept };
}

/**
 * Step 4: recognize, then produce. In the order taught where everything fits,
 * since that is the order the Words step just showed; a seeded selection
 * where it does not.
 */
export function practiceFor(lesson: LessonSpec, before: Ledger): PracticeItem[] {
  const random = rng(seedFrom(`practice:${lesson.id}`));
  const subjects = onePerMeaning(practiceSubjects(lesson, before)).filter((item) => !meaningShows(item));
  const tonight = lesson.teaches.flatMap(unfold);
  const pool = poolFor(tonight, before);
  const fits = tonight.length > 0 && subjects.length <= RECOGNISE_AT_MOST;
  const chosen = fits ? subjects : shuffle(subjects, random).slice(0, RECOGNISE_AT_MOST);
  const recog = chosen.map((item) => recognise(item, tonight.includes(item) ? [...nearestFirst(item, tonight), ...pool] : neighboursFirst(item, before, pool), random));
  const asked = shuffle(chosen.filter((item) => wordsOf(item.et).length <= TYPE_UP_TO_WORDS), random)
    .slice(0, PRODUCE_AT_MOST)
    .map((item) => produce(item, pool));
  return [...recog, ...asked];
}

/** Step 6: older words, by ear and by eye. Empty on the first lesson. */
export function reviewFor(lesson: LessonSpec, before: Ledger): PracticeItem[] {
  const random = rng(seedFrom(`review:${lesson.id}`));
  const older = before.items.map((d) => d.item).filter((item) => !meaningShows(item));
  if (older.length === 0) return [];
  // The newest older lessons are likeliest to need it, so they are drawn from first.
  const recent = [...older].reverse().slice(0, REVIEW_ITEMS * 3);
  const picked = shuffle(recent, random).slice(0, REVIEW_ITEMS);
  return picked.map((item) => recognise(item, neighboursFirst(item, before, [...older].reverse()), random));
}

/** A phrase as it is compared: lower case, no punctuation, single spaces. */
export function normalisePhrase(text: string): string {
  return wordsOf(text).map((w) => w.low).join(" ");
}

/** The slip floor for a one-letter difference (`lib/estonian/answer.ts`). */
const SLIP_FLOOR = 8;

export interface TypedMark {
  readonly verdict: Verdict;
  /** What to say, in English, beside the answer. */
  readonly note: string;
  /**
   * A wrong answer most of the way there, which is painted nearly and still
   * says "Not quite" (`nearMiss`: the color, never the verdict).
   */
  readonly close: boolean;
}

/**
 * How a typed or spoken answer compares with the phrase it was asked for.
 * `accept` is every spelling that counts, the asked one first.
 */
export function markPhrase(typed: string, accept: readonly string[]): TypedMark {
  const said = normalisePhrase(typed);
  const wants = accept.map(normalisePhrase);
  const want = wants.find((w) => w === said) ?? wants.find((w) => fold(w) === fold(said)) ?? wants[0] ?? "";
  if (said.length === 0) return { verdict: "wrong", note: "Nothing typed.", close: false };
  if (said === want) return { verdict: "right", note: "That's it.", close: false };
  if (fold(said) === fold(want)) return { verdict: "nearly", note: "Nearly: mind the letters with marks on them.", close: false };
  if (wants.some((w) => w.length >= SLIP_FLOOR && editDistance(said, w, 1) <= 1)) return { verdict: "nearly", note: "Nearly: one letter out.", close: false };
  return { verdict: "wrong", note: "Not quite.", close: wants.some((w) => nearMiss(said, w)) };
}
