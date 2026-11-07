import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkDirectionFrom, checkOutcomeFrom, type LastCheck, type StoredDirection } from "@/lib/games/commonCheck";

/**
 * WHERE EACH WORD STOOD THE LAST TIME THIS LEARNER CHECKED IT.
 *
 * The newest `WordCheck` row per word and direction, which is the whole of
 * what the next check needs to lead with the misses. `DISTINCT ON` in
 * Postgres rather than reading every row and keeping the newest here: the
 * table only ever grows, and a learner who checks a list every day would
 * otherwise send a year of answers across the wire to pick two hundred.
 * Ordered to the id so two rows written in the same millisecond settle the
 * same way every time.
 */
export async function lastChecks(ownerId: string, lexemeIds: readonly string[]): Promise<Map<string, LastCheck>> {
  const out = new Map<string, LastCheck>();
  if (lexemeIds.length === 0) return out;
  const rows = await prisma.$queryRaw<Array<{ lexemeId: string; direction: string; outcome: string; checkedAt: Date }>>`
    SELECT DISTINCT ON ("lexemeId", "direction") "lexemeId", "direction", "outcome", "checkedAt"
    FROM "WordCheck"
    WHERE "ownerId" = ${ownerId} AND "lexemeId" IN (${Prisma.join([...lexemeIds])})
    ORDER BY "lexemeId", "direction", "checkedAt" DESC, "id" DESC`;
  for (const row of rows) {
    const direction = checkDirectionFrom(row.direction);
    const outcome = checkOutcomeFrom(row.outcome);
    if (direction && outcome) out.set(checkKey(row.lexemeId, direction), { outcome, at: row.checkedAt.getTime() });
  }
  return out;
}

/** How a word and a direction are keyed in the map `lastChecks` returns. */
export function checkKey(lexemeId: string, direction: StoredDirection): string {
  return `${lexemeId}:${direction}`;
}
