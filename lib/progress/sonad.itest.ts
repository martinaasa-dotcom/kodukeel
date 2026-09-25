import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { SEED_SET_SIZE } from "@/lib/collections/seedSize";
import type { DayKey } from "@/lib/time/day";
import { crosswordFor } from "./crossword";
import { puzzleFor } from "./sonad";

/**
 * A DAY'S PUZZLE IS ONE PUZZLE FOR THE WHOLE OF THAT DAY.
 *
 * The board is built when the learner opens it, and the server builds the same
 * puzzle again from the date and the level to mark the round (ADR-016, the
 * shape ADR-022 gives the mock exam). Both are a draw from the dictionary, and
 * the dictionary grows while people use it: a live Ekilex lookup stores a word,
 * a conversation grows the dictionary by what it needed. A word stored between
 * the two builds moved the draw, so the board a learner solved and the puzzle
 * the server marked it against were two different puzzles.
 *
 * The words are invented, like every suite that writes to the shared
 * dictionary, and dated inside the day they are added on.
 */

const OWNER = "itest-owner-daily-pin";
const WORDS = ["aaaazq", "aaazq"];

/** Days after the seed was written, so the dictionary as it stood then is the seed. */
const days = Array.from({ length: 8 }, (_, i) => `2027-03-${String(10 + i).padStart(2, "0")}` as DayKey);

async function wipe() {
  const rows = await prisma.lexeme.findMany({ where: { lemma: { in: WORDS } }, select: { id: true } });
  if (rows.length) await prisma.lexeme.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
}

/** A word stored at noon, UTC, on the day being played. */
function addedAtNoon(day: DayKey, lemma: string) {
  return prisma.lexeme.create({
    data: {
      lemma, pos: "NOUN", cefr: "B1", translation: `itest filler ${lemma}`,
      createdAt: new Date(`${day}T12:00:00Z`),
    },
  });
}

beforeEach(wipe);
afterEach(() => { vi.useRealTimers(); });
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("the dictionary this is a fact about", () => {
  it("is the one the seed loads", async () => {
    expect(await prisma.lexeme.count()).toBeGreaterThanOrEqual(SEED_SET_SIZE.words);
  });
});

describe("Sõnad", () => {
  it("marks against the word the board was built on, whatever the dictionary gained since", async () => {
    const moved: string[] = [];
    for (const day of days) {
      const board = await puzzleFor(OWNER, day, "B1");
      await addedAtNoon(day, WORDS[0]!);
      const marking = await puzzleFor(OWNER, day, "B1");
      if (board?.lexemeId !== marking?.lexemeId) moved.push(`${day}: ${board?.answer} -> ${marking?.answer}`);
      await wipe();
    }
    expect(moved).toEqual([]);
  });
});

describe("a day that began before the dictionary was seeded", () => {
  /*
    Nothing was stored before it, so the day falls back to the whole pool
    rather than to no puzzle at all, which is every day of a deployment seeded
    this morning.
  */
  it("still has a Sõnad word and a crossword", async () => {
    const day = "2000-01-01" as DayKey;
    expect(await puzzleFor(OWNER, day, "B1")).not.toBeNull();
    expect(await crosswordFor(OWNER, day, "B1")).not.toBeNull();
  });
});

describe("the crossword", () => {
  it("marks against the grid the learner filled in, whatever the dictionary gained since", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const moved: string[] = [];
    for (const day of days) {
      const board = await crosswordFor(OWNER, day, "B1");
      await addedAtNoon(day, WORDS[1]!);
      // Past the minute the pool is held for, which is where the change lands.
      vi.setSystemTime(Date.now() + 5 * 60_000);
      const marking = await crosswordFor(OWNER, day, "B1");
      const before = board?.entries.map((e) => e.lemma).join(",");
      const after = marking?.entries.map((e) => e.lemma).join(",");
      if (before !== after) moved.push(`${day}: ${before} -> ${after}`);
      await wipe();
      vi.setSystemTime(Date.now() + 5 * 60_000);
    }
    expect(moved).toEqual([]);
  });
});
