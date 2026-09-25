/**
 * WHAT THE HARVEST MAY WRITE, DECIDED WITHOUT A NETWORK OR A FILESYSTEM.
 *
 * `npm run harvest -- --only=plaanid` was run with a key ekilex.ee answers 403
 * to, and the script printed every word of the unit as "not in Ekilex" and
 * rewrote `prisma/data/harvested.ts` from about 17,400 lines to two. Two faults
 * in one run, and neither was the key. The transport returned the same `null`
 * for "Ekilex holds no such word" and "Ekilex refused to say", so a refusal
 * was written down as a miss, which is the rule this repository states twice
 * and had already learned in the seed and in `enrichFromEkilex`. And `--only`
 * wrote only the words it had asked about, so a unit re-harvested on its own
 * deleted the other seventy, key or no key.
 *
 * So the transport says which of three things happened (`readAnswer`), and the
 * write is planned rather than taken (`planHarvestWrite`): a refused request
 * writes nothing, a run that answered nothing writes nothing, a word that was
 * not answered keeps the row it had, a word that was not asked keeps its row,
 * and a harvest that would drop most of what the file holds is refused unless
 * somebody says `--force`. Pure, so the guard is tested against a stubbed
 * transport rather than against the Institute's service.
 */

/** What one request to Ekilex came back as. */
export type Answer<T> =
  /** Ekilex answered. An empty body is a real miss and is the caller's to read. */
  | { readonly kind: "answered"; readonly value: T }
  /** Ekilex would not answer this key or this request: 401, 403, 404 and the rest of 4xx. */
  | { readonly kind: "refused"; readonly status: number }
  /** The service or the network did not answer at all: 429, 5xx, a timeout. Worth a retry. */
  | { readonly kind: "failed"; readonly reason: string };

/** The part of a `Response` the reading needs, so a test can hand one in. */
export interface ResponseLike {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

/**
 * One request, read into an `Answer`. The transport is handed in, so nothing
 * here opens a socket.
 */
export async function readAnswer<T>(doFetch: () => Promise<ResponseLike>): Promise<Answer<T>> {
  let res: ResponseLike;
  try {
    res = await doFetch();
  } catch (err) {
    return { kind: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
  if (res.status === 429 || res.status >= 500) return { kind: "failed", reason: `HTTP ${res.status}` };
  if (!res.ok) return { kind: "refused", status: res.status };
  try {
    return { kind: "answered", value: (await res.json()) as T };
  } catch (err) {
    return { kind: "failed", reason: `unreadable body: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** A row the harvest file holds, by the key the seed conflicts on. */
export interface Keyed { readonly lemma: string; readonly pos: string }

export const rowKey = (row: Keyed): string => `${row.lemma}|${row.pos}`;

/**
 * The share of the previous file a harvest may drop before it is refused
 * without `--force`. Half, because a real change to the course moves a unit
 * or two and a run that loses more than that has lost the source, not the
 * words.
 */
export const MAX_DROP_SHARE = 0.5;

export interface HarvestPlanInput<T extends Keyed> {
  /** What the file held before this run. */
  readonly previous: readonly T[];
  /** Every word this run asked Ekilex about, by `rowKey`. */
  readonly asked: ReadonlySet<string>;
  /**
   * Every word the course requests today, by `rowKey`, whether or not this run
   * asked about it.
   *
   * A row whose key the course no longer names leaves, even on an `--only` run
   * that did not ask about it. Without this, a word whose part of speech or
   * homonym changed kept its old row beside the new one for as long as nobody
   * ran the whole harvest: `täis` came back as "full" under ADVERB and the old
   * ADJECTIVE row, carrying the forms and sentences of the homonym meaning
   * "whole", stayed in the file, which the seed then writes as a second entry.
   */
  readonly wanted: ReadonlySet<string>;
  /** What came back with forms, this run. */
  readonly harvested: readonly T[];
  /** Words asked that Ekilex never answered for, by `rowKey`. Kept, never dropped. */
  readonly unanswered: ReadonlySet<string>;
  /** How many requests came back `refused`, by status. */
  readonly refused: ReadonlyMap<number, number>;
  /** `--force`: write even a harvest that drops most of the file. */
  readonly force: boolean;
}

export type HarvestPlan<T extends Keyed> =
  | { readonly write: true; readonly rows: readonly T[]; readonly kept: number }
  | { readonly write: false; readonly why: string };

/**
 * Whether to write, and what. The rows are the previous file with this run's
 * answers stood in: a word asked and answered takes its new row, a word asked
 * and not answered keeps its old one, a word not asked (`--only`) keeps its old
 * one, a word asked and genuinely dropped by Ekilex leaves, and a word the
 * course no longer requests leaves whether or not it was asked.
 */
export function planHarvestWrite<T extends Keyed>(input: HarvestPlanInput<T>): HarvestPlan<T> {
  const refusedTotal = [...input.refused.values()].reduce((a, b) => a + b, 0);
  if (refusedTotal > 0) {
    const statuses = [...input.refused.entries()].map(([status, n]) => `HTTP ${status} x${n}`).join(", ");
    return {
      write: false,
      why: `Ekilex refused ${refusedTotal} request${refusedTotal === 1 ? "" : "s"} (${statuses}). `
        + "A refusal is not a miss: check EKILEX_API_KEY. Nothing was written.",
    };
  }
  if (input.harvested.length === 0 && input.unanswered.size > 0) {
    return {
      write: false,
      why: `Ekilex answered for none of the ${input.unanswered.size} words asked. The source did not answer, `
        + "so nothing was written.",
    };
  }

  const rows: T[] = [];
  let kept = 0;
  for (const row of input.previous) {
    const key = rowKey(row);
    // No longer part of the course: it leaves, whichever words this run asked.
    if (!input.wanted.has(key)) continue;
    if (!input.asked.has(key) || input.unanswered.has(key)) {
      rows.push(row);
      kept += 1;
      continue;
    }
    // Asked and answered: the new row stands in below, or the word leaves.
  }
  for (const row of input.harvested) rows.push(row);

  const dropped = input.previous.length - rows.length;
  if (!input.force && input.previous.length > 0 && dropped > input.previous.length * MAX_DROP_SHARE) {
    return {
      write: false,
      why: `This harvest would drop ${dropped} of the ${input.previous.length} words the file holds, `
        + "which is more than half. That is the source going away rather than the course changing. "
        + "Pass --force to write it anyway.",
    };
  }
  return { write: true, rows, kept };
}
