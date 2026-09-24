import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { mailoutRoster } from "./mailout";

/**
 * WHO THE RUN CONSIDERS, COUNTED AND PAGED IN POSTGRES.
 *
 * The roster read `Review` with Prisma's `distinct`, which deduplicates in the
 * client and so read every answer in the deployment's last forty-five days,
 * twice a run. Nothing about the result showed it; what a test can hold is
 * that the count and the page still come out right now they are SQL: each
 * learner once, however many answers they gave, and the pages covering all of
 * them between them.
 *
 * Far in the future so no other row in the database falls in the window.
 */
const NOW = new Date("2031-03-01T12:00:00.000Z");
const OWNERS = ["itest-roster-a", "itest-roster-b", "itest-roster-c"];

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: OWNERS } } });
}

beforeAll(async () => {
  await wipe();
  const rows = OWNERS.flatMap((ownerId, i) =>
    Array.from({ length: 4 + i }, (_, n) => ({
      ownerId,
      cardId: `itest-roster-card-${i}-${n}`,
      rating: 3,
      reviewedAt: new Date(NOW.getTime() - (n + 1) * 86_400_000),
    })));
  await prisma.review.createMany({ data: rows });
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("mailoutRoster", () => {
  it("names each learner once, however many answers they gave", async () => {
    const roster = await mailoutRoster(NOW, 50);
    const ours = roster.filter((id) => OWNERS.includes(id));
    expect(ours.sort()).toEqual([...OWNERS].sort());
  });

  it("pages over the learners rather than over their answers", async () => {
    const seen = new Set<string>();
    // The page walks by the hour, so every hour in a day covers every page.
    for (let hour = 0; hour < 6; hour++) {
      const at = new Date(NOW.getTime() + hour * 3_600_000);
      const page = await mailoutRoster(at, 2);
      expect(page.length).toBeLessThanOrEqual(2);
      for (const id of page) if (OWNERS.includes(id)) seen.add(id);
    }
    expect([...seen].sort()).toEqual([...OWNERS].sort());
  });
});
