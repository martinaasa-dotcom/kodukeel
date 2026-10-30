import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { entryOwnership, removeWord } from "./removeWord";

/*
  TAKING A TYPED WORD BACK OUT, AGAINST A REAL DATABASE, because what goes
  with the row is decided by the schema's cascades and only a database can say
  what they did. The review log has to survive it, since `Review` has no
  foreign key to `Card` precisely so that removing a card cannot take its
  history with it.
*/

const LEMMA = "itest-remove-kogunud";
const ME = "itest-remove-me";
const OTHER = "itest-remove-other";

async function wipe() {
  const ids = (await prisma.lexeme.findMany({ where: { lemma: LEMMA }, select: { id: true } })).map((l) => l.id);
  await prisma.review.deleteMany({ where: { ownerId: { in: [ME, OTHER] } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: [ME, OTHER] } } });
  if (ids.length) await prisma.lexeme.deleteMany({ where: { id: { in: ids } } });
}

async function typedWord(provenance = "USER") {
  return prisma.lexeme.create({
    data: {
      lemma: LEMMA, pos: "VERB", translation: "gathered", provenance, editedBy: ME,
      forms: { create: [{ formType: "INF_MA", value: LEMMA, isPrincipal: true, orderIndex: 0 }] },
    },
  });
}

async function cardFor(ownerId: string, lexemeId: string) {
  return prisma.card.create({
    data: { ownerId, lexemeId, cardType: "RECOGNITION", front: LEMMA, back: "gathered", due: new Date() },
  });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("removing a word somebody typed", () => {
  it("lets the learner remove their own word, takes its cards and keeps the review log", async () => {
    const word = await typedWord();
    const card = await cardFor(ME, word.id);
    await prisma.review.create({
      data: { ownerId: ME, cardId: card.id, lexemeId: word.id, rating: 3, reviewedAt: new Date() },
    });

    expect(await entryOwnership(ME, false, word.id)).toMatchObject({ mine: true, shared: false, removable: true });
    expect(await removeWord(ME, false, word.id)).toMatchObject({ ok: true, lemma: LEMMA, cards: 1, learners: 1 });

    expect(await prisma.lexeme.findUnique({ where: { id: word.id } })).toBeNull();
    expect(await prisma.form.count({ where: { lexemeId: word.id } })).toBe(0);
    expect(await prisma.card.count({ where: { lexemeId: word.id } })).toBe(0);
    expect(await prisma.review.count({ where: { lexemeId: word.id } })).toBe(1);
  });

  it("refuses the learner once somebody else holds a card, and lets a reviewer remove it for everyone", async () => {
    const word = await typedWord();
    await cardFor(ME, word.id);
    await cardFor(OTHER, word.id);

    expect(await removeWord(ME, false, word.id)).toMatchObject({ ok: false });
    expect(await prisma.lexeme.findUnique({ where: { id: word.id } })).not.toBeNull();

    expect(await removeWord("itest-remove-reviewer", true, word.id)).toMatchObject({ ok: true, cards: 2, learners: 2 });
    expect(await prisma.card.count({ where: { lexemeId: word.id } })).toBe(0);
  });

  it("never removes a word a source supplied, not even for a reviewer", async () => {
    const word = await typedWord("EKILEX");
    expect(await removeWord("itest-remove-reviewer", true, word.id)).toMatchObject({ ok: false });
    expect(await prisma.lexeme.findUnique({ where: { id: word.id } })).not.toBeNull();
  });
});
