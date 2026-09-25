import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/auth/mode";
import { applyGradeBatch } from "@/lib/srs/replay";

/**
 * One answer, one row, whichever door it came through.
 *
 * A review grades online through `gradeCard` and, where the response does not
 * come back, puts the same grade in the outbox for `applyGradeBatch` to replay.
 * The two used to carry different ids, so a grade that reached the server and
 * lost only its response was written twice into the one table that is never
 * repaired. The device gives the grade its id now and both doors carry it.
 *
 * Local mode resolves the owner, so these rows belong to the local learner and
 * the cleanup is keyed on the cards this file made, never on the owner.
 */

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { gradeCard } = await import("./actions");

const DAY = 86_400_000;
const made: string[] = [];

async function makeCard() {
  const card = await prisma.card.create({
    data: {
      id: crypto.randomUUID(), ownerId: LOCAL_USER_ID, cardType: "RECOGNITION",
      front: "itest-grade-front", back: "room",
      due: new Date(Date.now() - DAY), createdAt: new Date(Date.now() - 10 * DAY),
    },
  });
  made.push(card.id);
  return card;
}

async function wipe() {
  if (made.length === 0) return;
  await prisma.review.deleteMany({ where: { cardId: { in: made } } });
  await prisma.card.deleteMany({ where: { id: { in: made } } });
  made.length = 0;
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("a grade carries the id the device gave it", () => {
  it("writes the review under that id", async () => {
    const card = await makeCard();
    const id = crypto.randomUUID();
    const result = await gradeCard(card.id, 3, 1000, undefined, undefined, undefined, id);
    expect(result.ok).toBe(true);
    expect(await prisma.review.findUnique({ where: { id } })).not.toBeNull();
  });

  it("writes one row when the same grade arrives twice online", async () => {
    const card = await makeCard();
    const id = crypto.randomUUID();
    await gradeCard(card.id, 3, 1000, undefined, undefined, undefined, id);
    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    const again = await gradeCard(card.id, 3, 1000, undefined, undefined, undefined, id);
    expect(again.ok).toBe(true);
    expect(await prisma.review.count({ where: { cardId: card.id } })).toBe(1);
    const still = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(still.reps).toBe(after.reps);
  });

  it("writes one row when the outbox replays a grade that already landed", async () => {
    const card = await makeCard();
    const id = crypto.randomUUID();
    await gradeCard(card.id, 3, 1000, new Date().toISOString(), undefined, undefined, id);
    const replay = await applyGradeBatch(LOCAL_USER_ID, [
      { id, cardId: card.id, rating: 3, durationMs: 1000, reviewedAt: Date.now() },
    ]);
    expect(replay.settled).toEqual([id]);
    expect(await prisma.review.count({ where: { cardId: card.id } })).toBe(1);
  });

  it("writes one row when the replay got there first", async () => {
    const card = await makeCard();
    const id = crypto.randomUUID();
    await applyGradeBatch(LOCAL_USER_ID, [
      { id, cardId: card.id, rating: 3, durationMs: 1000, reviewedAt: Date.now() },
    ]);
    const late = await gradeCard(card.id, 3, 1000, undefined, undefined, undefined, id);
    expect(late.ok).toBe(true);
    expect(await prisma.review.count({ where: { cardId: card.id } })).toBe(1);
  });

  it("refuses an id that is not a UUID", async () => {
    const card = await makeCard();
    const result = await gradeCard(card.id, 3, 1000, undefined, undefined, undefined, "g1");
    expect(result.ok).toBe(false);
    expect(await prisma.review.count({ where: { cardId: card.id } })).toBe(0);
  });
});
