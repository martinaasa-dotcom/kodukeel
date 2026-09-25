import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { writeGrade } from "./grade";
import { applyGradeBatch } from "./replay";

/*
  The Review row and the card's new scheduling are one fact. A card update
  that fails after the review insert must leave neither behind, or the retry
  finds the id written, settles it, and the card is never rescheduled.
*/
const OWNER = "itest-owner-grade-tx";

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
  await prisma.$executeRawUnsafe(`DELETE FROM itest_fail_card_update`);
}

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS itest_fail_card_update (id text PRIMARY KEY)`);
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION itest_fail_card_update() RETURNS trigger AS $$
    BEGIN
      IF EXISTS (SELECT 1 FROM itest_fail_card_update WHERE id = NEW.id) THEN
        RAISE EXCEPTION 'itest: card update refused';
      END IF;
      RETURN NEW;
    END $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS itest_fail_card_update ON "Card"`);
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER itest_fail_card_update BEFORE UPDATE ON "Card" FOR EACH ROW EXECUTE FUNCTION itest_fail_card_update()`,
  );
});
beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS itest_fail_card_update ON "Card"`);
  await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS itest_fail_card_update()`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS itest_fail_card_update`);
  await prisma.$disconnect();
});

async function makeCard() {
  const createdAt = new Date("2026-08-01T09:00:00Z");
  return prisma.card.create({
    data: { ownerId: OWNER, cardType: "RECOGNITION", front: "tuba", back: "room", due: createdAt, createdAt },
  });
}

describe("writeGrade is one write", () => {
  it("leaves no review behind when the card update fails", async () => {
    const card = await makeCard();
    await prisma.$executeRawUnsafe(`INSERT INTO itest_fail_card_update (id) VALUES ($1)`, card.id);

    await expect(writeGrade(OWNER, {
      card, rating: 3, durationMs: 0, reviewId: "tx-half",
      reviewedAt: new Date("2026-08-20T09:00:00Z"), now: new Date("2026-09-02T09:00:00Z"),
    })).rejects.toThrow();

    expect(await prisma.review.count({ where: { ownerId: OWNER } })).toBe(0);
  });

  it("a replay after that failure reschedules the card", async () => {
    const card = await makeCard();
    await prisma.$executeRawUnsafe(`INSERT INTO itest_fail_card_update (id) VALUES ($1)`, card.id);
    await writeGrade(OWNER, {
      card, rating: 3, durationMs: 0, reviewId: "tx-replayed",
      reviewedAt: new Date("2026-08-20T09:00:00Z"), now: new Date("2026-09-02T09:00:00Z"),
    }).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM itest_fail_card_update`);

    const res = await applyGradeBatch(OWNER, [{
      id: "tx-replayed", cardId: card.id, rating: 3, durationMs: 0,
      reviewedAt: new Date("2026-08-20T09:00:00Z").getTime(),
    }]);
    expect(res.settled).toContain("tx-replayed");
    expect(await prisma.review.count({ where: { ownerId: OWNER } })).toBe(1);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).reps).toBe(1);
  });
});
