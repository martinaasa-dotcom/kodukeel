import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES } from "@/lib/course";
import { LESSON_STEP } from "@/lib/course/types";
import { courseReading, dayIsInPlay } from "@/lib/progress/course";
import { restartPart } from "@/lib/progress/courseReset";
import { dayClock } from "@/lib/time/day";
import { SETTING_KEYS } from "@/lib/settings/store";

/**
 * WHERE SOMEBODY IS IN THE PLANNED COURSE, AGAINST A REAL DATABASE.
 *
 * `lib/course/` is unit tested without one and answers the question "given
 * these finished steps, which day is current". This file answers the parts of
 * it a unit test cannot: which day an action may write about, a part started
 * over, and whether a part finished tonight reads as finished today.
 *
 * Every level is the lessons since C1 moved (docs/43-lessons.md §16), so an
 * evening is one lesson with one step (`LESSON_STEP`), which the learner
 * ticks by finishing the lesson. The readings this file used to make about an
 * evening built from units, its two steps the log proves (meeting the words
 * and the closing round) and the window the closing round counts in, had no
 * evening left to be about and went with that move; their code goes with the
 * unit builder (§15.13, C1-9).
 */

const OWNER = "itest-owner-course";
const CLOCK = dayClock("Europe/Tallinn");
/** The first part of the course, which is lessons like every part. */
const PROGRAMME = PROGRAMMES[0]!;

/*
  A CLOCK THE TEST OWNS, which is this repository's own rule about a unit test.
  `NOW` is a fixed mid-evening instant and every fixture time is built from it.
*/
const NOW = new Date("2026-05-13T18:00:00Z");
/** Mid-evening in Tallinn, comfortably inside the learner's own day. */
const EVENING = new Date(NOW.getTime() - 60 * 60_000);

async function wipe() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
  await prisma.deferral.deleteMany({ where: { ownerId: OWNER } });
  /* Following the part these readings are about, which is also what a learner with nothing stored follows. */
  await prisma.setting.create({ data: { ownerId: OWNER, key: SETTING_KEYS.programme, value: PROGRAMME.id } });
}

/** A lesson finished, as `finishLesson` ticks it. */
async function finish(dayId: string, at: Date) {
  await prisma.courseStep.create({
    data: { ownerId: OWNER, programmeId: PROGRAMME.id, dayId, stepId: LESSON_STEP, createdAt: at },
  });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.setting.deleteMany({ where: { ownerId: OWNER } }); await prisma.$disconnect(); });

describe("the course, a lesson an evening", () => {
  it("is a premise this test can hold: every evening of the part is one lesson with one step", () => {
    expect(PROGRAMME.days.length).toBeGreaterThanOrEqual(5);
    for (const d of PROGRAMME.days) {
      expect(d.lesson, d.id).toBeTruthy();
      expect(d.steps.map((s) => s.id), d.id).toEqual([LESSON_STEP]);
    }
  });

  it("starts on the first lesson with nothing ticked", async () => {
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(1);
    expect(reading.finished).toBe(false);
  });

  it("is on the next lesson once a lesson is finished, and says tonight is done", async () => {
    await finish(PROGRAMME.days[0]!.id, EVENING);
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.finishedToday).toBe(true);
  });

  it("says nothing about today when the lesson was finished last night", async () => {
    await finish(PROGRAMME.days[0]!.id, new Date(EVENING.getTime() - 24 * 3600_000));
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.finishedToday).toBe(false);
    expect(reading.current?.day.index).toBe(2);
  });
});

describe("the day an action may write about", () => {
  it("takes the day reached, and the one it opens on to once it is finished", async () => {
    const one = PROGRAMME.days[0]!;
    expect(await dayIsInPlay(OWNER, PROGRAMME, one, NOW)).toBe(true);
    await finish(one.id, EVENING);
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[1]!, NOW)).toBe(true);
  });

  /*
    THE LADDER NOBODY HAD TO CLIMB. A tick on a day makes it the day reached,
    so a caller who could tick the day after an unfinished one could tick every
    evening of the program in turn, one request each, having done nothing.
  */
  it("does not open the next day while the day reached is unfinished", async () => {
    const two = PROGRAMME.days[1]!;
    expect(await dayIsInPlay(OWNER, PROGRAMME, two, NOW)).toBe(false);
    /* A forged tick on day two, written past the gate, opens nothing further than the day after it. */
    await finish(two.id, EVENING);
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[4]!, NOW)).toBe(false);
  });

  /*
    A forged day id is the whole reason this exists: a tick is the pointer, so
    one written on a day nobody has reached would move the course onto it.
  */
  it("refuses a day nobody has reached", async () => {
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[4]!)).toBe(false);
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days.at(-1)!)).toBe(false);
  });

  /*
    AND THE PROGRAM HAS TO BE THE ONE THEY ARE FOLLOWING. A part nobody has
    opened has no ticks, so its first two evenings would read as "reached",
    and a call naming the last part of C1 would build a beginner's deck out of
    its words.
  */
  it("refuses a day of a program they are not following", async () => {
    const elsewhere = PROGRAMMES.at(-1)!;
    expect(elsewhere.id).not.toBe(PROGRAMME.id);
    expect(await dayIsInPlay(OWNER, elsewhere, elsewhere.days[0]!)).toBe(false);
    expect(await dayIsInPlay(OWNER, elsewhere, elsewhere.days[1]!)).toBe(false);
    // The one they are following is still open, which is what the UI hands over.
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[0]!)).toBe(true);
  });
});

/*
  A LEVEL CHANGE STARTS THE PART OVER, AND THE PART CAN THEN BE WALKED AGAIN.
  The first version read past a restarted part's old ticks by the time they
  were written, which left every one of them holding its unique key: finishing
  the same lesson on the restarted part wrote nothing, so it could never be
  finished. `restartPart` clears them instead.
*/
describe("a part started over", () => {
  it("opens on its first evening and takes the same tick again", async () => {
    const [one, two] = [PROGRAMME.days[0]!, PROGRAMME.days[1]!];
    await finish(one.id, EVENING);
    await finish(two.id, new Date(EVENING.getTime() + 120_000));
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.day.index).toBe(3);

    const other = PROGRAMMES[1]!;
    await prisma.courseStep.create({ data: { ownerId: OWNER, programmeId: other.id, dayId: other.days[0]!.id, stepId: LESSON_STEP } });

    await restartPart(OWNER, PROGRAMME.id);
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.day.index).toBe(1);
    // Another part's ticks are not this part's to clear.
    expect(await prisma.courseStep.count({ where: { ownerId: OWNER, programmeId: other.id } })).toBe(1);

    await prisma.courseStep.upsert({
      where: { ownerId_programmeId_dayId_stepId: { ownerId: OWNER, programmeId: PROGRAMME.id, dayId: one.id, stepId: LESSON_STEP } },
      update: {},
      create: { ownerId: OWNER, programmeId: PROGRAMME.id, dayId: one.id, stepId: LESSON_STEP },
    });
    expect(await prisma.courseStep.count({ where: { ownerId: OWNER, programmeId: PROGRAMME.id } })).toBe(1);
  });
});

describe("a part's last evening", () => {
  /*
    A whole part has no current day, so the rule that finds the evening a
    render just finished could not fire, and a lesson part finished tonight
    read as finished on some other day: Today skipped "done for today" and
    offered the next part at once. And the morning after, it must offer the
    next part rather than fall back to the card for somebody with no course.
  */
  async function finishPart(at: Date) {
    await prisma.courseStep.createMany({
      data: PROGRAMME.days.flatMap((d) => d.steps.map((s) => ({
        ownerId: OWNER, programmeId: PROGRAMME.id, dayId: d.id, stepId: s.id, createdAt: at,
      }))),
    });
  }

  it("is an evening finished today when its last tick is today", async () => {
    await finishPart(EVENING);
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.finished).toBe(true);
    expect(reading.finishedToday).toBe(true);
  });

  it("is not finished today when its last tick was yesterday", async () => {
    await finishPart(new Date(EVENING.getTime() - 24 * 3600_000));
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.finished).toBe(true);
    expect(reading.finishedToday).toBe(false);
  });
});
