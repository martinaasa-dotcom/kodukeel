import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { MAX_SESSION } from "@/lib/srs/reviewQueue";
import { reviewQueue } from "./dailyQueue";

/**
 * THE QUEUE HOLDS EVERY CARD IT MAY ASK, WHEREVER THE FIRST PAGE ENDS.
 *
 * Reported live: Today said "20 due", the session asked one card and said all
 * caught up. One of the causes was that the review page read a window of 120
 * due cards and *then* filtered it, so a deck whose oldest due rows were ones
 * the session refuses served nothing behind them. These are the shapes that
 * starved it, against a real query: a bare form card with no recorded sentence
 * (held back by `askableRows`) sitting in front of cards that can be asked.
 */

const OWNER = "itest-owner-reviewqueue-page";
const BARE = "itestrqbare";
const GOOD = "itestrqgood";

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
  await prisma.lexeme.deleteMany({ where: { lemma: { startsWith: "itestrq" } } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

const longAgo = new Date(Date.now() - 30 * 86_400_000);
const yesterday = new Date(Date.now() - 86_400_000);

async function bareCards(n: number) {
  // No recorded sentence, so the builder can make no gap for it and the
  // session holds the bare card back rather than ask a suffix on a stem.
  const lexeme = await prisma.lexeme.create({
    data: { lemma: BARE, pos: "NOUN", translation: "itest", examples: "[]" },
  });
  await prisma.card.createMany({
    data: Array.from({ length: n }, (_, i) => ({
      ownerId: OWNER, lexemeId: lexeme.id, cardType: "CASE_FORM", targetCase: "INESSIVE",
      front: `${BARE} → milles? kus?`, back: `${BARE}s`,
      state: 2, difficulty: 5, stability: 3, reps: 2,
      due: new Date(longAgo.getTime() + i * 1000), lastReview: longAgo,
    })),
  });
}

async function goodCards(n: number) {
  for (let i = 0; i < n; i++) {
    const lexeme = await prisma.lexeme.create({
      data: { lemma: `${GOOD}${i}`, pos: "NOUN", translation: `itest ${i}` },
    });
    await prisma.card.create({
      data: {
        ownerId: OWNER, lexemeId: lexeme.id, cardType: "RECOGNITION",
        front: `${GOOD}${i}`, back: `itest ${i}`,
        state: 2, difficulty: 5, stability: 3, reps: 2, due: yesterday, lastReview: longAgo,
      },
    });
  }
}

describe("reviewQueue", () => {
  it("reads past a first page of cards the session cannot ask", async () => {
    await bareCards(MAX_SESSION * 2 + 10);
    await goodCards(5);
    const queue = await reviewQueue(OWNER, null, new Date());
    expect(queue.cards.map((c) => c.lexeme?.lemma).sort()).toEqual(
      Array.from({ length: 5 }, (_, i) => `${GOOD}${i}`).sort(),
    );
    expect(queue.due).toHaveLength(5);
    expect(queue.dueMore).toBe(false);
  });

  it("caps a sitting and says the cap bit", async () => {
    await goodCards(MAX_SESSION + 3);
    const queue = await reviewQueue(OWNER, null, new Date());
    expect(queue.due).toHaveLength(MAX_SESSION);
    expect(queue.dueMore).toBe(true);
    expect(queue.cards).toHaveLength(MAX_SESSION);
  });
});
