import { cache } from "react";

import { prisma } from "@/lib/db";
import { deferredWordIds } from "@/lib/progress/deferrals";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { courseLevelFor, courseStandingFor } from "@/lib/progress/level";
import { LEVELS, LEVEL_INFO, levelIndex, type Level } from "@/lib/collections/syllabus";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import type { DayClock } from "@/lib/time/day";
import { computeStreak } from "@/lib/stats/streak";
import { closingLeft } from "@/lib/progress/closing";
import { scopeFor } from "@/lib/course/scope";
import {
  DEFAULT_PROGRAMME, MEET_STEP, PROGRAMMES, REVIEW_STEP, dayById, dayReached, ladderProgress,
  ladderVerdict, levelsTo, programmeById, programmeStanding, type CourseDay,
  type LadderProgress, type LadderVerdict, type Programme, type ProgrammeStanding,
} from "@/lib/course";

/**
 * WHERE A LEARNER IS IN A PLANNED PROGRAMME, READ RATHER THAN STORED.
 *
 * `lib/course/` is the rule and holds no database; this is the half that asks
 * one, for the reason every pure layer in this app gives about itself.
 *
 * Which day somebody is on is the furthest one carrying a tick (`dayReached`),
 * and a step is finished in one of two ways. Two of them the review log proves
 * on its own and they are never written anywhere: meeting the day's words
 * leaves a mark on every one of their cards, and the closing review is answers
 * graded after that day's last tick. The rest are ticked on the course screen
 * and land in `CourseStep`, append-only, one row, the unique key making a
 * second press a no-op rather than a second row.
 *
 * The whole reading is five queries whatever the size of the programme and
 * whatever evening somebody is on, which is the same rule `classRoster` states
 * about itself and is the thing the first version of this could not manage: it
 * recomputed the day from the top of the programme and had to ask the log
 * about every evening it walked past.
 */

/**
 * Cards graded after the evening's last tick before the closing round counts.
 *
 * Five, which is a minute or two, and it is deliberately not the daily goal.
 * The goal is the day's whole quota and this is the last step of a lesson: a
 * learner who has just met eight words and played two rounds has earned the
 * right to finish, and a closing step that demanded fifteen more answers would
 * be the day refusing to end. What keeps the rest of the queue honest is the
 * scheduler, which will offer it tomorrow whatever happens here.
 */
export const CLOSING_REVIEW = 5;

/**
 * How many days one render asks the review log about.
 *
 * Two, and it is a fact about the shape rather than a budget. `dayReached`
 * names the day in play, so the first round is that day; resolving it can
 * finish it, and then the day it advances to is asked about as well, because
 * somebody who met tomorrow's words through Learn should not be shown tomorrow
 * at nought percent. A third round cannot happen: the day after that has no
 * ticks at all, and every day has at least one step the log cannot prove
 * (`course.test.ts`), so it can never complete unasked.
 */
const MAX_RESOLVE = 2;

/**
 * The programme a learner is following, or none.
 *
 * A missing row is read as "offer it where it fits" rather than as a yes or a
 * no, because a missing row is everybody who used this app before programmes
 * existed. Where it fits is at or below the programme's own level: a beginner
 * is led, and somebody a paper has already measured at B1 is not handed twelve
 * evenings of greetings on the screen they open each morning. `off` is
 * somebody saying in as many words that they would rather choose their own
 * evening, and it is honored at every level.
 *
 * One function so the course screen, Today and Settings cannot end up with
 * three answers to whether anybody is on a programme.
 */
export async function programmeFor(ownerId: string): Promise<Programme | null> {
  const [stored, level] = await Promise.all([
    readSetting(ownerId, SETTING_KEYS.programme),
    courseLevelFor(ownerId),
  ]);
  if (stored === "off") return null;
  if (stored) return programmeById(stored) ?? null;
  return openingPart(level);
}

/**
 * Which part of the ladder somebody starts on, given where they stand.
 *
 * The first part of their own level, which is the only honest answer: a
 * learner a paper has measured at B1 is not made to work up through five parts
 * of A1 to reach the material they came for, and a beginner is not dropped
 * into the impersonal. There is no skipping *within* a level, because the
 * parts of one level are a sequence and the later ones lean on the earlier.
 *
 * Above the top of the ladder there is nothing to offer, which is the honest
 * answer for a C1 speaker: the course has no C2 and says so.
 */
export function openingPart(level: string): Programme | null {
  return PROGRAMMES.find((p) => p.level === level)
    ?? (levelIndex(level as never) < levelIndex(DEFAULT_PROGRAMME.level) ? DEFAULT_PROGRAMME : null);
}

/** Whether a learner has said anything at all about programmes yet. */
export async function hasChosenProgramme(ownerId: string): Promise<boolean> {
  return Boolean(await readSetting(ownerId, SETTING_KEYS.programme));
}

interface Ticks {
  /** Step ids ticked, per day. */
  byDay: Map<string, Set<string>>;
  /**
   * When that day's most recent tick landed, which is when its closing round
   * starts counting. See `closingOpensAt`.
   *
   * PER DAY, AND THAT IS NOT A DETAIL. It was one timestamp for the whole
   * programme, the most recent tick anywhere, and the fault only shows up
   * across two evenings: finishing Monday's module and then ticking the first
   * round of Tuesday's moved the window forward, so Monday's closing round
   * counted nothing again, Monday stopped being finished, and the learner was
   * sent back to a day they had done.
   *
   * Per day it is also monotonic in the right direction: a day's window never
   * moves once its last step is ticked, so answers only ever accumulate and a
   * finished day stays finished.
   */
  lastAt: Map<string, Date>;
  /** When every tick was written, oldest first, for the run of evenings. */
  at: Date[];
}

/**
 * Every tick this learner has written for this programme.
 *
 * Memoised for the render, which is the rule this project already applies to
 * the settings table and to `latestFor`: the course screen asks for the
 * reading and then asks how far into the closing round the day is, and those
 * were two identical reads of the same rows a few lines apart.
 */
const ticksFor = cache(async (ownerId: string, programme: Programme): Promise<Ticks> => {
  const rows = await prisma.courseStep.findMany({
    where: { ownerId, programmeId: programme.id },
    select: { dayId: true, stepId: true, createdAt: true },
    // Total, ending on a column nothing can move: two ticks land in the same
    // millisecond when a learner presses twice, and `lastAt` decides where the
    // closing round's window opens.
    orderBy: [{ createdAt: "asc" }, { stepId: "asc" }],
  });
  const byDay = new Map<string, Set<string>>();
  const lastAt = new Map<string, Date>();
  const at = rows.map((row) => row.createdAt);
  for (const row of rows) {
    const set = byDay.get(row.dayId) ?? new Set<string>();
    set.add(row.stepId);
    byDay.set(row.dayId, set);
    // The rows arrive oldest first, so the last one written wins.
    lastAt.set(row.dayId, row.createdAt);
  }
  return { byDay, lastAt, at };
});

/**
 * WHERE A DAY'S CLOSING ROUND STARTS COUNTING: that day's own last tick, and
 * nowhere at all until it has one.
 *
 * Whenever that tick was, which is the correction rather than a detail. The
 * window used to open at the later of the tick and the learner's own midnight,
 * which is the same window on the evening itself and a different one every
 * morning after: a day finished at nine last night had its window moved to
 * midnight, the five answers that finished it stopped counting, the day
 * stopped being finished, and the learner was handed a module they had already
 * done. Every test in the suite ran inside a single day and none of them could
 * see it.
 *
 * And a day nobody has ticked anything on has not had an evening, so its
 * closing round counts nothing rather than counting from midnight. Under the
 * old floor, finishing one module and pressing "start the next one now" drew
 * the next day with its closing round already satisfied by the round that had
 * just finished the last one, which is one evening's answers closing two
 * evenings. Nothing is lost by it: the closing round is the last step of a
 * day, so by the time anybody reaches it the steps in front have been ticked.
 */
const closingOpensAt = (ticks: Ticks, dayId: string): Date | undefined =>
  ticks.lastAt.get(dayId);

/**
 * THE DAY A `"use server"` EXPORT MAY WRITE ABOUT.
 *
 * Both course actions take a day id from their caller, which is JSON off the
 * wire whatever the types say, and one of them builds a deck out of that day's
 * words. Nothing checked it was the day the learner is standing on, so a
 * forged call could tick a step two hundred evenings ahead or fill somebody's
 * deck with C1 vocabulary.
 *
 * It matters more since `dayReached`: the pointer is the furthest day carrying
 * a tick, so a tick on a day nobody has reached would move the whole course
 * onto it and skip everything in between. That is the door this closes, and
 * with it closed the pointer is monotonic by construction rather than by
 * hoping the client behaves.
 *
 * A day already reached is allowed, which is what makes a second press of a
 * button on a day that has just finished a no-op rather than an error.
 */
/**
 * HOW FAR THE MODULE HAS ACTUALLY TAKEN THIS LEARNER, OR NOTHING AT ALL.
 *
 * `dayIsInPlay` below asks a permission question and `courseReading` builds a
 * whole screen. This is the one fact a round outside the module needs: which
 * evening the learner has walked as far as, so the daily path can be held to
 * what that evening has handed over.
 *
 * NOTHING TICKED IS NOTHING TO GO ON, and that is the whole of what keeps this
 * from over-reaching. `programmeFor` answers for everybody: a learner who has
 * never opened the module, and every learner who used this app before
 * programmes existed, gets `openingPart` read off their level, which is an
 * offer rather than a record. Reading that as a standing would hold somebody
 * who has never touched the course to the first evening of it, which is the
 * app taking a deck away over a screen nobody opened. A tick is the learner
 * saying they are following the module, and `dayReached` is the pointer it
 * makes; with none there is no module to be held to and every round behaves
 * exactly as it did.
 *
 * Memoised for the render, like `ticksFor` underneath it, because Today and
 * the round it links to both ask.
 */
export const moduleReached = cache(async (
  ownerId: string,
): Promise<{ programme: Programme; day: CourseDay } | null> => {
  const programme = await programmeFor(ownerId);
  if (!programme) return null;
  const ticks = await ticksFor(ownerId, programme);
  if (ticks.byDay.size === 0) return null;
  return { programme, day: dayReached(programme, new Set(ticks.byDay.keys())) };
});

export async function dayIsInPlay(
  ownerId: string, programme: Programme, day: CourseDay, now = new Date(),
): Promise<boolean> {
  /*
    THE PROGRAMME IS OFF THE WIRE TOO, NOT ONLY THE DAY. A part nobody has
    opened carries no ticks, so the rule below reads its first two evenings as
    reached, and a call naming the last part of C1 built a beginner's deck out
    of its words: the forged call the header above says this closes. The one
    they are following is `programmeFor`'s answer, which is the programme every
    screen that draws a step hands over, so an honest press never meets this.
  */
  const followed = await programmeFor(ownerId);
  if (followed?.id !== programme.id) return false;
  const ticks = await ticksFor(ownerId, programme);
  const reached = dayReached(programme, new Set(ticks.byDay.keys()));
  if (day.index <= reached.index) return true;
  if (day.index > reached.index + 1) return false;
  /*
    THE DAY AFTER THE ONE REACHED IS IN PLAY ONCE THE ONE REACHED IS FINISHED,
    and not before. Finishing an evening is what opens the next, and nothing is
    ticked on it until somebody starts. Allowing it unconditionally was a
    ladder somebody could climb without doing anything: a tick on the next day
    makes it the day reached, so a tick on the day after that is allowed, and
    repeated calls walked the whole programme one evening per request. Read
    through the same function the screen reads, so an evening the list shows
    as finished is the evening this opens the next one after.
  */
  const done = await withDerivedSteps(
    ownerId, programme, ticks, reached, ticks.byDay.get(reached.id) ?? new Set<string>(), now,
  );
  return reached.steps.every((step) => done.has(step.id));
}

/**
 * Whether the day's words have been met.
 *
 * Every word in the deck, and every one of them answered at least once. `state
 * 0` is FSRS's New, which is exactly the ladder's `meet` rung, so a word that
 * has left it is a word somebody has been asked about and answered. Requiring
 * the rung above, produced in a sentence, was tried on paper and is the wrong
 * line: a word reaches it on the session after the one that taught it, so a
 * day could never be finished on the evening it was started.
 *
 * A word the dictionary does not hold cannot be met and cannot block a day, so
 * what is counted is the cards that exist against the words the deck actually
 * built. The alternative reads as a learner failing at a gap in Ekilex.
 */
async function metWords(ownerId: string, words: readonly string[]): Promise<boolean> {
  if (words.length === 0) return true;
  const [cards, aside] = await Promise.all([
    prisma.card.findMany({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE,
        lexeme: { lemma: { in: [...words] } },
      },
      select: { state: true, lexemeId: true },
    }),
    deferredWordIds(ownerId),
  ]);
  /*
    AND A WORD PUT ASIDE IS NOT A WORD STILL TO MEET. The meet rung offers
    "too complicated", which moves the card's date and leaves it New, and the
    ladder serves only what is due, so the word never came back while this
    went on waiting for it to leave New: the evening stopped with no press
    anywhere that could move it, since this step is derived and neither course
    action may write a row for it. The learner said not tonight; the step
    takes them at their word, and the word returns when its wait ends.
  */
  if (cards.length > 0) return cards.every((c) => c.state !== 0 || (c.lexemeId !== null && aside.has(c.lexemeId)));
  /*
    AND A DAY WHOSE WORDS THIS DEPLOYMENT'S DICTIONARY HOLDS NONE OF IS MET.

    `cards.length > 0` is what stops the step ticking before anybody has
    pressed Start, and on a dictionary that cannot supply a single one of the
    day's words it was also what stopped it ticking ever: the ladder builds
    nothing, so no card arrives, so the count stays nought and the evening
    cannot be finished by any press on any screen. `course.test.ts` holds
    every day's words to lemmas its own unit teaches, so this is a deployment
    seeded before those units rather than a programme naming a word that does
    not exist, and the honest answer to "meet these five words" when the
    dictionary has none of them is that there is nothing to meet.

    ALL OR NOTHING, WHICH IS NARROWER THAN THE STATE IT SITS IN. A dictionary
    holding three of the day's five words is the commoner shape, and there the
    step ticks on those three the moment they are met while the other two are
    never taught. That is the reading this has always had and is not what this
    branch is about; `missingWords` is what puts the gap on the screen, so the
    learner is told rather than left to notice. Only the case where there is
    nothing whatever to meet is answered here.

    One query, and only on the path that would otherwise be stuck: a deck that
    holds any card at all for the day never reaches it.
  */
  const known = await prisma.lexeme.count({ where: { lemma: { in: [...words] } } });
  return known === 0;
}

/** Answers graded since a moment, which is what the closing round counts. */
async function gradedSince(ownerId: string, since: Date): Promise<number> {
  return prisma.review.count({ where: { ownerId, reviewedAt: { gte: since } } });
}

/** How far into a day's closing round the learner is. Nought before it opens. */
async function closingGraded(ownerId: string, ticks: Ticks, dayId: string): Promise<number> {
  const opened = closingOpensAt(ticks, dayId);
  return opened ? gradedSince(ownerId, opened) : 0;
}

/**
 * HOW MANY ANSWERS THIS EVENING'S CLOSING ROUND IS OWED, which is five or
 * whatever the round can actually supply.
 *
 * `CLOSING_REVIEW` is the standing ask and it was also the only ask, so a
 * closing round with nothing left to offer left the evening at three quarters
 * for good: the step is derived, so no press on any screen can tick it, and
 * the round it points at said there was nothing due. Reported off a real
 * module. A step is finished by the evidence it asks for or by there being no
 * more evidence to be had, and `closingLeft` is the second half of that
 * sentence, read off the very queue the round would draw.
 *
 * Counted only where it could change the answer. A learner already past five
 * is finished whatever the deck holds, and asking the deck about it would be
 * two queries on Today to confirm something already true.
 */
async function closingNeeded(
  ownerId: string, programme: Programme, day: CourseDay, graded: number, now: Date,
): Promise<number> {
  if (graded >= CLOSING_REVIEW) return CLOSING_REVIEW;
  const left = await closingLeft(ownerId, scopeFor(programme, day), CLOSING_REVIEW - graded, now);
  return Math.min(CLOSING_REVIEW, graded + left);
}

/** Whether the closing round is the one step of the evening still outstanding. */
function onlyClosingLeft(day: CourseDay, done: ReadonlySet<string>): boolean {
  return day.steps.every((step) => step.id === REVIEW_STEP || done.has(step.id));
}

/**
 * A day's finished steps, the ticked ones and the two the review log proves.
 *
 * One function because two callers ask it and they may not disagree: the
 * reading that draws the screen, and `dayIsInPlay`, which decides whether the
 * day after the one reached may be written about yet.
 */
async function withDerivedSteps(
  ownerId: string, programme: Programme, ticks: Ticks, day: CourseDay,
  ticked: ReadonlySet<string>, now: Date,
): Promise<Set<string>> {
  const [met, graded] = await Promise.all([
    ticked.has(MEET_STEP) ? Promise.resolve(true) : metWords(ownerId, day.words),
    ticked.has(REVIEW_STEP) ? Promise.resolve(CLOSING_REVIEW) : closingGraded(ownerId, ticks, day.id),
  ]);

  const withDerived = new Set(ticked);
  if (met) withDerived.add(MEET_STEP);
  /*
    FIVE ANSWERS, OR EVERY ANSWER THE ROUND HAS LEFT TO GIVE.

    The first is the standing ask and used to be the only one, which is what
    left an evening whose closing round had nothing to offer stuck at three
    quarters for ever: the step is derived, so nothing a learner can press
    ticks it, and the round behind it said nothing was due. See
    `closingNeeded`.

    Asked only where it is the last thing standing, which is both the honest
    reading and the cheap one. Until then there is an evening's worth of
    steps in front of it and the question is not yet "can this be finished",
    it is "what is next"; and Today would be paying two queries a render to
    answer something nobody was asking.
  */
  if (graded >= CLOSING_REVIEW) withDerived.add(REVIEW_STEP);
  else if (onlyClosingLeft(day, withDerived)
    && graded >= await closingNeeded(ownerId, programme, day, graded, now)) {
    withDerived.add(REVIEW_STEP);
  }
  return withDerived;
}

export interface CourseReading extends ProgrammeStanding {
  /** True where the current day's last step was finished today. */
  finishedToday: boolean;
  /**
   * True where an evening of this programme was finished today, including one
   * this render walked past because a step of the next was already ticked.
   *
   * Not `finishedToday`, which is the screen's "come back tomorrow" and is
   * rightly false once somebody has pressed "start the next one now": the
   * screen is then about the next module. The evening letter asks a different
   * question, whether tonight's evening is done, and somebody who finished one
   * and carried on has done it.
   */
  eveningDoneToday: boolean;
  /**
   * Whether this learner has ticked anything in the programme at all. With
   * nothing ticked the programme is `openingPart` read off their level, which
   * is an offer rather than a course they chose; see `moduleReached`.
   */
  started: boolean;
  /**
   * How many evenings in a row this programme has been worked on, counting
   * today where today has a tick and yesterday where it does not, which is
   * `computeStreak`'s own rule and the same midnight the review streak breaks
   * at. Derived from the step log on every read (ADR-014).
   */
  eveningsInARow: number;
}

/**
 * The whole reading, for the course screen and for Today.
 *
 * The derived steps are resolved for the *current* day alone rather than for
 * all twelve, and that is what keeps this three queries rather than
 * twenty-five: a day the learner has already walked past is finished by
 * definition, since walking past it is what finishing it means. The two
 * proofs are asked in parallel, because neither needs the other's answer.
 */
export async function courseReading(
  ownerId: string, programme: Programme, clock: DayClock, now = new Date(),
): Promise<CourseReading> {
  const ticks = await ticksFor(ownerId, programme);

  /*
    THE DAY IN PLAY IS THE FURTHEST ONE CARRYING A TICK, AND EVERY DAY BEFORE
    IT IS DONE. Walking past a day is what finishing it means, and `dayReached`
    is that sentence written down; see its own header for the reading this
    replaced and why that one could not survive a fortnight.
  */
  const reached = dayReached(programme, new Set(ticks.byDay.keys()));
  const done = new Map<string, ReadonlySet<string>>();
  for (const d of programme.days) {
    if (d.index < reached.index) done.set(d.id, new Set(d.steps.map((s) => s.id)));
    else if (d.index === reached.index) done.set(d.id, ticks.byDay.get(d.id) ?? new Set<string>());
  }
  let standing = programmeStanding(programme, done);

  /*
    AND THE TWO STEPS THE LOG PROVES ARE ASKED ABOUT, FOR THE DAY IN PLAY AND
    FOR THE DAY IT ADVANCES TO.

    The second half of that was a fault found by driving two evenings rather
    than by reading: resolving a day can finish it, and the day after was then
    drawn with its own two derived steps unknown, so somebody who had met
    tomorrow's words through Learn saw tomorrow at nought percent with "meet
    the words" waiting for them.
  */
  let justFinished: string | null = null;
  for (let round = 0; round < MAX_RESOLVE; round += 1) {
    const day = standing.current?.day;
    if (!day) break;

    const withDerived = await withDerivedSteps(
      ownerId, programme, ticks, day, done.get(day.id) ?? new Set<string>(), now,
    );
    done.set(day.id, withDerived);
    standing = programmeStanding(programme, done);

    /* Still on it, so there is nothing further to ask about: the day after is
       only worth a query once this one has actually finished. */
    if (standing.current?.day.id === day.id) break;
    /* And this render is what finished it, which is what "come back tomorrow"
       is a claim about. The day it advances to is resolved as well and must
       not overwrite that. */
    justFinished = day.id;
  }

  /*
    "Come back tomorrow" is a claim about a day that finished *today*, so it is
    read off the day this render just settled rather than off the first day of
    the programme, which is where it used to be read and which made the
    sentence reachable on day one alone. A day finished by its closing round
    alone still carries a tick, because the round before it was ticked, and a
    day with no ticks cannot finish: every day has a step the log cannot prove.
  */
  const today = clock.startOfDay(now);
  const lastTick = justFinished ? ticks.lastAt.get(justFinished) : undefined;
  const finishedToday = Boolean(lastTick && lastTick >= today);

  /*
    THE RUN OF EVENINGS, off the same rows. A tick is a fact about an evening
    the way a review row is a fact about a sitting, so the evenings are the
    distinct days carrying one. Every tick rather than each day's last, since
    an evening spent on a day that finished the next night is still an
    evening somebody turned up for.
  */
  const eveningsInARow = computeStreak(ticks.at, now, clock);

  /*
    AN EVENING DONE TODAY, WHICHEVER RENDER NOTICED. The day before the one
    reached has been walked past, which is what finishing it means, so its
    last tick landing today is an evening finished today even though this
    render did not finish it.
  */
  const before = programme.days[programme.days.indexOf(reached) - 1];
  const beforeLast = before ? ticks.lastAt.get(before.id) : undefined;
  const eveningDoneToday = finishedToday
    || Boolean(beforeLast && beforeLast >= today);

  return {
    ...standing, finishedToday, eveningDoneToday, started: ticks.byDay.size > 0, eveningsInARow,
  };
}

/**
 * How many of the closing round's answers are in, for the screen that asks.
 *
 * Read separately rather than returned above, because only one screen prints
 * it and the reading above is on Today.
 */
export async function closingProgress(
  ownerId: string, programme: Programme, dayId: string, now = new Date(),
): Promise<{ graded: number; needed: number }> {
  const ticks = await ticksFor(ownerId, programme);
  const day = dayById(programme, dayId);
  const graded = await closingGraded(ownerId, ticks, dayId);
  /* The same number the step itself is finished against, or the list would
     promise five answers while the reading behind it settles for two. That
     includes the reading's condition: it settles for less only once the
     closing round is the one step left, so the line does too, or it reads
     "2 of 2 answers in" over a step that is not finished. The meet step is
     proved off the deck, so it is asked the same way the reading asks it, and
     only where it is the one thing between this and the closing round. */
  const ticked = ticks.byDay.get(dayId);
  let lastStanding = false;
  if (day && ticked) {
    const done = new Set(ticked);
    if (onlyClosingLeft(day, new Set([...done, MEET_STEP]))) {
      lastStanding = done.has(MEET_STEP) || await metWords(ownerId, day.words);
    }
  }
  const needed = day && lastStanding
    ? await closingNeeded(ownerId, programme, day, graded, now)
    : CLOSING_REVIEW;
  return { graded: Math.min(needed, graded), needed };
}

/** Which of a day's words the deck does not hold yet, for the screen to say so. */
export async function missingWords(ownerId: string, day: CourseDay): Promise<string[]> {
  const held = await prisma.card.findMany({
    where: {
      ownerId, cardType: LADDER_CARD_TYPE,
      lexeme: { lemma: { in: [...day.words] } },
    },
    select: { lexeme: { select: { lemma: true } } },
  });
  const have = new Set(held.map((c) => c.lexeme?.lemma));
  return day.words.filter((w) => !have.has(w));
}

/**
 * How far back the accuracy half of the ladder reading looks.
 *
 * A fortnight, which is the stretch a learner can still remember having and
 * the one they can change by next week. All of time would hold somebody's bad
 * first month against them for ever, which is the opposite of what a warning
 * before the next part is for.
 */
const LADDER_WINDOW_DAYS = 14;

/**
 * WHETHER THE LOG SUPPORTS THE NEXT PART, READ OFF THE ONE JUST FINISHED.
 *
 * `lib/course/gate.ts` is the rule and holds no database; this is the half
 * that asks one. Three reads, none of which needs another's answer.
 *
 * Retention is counted over the words that part actually taught, matched by
 * lemma, and "known" is the scheduler's own verdict rather than ours: a card
 * in FSRS Review state is one it has stopped treating as new, which is the
 * same line `unitProgress` draws for a finished unit. A word the dictionary
 * could not supply is in no count either way, because a learner failing at a
 * gap in Ekilex is not a learner failing.
 */
export async function ladderReading(
  ownerId: string, finished: Programme, now = new Date(),
): Promise<LadderVerdict> {
  const words = [...new Set(finished.days.flatMap((d) => d.words))];
  const since = new Date(now.getTime() - LADDER_WINDOW_DAYS * 86_400_000);

  const [taught, known, answers, right] = await Promise.all([
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE,
        lexeme: { lemma: { in: words } },
      },
    }),
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE,
        // FSRS Review: the scheduler has stopped treating the word as new.
        state: 2,
        lexeme: { lemma: { in: words } },
      },
    }),
    prisma.review.count({ where: { ownerId, reviewedAt: { gte: since } } }),
    /* Good or Easy, which is what every other reading here calls recalled
       (`lib/stats/history.ts`, `lib/readiness/evidence.ts`, `lib/srs/mastery.ts`).
       Hard is what a hint, a slip or the right word in the wrong ending is
       graded, and counting it here read a fortnight of near misses as a
       fortnight of right answers and handed the next part over on them. */
    prisma.review.count({ where: { ownerId, reviewedAt: { gte: since }, rating: { gte: 3 } } }),
  ]);

  return ladderVerdict({ taught, known, answers, right });
}

/**
 * HOW FAR ALONG THE LADDER SOMEBODY IS, FOR THE BAR ON TODAY.
 *
 * `lib/course/milestones.ts` is the rule; this counts the words. One grouped
 * query rather than one per level, because it runs on the screen everybody
 * opens each morning.
 *
 * WHAT IS COUNTED IS A CARD THE SCHEDULER HAS GRADUATED, which is FSRS Review
 * state: it has stopped treating the word as new, which is the same line
 * `unitProgress` draws for a finished unit and the only reading that means
 * "they still had it days later". A bar that filled on evenings ticked would
 * be attendance drawn as attainment.
 *
 * The band is the dictionary's own `cefr`, so a word somebody learned outside
 * the course counts toward the level it belongs to. That is the honest reading
 * of "how close to B1 am I": a B1 word is a B1 word however it arrived. It can
 * over-count where a learner has graduated words the ladder does not teach,
 * which is why each level is clamped to what the ladder asks for rather than
 * summed raw.
 *
 * AND WHERE THEY STAND IS READ HERE RATHER THAN THREADED IN, because there are
 * three callers and the one that forgot would draw a B1 speaker at the bottom
 * of A1. `courseStandingFor` is the same answer the course opens at, so the
 * bar and the evening cannot disagree about which band somebody is on. It is
 * two memoised reads on a screen that has already asked for both.
 *
 * MEMOISED, BECAUSE THE NIGHTLY RUN ASKS FOR IT TWICE PER LEARNER. `candidateFor`
 * reads it to find out whether a milestone letter is owed and `letterInputFor`
 * reads it again to build whichever letter that decided on, which is ten
 * counts and two standing reads where five and one will do, once for every
 * learner on the deployment. It is the rule this file already applies to
 * `ticksFor` and `moduleReached`: a fact about one learner that is wanted
 * twice in one pass is held for that pass.
 */
export const ladderPosition = cache(async (
  ownerId: string, target: Level,
): Promise<LadderProgress> => {
  const bands = levelsTo(target);

  /*
    One count per band, asked at once. Five at the very most, each an indexed
    read, and none of them needs another's answer. A `groupBy` over the words
    would be one statement and then a second read to find out which band each
    word is in, which is more work for a smaller number of round trips on a
    query that is already cheap.
  */
  const [counts, standing] = await Promise.all([
    Promise.all(bands.map((band) => prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 2,
        lexeme: { cefr: band },
      },
    }))),
    courseStandingFor(ownerId),
  ]);
  const verifiedAt = Object.fromEntries(bands.map((band, at) => [band, counts[at]!]));

  return ladderProgress(
    target,
    verifiedAt,
    (level) => ({ title: LEVEL_INFO[level].title, arrival: LEVEL_INFO[level].arrival }),
    standing,
  );
});

/** The band a learner said they were aiming at, or the top of the ladder. */
export function targetFrom(stored: string | null | undefined): Level {
  const wanted = (stored ?? "").trim().toUpperCase();
  return (LEVELS as readonly string[]).includes(wanted) ? (wanted as Level) : "B1";
}
