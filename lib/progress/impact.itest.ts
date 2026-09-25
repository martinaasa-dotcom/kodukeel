import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { encounterTotals, learnerDays } from "./impact";

/**
 * Integration tests: these need a real Postgres.
 *
 *   npm run test:db
 *
 * The impact report buckets reviews by UTC day. The column is a naive
 * timestamp holding UTC wall time, and the query used to convert it once to a
 * timestamptz, which TO_CHAR renders in the *session's* zone: on a database
 * set to anything west of UTC, a review at 02:00 UTC landed on the day before.
 * No unit test can see that, since it is a fact about Postgres, so the
 * database's own zone is moved for the length of the test and a fresh
 * connection is made to pick it up.
 */

const OWNER = "itest-owner-impact-days";

async function withDatabaseZone<T>(zone: string, run: () => Promise<T>): Promise<T> {
  const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  const db = rows[0]?.db;
  if (!db) throw new Error("could not read the database name");
  await prisma.$executeRawUnsafe(`ALTER DATABASE "${db}" SET timezone TO '${zone}'`);
  await prisma.$disconnect();
  try {
    return await run();
  } finally {
    await prisma.$executeRawUnsafe(`ALTER DATABASE "${db}" RESET timezone`);
    await prisma.$disconnect();
  }
}

afterAll(async () => {
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.encounter.deleteMany({ where: { ownerId: OWNER } });
  await prisma.$disconnect();
});

describe("learnerDays", () => {
  it("reads the UTC day whatever zone the database session is in", async () => {
    await prisma.review.deleteMany({ where: { ownerId: OWNER } });
    await prisma.review.create({
      data: { ownerId: OWNER, cardId: "itest-card", rating: 3, reviewedAt: new Date("2031-01-01T02:00:00Z") },
    });

    const days = await withDatabaseZone("America/Toronto", async () => {
      const zone = await prisma.$queryRaw<{ zone: string }[]>`SELECT current_setting('TimeZone') AS zone`;
      expect(zone[0]?.zone).toBe("America/Toronto");
      // Far enough ahead that no other suite's review is in the window.
      return learnerDays(new Date("2031-01-01T00:00:00Z"), []);
    });

    expect(days).toEqual([{ firstDay: "2031-01-01", activeDays: ["2031-01-01"] }]);
  });
});

describe("encounterTotals", () => {
  it("counts one report per learner per day, the last one given", async () => {
    await prisma.encounter.deleteMany({ where: { ownerId: OWNER } });
    const at = (iso: string) => new Date(iso);
    await prisma.encounter.createMany({
      data: [
        // Three presses on one morning: two tabs, then a change of mind.
        { ownerId: OWNER, outcome: "BAILED", createdAt: at("2026-09-24T07:00:00Z") },
        { ownerId: OWNER, outcome: "UNDERSTOOD", createdAt: at("2026-09-24T07:01:00Z") },
        { ownerId: OWNER, outcome: "UNDERSTOOD", createdAt: at("2026-09-24T07:02:00Z") },
        { ownerId: OWNER, outcome: "BAILED", createdAt: at("2026-09-25T07:00:00Z") },
      ],
    });
    const mine = (await encounterTotals([])).find((row) => row.learner === OWNER);
    expect(mine).toEqual({ learner: OWNER, reports: 2, conversations: 1 });
  });
});
