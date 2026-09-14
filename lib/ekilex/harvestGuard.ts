/**
 * What the harvest may write, and when it may not write at all.
 *
 * Two faults, both found by running `npm run harvest -- --only=plaanid` on a
 * machine whose EKILEX_API_KEY had been withdrawn. Ekilex answered 401, the
 * fetch layer read every non-OK status as "this word does not exist", every
 * word of the unit was dropped, and the script wrote what was left to
 * `prisma/data/harvested.ts`. What was left was nothing, because `--only`
 * never merged: it filtered the requests to one unit and then wrote the
 * results of that unit as the whole file, so 1,452 course words became
 * twenty on a full run and none on a refused one. `syllabus.test.ts` would
 * have caught the empty file on the next `npm test`, which is the right
 * backstop and the wrong first line: a generator that can delete the data it
 * generates on a bad key is a generator with a door open.
 *
 * So two rules, pure, tested, and read by the script rather than restated in
 * it. A refusal is a fact about the key and never about a word, so one 401 or
 * 403 aborts the run before anything is written. And `--only` replaces exactly
 * the rows it asked for and keeps every other row as it was, so a partial run
 * is a partial run and not a smaller file.
 */

/** A status that says the key is the problem, not the word. */
export function refusesKey(status: number): boolean {
  return status === 401 || status === 403;
}

export interface HarvestRow {
  lemma: string;
  pos: string;
}

/** The unique key `Lexeme` uses and `syllabus.test.ts` keys the course on. */
export const rowKey = (row: HarvestRow): string => `${row.lemma}|${row.pos}`;

/**
 * The file after a partial harvest.
 *
 * Every existing row whose key was requested is replaced by what came back,
 * which for a word Ekilex dropped this time is nothing: a request the
 * Institute refused is dropped on a partial run exactly as on a full one,
 * loudly, and never kept from an older file it once answered on. Every row
 * that was not requested is kept untouched. Sorted the way the full run
 * sorts, so a partial run and a full run leave the file in one order.
 */
export function mergeHarvest<T extends HarvestRow>(
  existing: readonly T[],
  fresh: readonly T[],
  requested: ReadonlySet<string>,
): T[] {
  const kept = existing.filter((row) => !requested.has(rowKey(row)));
  const out = [...kept, ...fresh];
  out.sort((a, b) => a.lemma.localeCompare(b.lemma, "et"));
  return out;
}
