import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import type { ExamLevel } from "./spec";
import { drawKeyOf, numberedOf } from "./seed";

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

/**
 * A score for one entry under one key.
 *
 * The key and the id are hashed apart and combined before the generator runs,
 * so no key's scores are a small edit of another's. What keeps two numbered
 * papers apart was measured rather than argued, with
 * `scripts/measure-exam-volume.ts --numbered`: the first version, one pool
 * ordered by the score it was selected on, shared 17 to 33 percent of its
 * words with the closest earlier paper, against 4 to 12 for random papers;
 * this one, two halves and a separate score for the order, shares 5 to 12.
 */
function entryScore(level: ExamLevel, key: string, id: string | number): number {
  const k = seedFrom(`pool:${level}:${key}`);
  const e = seedFrom(`id:${String(id)}`);
  return rng((k ^ Math.imul(e, 0x9e3779b1)) >>> 0)();
}

function topBy<T extends string | number>(ids: readonly T[], level: ExamLevel, key: string, n: number): T[] {
  return ids
    .map((id) => ({ id, s: entryScore(level, key, id) }))
    .sort((a, b) => b.s - a.s || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0))
    .slice(0, n)
    .map((x) => x.id);
}

/** The share of a numbered paper's pool taken from the paper's own band, where the band has that many. */
export const AT_LEVEL_SHARE = 0.5;

/**
 * A numbered paper's pool, drawn so the dictionary growing moves it as little
 * as possible, and so the paper is a paper of its level.
 *
 * STABLE. `drawPool` shuffles the whole eligible set, so one entry added
 * anywhere reorders all of it and the cut at `POOL_SIZE` takes a different
 * five hundred. That is harmless for a paper nobody will see twice and wrong
 * for "paper 7", which a learner sits, reviews and sits again. So each entry
 * gets a score of its own from the key and its id, and the pool is the highest
 * scores: an entry added can displace at most one member of its half.
 *
 * AT ITS LEVEL. A paper draws from its band and every band below, and measured
 * over the shipped dictionary a random B1 paper's words were a third B1 and a
 * B2 paper's a fifth B2, because the bands below are larger. So up to half the
 * pool comes from the paper's own band, or its natural share where that is
 * more, and the rest from everything else it may draw on. A band too small to fill its half gives all it has, which at C1
 * is about a fifth: the dictionary is thin there, and `scripts/measure-exam-
 * volume.ts --numbered` prints the figure rather than hiding it.
 *
 * Random papers keep `drawPool` exactly, because one started before this is
 * rebuilt to be marked.
 */
export function drawStablePool<T extends string | number>(
  rows: readonly { id: T; cefr: string | null }[],
  level: ExamLevel,
  key: string,
): T[] {
  const own = rows.filter((r) => r.cefr === level).map((r) => r.id);
  const rest = rows.filter((r) => r.cefr !== level).map((r) => r.id);
  // At least half, and never less than a random draw would have taken: at A2
  // the band is already more than half of what a paper may draw on.
  const natural = rows.length === 0 ? 0 : Math.round((POOL_SIZE * own.length) / rows.length);
  const fromOwn = topBy(own, level, `${key}:own`, Math.max(Math.floor(POOL_SIZE * AT_LEVEL_SHARE), natural));
  const fromRest = topBy(rest, level, `${key}:rest`, POOL_SIZE - fromOwn.length);
  /*
    Interleaved by score rather than one half after the other, because the
    order of the pool is the order the paper's builders meet words in, and a
    paper whose first tasks took only its own band would put the hard words in
    reading and the easy ones in speaking.
  */
  return [...fromOwn, ...fromRest]
    .map((id) => ({ id, s: entryScore(level, `${key}:order`, id) }))
    .sort((a, b) => b.s - a.s || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0))
    .map((x) => x.id);
}

/**
 * The pool for a seed, whichever kind it is: the stable draw on the number for
 * a numbered paper, and the old draw on the seed for every other, so a paper
 * started before numbered papers existed is rebuilt and marked exactly as it
 * was.
 */
export function poolForSeed<T extends string | number>(
  rows: readonly { id: T; cefr: string | null }[],
  level: ExamLevel,
  seed: string,
): T[] {
  return numberedOf(seed)
    ? drawStablePool(rows, level, drawKeyOf(seed))
    : drawPool(rows.map((r) => r.id), level, seed);
}
