import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hardWordReadings, movedWords } from "./hard";
import { HARD_LEARNERS } from "@/lib/srs/defer";

/**
 * A deferral moves a word for everybody once enough people press it, and
 * sign-up is open, so the vote belongs to learners who have graded a card.
 * A fresh account's press still holds their own wait (that is
 * `deferrals.itest.ts`); what it may not do is count toward the move.
 */

const PREFIX = "itest-owner-hardvote-";
const LEMMA = "zzhardvoteword";
const owners = Array.from({ length: HARD_LEARNERS }, (_, i) => `${PREFIX}${i}`);

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
  await prisma.card.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
  await prisma.deferral.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

/** Every owner holds a card for the word and has put it aside. */
async function fivePressed() {
  const entry = await prisma.lexeme.create({
    data: { lemma: LEMMA, pos: "NOUN", translation: "a test word", cefr: "A1" },
  });
  const until = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  for (const ownerId of owners) {
    await prisma.card.create({
      data: { ownerId, lexemeId: entry.id, cardType: "RECOGNITION", front: LEMMA, back: "x", due: until },
    });
    await prisma.deferral.create({
      data: {
        ownerId, lexemeId: entry.id, lemma: LEMMA, band: "A1", level: "A1",
        reason: "SOON", untilAt: until,
      },
    });
  }
  return entry.id;
}

async function graded(ownerIds: readonly string[]) {
  await prisma.review.createMany({
    data: ownerIds.map((ownerId) => ({ ownerId, cardId: `${ownerId}-card`, rating: 3 })),
  });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("the too-hard vote", () => {
  it("moves a word when enough learners who have graded a card put it aside", async () => {
    const id = await fivePressed();
    await graded(owners);

    expect((await movedWords()).has(id)).toBe(true);
    const reading = (await hardWordReadings(200)).find((row) => row.lexemeId === id);
    expect(reading?.learners).toBe(HARD_LEARNERS);
    expect(reading?.moved).toBe(true);
  });

  it("does not count presses from accounts that have never graded a card", async () => {
    const id = await fivePressed();

    expect((await movedWords()).has(id)).toBe(false);
    // The admin's reading agrees with the move rather than showing votes it refused.
    expect((await hardWordReadings(200)).some((row) => row.lexemeId === id)).toBe(false);
  });

  it("counts only the engaged ones when the two are mixed", async () => {
    const id = await fivePressed();
    await graded(owners.slice(0, HARD_LEARNERS - 1));

    expect((await movedWords()).has(id)).toBe(false);
    const reading = (await hardWordReadings(200)).find((row) => row.lexemeId === id);
    expect(reading?.learners).toBe(HARD_LEARNERS - 1);
    expect(reading?.moved).toBe(false);
  });
});
