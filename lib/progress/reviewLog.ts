import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * ONE LEARNER'S REVIEW LOG, READ IN FULL ONCE AND THEN ONLY WHAT IS NEW.
 *
 * Progress is derived from the log on every request (ADR-014), and four
 * screens read a learner's whole history to do it: mastery on Practice, My
 * words and the flash round, the readiness picture, the charts on Progress and
 * the examination hub. Measured through a byte counter on the socket against a
 * learner with twenty thousand answers, which is a year of steady use, that was
 * 2.7 MB off the database for each of the first three and 9 MB for Progress,
 * on every page view and every prefetch. On Supabase's free plan that is the
 * egress quota, and it grows with exactly the thing the app is for.
 *
 * `Review` is append-only, which is what makes a cache safe here where it would
 * not be for a table that changes in place. So each warm instance keeps the
 * learner's rows and asks, per request, one tiny question: how many rows the
 * learner has, the newest `receivedAt`, and a fingerprint of the ids. If that
 * matches, the log in hand is the log in the database. If the count grew, only
 * rows received since the last read are fetched, with two minutes of slack for
 * a transaction that committed out of order, and merged by id; if the merge
 * does not come out at the count Postgres reported, or anything else moved,
 * the whole log is read again. That covers the writes that do not go through
 * `receivedAt`: a restored backup writes its history with it null, and an
 * erasure deletes the lot, and both change the head.
 *
 * Per instance, bounded, and keyed by the owner the caller already resolved.
 * Nothing here decides who may read what: every caller passes the id it got
 * from `requireUserId()` or from a roster it was allowed to read, exactly as it
 * passed it to the query this replaces.
 */

export interface LogRow {
  id: string;
  cardId: string;
  lexemeId: string | null;
  rating: number;
  reviewedAt: Date;
  durationMs: number;
  stateBefore: number;
  targetCase: string | null;
  slot: string | null;
  reachedSlot: string | null;
  receivedAt: Date | null;
  /** Said aloud rather than typed (docs/41-fifth-batch.md D4). */
  spoken: boolean;
}

interface Head {
  count: number;
  maxReceived: string | null;
  fingerprint: string;
}

interface Held {
  head: Head;
  /** In `reviewedAt` order, then `id`, oldest first. */
  rows: LogRow[];
}

/** How many rows every learner together may hold in one instance. */
const MAX_ROWS = 250_000;
/** How far back an incremental read reaches past the newest row it has. */
const SLACK_MS = 2 * 60_000;

const SELECT = {
  id: true, cardId: true, lexemeId: true, rating: true, reviewedAt: true, durationMs: true,
  stateBefore: true, targetCase: true, slot: true, reachedSlot: true, receivedAt: true, spoken: true,
} as const;

const held = new Map<string, Held>();

const sameHead = (a: Head, b: Head) =>
  a.count === b.count && a.maxReceived === b.maxReceived && a.fingerprint === b.fingerprint;

const byTime = (a: LogRow, b: LogRow) =>
  a.reviewedAt.getTime() - b.reviewedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

async function headOf(ownerId: string): Promise<Head> {
  const [row] = await prisma.$queryRaw<{ count: bigint; maxReceived: Date | null; fingerprint: string | null }[]>`
    SELECT count(*) AS count, max("receivedAt") AS "maxReceived",
           coalesce(sum(hashtext(id)::bigint), 0)::text AS fingerprint
    FROM "Review" WHERE "ownerId" = ${ownerId}
  `;
  return {
    count: Number(row?.count ?? 0),
    maxReceived: row?.maxReceived ? row.maxReceived.toISOString() : null,
    fingerprint: row?.fingerprint ?? "0",
  };
}

function keep(ownerId: string, entry: Held): void {
  held.delete(ownerId);
  held.set(ownerId, entry);
  let total = 0;
  for (const value of held.values()) total += value.rows.length;
  // Oldest learner out first; a learner bigger than the whole budget is not kept at all.
  for (const [key, value] of held) {
    if (total <= MAX_ROWS) break;
    held.delete(key);
    total -= value.rows.length;
  }
}

async function load(ownerId: string): Promise<LogRow[]> {
  const head = await headOf(ownerId);
  const before = held.get(ownerId);
  if (before && sameHead(before.head, head)) {
    keep(ownerId, before);
    return before.rows;
  }

  if (before && before.head.maxReceived && head.count > before.head.count) {
    const since = new Date(new Date(before.head.maxReceived).getTime() - SLACK_MS);
    const fresh = await prisma.review.findMany({
      where: { ownerId, receivedAt: { gte: since } },
      select: SELECT,
    });
    const seen = new Set(before.rows.map((r) => r.id));
    const added = fresh.filter((r) => !seen.has(r.id));
    if (before.rows.length + added.length === head.count) {
      const rows = [...before.rows, ...added].sort(byTime);
      keep(ownerId, { head, rows });
      return rows;
    }
  }

  const rows = (await prisma.review.findMany({ where: { ownerId }, select: SELECT })).sort(byTime);
  keep(ownerId, { head, rows });
  return rows;
}

/**
 * The learner's whole review log, oldest first. Memoised for the request, so
 * the screens that read it several times in one render ask the head once.
 */
export const reviewLog = cache((ownerId: string): Promise<readonly LogRow[]> => load(ownerId));

/** Newest first, ties broken on the id, which is the order the replaced reads asked for. */
export function newestFirst(rows: readonly LogRow[]): LogRow[] {
  return [...rows].sort((a, b) =>
    b.reviewedAt.getTime() - a.reviewedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
