import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES } from "@/lib/course";
import { CLOSING_REVIEW } from "@/lib/progress/course";
import { candidateFor } from "@/lib/progress/mailout";
import { letterOwed } from "@/lib/email/schedule";
import { SETTING_KEYS } from "@/lib/settings/store";

/**
 * WHO THE EVENING LETTER IS FOR, AGAINST A REAL DATABASE.
 *
 * `lib/email/schedule.ts` is unit tested on a `Candidate` somebody already
 * built, so it cannot see the two faults this file is about, which are both
 * in how the candidate is built.
 *
 * THE FIRST IS WHO HAS A COURSE. `programmeFor` answers for everybody: a
 * learner who never opened the module is offered `openingPart` off their
 * level, which is an offer rather than a record, and the letter read it as a
 * course they were following. So somebody who had never pressed a step was
 * told "Tonight is five new words" every evening, about an evening they never
 * chose. A tick is the learner saying they follow the module, which is
 * `moduleReached`'s own rule.
 *
 * THE SECOND IS AN EVENING ALREADY DONE. Finishing tonight's module and then
 * pressing "start the next one now" ticks a step of tomorrow's, so the reading
 * stands on tomorrow's day, unfinished, and the letter asked somebody who had
 * just done their evening to go and do it.
 */

const OWNER = "itest-owner-mailout-evening";
const PROGRAMME = PROGRAMMES[0]!;
/** 21:00 in Tallinn on a Wednesday: inside the evening window, past 18:00. */
const NOW = new Date("2026-05-13T18:00:00Z");
const EVENING = new Date(NOW.getTime() - 2 * 60 * 60_000);

async function wipe() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
}

async function zone() {
  await prisma.setting.create({
    data: { ownerId: OWNER, key: SETTING_KEYS.timeZone, value: "Europe/Tallinn" },
  });
}

/** The day's words, met, so the "meet the words" step is proved off the log. */
async function deck(words: readonly string[]) {
  const lexemes = await prisma.lexeme.findMany({
    where: { lemma: { in: [...new Set(words)] } }, select: { id: true },
  });
  expect(lexemes.length, "run `npm run db:seed`: the dictionary cannot supply the day's words")
    .toBeGreaterThan(0);
  for (const lexeme of lexemes) {
    await prisma.card.create({
      data: {
        ownerId: OWNER, lexemeId: lexeme.id, cardType: "RECOGNITION",
        front: "x", back: "y", state: 1,
        due: new Date(NOW.getTime() + 24 * 3600_000), stability: 0, difficulty: 0,
        elapsedDays: 0, scheduledDays: 0, reps: 1, lapses: 0, learningSteps: 0,
      },
    });
  }
}

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

async function owed() {
  const who = await candidateFor(OWNER, NOW);
  return letterOwed({ ...who, email: "learner@example.test" }, NOW)?.kind ?? null;
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("the evening letter", () => {
  it("is not sent to somebody who has never started the module", async () => {
    await zone();
    expect(await owed()).not.toBe("tonight");
  });

  it("is sent to somebody who started it and has not done tonight", async () => {
    const [one] = PROGRAMME.days;
    await zone();
    await deck(one!.words);
    await tick(one!.id, ticked(one!).slice(0, 1), new Date(NOW.getTime() - 24 * 3600_000));
    expect(await owed()).toBe("tonight");
  });

  it("is not sent after tonight's module was finished and the next one started", async () => {
    const [one, two] = PROGRAMME.days;
    await zone();
    await deck([...one!.words, ...two!.words]);
    await tick(one!.id, ticked(one!), EVENING);
    await review(CLOSING_REVIEW, new Date(EVENING.getTime() + 60_000));
    // "Start the next one now", pressed straight after.
    await tick(two!.id, ticked(two!).slice(0, 1), new Date(EVENING.getTime() + 10 * 60_000));
    expect(await owed()).not.toBe("tonight");
  });
});
