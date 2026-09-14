import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES, MEET_STEP, REVIEW_STEP } from "@/lib/course";
import { CLOSING_REVIEW, closingProgress, courseReading } from "@/lib/progress/course";
import { dayClock } from "@/lib/time/day";

/**
 * WHERE SOMEBODY IS IN THE PLANNED COURSE, AGAINST A REAL DATABASE.
 *
 * `lib/course/` is unit tested without one and answers the question "given
 * these finished steps, which day is current". This file answers the one it
 * cannot: which steps are finished, given a deck and a review log. Both of the
 * faults below were found by driving two evenings in a browser rather than by
 * reading, and neither is visible to a unit test, because a unit test hands
 * the reading a day that was already current and a set of steps that was
 * already decided.
 *
 * THE FIRST IS THE DAY THE READING ADVANCES TO. Resolving the current day's
 * two derived steps can finish it, and the day after was then drawn with its
 * own two unknown: a learner who had met tomorrow's words through Learn saw
 * tomorrow at nought percent with "meet the words" waiting for them.
 *
 * THE SECOND IS THE CLOSING ROUND'S WINDOW. It opened at the most recent tick
 * anywhere in the programme, so ticking the first round of Tuesday's module
 * moved the window past Monday's answers, Monday stopped being finished, and
 * the learner was sent back to a day they had done.
 */

const OWNER = "itest-owner-course";
const CLOCK = dayClock("Europe/Tallinn");
const PROGRAMME = PROGRAMMES[0]!;

/*
  A CLOCK THE TEST OWNS, which is this repository's own rule about a unit test
  and is the fault this file was written with. The fixtures anchored on
  "an hour ago", and the closing round's window opens at the later of the
  evening's last tick and the learner's own midnight: run at 00:40 in Tallinn,
  "an hour ago" is yesterday, the window opened at midnight, and three checks
  failed on the time of day rather than on anything in the code. So `NOW` is a
  fixed mid-evening instant and every fixture time is built from it.
*/
const NOW = new Date("2026-05-13T18:00:00Z");
/** Mid-evening in Tallinn, comfortably inside the learner's own day. */
const EVENING = new Date(NOW.getTime() - 60 * 60_000);

async function wipe() {
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
}

/** The recognition cards a day's words need, answered or not. */
async function deck(words: readonly string[], state: number) {
  const lexemes = await prisma.lexeme.findMany({
    where: { lemma: { in: [...words] } }, select: { id: true },
  });
  for (const lexeme of lexemes) {
    await prisma.card.create({
      data: {
        ownerId: OWNER, lexemeId: lexeme.id, cardType: "RECOGNITION",
        front: "x", back: "y", state,
        due: new Date(), stability: 0, difficulty: 0, elapsedDays: 0,
        scheduledDays: 0, reps: 0, lapses: 0, learningSteps: 0,
      },
    });
  }
  return lexemes.length;
}

/** The steps of a day that a learner ticks, in order, with real timestamps. */
async function tick(dayId: string, stepIds: readonly string[], at: Date) {
  for (const [n, stepId] of stepIds.entries()) {
    await prisma.courseStep.create({
      data: {
        ownerId: OWNER, programmeId: PROGRAMME.id, dayId, stepId,
        createdAt: new Date(at.getTime() + n * 1000),
      },
    });
  }
}

async function review(n: number, at: Date) {
  const card = await prisma.card.findFirst({ where: { ownerId: OWNER }, select: { id: true, lexemeId: true } });
  for (let i = 0; i < n; i += 1) {
    await prisma.review.create({
      data: {
        ownerId: OWNER, cardId: card!.id, lexemeId: card!.lexemeId,
        rating: 3, durationMs: 4000, reviewedAt: new Date(at.getTime() + i * 1000),
      },
    });
  }
}

const ticked = (day: (typeof PROGRAMME.days)[number]) =>
  day.steps.filter((s) => !s.derived).map((s) => s.id);

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("which day is current", () => {
  it("starts on day one with an empty deck", async () => {
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(1);
    expect(reading.current?.next?.id).toBe(MEET_STEP);
    expect(reading.finishedToday).toBe(false);
  });

  it("proves the meet step off the deck rather than off a tick", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.done.has(MEET_STEP)).toBe(true);
    /* Nothing was ticked, so nothing was written: the log is the proof. */
    expect(await prisma.courseStep.count({ where: { ownerId: OWNER } })).toBe(0);
  });

  it("does not count a word the learner has never been asked about", async () => {
    await deck(PROGRAMME.days[0]!.words, 0);
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.done.has(MEET_STEP)).toBe(false);
  });

  it("proves the closing round off answers given after the evening's own ticks", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const at = EVENING;
    await tick(one.id, ticked(one), at);
    await review(CLOSING_REVIEW, new Date(at.getTime() + 60_000));

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.daysDone).toBe(1);
    expect(reading.current?.day.index).toBe(2);
    expect(reading.finishedToday).toBe(true);
  });

  it("does not count answers given before the evening's rounds", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const at = EVENING;
    await review(CLOSING_REVIEW, new Date(at.getTime() - 60_000));
    await tick(one.id, ticked(one), at);

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(1);
    expect(reading.current?.next?.id).toBe(REVIEW_STEP);
  });
});

describe("the two faults a browser found", () => {
  /*
    Made to fail on the real code first: with the resolution loop removed, day
    two comes back at nought percent with its meet step waiting, on a deck
    where every one of its words has been answered.
  */
  it("resolves the day it advances to, not only the day it started on", async () => {
    const [one, two] = [PROGRAMME.days[0]!, PROGRAMME.days[1]!];
    await deck([...one.words, ...two.words], 1);
    const at = EVENING;
    await tick(one.id, ticked(one), at);
    await review(CLOSING_REVIEW, new Date(at.getTime() + 60_000));

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(2);
    /* The words are met, so day two opens part way through rather than at nothing. */
    expect(reading.current?.done.has(MEET_STEP)).toBe(true);
    expect(reading.current?.next?.id).not.toBe(MEET_STEP);
    expect(reading.current?.pct).toBeGreaterThan(0);
  });

  /*
    Made to fail on the real code first: with one window for the whole
    programme, ticking day two's first round moves it past day one's answers
    and day one stops being finished.
  */
  it("keeps a finished day finished when the next one is started", async () => {
    const [one, two] = [PROGRAMME.days[0]!, PROGRAMME.days[1]!];
    await deck([...one.words, ...two.words], 1);
    const monday = new Date(NOW.getTime() - 3 * 60 * 60_000);
    await tick(one.id, ticked(one), monday);
    await review(CLOSING_REVIEW, new Date(monday.getTime() + 60_000));

    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).daysDone).toBe(1);

    /* An hour later, the first round of the next module. */
    await tick(two.id, [ticked(two)[0]!], EVENING);

    const after = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(after.daysDone, "day one stopped being finished").toBe(1);
    expect(after.current?.day.index).toBe(2);
  });
});

describe("the closing round's own counter", () => {
  it("counts up to what the day needs and no further", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const at = EVENING;
    await tick(one.id, ticked(one), at);

    expect(await closingProgress(OWNER, PROGRAMME, one.id, CLOCK, NOW))
      .toEqual({ graded: 0, needed: CLOSING_REVIEW });

    await review(CLOSING_REVIEW + 7, new Date(at.getTime() + 60_000));
    expect(await closingProgress(OWNER, PROGRAMME, one.id, CLOCK, NOW))
      .toEqual({ graded: CLOSING_REVIEW, needed: CLOSING_REVIEW });
  });
});
