/**
 * SÕNAMÄNG, THE ROUND: TAKE THE WORD APART, GUESS IT, NAME IT, AND DON'T BE
 * FOOLED BY THE ONES THAT LOOK ENGLISH.
 *
 * Three steps and one thing to do on each.
 *
 *   TAKE IT APART. Five compounds, one at a time. The learner turns each piece
 *   over to see what it says on its own, the word-for-word reading lands in
 *   quotation marks (the funny part), and they guess what the whole word
 *   really means before being told, with one line about it.
 *   NAME IT. The same five, asked the other way round: which word is
 *   literally a "leather mouse"? Wrong ones come back before the round ends.
 *   DON'T BE FOOLED. Three words spelled like English ones, each asked as
 *   "what does it mean?", with the English it looks like among the options.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS GRADED BY A MODEL. Every word is
 * `lib/estonian/literally.ts`, every one of them held to the shipped
 * dictionary by its test, and every step is a comparison of two strings or
 * two ids. Nothing is written to the review log either: a compound read for
 * fun is not a card, which is the standing the Väljendid round already has.
 *
 * DEALT BY THE DAY AND THE ROUND, NOT STORED. A sitting is a pure function of
 * the date and the round number on the address, walked with `dayIndex` so
 * consecutive days are far apart and "Another round" moves on to the next
 * five. Shuffled on the server and handed down, for the reason Tähed gives: a
 * shuffle run in a render disagrees with itself between server and browser.
 *
 * Pure: no React, no Prisma, no network.
 */

import { dayIndex } from "@/lib/random/dayHash";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { COMPOUNDS, FALSE_FRIENDS, type Compound, type FalseFriend } from "@/lib/estonian/literally";

/** How many compounds a sitting takes apart, and how many false friends it asks. */
export const COMPOUNDS_PER_SITTING = 5;
export const FRIENDS_PER_SITTING = 3;

/** How many options stand on a question, the right one included. */
export const OPTIONS = 4;

export interface ApartStep {
  readonly id: string;
  readonly word: string;
  readonly parts: readonly { readonly text: string; readonly en: string }[];
  readonly literal: string;
  readonly means: string;
  readonly quip: string;
  /** The real meaning and three others, shuffled. */
  readonly guesses: readonly string[];
}

export interface NameQuestion {
  readonly id: string;
  readonly literal: string;
  readonly word: string;
  readonly means: string;
  /** The right word and its neighbours in the sitting, shuffled. */
  readonly options: readonly { readonly id: string; readonly word: string }[];
}

export interface FriendQuestion {
  readonly id: string;
  readonly word: string;
  readonly looksLike: string;
  readonly means: string;
  readonly quip: string;
  /** The real meaning, the English the word looks like, and two other meanings, shuffled. */
  readonly options: readonly string[];
}

export interface WordplayPlan {
  readonly apart: readonly ApartStep[];
  readonly name: readonly NameQuestion[];
  readonly friends: readonly FriendQuestion[];
}

/**
 * Which compounds and false friends a sitting deals, as a walk round each
 * list. The day picks where the walk starts and each round moves one sitting
 * on, so a learner pressing "Another round" meets the next five rather than a
 * reshuffle of the same ones.
 */
export function dealSitting(day: string, round: number): { compounds: Compound[]; friends: FalseFriend[] } {
  const sittings = Math.ceil(COMPOUNDS.length / COMPOUNDS_PER_SITTING);
  const at = (dayIndex(day, "wordplay", sittings) + round) % sittings;
  const compounds = Array.from({ length: COMPOUNDS_PER_SITTING }, (_, i) =>
    COMPOUNDS[(at * COMPOUNDS_PER_SITTING + i) % COMPOUNDS.length]!);
  const friendSittings = Math.ceil(FALSE_FRIENDS.length / FRIENDS_PER_SITTING);
  const fat = (dayIndex(day, "wordplay-friends", friendSittings) + round) % friendSittings;
  const friends = Array.from({ length: FRIENDS_PER_SITTING }, (_, i) =>
    FALSE_FRIENDS[(fat * FRIENDS_PER_SITTING + i) % FALSE_FRIENDS.length]!);
  return { compounds: unique(compounds, (c) => c.id), friends: unique(friends, (f) => f.id) };
}

function unique<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(key(item)) ? false : (seen.add(key(item)), true)));
}

/**
 * Meanings to stand beside a right one: drawn from the whole list rather than
 * the sitting, so the wrong answers are as plausible as the right one, and
 * never a second right one.
 */
function otherMeanings(right: string, pool: readonly string[], n: number, random: () => number): string[] {
  const fold = (s: string) => s.toLowerCase().trim();
  const taken = new Set([fold(right)]);
  const out: string[] = [];
  for (const m of shuffle(pool, random)) {
    if (out.length >= n) break;
    if (taken.has(fold(m))) continue;
    taken.add(fold(m));
    out.push(m);
  }
  return out;
}

/** The whole sitting, ready to draw. Null where there is too little to play. */
export function buildWordplay(day: string, round: number, random: () => number = rng(seedFrom(`${day}:${round}`))): WordplayPlan | null {
  const { compounds, friends } = dealSitting(day, round);
  if (compounds.length < 3) return null;
  const allMeanings = COMPOUNDS.map((c) => c.means);

  const apart: ApartStep[] = compounds.map((c) => ({
    id: c.id,
    word: c.word,
    parts: c.parts.map((x) => ({ text: x.text, en: x.en })),
    literal: c.literal,
    means: c.means,
    quip: c.quip,
    guesses: shuffle([c.means, ...otherMeanings(c.means, allMeanings, OPTIONS - 1, random)], random),
  }));

  const name: NameQuestion[] = shuffle(compounds, random).map((c) => ({
    id: c.id,
    literal: c.literal,
    word: c.word,
    means: c.means,
    options: shuffle(
      [c, ...shuffle(compounds.filter((o) => o.id !== c.id), random).slice(0, OPTIONS - 1)],
      random,
    ).map((o) => ({ id: o.id, word: o.word })),
  }));

  const friendMeanings = FALSE_FRIENDS.map((f) => f.means);
  const friendQuestions: FriendQuestion[] = friends.map((f) => {
    const decoys = otherMeanings(f.means, friendMeanings.filter((m) => m !== f.looksLike), OPTIONS - 2, random)
      .filter((m) => m.toLowerCase() !== f.looksLike.toLowerCase());
    return {
      id: f.id,
      word: f.word,
      looksLike: f.looksLike,
      means: f.means,
      quip: f.quip,
      options: shuffle([f.means, f.looksLike, ...decoys], random),
    };
  });

  return { apart, name, friends: friendQuestions };
}

/** A guess is right when it is the word's own meaning. */
export function isGuessRight(step: ApartStep, option: string): boolean {
  return option === step.means;
}

/** A word is named right when the id picked is the question's own. */
export function isNamed(question: NameQuestion, id: string): boolean {
  return question.id === id;
}

/** A false friend is seen through when the meaning picked is its real one. */
export function isSeenThrough(question: FriendQuestion, option: string): boolean {
  return option === question.means;
}

/** Whether the option picked was the trap: the English the word only looks like. */
export function fellFor(question: FriendQuestion, option: string): boolean {
  return option === question.looksLike;
}
