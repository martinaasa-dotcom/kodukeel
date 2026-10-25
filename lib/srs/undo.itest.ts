import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { applyGradeBatch } from "./replay";
import { snapshotOf, undoGradeFor } from "./undo";

/**
 * Undo, as both doors call it: the web's `undoGrade` action and
 * `POST /api/v1/grades/undo` are this one body (ADR-029).
 *
 *   npm run test:db
 *
 * Namespaced to synthetic owners and cleaned between tests.
 */

const OWNER = "itest-owner-undo";
const OTHER = "itest-owner-undo-other";
const DAY = 86_400_000;

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: [OWNER, OTHER] } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: [OWNER, OTHER] } } });
}

async function makeCard(ownerId = OWNER) {
  return prisma.card.create({
    data: {
      ownerId, cardType: "RECOGNITION", front: "tuba", back: "room",
      due: new Date(Date.now() - 2 * DAY), createdAt: new Date(Date.now() - 30 * DAY),
    },
  });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("undoGradeFor", () => {
  it("puts the scheduling back and leaves the review where it is", async () => {
    const card = await makeCard();
    const before = snapshotOf(card);
    await applyGradeBatch(OWNER, [{ id: "u1", cardId: card.id, rating: 1, durationMs: 1000, reviewedAt: Date.now() }]);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).reps).toBe(1);

    expect(await undoGradeFor(OWNER, card.id, before)).toEqual({ ok: true });

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(snapshotOf(after)).toEqual(before);
    expect(await prisma.review.count({ where: { ownerId: OWNER } })).toBe(1);
  });

  it("refuses a state no grade of this card could have come from", async () => {
    const card = await makeCard();
    // No grade at all: nothing to take back, so a forged "before" is refused.
    const forged = { ...snapshotOf(card), state: 2, reps: 50, stability: 99_999, due: new Date(Date.now() + 3650 * DAY).toISOString() };
    expect(await undoGradeFor(OWNER, card.id, forged)).toMatchObject({ ok: false, reason: "invalid" });

    // A real grade, then the same forgery: still not the state that grade left.
    await applyGradeBatch(OWNER, [{ id: "u2", cardId: card.id, rating: 3, durationMs: 1000, reviewedAt: Date.now() }]);
    expect(await undoGradeFor(OWNER, card.id, forged)).toMatchObject({ ok: false, reason: "invalid" });
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).reps).toBe(1);
  });

  it("will not touch a card somebody else holds", async () => {
    const theirs = await makeCard(OTHER);
    const result = await undoGradeFor(OWNER, theirs.id, { ...snapshotOf(theirs), reps: 9 });
    expect(result).toMatchObject({ ok: false, reason: "not_found" });
    expect((await prisma.card.findUniqueOrThrow({ where: { id: theirs.id } })).reps).toBe(0);
  });

  it("refuses a snapshot out of range or with a date nobody can read", async () => {
    const card = await makeCard();
    expect(await undoGradeFor(OWNER, card.id, { ...snapshotOf(card), state: 7 })).toMatchObject({ ok: false, reason: "invalid" });
    expect(await undoGradeFor(OWNER, card.id, { ...snapshotOf(card), due: "not a date" })).toMatchObject({ ok: false, reason: "invalid" });
    expect(await undoGradeFor(OWNER, card.id, null)).toMatchObject({ ok: false, reason: "invalid" });
  });
});
