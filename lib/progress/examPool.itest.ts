import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { freshSeed } from "@/lib/exam/seed";
import { examPool } from "./exam";

/**
 * A WORD ADDED DURING A SITTING DOES NOT REACH THE PAPER THAT MARKS IT.
 *
 * `submitExam` rebuilds the paper from its seed to mark it. The pool is a
 * shuffle over every eligible entry, so one more eligible entry reorders the
 * whole draw, and a learner who looked a word up while somebody else was
 * sitting a paper changed the questions that paper was marked against. Only a
 * database can say whether the rebuilt pool is the same pool, because the
 * fault is a row arriving between two reads.
 *
 * The words are invented, for the reason every fixture here is: `Lexeme` is
 * unique on `(lemma, pos)` and a fixture spelled like a real word sits beside
 * the real one in a dictionary every later suite shares.
 */

const OWNER = "itest-owner-exampool";
const PREFIX = "itestexampool";

async function wipe() {
  await prisma.lexeme.deleteMany({ where: { lemma: { startsWith: PREFIX } } });
}

/** Enough A1 entries that a pool is a real draw even on an empty database. */
async function dictionaryAt(at: Date, count: number) {
  await prisma.lexeme.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      lemma: `${PREFIX}${String(i).padStart(4, "0")}`,
      pos: "NOUN",
      translation: `fixture ${i}`,
      cefr: "A1",
      createdAt: at,
    })),
  });
}

const ids = (pool: { lexemeId: string }[]) => pool.map((w) => w.lexemeId);

describe("the exam pool", () => {
  beforeEach(wipe);
  afterAll(async () => { await wipe(); await prisma.$disconnect(); });

  it("is the same pool after a word is added mid-sitting", async () => {
    const started = new Date(Date.now() - 60 * 60_000);
    await dictionaryAt(new Date(started.getTime() - 60_000), 40);
    const seed = freshSeed(started);

    const handedOut = ids(await examPool(OWNER, "A1", seed));

    // Somebody looks a word up while the paper is being sat.
    await prisma.lexeme.create({
      data: { lemma: `${PREFIX}late`, pos: "NOUN", translation: "fixture late", cefr: "A1" },
    });

    const markedAgainst = ids(await examPool(OWNER, "A1", seed));
    expect(markedAgainst).toEqual(handedOut);
  });

  it("draws nothing added after the paper was built, even as a fresh paper would", async () => {
    const started = new Date(Date.now() - 60 * 60_000);
    await dictionaryAt(new Date(started.getTime() - 60_000), 40);
    const late = await prisma.lexeme.create({
      data: { lemma: `${PREFIX}late`, pos: "NOUN", translation: "fixture late", cefr: "A1" },
    });
    const pinned = ids(await examPool(OWNER, "A1", freshSeed(started)));
    expect(pinned).not.toContain(late.id);
  });
});
