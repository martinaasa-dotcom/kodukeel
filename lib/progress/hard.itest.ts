import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { movedWords } from "./hard";
import { HARD_LEARNERS } from "@/lib/srs/defer";

/**
 * Which words enough learners have put aside, against a database.
 *
 * The share is people who put the word aside over people who met it, and the
 * unit lesson puts a word aside before any card for it exists. Counted over
 * card holders alone, a learner who refused it there was on top and never
 * below, so the share could pass one, and a word refused only in lessons had
 * no holders at all and could never move.
 */

const PREFIX = "itest-hard-";

async function wipe() {
  await prisma.deferral.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
  await prisma.card.deleteMany({ where: { ownerId: { startsWith: PREFIX } } });
  await prisma.lexeme.deleteMany({ where: { lemma: "zzhardword" } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

async function refusedBy(lexemeId: string, owners: readonly string[]) {
  const now = new Date();
  await prisma.deferral.createMany({
    data: owners.map((ownerId) => ({
      ownerId, lexemeId, lemma: "zzhardword", untilAt: new Date(now.getTime() + 86_400_000),
      reason: "SOON", times: 1,
    })),
  });
}

const aWord = () =>
  prisma.lexeme.create({ data: { lemma: "zzhardword", pos: "NOUN", translation: "x", cefr: "A2" } });

describe("movedWords", () => {
  it("counts a learner who refused a word in a lesson as somebody who met it", async () => {
    const word = await aWord();
    await refusedBy(word.id, Array.from({ length: HARD_LEARNERS }, (_, i) => `${PREFIX}${i}`));
    expect((await movedWords()).has(word.id)).toBe(true);
  });

  it("does not move a word most of the people who met it are fine with", async () => {
    const word = await aWord();
    await refusedBy(word.id, Array.from({ length: HARD_LEARNERS }, (_, i) => `${PREFIX}r${i}`));
    await prisma.card.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({
        ownerId: `${PREFIX}h${i}`, lexemeId: word.id, cardType: "RECOGNITION", front: "f", back: "b",
      })),
    });
    // Five of the thirty-five people who met it is under a fifth.
    expect((await movedWords()).has(word.id)).toBe(false);
  });
});
