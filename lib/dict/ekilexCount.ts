/**
 * WHAT THIS INSTALLATION ASKS OF EKILEX, COUNTED A DAY AT A TIME.
 *
 * docs/44-sixth-batch.md D17. The gate in `lib/ekilex/client.ts` fills an
 * `EkilexTally` as it goes; `lib/dict/lookup.ts` hands this the tally once a
 * lookup is over, and this adds it to the day's row in one statement. A
 * dictionary entry Ekilex supplied and this database answered with no request
 * at all is counted here too, as `stored`, by the dictionary page.
 *
 * ONE STATEMENT, NO READ FIRST, the way `lib/usage/sharedLimit.ts` counts:
 * `INSERT ... ON CONFLICT DO UPDATE SET n = n + EXCLUDED.n`. Two instances
 * counting the same day at once both land, where a Prisma upsert could lose
 * one to a unique violation on the create.
 *
 * A COUNT MAY NEVER COST A PAGE. Every write here swallows its own failure:
 * the cost of a lost count is one figure on /impact being one short, and the
 * cost of a thrown one would be a dictionary entry that did not render.
 */
import { prisma } from "@/lib/db";
import type { EkilexTally } from "@/lib/ekilex/client";
import { type EkilexDayRow, type EkilexLoad, summariseEkilexLoad, utcDay } from "@/lib/research/ekilexLoad";

/** Adds what one lookup asked of Ekilex to today's row. Nothing to add, nothing written. */
export async function recordEkilexTally(tally: EkilexTally, now = new Date()): Promise<void> {
  if (tally.search + tally.details + tally.refused + tally.failed === 0) return;
  await prisma.$executeRaw`
    INSERT INTO "EkilexDay" ("day", "search", "details", "refused", "failed", "stored", "updatedAt")
    VALUES (${utcDay(now)}, ${tally.search}, ${tally.details}, ${tally.refused}, ${tally.failed}, 0, NOW())
    ON CONFLICT ("day") DO UPDATE SET
      "search" = "EkilexDay"."search" + EXCLUDED."search",
      "details" = "EkilexDay"."details" + EXCLUDED."details",
      "refused" = "EkilexDay"."refused" + EXCLUDED."refused",
      "failed" = "EkilexDay"."failed" + EXCLUDED."failed",
      "updatedAt" = NOW()
  `.then(() => undefined, () => undefined);
}

/** One entry Ekilex supplied, answered from this database with no request to Ekilex. */
export async function recordStoredAnswer(now = new Date()): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "EkilexDay" ("day", "stored", "updatedAt")
    VALUES (${utcDay(now)}, 1, NOW())
    ON CONFLICT ("day") DO UPDATE SET "stored" = "EkilexDay"."stored" + 1, "updatedAt" = NOW()
  `.then(() => undefined, () => undefined);
}

/** The rows for the last `days` days, today included, oldest first. */
export async function ekilexDays(days: number, now = new Date()): Promise<EkilexDayRow[]> {
  const from = utcDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  return prisma.ekilexDay.findMany({
    where: { day: { gte: from } },
    orderBy: { day: "asc" },
    select: { day: true, search: true, details: true, refused: true, failed: true, stored: true },
  });
}

/**
 * Corrections a reviewer here accepted to entries Ekilex supplied, which is
 * what this app gives back. Counted by group, because accepting acts on a
 * group: forty people reporting one wrong form are one correction.
 */
export async function acceptedEkilexCorrections(since: Date | null): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(DISTINCT s."groupKey") AS n
    FROM "Suggestion" s
    JOIN "Lexeme" l ON l."id" = s."lexemeId"
    WHERE s."status" = 'ACCEPTED'
      AND l."ekilexWordId" IS NOT NULL
      AND (${since}::timestamp IS NULL OR s."reviewedAt" >= ${since}::timestamp)
  `;
  return Number(rows[0]?.n ?? 0);
}

/** What /impact says about Ekilex, or null where the figures could not be read just now. */
export interface EkilexImpact {
  windowDays: number;
  load: EkilexLoad;
  correctionsInWindow: number;
  correctionsEver: number;
}

export async function ekilexImpact(windowDays: number, now = new Date()): Promise<EkilexImpact | null> {
  try {
    const since = new Date(now.getTime() - windowDays * 86_400_000);
    const [rows, correctionsInWindow, correctionsEver] = await Promise.all([
      ekilexDays(windowDays, now),
      acceptedEkilexCorrections(since),
      acceptedEkilexCorrections(null),
    ]);
    return { windowDays, load: summariseEkilexLoad(rows), correctionsInWindow, correctionsEver };
  } catch {
    return null;
  }
}
