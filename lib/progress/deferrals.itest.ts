import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deferWord, deferredFor, deferredWordIds, undoDeferral, wakeForLevel } from "./deferrals";
import { BAND_WEEKS, DEFER_WEEKS } from "@/lib/srs/defer";

/**
 * Putting a word aside, against a database, because what it promises is about
 * rows rather than about arithmetic.
 *
 * The rule is that it moves `Card.due` and gives back only what it took. Both
 * halves are invisible to a unit test: the first is an `updateMany` with a
 * date comparison in it, and the second is the difference between matching the
 * date this wrote and setting every card of the word to now, which is the
 * schedule being overwritten by a button that promised not to touch it. A card
 * FSRS had honestly put six months out is the case that separates them, so
 * there is one in every fixture here.
 */

const MINE = "itest-owner-defer";
const LATER = new Date("2027-06-01T09:00:00.000Z");

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: MINE } });
  await prisma.deferral.deleteMany({ where: { ownerId: MINE } });
  await prisma.lexeme.deleteMany({ where: { lemma: { in: ["zzdefer", "zzdeferb"] } } });
}

/** A word of this test's own, spelled so nobody could mistake it for Estonian. */
async function word(lemma: string, cefr: string | null) {
  return prisma.lexeme.create({
    data: { lemma, pos: "NOUN", translation: `${lemma} in English`, cefr },
  });
}

async function cards(lexemeId: string, dues: readonly Date[]) {
  await prisma.card.createMany({
    data: dues.map((due, i) => ({
      ownerId: MINE, lexemeId, cardType: i === 0 ? "RECOGNITION" : "PRODUCTION",
      front: "front", back: "back", due, state: 2,
    })),
  });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("deferWord", () => {
  it("pushes every card of the word, and leaves one the scheduler put further out", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [now, LATER]);

    const done = await deferWord(MINE, entry.id, "A1", "/review", now);
    expect(done.ok).toBe(true);

    const rows = await prisma.card.findMany({ where: { ownerId: MINE }, orderBy: { due: "asc" } });
    const weeks = (rows[0]!.due.getTime() - now.getTime()) / (7 * 24 * 3600 * 1000);
    expect(Math.round(weeks)).toBe(DEFER_WEEKS);
    // The one already six months out is where the scheduler left it.
    expect(rows[1]!.due.toISOString()).toBe(LATER.toISOString());
  });

  it("makes a word above the learner wait for its own band", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "B2");
    await cards(entry.id, [now]);

    const done = await deferWord(MINE, entry.id, "A1", "/review", now);
    expect(done.ok && done.deferral.untilLevel).toBe("B2");
    expect(done.ok && done.deferral.weeks).toBe(BAND_WEEKS);
  });

  /* A second press is the same person saying it again: one row per learner per
     word is what makes the deployment-wide count mean people. */
  it("keeps one row per learner per word and counts the presses on it", async () => {
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [new Date()]);

    await deferWord(MINE, entry.id, "A1", "/review");
    await deferWord(MINE, entry.id, "A1", "/review");

    const rows = await prisma.deferral.findMany({ where: { ownerId: MINE } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.times).toBe(2);
  });
});

describe("giving a word back", () => {
  it("returns what it took and nothing else", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [now, LATER]);
    await deferWord(MINE, entry.id, "A1", "/review", now);

    const back = new Date("2026-09-15T10:00:00.000Z");
    expect(await undoDeferral(MINE, entry.id, back)).toBe(true);

    const rows = await prisma.card.findMany({ where: { ownerId: MINE }, orderBy: { due: "asc" } });
    expect(rows[0]!.due.toISOString()).toBe(back.toISOString());
    // Still where the scheduler left it, which is the half a blanket update breaks.
    expect(rows[1]!.due.toISOString()).toBe(LATER.toISOString());
    expect(await prisma.deferral.count({ where: { ownerId: MINE } })).toBe(0);
  });

  it("hands back the words that were waiting for a band the learner reaches", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const waiting = await word("zzdefer", "B1");
    const other = await word("zzdeferb", "C1");
    await cards(waiting.id, [now]);
    await cards(other.id, [now]);
    await deferWord(MINE, waiting.id, "A2", "/review", now);
    await deferWord(MINE, other.id, "A2", "/review", now);

    const moved = new Date("2026-10-01T10:00:00.000Z");
    expect(await wakeForLevel(MINE, "B1", moved)).toBe(1);

    const back = await prisma.card.findFirst({ where: { ownerId: MINE, lexemeId: waiting.id } });
    expect(back!.due.toISOString()).toBe(moved.toISOString());
    // The C1 word is still waiting, because C1 is not where they are.
    const still = await prisma.card.findFirst({ where: { ownerId: MINE, lexemeId: other.id } });
    expect(still!.due.getTime()).toBeGreaterThan(moved.getTime());

    /*
      And a woken row stops holding without anybody reading a level again,
      which is what the stamp is for: a dozen read paths ask this question.
    */
    const held = await deferredWordIds(MINE, moved);
    expect(held.has(waiting.id)).toBe(false);
    expect(held.has(other.id)).toBe(true);

    const listed = await deferredFor(MINE, moved);
    expect(listed.map((row) => row.lemma)).toEqual(["zzdeferb"]);
  });
});
