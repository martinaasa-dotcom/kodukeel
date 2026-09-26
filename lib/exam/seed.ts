import type { SkillKey } from "./types";

/**
 * WHAT A PAPER'S SEED SAYS, AND THE ONE THING IT SAYS BESIDES THE DRAW.
 *
 * `submitExam` rebuilds a paper on the server to mark it, and a paper is a
 * function of (level, seed, pool). The pool was a function of the seed and of
 * which words the dictionary held *at the moment it was read*, so a word added
 * while somebody was sitting a paper, by a live lookup, a confirmed scan or an
 * accepted report, which any learner can cause, grew the eligible set by one.
 * The shuffle walks the whole set, so one more id reorders all of it, the cut
 * at five hundred takes a different pool, and the item ids are positional: the
 * answers were marked against questions nobody had been asked.
 *
 * So a fresh seed carries the moment the paper was first built, and the pool
 * is drawn only from entries that existed then. Adding a word stops reaching a
 * paper already in progress, and the paper is a function of (level, seed) and
 * of the dictionary as it stood when the seed was issued, which is a fact that
 * does not move.
 *
 * Nothing about this needs trusting. The seed is in the URL and anybody can
 * type one, which was already true: a typed seed buys a different draw of the
 * same eligible words and nothing else. A time in the future is read as none,
 * and so is a seed with no time in it at all, which is every seed the suites
 * use and every paper started before this existed, so those keep the reading
 * they had.
 *
 * What it does not pin is a word that existed and changed: a band corrected or
 * a form edited during the sitting still reaches the rebuilt paper. Those are
 * edits to the shared dictionary by a reviewer, not a side effect of anybody
 * reading it, and they are rare enough that pinning them would need a copy of
 * the pool stored per sitting, which is a larger thing than the fault.
 */

/** Anything earlier than this is not a moment a paper here was started. */
const EPOCH = Date.UTC(2024, 0, 1);

/** A fresh seed: a random draw, then the moment, both in base 36. */
export function freshSeed(now: Date = new Date(), random: () => number = Math.random): string {
  const draw = random().toString(36).slice(2, 10) || "0";
  // A random draw may never read as a numbered paper (`numberedOf` below), or
  // it would be drawn on a number rather than on itself. Only a draw of three
  // characters or fewer could, and it is given a letter a number never starts with.
  const safe = /^p[1-9]\d?[wlrs]?$/.test(draw) ? `x${draw}` : draw;
  return `${safe}-${now.getTime().toString(36)}`;
}

/**
 * The moment the paper was first built, or null where the seed does not say.
 *
 * Null keeps the older reading, the whole dictionary as it is now, rather than
 * guessing: a seed from before this, or one somebody typed, has no moment in it.
 */
export function seedIssuedAt(seed: string, now: Date = new Date()): Date | null {
  const match = /^[0-9a-z]{1,16}-([0-9a-z]{6,10})$/.exec(seed);
  if (!match) return null;
  const ms = parseInt(match[1]!, 36);
  if (!Number.isFinite(ms) || ms < EPOCH || ms > now.getTime()) return null;
  return new Date(ms);
}

/*
  THE NUMBERED SET.

  A learner working towards an examination wants what a workbook gives them: a
  paper they can sit, look at, and come back to as "paper 7", and a way to sit
  just the reading when the reading is the problem. A random seed gives neither,
  so a numbered paper is a seed of its own shape, `p7-<moment>` for the whole
  paper and `p7r-<moment>` for its reading alone, carrying the same moment every
  fresh seed carries so the pool is pinned while it is being sat.

  WHAT DECIDES THE QUESTIONS IS THE NUMBER, NOT THE MOMENT. `drawKeyOf` turns
  the seed into the key the pool and the paper are drawn with, and for a
  numbered seed that key is `set-7`, whoever sits it and whenever. Sitting paper
  7 twice gives the same questions; the moment only decides which words the
  dictionary held at the time, and `lib/exam/pool.ts` draws a numbered pool so
  that one word added moves at most one word of it.

  Each sitting is still its own seed, so sitting paper 7 again is a new sitting
  rather than the old result reopened, which is what a learner resitting a
  workbook paper expects.
*/


/** How many numbered papers each level offers. Measured, not chosen: see `scripts/measure-exam-volume.ts`. */
export const PAPERS_PER_LEVEL = 25;

const PART_CODE: Record<SkillKey, string> = { writing: "w", listening: "l", reading: "r", speaking: "s" };
const CODE_PART: Record<string, SkillKey> = { w: "writing", l: "listening", r: "reading", s: "speaking" };

export interface Numbered {
  readonly number: number;
  /** The one part sat, or null for the whole paper. */
  readonly part: SkillKey | null;
}

/** A seed for numbered paper `number`, whole or one part, issued now. */
export function numberedSeed(number: number, part: SkillKey | null, now: Date = new Date()): string {
  if (!Number.isInteger(number) || number < 1 || number > PAPERS_PER_LEVEL) {
    throw new RangeError(`there is no paper ${number}`);
  }
  return `p${number}${part ? PART_CODE[part] : ""}-${now.getTime().toString(36)}`;
}

/** Which numbered paper a seed is, or null for a seed drawn at random. */
export function numberedOf(seed: string): Numbered | null {
  const match = /^p([1-9]\d?)([wlrs])?-[0-9a-z]{6,10}$/.exec(seed);
  if (!match) return null;
  const number = Number(match[1]);
  if (number > PAPERS_PER_LEVEL) return null;
  return { number, part: match[2] ? CODE_PART[match[2]]! : null };
}

/**
 * The key a paper's pool and questions are drawn with.
 *
 * The seed itself for a random paper, which is every paper sat before this and
 * so marks them exactly as it always did. The number for a numbered one.
 */
export function drawKeyOf(seed: string): string {
  const numbered = numberedOf(seed);
  return numbered ? `set-${numbered.number}` : seed;
}
