import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deferWord, deferredFor, deferredWordIds, undoDeferral, wakeForLevel } from "./deferrals";
import { addUnitsToDeck, lockDeck, planUnits } from "@/lib/srs/deck";
import { SYLLABUS } from "@/lib/collections/syllabus";
import { BAND_DAYS, DEFER_DAYS } from "@/lib/srs/defer";

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
  /*
    Every builder reads the word's deferral under the deck lock and dates a new
    card on it. A deferral that pushes the cards without taking the same lock
    runs beside a builder that has read "no deferral" and not yet committed:
    the push cannot see the uncommitted card, so it commits dated now and the
    word comes straight back. Held open here on purpose, so the interleaving is
    the one a double tab or a dictionary render lands in, every run.
  */
  it("waits for a builder already holding the deck, and pushes what it built", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [now]);

    let deferred: Promise<unknown> | null = null;
    await prisma.$transaction(async (tx) => {
      await lockDeck(tx, MINE);
      await tx.card.create({
        data: { ownerId: MINE, lexemeId: entry.id, cardType: "CLOZE", front: "gap", back: "b", due: now },
      });
      deferred = deferWord(MINE, entry.id, "A1", "/review", now);
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    await deferred;

    const rows = await prisma.card.findMany({ where: { ownerId: MINE } });
    for (const row of rows) expect(row.due.getTime()).toBeGreaterThan(now.getTime());
  });

  it("pushes every card of the word, and leaves one the scheduler put further out", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [now, LATER]);

    const done = await deferWord(MINE, entry.id, "A1", "/review", now);
    expect(done.ok).toBe(true);

    const rows = await prisma.card.findMany({ where: { ownerId: MINE }, orderBy: { due: "asc" } });
    const days = (rows[0]!.due.getTime() - now.getTime()) / (24 * 3600 * 1000);
    expect(Math.round(days)).toBe(DEFER_DAYS);
    // The one already six months out is where the scheduler left it.
    expect(rows[1]!.due.toISOString()).toBe(LATER.toISOString());
  });

  it("makes a word above the learner wait for its own band", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "B2");
    await cards(entry.id, [now]);

    const done = await deferWord(MINE, entry.id, "A1", "/review", now);
    expect(done.ok && done.deferral.untilLevel).toBe("B2");
    expect(done.ok && done.deferral.days).toBe(BAND_DAYS);
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
  /*
    The mirror of the race `deferWord` takes the lock for: a builder that has
    read the deferral and not yet committed dates its card on the deferral's
    own date. An undo or a wake that does not wait for it hands back what it
    can see and leaves that card on the old date, with no row left to bring
    it back. Held open on purpose, so the interleaving happens every run.
  */
  async function buildingOnTheDeferral(lexemeId: string, run: () => Promise<unknown>) {
    const row = await prisma.deferral.findUniqueOrThrow({
      where: { ownerId_lexemeId: { ownerId: MINE, lexemeId } },
      select: { untilAt: true },
    });
    let pending: Promise<unknown> | null = null;
    await prisma.$transaction(async (tx) => {
      await lockDeck(tx, MINE);
      await tx.card.create({
        data: { ownerId: MINE, lexemeId, cardType: "CLOZE", front: "gap", back: "b", due: row.untilAt },
      });
      pending = run();
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    await pending;
  }

  it("waits for a builder already holding the deck before giving the word back", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [now]);
    await deferWord(MINE, entry.id, "A1", "/review", now);

    const back = new Date("2026-09-15T10:00:00.000Z");
    await buildingOnTheDeferral(entry.id, () => undoDeferral(MINE, entry.id, back));

    const rows = await prisma.card.findMany({ where: { ownerId: MINE } });
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.due.toISOString()).toBe(back.toISOString());
  });

  it("waits for a builder already holding the deck before waking a word", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "B1");
    await cards(entry.id, [now]);
    await deferWord(MINE, entry.id, "A2", "/review", now);

    const moved = new Date("2026-10-01T10:00:00.000Z");
    await buildingOnTheDeferral(entry.id, () => wakeForLevel(MINE, "B1", moved));

    const rows = await prisma.card.findMany({ where: { ownerId: MINE } });
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.due.toISOString()).toBe(moved.toISOString());
  });

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

/**
 * And the half the unit lesson needs, which is about a card that does not
 * exist yet.
 *
 * Pushing `due` reaches every card a word has; a word refused during a lesson
 * has none until `completeLesson` builds them at the end, and "Add to deck" on
 * the unit afterwards is the same shape. Without the builder asking, the word
 * somebody said was too complicated arrives the next morning with a card dated
 * today, which is the button quietly not working.
 */
describe("a card built after the word was put aside", () => {
  const OWNER = "itest-owner-defer-build";
  const unit = SYLLABUS.find((u) => u.lemmas.length >= 3)!;

  afterAll(async () => { await prisma.card.deleteMany({ where: { ownerId: OWNER } }); });

  it("is dated where the deferral put it, and its neighbours are not", async () => {
    await prisma.card.deleteMany({ where: { ownerId: OWNER } });
    await prisma.deferral.deleteMany({ where: { ownerId: OWNER } });

    // A word of the unit the dictionary actually holds, since a lemma in a
    // unit is a request rather than a fact (the Ekilex harvest decides).
    const plan = planUnits([unit.id]);
    const word = await prisma.lexeme.findFirst({
      where: { lemma: { in: [...plan.lemmas] } },
      select: { id: true, lemma: true },
      orderBy: { id: "asc" },
    });
    expect(word).not.toBeNull();

    /*
      THE REAL CLOCK, WHICH IS THE ONE `addUnitsToDeck` READS.
      Every other test here hands its own `now` to every call it makes and is
      hermetic for it. This one cannot: the builder is what is under test and
      it asks `deferredDues` with a clock of its own, so a wait written against
      a fixed date is a wait that has to outlast the distance between that date
      and today. It was `2026-09-14`, and it passed only because the plain wait
      was three weeks long; at three days the deferral had expired before the
      builder ever looked, the card was correctly built for today, and the
      failure read as the button not working.
    */
    const now = new Date();
    const put = await deferWord(OWNER, word!.id, "A1", "/learn/lesson", now);
    expect(put.ok).toBe(true);

    await addUnitsToDeck(OWNER, [unit.id]);

    const mine = await prisma.card.findMany({
      where: { ownerId: OWNER, lexemeId: word!.id },
      select: { due: true },
    });
    expect(mine.length).toBeGreaterThan(0);
    for (const card of mine) {
      expect(card.due.toISOString()).toBe(put.ok && put.deferral.untilAt.toISOString());
    }

    const others = await prisma.card.findMany({
      where: { ownerId: OWNER, lexemeId: { not: word!.id } },
      select: { due: true },
      take: 5,
      orderBy: { id: "asc" },
    });
    // Everything else arrives ready to be taught, which is what a new card is.
    for (const card of others) expect(card.due.getTime()).toBeLessThan(Date.now() + 1000);

    await prisma.deferral.deleteMany({ where: { ownerId: OWNER } });
  });
});

/**
 * SAYING IT TWICE, WHICH IS WHERE THE WHOLE THING COMES APART IF THE DATE CAN
 * SHRINK.
 *
 * The undo and `wakeForLevel` both hand a word back by matching the cards
 * sitting on the date the deferral wrote, which is what stops either of them
 * pulling forward a card the scheduler had honestly put further out. A second
 * press that wrote an *earlier* date would leave the cards standing on the old
 * one, matched by nothing, so the row would read a few days while the word
 * stayed gone for a term and the way back would do nothing at all. It is
 * reachable: a wait for a band, then a level rise, then the same word on a
 * screen that was already open.
 */
describe("a second press", () => {
  it("keeps the longer wait, and its grounds with it", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "B2");
    await cards(entry.id, [now]);

    // Said at A1, so it waits for B2: a term.
    await deferWord(MINE, entry.id, "A1", "/review", now);
    const first = await prisma.deferral.findFirstOrThrow({ where: { ownerId: MINE } });
    expect(first.reason).toBe("BAND");

    // Said again a day later, now standing at B2 themselves, which on its own
    // would be the plain few days and therefore sooner.
    const later = new Date(now.getTime() + 24 * 3600 * 1000);
    const again = await deferWord(MINE, entry.id, "B2", "/review", later);
    expect(again.ok).toBe(true);

    const row = await prisma.deferral.findFirstOrThrow({ where: { ownerId: MINE } });
    expect(row.untilAt.toISOString()).toBe(first.untilAt.toISOString());
    expect(row.untilLevel).toBe("B2");
    expect(row.reason).toBe("BAND");
    // It is still one person saying it, counted once, and how loudly is `times`.
    expect(row.times).toBe(2);
    expect(await prisma.deferral.count({ where: { ownerId: MINE } })).toBe(1);
  });

  it("leaves the cards on one date, so the way back still works", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "B2");
    await cards(entry.id, [now, LATER]);

    await deferWord(MINE, entry.id, "A1", "/review", now);
    await deferWord(MINE, entry.id, "B2", "/review", new Date(now.getTime() + 24 * 3600 * 1000));

    const back = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
    expect(await undoDeferral(MINE, entry.id, back)).toBe(true);

    const rows = await prisma.card.findMany({ where: { ownerId: MINE }, orderBy: { due: "asc" } });
    expect(rows[0]!.due.toISOString()).toBe(back.toISOString());
    // And the one the scheduler put six months out is still six months out.
    expect(rows[1]!.due.toISOString()).toBe(LATER.toISOString());
    expect(await deferredWordIds(MINE, back)).not.toContain(entry.id);
  });

  it("does start a fresh wait once the last one is spent", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const entry = await word("zzdefer", "A1");
    await cards(entry.id, [now]);

    await deferWord(MINE, entry.id, "A1", "/review", now);
    // A month on, the few days are long up and the word has come back.
    const month = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    await deferWord(MINE, entry.id, "A1", "/review", month);

    const row = await prisma.deferral.findFirstOrThrow({ where: { ownerId: MINE } });
    const days = (row.untilAt.getTime() - month.getTime()) / (24 * 3600 * 1000);
    expect(Math.round(days)).toBe(DEFER_DAYS);
    const card = await prisma.card.findFirstOrThrow({ where: { ownerId: MINE } });
    expect(card.due.toISOString()).toBe(row.untilAt.toISOString());
  });
});
