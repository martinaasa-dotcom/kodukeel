import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { LESSONS } from "@/lib/course/lessons";
import { deferWord } from "./deferrals";
import { keepOwnSentences, ownCardsFrom } from "./ownSentences";

/**
 * KEEPING A WRITTEN SENTENCE, AGAINST A DATABASE.
 *
 * Three promises the writing step makes are about rows and no unit test can
 * see them: a second press keeps nothing twice, two presses at once (a double
 * tap on a phone) still keep one card per sentence because the write is under
 * the deck lock, and a word put aside keeps its date on a card built for it
 * later. Each is driven here on a real writing lesson's own model sentences,
 * which are the sentences most like what a learner writes.
 */

const MINE = "itest-owner-own-sentences";
const writing = LESSONS.find((l) => l.level === "B1" && l.write)!;
const sentences = writing.write!.model.map((m) => m.et);
const cardable = sentences.filter((s) => ownCardsFrom(writing.id, [s]).length > 0).slice(0, 3);

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: MINE } });
  await prisma.deferral.deleteMany({ where: { ownerId: MINE } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("keepOwnSentences", () => {
  it("is a premise this test can hold: the lesson's model makes cards", () => {
    expect(cardable.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps each sentence once, however often it is pressed", async () => {
    const first = await keepOwnSentences(MINE, writing.id, cardable);
    expect(first.kept).toBe(cardable.length);
    const again = await keepOwnSentences(MINE, writing.id, cardable);
    expect(again).toEqual({ kept: 0, already: cardable.length });
    expect(await prisma.card.count({ where: { ownerId: MINE, source: "WRITTEN" } })).toBe(cardable.length);
  });

  it("keeps one card per sentence when two presses land at once", async () => {
    await Promise.all([
      keepOwnSentences(MINE, writing.id, cardable),
      keepOwnSentences(MINE, writing.id, cardable),
      keepOwnSentences(MINE, writing.id, cardable),
    ]);
    const fronts = await prisma.card.findMany({ where: { ownerId: MINE, source: "WRITTEN" }, select: { front: true } });
    expect(fronts.length).toBe(cardable.length);
    expect(new Set(fronts.map((f) => f.front)).size).toBe(cardable.length);
  });

  it("dates a card for a word put aside on the date the deferral wrote", async () => {
    const card = ownCardsFrom(writing.id, [cardable[0]!])[0]!;
    const entry = await prisma.lexeme.findFirst({ where: { lemma: card.lemma }, orderBy: { id: "asc" }, select: { id: true } });
    expect(entry, `${card.lemma} is in the seeded dictionary`).not.toBeNull();
    const deferred = await deferWord(MINE, entry!.id, "B1", "/course/lessons", new Date());
    expect(deferred.ok).toBe(true);
    await keepOwnSentences(MINE, writing.id, [cardable[0]!]);
    const built = await prisma.card.findFirst({ where: { ownerId: MINE, source: "WRITTEN" }, select: { due: true, lexemeId: true } });
    expect(built?.lexemeId).not.toBeNull();
    expect(built!.due.getTime()).toBeGreaterThan(Date.now() + 24 * 3600_000);
  });
});
