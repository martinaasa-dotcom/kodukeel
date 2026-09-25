import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { isRepeatedReview, stableReviewId, writeGrade } from "./grade";
import { applyGradeBatch } from "./replay";

/**
 * Integration tests: these need a real Postgres.
 *
 *   npm run test:db
 *
 * The claim being checked is about rows, not about types: a grade dated before
 * the card it is about is a review of something that was not there, and the
 * streak, the heatmap and every "reviews this week" figure read that column.
 */

const OWNER = "itest-owner-grade";

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
}

async function makeCard(createdAt: Date) {
  return prisma.card.create({
    data: {
      ownerId: OWNER, cardType: "RECOGNITION",
      front: "tuba", back: "room", targetCase: "INESSIVE",
      due: createdAt, createdAt,
    },
  });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("writeGrade", () => {
  it("writes the review and returns exactly the scheduling it stored", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    const next = await writeGrade(OWNER, {
      card, rating: 3, durationMs: 2_400,
      reviewedAt: new Date("2026-08-20T09:00:00Z"),
      now: new Date("2026-09-02T09:00:00Z"),
    });

    const stored = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(stored.due.toISOString()).toBe(next.due.toISOString());
    expect(stored.stability).toBeCloseTo(next.stability, 6);
    expect(stored.difficulty).toBeCloseTo(next.difficulty, 6);
    expect(stored.reps).toBe(next.reps);
    expect(stored.state).toBe(next.state);
    expect(stored.learningSteps).toBe(next.learningSteps);

    const review = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(review.reviewedAt.toISOString()).toBe("2026-08-20T09:00:00.000Z");
    expect(review.rating).toBe(3);
    expect(review.stateBefore).toBe(card.state);
  });

  it("floors a review at the moment its card was created", async () => {
    const created = new Date("2026-08-01T09:00:00Z");
    const card = await makeCard(created);
    await writeGrade(OWNER, {
      card, rating: 3, durationMs: 1_000,
      reviewedAt: new Date("2026-06-01T09:00:00Z"),
      now: new Date("2026-09-02T09:00:00Z"),
    });

    const review = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(review.reviewedAt.toISOString()).toBe(created.toISOString());
  });

  it("takes the client's id only where one is given", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, {
      card, rating: 3, durationMs: 0, reviewedAt: new Date("2026-08-20T09:00:00Z"),
      now: new Date("2026-09-02T09:00:00Z"), reviewId: "from-the-device",
    });
    expect(await prisma.review.count({ where: { id: "from-the-device" } })).toBe(1);
  });

  /*
    The online write committed and its answer never reached the device, so the
    same grade arrives again under the same id, first as a retry and then
    through the outbox. It is one answer and the scheduler hears it once.
  */
  it("applies a grade once however often its id arrives", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    const write = {
      rating: 3 as const, durationMs: 0, reviewedAt: new Date("2026-08-20T09:00:00Z"),
      now: new Date("2026-09-02T09:00:00Z"), reviewId: "sent-twice",
    };
    const first = await writeGrade(OWNER, { card, ...write });
    const again = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    const second = await writeGrade(OWNER, { card: again, ...write });

    expect(await prisma.review.count({ where: { cardId: card.id } })).toBe(1);
    const stored = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(stored.reps).toBe(1);
    expect(second.due.toISOString()).toBe(first.due.toISOString());
  });

  it("applies it once when two copies arrive at the same moment", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    const write = {
      card, rating: 3 as const, durationMs: 0, reviewedAt: new Date("2026-08-20T09:00:00Z"),
      now: new Date("2026-09-02T09:00:00Z"), reviewId: "raced",
    };
    await Promise.all([writeGrade(OWNER, write), writeGrade(OWNER, write)]);

    expect(await prisma.review.count({ where: { cardId: card.id } })).toBe(1);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).reps).toBe(1);
  });

  it("never applies a grade whose id belongs to somebody else", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await prisma.review.create({
      data: {
        id: "not-yours", ownerId: "itest-someone-else", cardId: "elsewhere", lexemeId: null,
        rating: 1, reviewedAt: new Date("2026-08-10T09:00:00Z"), durationMs: 0, stateBefore: 0,
      },
    });
    try {
      await expect(writeGrade(OWNER, {
        card, rating: 3, durationMs: 0, reviewedAt: new Date("2026-08-20T09:00:00Z"),
        now: new Date("2026-09-02T09:00:00Z"), reviewId: "not-yours",
      })).rejects.toThrow();
      expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).reps).toBe(0);
    } finally {
      await prisma.review.deleteMany({ where: { id: "not-yours" } });
    }
  });
});

describe("a card's own columns reach the log only where they are on the list", () => {
  it("writes no invented case and no invented slot off a card restored from a file", async () => {
    // A backup is restored as the file wrote it, so a card can carry anything.
    const card = await prisma.card.create({
      data: {
        ownerId: OWNER, cardType: "RECOGNITION", front: "tuba", back: "room",
        targetCase: "anything", slot: "made-up", due: new Date("2026-08-01T09:00:00Z"),
        createdAt: new Date("2026-08-01T09:00:00Z"),
      },
    });
    await writeGrade(OWNER, { card, rating: 3, durationMs: 1_000, reviewedAt: new Date("2026-09-02T09:00:00Z"), now: new Date("2026-09-02T09:00:00Z") });
    const review = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(review.targetCase).toBeNull();
    expect(review.slot).toBe("RECOGNITION");
  });

  it("keeps a real case exactly as it was", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, { card, rating: 3, durationMs: 1_000, reviewedAt: new Date("2026-09-02T09:00:00Z"), now: new Date("2026-09-02T09:00:00Z") });
    const review = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(review.targetCase).toBe("INESSIVE");
    expect(review.slot).toBe("INESSIVE");
  });
});

describe("the replay path takes the same floor", () => {
  /*
    THE FIX WAS WRITTEN ON THE DOOR NOBODY WAS COMING THROUGH.

    `gradeCard` floored a grade at the card's own creation and said why in a
    comment. `applyGradeBatch` is the path that actually carries a device's own
    timestamps, and it clamped forward and to thirty days back and no further,
    so an outbox entry could date a review before its card existed and no
    figure derived from the log could tell.
  */
  it("will not date an offline grade before its card existed", async () => {
    const created = new Date(Date.now() - 2 * 86_400_000);
    const card = await makeCard(created);

    const result = await applyGradeBatch(OWNER, [{
      id: "backdated", cardId: card.id, rating: 3, durationMs: 1_000,
      reviewedAt: Date.now() - 20 * 86_400_000,
    }]);

    expect(result.settled).toEqual(["backdated"]);
    const review = await prisma.review.findFirstOrThrow({ where: { id: "backdated" } });
    expect(review.reviewedAt.getTime()).toBeGreaterThanOrEqual(created.getTime());
  });

  it("still lands an honest offline grade at the moment it was answered", async () => {
    const card = await makeCard(new Date(Date.now() - 30 * 86_400_000));
    const answered = Date.now() - 3 * 86_400_000;

    await applyGradeBatch(OWNER, [{
      id: "honest", cardId: card.id, rating: 3, durationMs: 1_000, reviewedAt: answered,
    }]);

    const review = await prisma.review.findFirstOrThrow({ where: { id: "honest" } });
    expect(Math.abs(review.reviewedAt.getTime() - answered)).toBeLessThan(1_000);
  });
});


/**
 * The column that records what came back instead.
 *
 * Against a real database rather than a stub, because the claim is about a row
 * in the one table that is never updated and never deleted: if the wrong thing
 * lands here it is permanent, and it would not be a skewed count, it would be a
 * sentence telling somebody they mix up two cases nobody has asked them for.
 */
describe("the form a learner reached for instead", () => {
  it("records the pair where two forms were genuinely swapped", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, {
      card, rating: 2, durationMs: 3_800,
      reviewedAt: new Date("2026-08-20T09:00:00Z"),
      practisedSlot: "INESSIVE",
      reachedSlot: "ELATIVE",
    });

    const row = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(row.slot).toBe("INESSIVE");
    expect(row.reachedSlot).toBe("ELATIVE");
    // And the column the case charts read is untouched by either of them.
    expect(row.targetCase).toBe("INESSIVE");
  });

  it("records the case the round asked in the slot, whatever card it landed on", async () => {
    // The flash, writing and target rounds ask one case and grade the nearest
    // card the learner holds. The slot carries what was asked; `targetCase`
    // stays the card's own, which is the decision recorded in CLAUDE.md.
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, {
      card, rating: 3, durationMs: 2_000,
      reviewedAt: new Date("2026-08-20T09:00:00Z"),
      practisedSlot: "COMITATIVE",
    });
    const row = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(row.slot).toBe("COMITATIVE");
    expect(row.targetCase).toBe("INESSIVE");
  });

  it("writes a duration it can store whatever number arrives", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, { card, rating: 3, durationMs: Number.NaN, reviewedAt: new Date("2026-08-20T09:00:00Z") });
    const card2 = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, { card: card2, rating: 3, durationMs: 4.5, reviewedAt: new Date("2026-08-20T09:00:00Z") });
    const rows = await prisma.review.findMany({ where: { ownerId: OWNER }, orderBy: { id: "asc" } });
    expect(rows.map((r) => r.durationMs).sort()).toEqual([0, 5].sort());
  });

  it("writes nothing where the learner produced what was asked for", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, {
      card, rating: 3, durationMs: 900,
      reviewedAt: new Date("2026-08-20T09:00:00Z"),
      practisedSlot: "INESSIVE",
      reachedSlot: "INESSIVE",
    });
    expect((await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } })).reachedSlot).toBeNull();
  });

  it("refuses a slot the app does not write, however it arrives", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, {
      card, rating: 1, durationMs: 1_000,
      reviewedAt: new Date("2026-08-20T09:00:00Z"),
      practisedSlot: "INESSIVE",
      reachedSlot: "'; drop table \"Review\"; --",
    });
    expect((await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } })).reachedSlot).toBeNull();
  });

  it("refuses a pair where either side is a question about meaning", async () => {
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    await writeGrade(OWNER, {
      card, rating: 1, durationMs: 1_000,
      reviewedAt: new Date("2026-08-20T09:00:00Z"),
      practisedSlot: "RECOGNITION",
      reachedSlot: "INESSIVE",
    });
    const row = await prisma.review.findFirstOrThrow({ where: { ownerId: OWNER } });
    expect(row.slot).toBe("RECOGNITION");
    expect(row.reachedSlot).toBeNull();
  });

  it("carries both slots back from a grade taken offline", async () => {
    // The path the flash round takes on a train, and the one where the fields
    // were being dropped between the outbox and the server.
    const card = await makeCard(new Date("2026-08-01T09:00:00Z"));
    const result = await applyGradeBatch(OWNER, [{
      id: "replayed-confusion",
      cardId: card.id,
      rating: 2,
      durationMs: 4_100,
      reviewedAt: new Date("2026-08-20T09:00:00Z").getTime(),
      slot: "ADESSIVE",
      reachedSlot: "ALLATIVE",
    }]);

    expect(result.ok).toBe(true);
    const row = await prisma.review.findUniqueOrThrow({ where: { id: "replayed-confusion" } });
    expect(row.slot).toBe("ADESSIVE");
    expect(row.reachedSlot).toBe("ALLATIVE");
    expect(row.durationMs).toBe(4_100);
  });
});

describe("a game round reported twice", () => {
  it("writes one review and schedules the card once when the id is derived", async () => {
    const card = await makeCard(new Date(Date.now() - 10 * 86_400_000));
    const id = stableReviewId("sonad", OWNER, "2026-09-25", card.id);
    const first = await writeGrade(OWNER, { card, rating: 3, durationMs: 0, reviewedAt: new Date(), reviewId: id });
    // Refused on the key, or answered as already applied: either way nothing moves.
    const again = await writeGrade(OWNER, { card, rating: 3, durationMs: 0, reviewedAt: new Date(), reviewId: id }).catch((e: unknown) => e);
    if (again instanceof Error) expect(isRepeatedReview(again)).toBe(true);

    expect(await prisma.review.count({ where: { ownerId: OWNER } })).toBe(1);
    const stored = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(stored.reps).toBe(first.reps);
  });

  it("is two reviews without one, which is the fault the id closes", async () => {
    const card = await makeCard(new Date(Date.now() - 10 * 86_400_000));
    await writeGrade(OWNER, { card, rating: 3, durationMs: 0, reviewedAt: new Date() });
    await writeGrade(OWNER, { card, rating: 3, durationMs: 0, reviewedAt: new Date() });
    expect(await prisma.review.count({ where: { ownerId: OWNER } })).toBe(2);
  });

  it("derives a different id for another day, another card or another game", () => {
    const base = stableReviewId("sonad", OWNER, "2026-09-25", "c1");
    expect(stableReviewId("sonad", OWNER, "2026-09-25", "c1")).toBe(base);
    expect(stableReviewId("sonad", OWNER, "2026-09-26", "c1")).not.toBe(base);
    expect(stableReviewId("sonad", OWNER, "2026-09-25", "c2")).not.toBe(base);
    expect(stableReviewId("crossword", OWNER, "2026-09-25", "c1")).not.toBe(base);
    expect(base).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
