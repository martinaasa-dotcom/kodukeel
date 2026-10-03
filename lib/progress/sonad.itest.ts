import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { SEED_SET_SIZE } from "@/lib/collections/seedSize";
import type { DayKey } from "@/lib/time/day";
import { crosswordFor } from "./crossword";
import { puzzleFor } from "./sonad";
import { PROGRAMMES, taughtThrough } from "@/lib/course";
import { SETTING_KEYS } from "@/lib/settings/store";

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

/*
  A LEARNER THE MODULE HOLDS IS GIVEN A PUZZLE OF WORDS IT HAD TAUGHT.

  Three evenings into A1, Sõnad dealt a six-letter word to deduce out of a
  language the learner had eleven words of. The puzzle is built from the words
  the evenings had taught when the day began, which is fixed for the day, so
  the marking draws the same word; a learner who began today has been taught
  nothing yet and is given no puzzle rather than the dictionary.
*/
describe("a learner the module holds", () => {
  const HELD = "itest-owner-puzzle-held";
  const ARRIVED = "itest-owner-puzzle-arrived";
  const day = "2027-03-10" as DayKey;
  const programme = PROGRAMMES[0]!;
  const reached = programme.days.find((d) => d.index === 18)!;

  async function clear() {
    await prisma.courseStep.deleteMany({ where: { ownerId: { in: [HELD, ARRIVED] } } });
    await prisma.setting.deleteMany({ where: { ownerId: { in: [HELD, ARRIVED] } } });
  }
  beforeEach(clear);
  afterAll(clear);

  it("draws Sõnad and the crossword from the words the evenings had taught", async () => {
    await prisma.setting.create({ data: { ownerId: HELD, key: SETTING_KEYS.programme, value: programme.id } });
    await prisma.courseStep.createMany({
      data: programme.days.filter((d) => d.index <= reached.index).map((d) => ({
        ownerId: HELD, programmeId: programme.id, dayId: d.id, stepId: "do:match",
        createdAt: new Date("2027-03-01T12:00:00Z"),
      })),
    });
    const taught = new Set(taughtThrough(programme, reached.index));
    const word = await puzzleFor(HELD, day, "B1");
    expect(word, "a module learner eighteen evenings in has a six-letter word to guess").not.toBeNull();
    expect(taught.has(word!.answer)).toBe(true);
    // A tick written today is a word met today, and the day's word does not move for it.
    await prisma.courseStep.create({
      data: { ownerId: HELD, programmeId: programme.id, dayId: programme.days[reached.index]!.id, stepId: "do:match", createdAt: new Date(`${day}T12:00:00Z`) },
    });
    expect((await puzzleFor(HELD, day, "B1"))?.answer).toBe(word!.answer);
    const grid = await crosswordFor(HELD, day, "B1");
    const entries = grid?.entries ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(taught.has(entry.lemma), entry.lemma).toBe(true);
  });

  it("gives somebody who began today no puzzle rather than the dictionary", async () => {
    await prisma.setting.createMany({
      data: [
        { ownerId: ARRIVED, key: SETTING_KEYS.programme, value: programme.id },
        { ownerId: ARRIVED, key: SETTING_KEYS.onboardedAt, value: `${day}T12:00:00.000Z` },
      ],
    });
    expect(await puzzleFor(ARRIVED, day, "A1")).toBeNull();
    expect(await crosswordFor(ARRIVED, day, "A1")).toBeNull();
  });
});
