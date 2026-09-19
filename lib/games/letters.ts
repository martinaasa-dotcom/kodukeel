/**
 * TÄHED: THE LETTERS OF A TAUGHT WORD, SHUFFLED, TO BE PUT BACK IN ORDER.
 *
 * A1 evenings were Match, Listening, the closing review and a word met on the
 * ladder, and a beginner reported them as the same evening every night. What
 * a beginner has at A1 is a few dozen words and the alphabet those words are
 * spelled in, and the alphabet is the thing an English keyboard makes strange:
 * õ, ä, ö and ü are not letters somebody has, they are letters somebody has
 * to notice. So this is a game about noticing them. The meaning is shown, the
 * word is heard, and its letters arrive scrambled on tiles; the learner taps
 * them into order. Every letter on the board is one of the word's own, so the
 * only thing there is to get wrong is the order, which is exactly what a
 * beginner reading `tänan` as `tanan` has not yet seen.
 *
 * NOTHING HERE IS WRITTEN. The tiles are the code points of a dictionary
 * lemma, shuffled with the app's one shuffle, and the check is a string
 * comparison against that lemma. The module holds no Estonian at all and the
 * word it scrambles is the caller's.
 *
 * WHICH WORDS CAN BE PLAYED. One word, three letters or more, and at least two
 * different letters in it: `ei` and `ja` have no order to find, and `aaa`
 * would have one arrangement. A phrase has spaces, which are not letters, and
 * is `Tere hommikust!` on the greetings unit, taught as a phrase and asked as
 * one on every other round.
 *
 * Pure, unit tested, and the page is the only thing that knows which words the
 * learner holds.
 */

import { shuffle } from "@/lib/random/shuffle";

/** The shortest word worth scrambling. Two letters is a coin toss. */
export const MIN_LETTERS = 3;

/** The longest, since a row of tiles has to fit a phone at 44px a tile. */
export const MAX_LETTERS = 9;

/** Split a word into the letters a tile carries, one code point each. */
export function lettersOf(word: string): string[] {
  return Array.from(word.normalize("NFC"));
}

/** Whether a lemma can be played: one word, long enough, with an order to find. */
export function spellable(lemma: string): boolean {
  const word = lemma.trim();
  if (!/^[\p{L}]+$/u.test(word)) return false;
  const letters = lettersOf(word);
  if (letters.length < MIN_LETTERS || letters.length > MAX_LETTERS) return false;
  return new Set(letters.map((l) => l.toLowerCase())).size >= 2;
}

/**
 * The word's letters in an order that is not the word's.
 *
 * Tries the shuffle until it differs, which for a word with two different
 * letters in it is a handful of draws at worst; the cap is a guard against a
 * word `spellable` should have refused rather than a bound anything reaches.
 * A word the shuffle cannot move is handed back reversed, which for any word
 * with two different letters is a different string.
 */
export function scramble(word: string, random: () => number = Math.random): string[] {
  const letters = lettersOf(word);
  for (let i = 0; i < 20; i++) {
    const out = shuffle(letters, random);
    if (out.join("") !== word) return out;
  }
  return [...letters].reverse();
}

/**
 * A tile on the board: its letter and a stable id, since a word can hold the
 * same letter twice and the board has to know which of the two was tapped.
 */
export interface Tile {
  id: number;
  letter: string;
}

export function tilesFor(word: string, random: () => number = Math.random): Tile[] {
  return scramble(word, random).map((letter, id) => ({ id, letter }));
}

/**
 * Which unused tile a typed key takes, so a keyboard plays the board the way a
 * finger does: the first free tile carrying that letter, compared without
 * case so `E` finds `e` and a capital lemma still answers to a lowercase key.
 */
export function tileForKey(tiles: readonly Tile[], used: ReadonlySet<number>, key: string): Tile | null {
  const want = key.toLowerCase();
  return tiles.find((t) => !used.has(t.id) && t.letter.toLowerCase() === want) ?? null;
}

/** Whether the tiles placed so far still spell a prefix of the word. */
export function onTrack(word: string, placed: readonly string[]): boolean {
  const letters = lettersOf(word);
  return placed.every((letter, i) => letters[i] === letter);
}

/**
 * How a finished board is graded: right first time is Good, right after one
 * miss is Hard, since the second go had the first letter placed for them, and
 * a second miss is Again. Nothing here talks to the scheduler; the page hands
 * the number to `gradeCard` like every other round (ADR-016).
 */
export function ratingFor(misses: number, solved: boolean): 1 | 2 | 3 {
  if (!solved) return 1;
  return misses === 0 ? 3 : 2;
}
