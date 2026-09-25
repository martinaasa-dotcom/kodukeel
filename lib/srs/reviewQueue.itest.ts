import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { meetingFirst } from "./reviewQueue";

/**
 * What a drill of newly added words may hand out, against a real query.
 *
 * The clause is a relation filter, so what it lets through is a claim about
 * Postgres rather than about a type.
 */

const OWNER = "itest-owner-reviewqueue";
const LEMMA = "itestrqzurp";

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

async function word(ladderState: number) {
  const lexeme = await prisma.lexeme.create({ data: { lemma: LEMMA, pos: "NOUN", translation: "itest" } });
  const base = { ownerId: OWNER, lexemeId: lexeme.id, front: "x", back: "y", due: new Date() };
  await prisma.card.create({ data: { ...base, cardType: LADDER_CARD_TYPE, state: ladderState } });
  await prisma.card.create({ data: { ...base, cardType: "CASE_FORM", targetCase: "INESSIVE", state: 0 } });
  return lexeme.id;
}

describe("meetingFirst", () => {
  it("meets a new word on its ladder card and holds its case card back", async () => {
    const id = await word(0);
    const cards = await prisma.card.findMany({
      where: { ownerId: OWNER, lexemeId: id, ...meetingFirst(OWNER) }, select: { cardType: true },
    });
    expect(cards.map((c) => c.cardType)).toEqual([LADDER_CARD_TYPE]);
  });

  it("lets the case card through once the word has left the ladder", async () => {
    const id = await word(2);
    const cards = await prisma.card.findMany({
      where: { ownerId: OWNER, lexemeId: id, ...meetingFirst(OWNER) }, select: { cardType: true },
    });
    expect(cards.map((c) => c.cardType).sort()).toEqual(["CASE_FORM", LADDER_CARD_TYPE].sort());
  });
});
