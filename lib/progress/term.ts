import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  caseWindowWeeks, termFigures, type CaseCount, type TermFigures, type TermPeriod, type TermRange,
} from "@/lib/classroom/term";
import type { DayClock } from "@/lib/time/day";

/**
 * THE QUERIES BEHIND A CLASS'S END-OF-TERM PAGE, AND NOTHING ABOUT ANYBODY.
 *
 * Three reads, each bounded by the class's members and the range, and each an
 * aggregate in Postgres: the answers per week with the members who gave them
 * counted, the members active at all, and the answers per case at the two
 * ends of the range. No query here returns a name, and no row leaves this
 * module about one learner: the case counts carry an owner id only so the
 * rule that a case needs three students can be applied, and `termFigures`
 * spends that id and returns none.
 *
 * The class's owner is left out of every figure, as the weekly letter leaves
 * them out: a teacher holds a member row in their own class and is not one of
 * the people the page describes.
 *
 * Owner only: the page resolves the class through `rosterClassFor`, so a
 * member, a stranger and a guessed id all meet one not-found before this runs.
 */
export async function classTermFigures(
  classroomId: string, ownerId: string, range: TermRange, clock: DayClock, opts: { cases: boolean },
): Promise<TermFigures> {
  const members = await prisma.classroomMember.findMany({
    where: { classroomId, ownerId: { not: ownerId } },
    select: { ownerId: true },
    orderBy: { ownerId: "asc" },
  });
  const ids = members.map((m) => m.ownerId);
  const weekly: TermPeriod[] = range.edges.slice(0, -1).map((at) => ({ start: clock.dayKey(at), active: 0, reviews: 0 }));
  if (ids.length === 0) return termFigures({ weekly, everActive: 0, startCases: [], endCases: [] });

  const window = caseWindowWeeks(range.weeks);
  const startEnd = range.edges[window]!;
  const endStart = range.edges[range.weeks - window]!;
  /*
    `reviewedAt` is a timestamp without a zone holding UTC, so it is read AT
    TIME ZONE 'UTC' once to make it an instant before it is compared with the
    edges, which are instants.
  */
  const edges = range.edges.map((d) => d.toISOString());
  const [weeks, ever, cases] = await Promise.all([
    prisma.$queryRaw<{ bucket: number; reviews: bigint; active: bigint }[]>`
      SELECT width_bucket("reviewedAt" AT TIME ZONE 'UTC', ${edges}::timestamptz[]) AS bucket,
             count(*) AS reviews, count(DISTINCT "ownerId") AS active
      FROM "Review"
      WHERE "ownerId" IN (${Prisma.join(ids)})
        AND "reviewedAt" >= ${range.from} AND "reviewedAt" < ${range.until}
      GROUP BY bucket`,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(DISTINCT "ownerId") AS n FROM "Review"
      WHERE "ownerId" IN (${Prisma.join(ids)})
        AND "reviewedAt" >= ${range.from} AND "reviewedAt" < ${range.until}`,
    /*
      A workplace group reads no case at all, as its screen does not
      (`workplaceRoster` never selects one): an employer has no lesson to plan.
    */
    !opts.cases ? Promise.resolve([]) : prisma.$queryRaw<{ part: number; ownerId: string; targetCase: string | null; slot: string | null; ok: boolean; n: bigint }[]>`
      SELECT CASE WHEN "reviewedAt" < ${startEnd} THEN 0 ELSE 1 END AS part,
             "ownerId", "targetCase", "slot", ("rating" >= 3) AS ok, count(*) AS n
      FROM "Review"
      WHERE "ownerId" IN (${Prisma.join(ids)})
        AND "reviewedAt" >= ${range.from} AND "reviewedAt" < ${range.until}
        AND ("reviewedAt" < ${startEnd} OR "reviewedAt" >= ${endStart})
        AND ("targetCase" IS NOT NULL OR "slot" IS NOT NULL)
      GROUP BY part, "ownerId", "targetCase", "slot", ok`,
  ]);

  for (const row of weeks) {
    const at = weekly[Number(row.bucket) - 1];
    if (at) weekly[Number(row.bucket) - 1] = { ...at, reviews: Number(row.reviews), active: Number(row.active) };
  }
  const count = (part: number): CaseCount[] => cases
    .filter((c) => Number(c.part) === part)
    .map((c) => ({ ownerId: c.ownerId, targetCase: c.targetCase, slot: c.slot, ok: c.ok, count: Number(c.n) }));
  return termFigures({ weekly, everActive: Number(ever[0]?.n ?? 0), startCases: count(0), endCases: count(1) });
}
