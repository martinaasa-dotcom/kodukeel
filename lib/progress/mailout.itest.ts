import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { mailoutRoster } from "./mailout";

/**
 * Who the hourly run considers, against a real query.
 *
 * The roster is deployment-wide on purpose, so this asserts what it can about
 * rows it made: each of its learners arrives once however many reviews they
 * have, and one who has reviewed only outside the window does not arrive.
 */

const OWNERS = ["itest-mailout-a", "itest-mailout-b", "itest-mailout-c"];
const NOW = new Date();
const DAY = 86_400_000;

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: OWNERS } } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

async function reviews(ownerId: string, n: number, at: Date) {
  await prisma.review.createMany({
    data: Array.from({ length: n }, () => ({ ownerId, cardId: "itest-card", rating: 3, reviewedAt: at })),
  });
}

describe("mailoutRoster", () => {
  it("names each recent reviewer once and leaves out one who reviewed long ago", async () => {
    await reviews(OWNERS[0]!, 40, new Date(NOW.getTime() - DAY));
    await reviews(OWNERS[1]!, 1, new Date(NOW.getTime() - 2 * DAY));
    await reviews(OWNERS[2]!, 5, new Date(NOW.getTime() - 400 * DAY));

    const roster = await mailoutRoster(NOW, 100_000);
    const mine = roster.filter((id) => OWNERS.includes(id));
    expect(mine.sort()).toEqual([OWNERS[0], OWNERS[1]]);
    expect(new Set(roster).size).toBe(roster.length);
  });

  it("returns no more than it was asked for", async () => {
    await reviews(OWNERS[0]!, 3, NOW);
    await reviews(OWNERS[1]!, 3, NOW);
    expect((await mailoutRoster(NOW, 1)).length).toBeLessThanOrEqual(1);
  });
});
