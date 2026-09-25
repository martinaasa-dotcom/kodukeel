import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { backfillClozeCards } from "./backfill";
import { deferWord } from "@/lib/progress/deferrals";

/**
 * The dictionary render's gap-fill backfill is a third door that builds cards,
 * and a word put aside has to stay aside through it. `addCardsFor` and
 * `addPlanToDeck` ask `deferredDues` inside the deck lock; this path wrote its
 * new card with `due: now`, so opening the entry for a word somebody had just
 * called too complicated handed them a gap-fill on it the same evening.
 */

const MINE = "itest-owner-backfill-defer";
const LEMMA = "zzbackfillword";

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: MINE } });
  await prisma.deferral.deleteMany({ where: { ownerId: MINE } });
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

/** A word of this test's own, spelled so nobody could mistake it for Estonian. */
async function word() {
  return prisma.lexeme.create({
    data: {
      lemma: LEMMA,
      pos: "NOUN",
      translation: "a test word",
      cefr: "A1",
      examples: JSON.stringify([
        { et: `Ma nägin eile ${LEMMA} suures aias.`, en: null },
        { et: `Meie ${LEMMA} seisab akna all.`, en: null },
      ]),
    },
  });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("backfillClozeCards", () => {
  it("builds a gap-fill due now for a word nobody put aside", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word();
    await prisma.card.create({
      data: { ownerId: MINE, lexemeId: entry.id, cardType: "RECOGNITION", front: LEMMA, back: "x", due: now },
    });

    const made = await backfillClozeCards(MINE, entry.id, now);
    expect(made).toBeGreaterThan(0);
    const cloze = await prisma.card.findMany({ where: { ownerId: MINE, cardType: "CLOZE" } });
    expect(cloze.length).toBe(made);
    for (const card of cloze) expect(card.due.toISOString()).toBe(now.toISOString());
  });

  /* The real clock on purpose, and no `now` handed to the backfill: that is how
     the dictionary page calls it, so this fails on the missing deferral read
     rather than on a parameter the old signature did not have. */
  it("dates the new gap-fill where the deferral put the word", async () => {
    const now = new Date();
    const entry = await word();
    await prisma.card.create({
      data: { ownerId: MINE, lexemeId: entry.id, cardType: "RECOGNITION", front: LEMMA, back: "x", due: now },
    });

    const aside = await deferWord(MINE, entry.id, "A1", "/review", now);
    expect(aside.ok).toBe(true);
    const until = aside.ok ? aside.deferral.untilAt : now;
    expect(until.getTime()).toBeGreaterThan(now.getTime());

    const made = await backfillClozeCards(MINE, entry.id);
    expect(made).toBeGreaterThan(0);
    const cloze = await prisma.card.findMany({ where: { ownerId: MINE, cardType: "CLOZE" } });
    expect(cloze.length).toBe(made);
    for (const card of cloze) expect(card.due.toISOString()).toBe(until.toISOString());
  });
});
