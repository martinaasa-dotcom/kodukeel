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
  return `${draw}-${now.getTime().toString(36)}`;
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
