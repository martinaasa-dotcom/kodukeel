/**
 * WHAT THE LAST THIRTY DAYS ASKED OF EKILEX, READ FOR /impact.
 *
 * Pure, like the rest of `lib/research/`: the rows come from
 * `lib/dict/ekilexCount.ts` and this decides what may be said about them. It
 * is a count and only ever worded as one. It is not a claim about Ekilex, its
 * capacity or its quality, and nothing here is a cost: `/funding` lists Ekilex
 * as given and never priced (docs/44-sixth-batch.md S-2).
 */
export interface EkilexDayRow {
  day: string;
  search: number;
  details: number;
  refused: number;
  failed: number;
  stored: number;
}

export interface EkilexLoad {
  /** Requests that reached Ekilex: searches and details together. */
  live: number;
  /** Of those, how many it refused and how many failed after every try. */
  refused: number;
  failed: number;
  /** Entries Ekilex supplied, answered from the stored copy with no request. */
  stored: number;
  /** `stored` as a share of all the answers, live and stored, in whole percent; null with nothing to divide. */
  storedPct: number | null;
  /** True when nothing at all was counted in the window. */
  empty: boolean;
}

/** `YYYY-MM-DD` in UTC, the key `EkilexDay` is stored under. */
export function utcDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function summariseEkilexLoad(rows: readonly EkilexDayRow[]): EkilexLoad {
  let live = 0;
  let refused = 0;
  let failed = 0;
  let stored = 0;
  for (const row of rows) {
    live += row.search + row.details;
    refused += row.refused;
    failed += row.failed;
    stored += row.stored;
  }
  const answers = live + stored;
  return {
    live,
    refused,
    failed,
    stored,
    storedPct: answers > 0 ? Math.round((stored / answers) * 100) : null,
    empty: answers === 0,
  };
}
