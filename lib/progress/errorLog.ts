import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { KEEP_DAYS } from "@/lib/observability/store";

/**
 * The errors of the last `KEEP_DAYS` days, one entry per kind, for
 * `/admin/errors`. Two queries whatever the table holds: the counts and dates
 * per fingerprint, and the latest occurrence of each, which is what the page
 * shows the detail of.
 */
export interface ErrorKind {
  fingerprint: string;
  at: string;
  message: string;
  stack: string | null;
  extra: string | null;
  count: number;
  firstAt: Date;
  lastAt: Date;
  emailed: boolean;
}

/** The most kinds the page lists, newest first. More than that is a different problem. */
export const KINDS_SHOWN = 100;

export async function errorKinds(now: Date = new Date()): Promise<ErrorKind[]> {
  const since = new Date(now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000);
  const groups = await prisma.errorEvent.groupBy({
    by: ["fingerprint"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
    orderBy: [{ _max: { createdAt: "desc" } }, { fingerprint: "asc" }],
    take: KINDS_SHOWN,
  });
  if (groups.length === 0) return [];

  const fingerprints = groups.map((g) => g.fingerprint);
  const latest = await prisma.$queryRaw<{
    fingerprint: string; at: string; message: string; stack: string | null; extra: string | null; emailed: boolean;
  }[]>(Prisma.sql`
    SELECT DISTINCT ON (fingerprint)
      fingerprint, at, message, stack, extra,
      bool_or(alerted) OVER (PARTITION BY fingerprint) AS emailed
    FROM "ErrorEvent"
    WHERE "createdAt" >= ${since} AND fingerprint IN (${Prisma.join(fingerprints)})
    ORDER BY fingerprint, "createdAt" DESC, id
  `);
  const byPrint = new Map(latest.map((row) => [row.fingerprint, row]));

  return groups.flatMap((g) => {
    const row = byPrint.get(g.fingerprint);
    if (!row || !g._min.createdAt || !g._max.createdAt) return [];
    return [{
      fingerprint: g.fingerprint,
      at: row.at,
      message: row.message,
      stack: row.stack,
      extra: row.extra,
      count: g._count._all,
      firstAt: g._min.createdAt,
      lastAt: g._max.createdAt,
      emailed: row.emailed,
    }];
  });
}
