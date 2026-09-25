import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ENCOUNTER_DAYS } from "./outThere";

/*
  ONE MORNING IS ONE ANSWER, IN EVERY READER.

  Progress keeps one report per day and the last one wins, because two rows on
  one morning are a double tap or a second tab. The research export and the
  funder report counted rows, so the same morning was two conversations there.
  They read `ENCOUNTER_DAYS` now, and this is that subquery against Postgres.
*/
const OWNER = "itest-encounter-days";
const OTHER = "itest-encounter-days-other";

async function wipe() {
  await prisma.encounter.deleteMany({ where: { ownerId: { in: [OWNER, OTHER] } } });
}
beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

function at(iso: string, outcome: string, ownerId = OWNER) {
  return prisma.encounter.create({ data: { ownerId, outcome, createdAt: new Date(iso) } });
}

describe("a learner's reports, one per day", () => {
  it("counts a morning answered twice as one answer, the last one", async () => {
    await at("2026-09-20T07:00:00Z", "UNDERSTOOD");
    await at("2026-09-20T07:00:02Z", "SWITCHED");
    await at("2026-09-21T08:00:00Z", "UNDERSTOOD");
    await at("2026-09-20T09:00:00Z", "UNDERSTOOD", OTHER);

    const rows = await prisma.$queryRaw<{ ownerId: string; outcome: string }[]>`
      SELECT e."ownerId", e."outcome" FROM ${ENCOUNTER_DAYS} e
      WHERE e."ownerId" IN (${OWNER}, ${OTHER})
      ORDER BY e."ownerId", e."createdAt"
    `;
    expect(rows).toEqual([
      { ownerId: OWNER, outcome: "SWITCHED" },
      { ownerId: OWNER, outcome: "UNDERSTOOD" },
      { ownerId: OTHER, outcome: "UNDERSTOOD" },
    ]);
  });
});
