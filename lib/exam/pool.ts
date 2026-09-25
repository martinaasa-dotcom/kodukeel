import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import type { ExamLevel } from "./spec";

/**
 * Which dictionary entries one paper is drawn from, as a rule rather than a query.
 *
 * `lib/progress/exam.ts` reads the rows and `scripts/measure-exam-volume.ts`
 * reads the shipped file, and both have to draw the same way or the script is
 * measuring a paper the app never builds. It did: handed the whole dictionary
 * for every level, it reported every A1 paper full, where the app draws an A1
 * paper from the A1 words alone. One rule, two readers.
 */

const RANK: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };

/** How many dictionary entries one paper is drawn from. */
export const POOL_SIZE = 500;

/** The bands a paper at this level may draw from. */
export function eligibleLevels(level: ExamLevel): string[] {
  const ceiling = RANK[level] ?? 2;
  return Object.entries(RANK).filter(([, rank]) => rank <= ceiling).map(([name]) => name);
}

/**
 * Whether an entry may be in the pool. From B1 up an ungraded entry is in, since
 * the untagged tail is mostly above B1; below it only a graded word is.
 */
export function eligibleFor(level: ExamLevel, cefr: string | null): boolean {
  if (cefr === null) return (RANK[level] ?? 2) >= RANK.B1!;
  return eligibleLevels(level).includes(cefr);
}

/**
 * The pool: eligible ids in an order nothing can move, shuffled on a seed of
 * the paper's own, and the first `POOL_SIZE` of them.
 */
export function drawPool<T>(orderedIds: readonly T[], level: ExamLevel, seed: string): T[] {
  return shuffle([...orderedIds], rng(seedFrom(`pool:${level}:${seed}`))).slice(0, POOL_SIZE);
}
