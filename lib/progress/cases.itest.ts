import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { caseReviewsFor } from "./cases";

/**
 * Integration tests: these need a real Postgres.
 *
 *   npm run test:db
 *
 * The case charts read this one query. An answer is charted at the case the
 * round asked, which the writing round and Target record in `Review.slot`
 * when they ask a card for a case other than its own.
 */

const OWNER = "itest-owner-cases";

beforeEach(async () => {
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
});
afterAll(async () => {
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.$disconnect();
});

describe("caseReviewsFor", () => {
  it("charts an answer at the case the round asked", async () => {
    const now = new Date("2026-09-20T09:00:00Z");
    await prisma.review.createMany({
      data: [
        { ownerId: OWNER, cardId: "c1", rating: 1, targetCase: "INESSIVE", slot: "ILLATIVE", reviewedAt: now },
        { ownerId: OWNER, cardId: "c2", rating: 3, targetCase: "INESSIVE", slot: "INESSIVE", reviewedAt: now },
        { ownerId: OWNER, cardId: "c3", rating: 3, targetCase: null, slot: "IndPrSg3", reviewedAt: now },
        { ownerId: OWNER, cardId: "c4", rating: 3, targetCase: "PARTITIVE", slot: null, reviewedAt: now },
      ],
    });
    const rows = await caseReviewsFor(OWNER, now);
    expect(rows.map((r) => r.targetCase).sort()).toEqual(["ILLATIVE", "INESSIVE", "PARTITIVE"]);
  });
});
