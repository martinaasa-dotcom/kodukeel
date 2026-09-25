import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PROGRAMMES, MEET_STEP, REVIEW_STEP } from "@/lib/course";
import { CLOSING_REVIEW, closingProgress, courseReading, dayIsInPlay, ladderReading } from "@/lib/progress/course";
import { recordCourseLevel } from "@/lib/progress/level";
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
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
  await prisma.deferral.deleteMany({ where: { ownerId: OWNER } });
}

/**
 * The recognition cards a day's words need, answered or not.
 *
 * IT STATES ITS PRECONDITION RATHER THAN INHERITING IT, which is this
 * repository's own rule and is what this file was missing. Every reading below
 * is about a deck, and a deck is built out of the shipped dictionary: run
 * after a suite that empties or edits it, the cards simply fail to appear, the
 * day never finishes, and the failure reads as the pointer stalling on a day
 * it has already passed. That cost an hour once. Here it fails in seven
 * milliseconds and names the command.
 */
async function deck(words: readonly string[], state: number) {
  const wanted = [...new Set(words)];
  const lexemes = await prisma.lexeme.findMany({
    where: { lemma: { in: wanted } }, select: { id: true, lemma: true },
  });
  const held = new Set(lexemes.map((l) => l.lemma));
  const missing = wanted.filter((w) => !held.has(w));
  expect(
    missing, `the dictionary cannot supply ${missing.length} of the ${wanted.length} words these `
    + "evenings teach, so no deck can be built and every reading below is about nothing. Run "
    + "`npm run db:seed`: a suite that empties or edits the dictionary ran first",
  ).toEqual([]);
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

/**
 * Cards the closing round can actually ask, which is not the same as a deck.
 *
 * The recognition cards `deck` builds are the Learn ladder's own and the
 * review queue refuses them while they are on it, so a fixture holding those
 * alone has nothing to review. That is a real state and it is the one the bug
 * below was reported in; it is not the state the tests about the *counter*
 * mean to be in, so those say so by calling this.
 *
 * `PRODUCTION` at the scheduler's Review state and due: nothing about a module
 * refuses it, so the closing round has five things to ask.
 */
async function reviewable(n: number): Promise<string[]> {
  const lexeme = await prisma.lexeme.findFirst({ select: { id: true } });
  const ids: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const card = await prisma.card.create({
      data: {
        ownerId: OWNER, lexemeId: lexeme!.id, cardType: "PRODUCTION",
        front: `p${i}`, back: "y", state: 2,
        due: new Date(NOW.getTime() - 60_000), stability: 1, difficulty: 1, elapsedDays: 1,
        scheduledDays: 1, reps: 1, lapses: 0, learningSteps: 0,
      },
      select: { id: true },
    });
    ids.push(card.id);
  }
  return ids;
}

/**
 * An unseen card on a word the evening teaches, which is what the closing
 * round's other half draws on.
 *
 * `PRODUCTION` rather than the recognition card `deck` builds, so the Learn
 * ladder has no claim on it and the only thing that can keep it out of the
 * count is the learner's own band.
 */
async function unseenTaught(words: readonly string[]): Promise<void> {
  const lexeme = await prisma.lexeme.findFirst({
    where: { lemma: { in: [...new Set(words)] } }, select: { id: true },
  });
  await prisma.card.create({
    data: {
      ownerId: OWNER, lexemeId: lexeme!.id, cardType: "PRODUCTION",
      front: "u0", back: "y", state: 0,
      due: new Date(NOW.getTime() - 60_000), stability: 0, difficulty: 0, elapsedDays: 0,
      scheduledDays: 0, reps: 0, lapses: 0, learningSteps: 0,
    },
  });
}

/** A card answered and scheduled away, which is what grading one does. */
async function scheduleAway(ids: readonly string[]) {
  await prisma.card.updateMany({
    where: { ownerId: OWNER, id: { in: [...ids] } },
    data: { due: new Date(NOW.getTime() + 24 * 3600_000) },
  });
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

  it("meets a word the learner put aside, since the ladder will not serve it tonight", async () => {
    /*
      "Too complicated" on the meet rung moves the card's date and leaves it
      New, and the ladder serves only what is due, so a step waiting for it
      to leave New waited for ever and no press could move the evening.
    */
    const words = PROGRAMME.days[0]!.words;
    await deck(words, 1);
    const card = await prisma.card.findFirst({ where: { ownerId: OWNER }, select: { id: true, lexemeId: true } });
    await prisma.card.update({ where: { id: card!.id }, data: { state: 0 } });
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.done.has(MEET_STEP)).toBe(false);
    await prisma.deferral.create({
      data: {
        ownerId: OWNER, lexemeId: card!.lexemeId!, lemma: "x", reason: "SOON",
        untilAt: new Date(Date.now() + 3 * 24 * 3600_000),
      },
    });
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.done.has(MEET_STEP)).toBe(true);
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
    /* And one evening ticked tonight is a run of one, read off the same rows. */
    expect(reading.eveningsInARow).toBe(1);
  });

  it("does not count answers given before the evening's rounds", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    await reviewable(CLOSING_REVIEW);
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

describe("a course that has to survive a midnight", () => {
  /** Every non-derived step of a day, and the five answers that close it. */
  async function evening(day: (typeof PROGRAMME.days)[number], at: Date) {
    await tick(day.id, ticked(day), at);
    await review(CLOSING_REVIEW, new Date(at.getTime() + 60_000));
  }

  /*
    THE FAULT THIS WAS WRITTEN FOR, AND IT SHIPPED.

    The closing round's window opened at the later of the day's last tick and
    the learner's own midnight, which is the same window on the evening itself
    and a different one every morning after. A module finished at nine last
    night had its window moved to midnight, the answers that closed it stopped
    counting, and the learner opened the app to the module they had already
    done. Every test in this file ran inside one day, so nothing could see it:
    made to fail by putting the floor back, and it comes back as day one.
  */
  it("keeps last night's module finished this morning", async () => {
    const [one, two] = [PROGRAMME.days[0]!, PROGRAMME.days[1]!];
    await deck([...one.words, ...two.words], 1);
    await evening(one, new Date(NOW.getTime() - 24 * 60 * 60_000));

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.daysDone, "last night's module came back").toBe(1);
    expect(reading.current?.day.index).toBe(2);
    /* And it does not claim this morning as the evening that finished it. */
    expect(reading.finishedToday).toBe(false);
  });

  /*
    AND THE POINTER MAY NOT STALL ON A LONG PROGRAMME.

    It used to be recomputed from the top: by ticks alone every day is
    unfinished, since two steps of each are proved off the log and written
    nowhere, so the reading walked from day one asking the log about every day
    it passed, under a cap. Past the cap the learner was held for ever on
    whichever evening the cap fell on. Made to fail by recomputing from day
    one with the old cap, which answers day four here.
  */
  it("stands on the day reached however many evenings are behind it", async () => {
    const days = PROGRAMME.days.slice(0, 6);
    await deck(days.flatMap((d) => d.words), 1);
    for (const [i, d] of days.slice(0, 5).entries()) {
      await evening(d, new Date(NOW.getTime() - (4 - i) * 24 * 60 * 60_000));
    }

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.daysDone).toBe(5);
    expect(reading.current?.day.index).toBe(6);
    /* The fifth evening was this one, and that is what "come back tomorrow" is
       a claim about. It used to be read off day one and so was reachable on
       the first evening alone. */
    expect(reading.finishedToday, "the evening it just finished").toBe(true);
  });

  /*
    An evening's own answers close that evening and no other. Under the old
    floor, finishing one module and pressing "start the next one now" drew the
    next day with its closing round already satisfied by the round that had
    just closed the last one.
  */
  it("does not let one round of answers close two evenings", async () => {
    const [one, two] = [PROGRAMME.days[0]!, PROGRAMME.days[1]!];
    await deck([...one.words, ...two.words], 1);
    await evening(one, EVENING);

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(2);
    expect(reading.current?.done.has(REVIEW_STEP), "tomorrow's round is not done").toBe(false);
  });
});

describe("the day an action may write about", () => {
  it("takes the day reached, and the one it opens on to once it is finished", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    await reviewable(CLOSING_REVIEW);
    expect(await dayIsInPlay(OWNER, PROGRAMME, one, NOW)).toBe(true);
    await tick(one.id, ticked(one), EVENING);
    await review(CLOSING_REVIEW, new Date(EVENING.getTime() + 60_000));
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[1]!, NOW)).toBe(true);
  });

  /*
    THE LADDER NOBODY HAD TO CLIMB. The day after the one reached used to be in
    play whatever state the day reached was in, and a tick on it makes it the
    day reached, so a caller could tick day two, then day three, then every
    evening of the programme in turn, one request each, having done nothing.
  */
  it("does not open the next day while the day reached is unfinished", async () => {
    const [one, two, three] = [PROGRAMME.days[0]!, PROGRAMME.days[1]!, PROGRAMME.days[2]!];
    await deck(one.words, 1);
    expect(await dayIsInPlay(OWNER, PROGRAMME, two, NOW)).toBe(false);

    /* Half an evening is not an evening: one step ticked and the rest not. */
    await tick(one.id, ticked(one).slice(0, 1), EVENING);
    expect(await dayIsInPlay(OWNER, PROGRAMME, two, NOW)).toBe(false);

    /* And a forged tick on day two, written past the gate, opens nothing further. */
    await tick(two.id, ticked(two).slice(0, 1), new Date(EVENING.getTime() + 5 * 60_000));
    expect(await dayIsInPlay(OWNER, PROGRAMME, three, NOW)).toBe(false);
  });

  /*
    A forged day id is the whole reason this exists: a tick is the pointer, so
    one written on a day nobody has reached would move the course onto it, and
    `startCourseDay` would build a deck out of that day's words.
  */
  it("refuses a day nobody has reached", async () => {
    await deck(PROGRAMME.days[0]!.words, 1);
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[4]!)).toBe(false);
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days.at(-1)!)).toBe(false);
  });

  /*
    AND THE PROGRAMME HAS TO BE THE ONE THEY ARE FOLLOWING. The day id is not
    the only thing off the wire: the programme id is too, and a part nobody has
    opened has no ticks, so its first two evenings read as "reached" by the
    rule above. Without this a call naming the last part of C1 builds a
    beginner's deck out of its words, which is the forged call the guard's own
    header says it closes.
  */
  it("refuses a day of a programme they are not following", async () => {
    const elsewhere = PROGRAMMES.at(-1)!;
    expect(elsewhere.id).not.toBe(PROGRAMME.id);
    await deck(PROGRAMME.days[0]!.words, 1);
    expect(await dayIsInPlay(OWNER, elsewhere, elsewhere.days[0]!)).toBe(false);
    expect(await dayIsInPlay(OWNER, elsewhere, elsewhere.days[1]!)).toBe(false);
    // The one they are following is still open, which is what the UI hands over.
    expect(await dayIsInPlay(OWNER, PROGRAMME, PROGRAMME.days[0]!)).toBe(true);
  });
});

describe("the closing round's own counter", () => {
  it("counts up to what the day needs and no further", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    await reviewable(CLOSING_REVIEW);
    const at = EVENING;
    await tick(one.id, ticked(one), at);

    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW))
      .toEqual({ graded: 0, needed: CLOSING_REVIEW });

    await review(CLOSING_REVIEW + 7, new Date(at.getTime() + 60_000));
    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW))
      .toEqual({ graded: CLOSING_REVIEW, needed: CLOSING_REVIEW });
  });

  /*
    AND IT ASKS FOR NO MORE THAN THE ROUND CAN GIVE.

    Reported off a real module: the evening read three quarters done, the last
    step said "1 of 5 answers in", and the round behind it said nothing was
    due. The step is derived, so no press on any screen could tick it and the
    day could never be finished. `deck` alone is exactly that state, since the
    review queue refuses a word the Learn ladder is still walking.
  */
  it("asks for what the round can give, so an evening can always be finished", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const at = EVENING;
    await tick(one.id, ticked(one), at);

    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW))
      .toEqual({ graded: 0, needed: 0 });

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.daysDone).toBe(1);
    expect(reading.current?.day.index).toBe(2);
    /* And nothing was written for it: the step is still derived (ADR-014). */
    expect(await prisma.courseStep.count({ where: { ownerId: OWNER, stepId: REVIEW_STEP } })).toBe(0);
  });

  it("still asks for all five where the round has five to give", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    await reviewable(CLOSING_REVIEW + 3);
    const at = EVENING;
    await tick(one.id, ticked(one), at);

    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW))
      .toEqual({ graded: 0, needed: CLOSING_REVIEW });
    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(1);
    expect(reading.current?.next?.id).toBe(REVIEW_STEP);
  });

  /*
    AND AN UNSEEN WORD THE ROUND WOULD NOT REACH FOR IS NOT COUNTED.

    The round replaces its unseen window with a wider read when nothing in the
    first sixty rows is near the learner's band, and the widening *replaces*
    that window rather than adding to it, so the rows it ends up showing are
    neither a subset nor a superset of the ones counted here. Counting every
    unseen row could therefore ask for an answer the round will never offer,
    which is the hang this whole module exists to end. Counted in band only,
    which is at or under what the round shows in every case.

    A C1 learner walking the first part of A1 is the state that reaches it:
    every word the evening teaches is two bands under them, so none of it is
    around their level and the closing round's unseen half is empty.
  */
  it("counts no unseen word the round would pass over", async () => {
    const one = PROGRAMME.days[0]!;
    /* Graduated rather than still on the ladder, or `pastTheLadder` keeps the
       word's other cards out of the unseen window and there is nothing to
       count either way. */
    await deck(one.words, 2);
    await unseenTaught(one.words);
    await recordCourseLevel(OWNER, "C1", NOW);
    await tick(one.id, ticked(one), EVENING);

    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW)).toEqual({ graded: 0, needed: 0 });
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.day.index).toBe(2);
  });

  /*
    AND THE LINE ASKS WHAT THE STEP IS FINISHED AGAINST, WHILE ANOTHER STEP
    IS STILL OPEN.

    The reading settles for what the round can give only once the closing
    round is the one step left; until then it wants five. The line settled
    early, so it read "2 of 2 answers in" over a step that was not finished.
  */
  it("asks for five while another step of the evening is still open", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const two = await reviewable(2);
    const manual = ticked(one);
    expect(manual.length, "the first evening has no step a learner ticks").toBeGreaterThan(0);
    await tick(one.id, manual.slice(0, -1), EVENING);
    await review(2, new Date(EVENING.getTime() + 60_000));
    await scheduleAway(two);

    const reading = await courseReading(OWNER, PROGRAMME, CLOCK, NOW);
    expect(reading.current?.day.index).toBe(1);
    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW))
      .toEqual({ graded: 2, needed: CLOSING_REVIEW });
  });

  /* Two cards left is two answers, and then the evening is over. */
  it("settles for what is there when the round is nearly empty", async () => {
    const one = PROGRAMME.days[0]!;
    await deck(one.words, 1);
    const two = await reviewable(2);
    const at = EVENING;
    await tick(one.id, ticked(one), at);

    expect(await closingProgress(OWNER, PROGRAMME, one.id, NOW)).toEqual({ graded: 0, needed: 2 });
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.day.index).toBe(1);

    /* Answered, and scheduled away by the answer, which is what grading does. */
    await review(2, new Date(at.getTime() + 60_000));
    await scheduleAway(two);
    expect((await courseReading(OWNER, PROGRAMME, CLOCK, NOW)).current?.day.index).toBe(2);
  });
});

/*
  "RIGHT" IS WHAT EVERY OTHER READING IN THIS APP CALLS RECALLED, which is Good
  or Easy. Hard is what a hint, a slip or the right word in the wrong ending is
  graded, and the hand-off counted it as right, so a fortnight of near misses
  read as a fortnight of perfect answers and the part was handed on.
*/
describe("the reading at the hand-off", () => {
  it("does not count a Hard answer as right", async () => {
    await deck(PROGRAMME.days[0]!.words, 2);
    const card = await prisma.card.findFirst({ where: { ownerId: OWNER }, select: { id: true, lexemeId: true } });
    for (let i = 0; i < 40; i += 1) {
      await prisma.review.create({
        data: {
          ownerId: OWNER, cardId: card!.id, lexemeId: card!.lexemeId,
          rating: i < 20 ? 3 : 2, durationMs: 4000, reviewedAt: new Date(EVENING.getTime() + i * 1000),
        },
      });
    }
    const verdict = await ladderReading(OWNER, PROGRAMME, NOW);
    expect(verdict).toEqual({ kind: "hold", because: "accuracy", seen: 0.5, bar: 0.7 });
  });
});
