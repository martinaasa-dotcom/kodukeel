import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setStarred, starredAmong } from "./stars";

/**
 * The star against a real database, because both of its faults were about
 * what the row looked like when the press arrived rather than about the code.
 * It stars a word the shipped dictionary already holds and writes nothing but
 * its own `StarredWord` rows.
 */

const MINE = "itest-owner-stars";

async function wipe() {
  await prisma.starredWord.deleteMany({ where: { ownerId: MINE } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

async function aWord(): Promise<string> {
  const row = await prisma.lexeme.findFirstOrThrow({ orderBy: { id: "asc" }, select: { id: true } });
  return row.id;
}

/** What the action did before: read, then write the opposite. */
async function oldToggle(ownerId: string, lexemeId: string): Promise<boolean> {
  const existing = await prisma.starredWord.findUnique({ where: { ownerId_lexemeId: { ownerId, lexemeId } } });
  if (existing) await prisma.starredWord.delete({ where: { ownerId_lexemeId: { ownerId, lexemeId } } });
  else await prisma.starredWord.create({ data: { ownerId, lexemeId } });
  return !existing;
}

describe("why the star says which state it wants", () => {
  it("two toggles landing together throw on the key, so the button reverts over a starred row", async () => {
    const word = await aWord();
    const outcomes = await Promise.allSettled(Array.from({ length: 4 }, () => oldToggle(MINE, word)));
    expect(outcomes.some((o) => o.status === "rejected")).toBe(true);
  });

  it("a toggle from a stale screen turns an Add into a removal", async () => {
    const word = await aWord();
    await setStarred(MINE, word, true); // starred in another tab
    // This tab still shows it unstarred, so the learner presses "Add".
    expect(await oldToggle(MINE, word)).toBe(false);
    expect((await starredAmong(MINE, [word])).has(word)).toBe(false);
  });
});

describe("setStarred", () => {
  it("writes the wanted state however many presses land together", async () => {
    const word = await aWord();
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => setStarred(MINE, word, true)));
    expect(outcomes.every((o) => o.status === "fulfilled")).toBe(true);
    expect(await prisma.starredWord.count({ where: { ownerId: MINE, lexemeId: word } })).toBe(1);

    const off = await Promise.allSettled(Array.from({ length: 8 }, () => setStarred(MINE, word, false)));
    expect(off.every((o) => o.status === "fulfilled")).toBe(true);
    expect(await prisma.starredWord.count({ where: { ownerId: MINE, lexemeId: word } })).toBe(0);
  });

  it("keeps a word starred when a stale screen asks to add it", async () => {
    const word = await aWord();
    await setStarred(MINE, word, true);
    expect(await setStarred(MINE, word, true)).toBe(true);
    expect((await starredAmong(MINE, [word])).has(word)).toBe(true);
  });
});
