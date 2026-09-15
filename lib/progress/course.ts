import { cache } from "react";

import { prisma } from "@/lib/db";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { courseLevelFor } from "@/lib/progress/level";
import { LEVELS, LEVEL_INFO, levelIndex, type Level } from "@/lib/collections/syllabus";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import type { DayClock } from "@/lib/time/day";
import {
  DEFAULT_PROGRAMME, MEET_STEP, PROGRAMMES, REVIEW_STEP, dayReached, ladderProgress,
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
  for (const row of rows) {
    const set = byDay.get(row.dayId) ?? new Set<string>();
    set.add(row.stepId);
    byDay.set(row.dayId, set);
    // The rows arrive oldest first, so the last one written wins.
    lastAt.set(row.dayId, row.createdAt);
  }
  return { byDay, lastAt };
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
export async function dayIsInPlay(
  ownerId: string, programme: Programme, day: CourseDay,
): Promise<boolean> {
  const ticks = await ticksFor(ownerId, programme);
  const reached = dayReached(programme, new Set(ticks.byDay.keys()));
  /* The day after the one reached is in play too: finishing an evening is what
     opens the next, and nothing is ticked on it until somebody starts. */
  return day.index <= reached.index + 1;
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
  const cards = await prisma.card.findMany({
    where: {
      ownerId, suspended: false, cardType: LADDER_CARD_TYPE,
      lexeme: { lemma: { in: [...words] } },
    },
    select: { state: true },
  });
  return cards.length > 0 && cards.every((c) => c.state !== 0);
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

export interface CourseReading extends ProgrammeStanding {
  /** True where the current day's last step was finished today. */
  finishedToday: boolean;
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

    const ticked = done.get(day.id) ?? new Set<string>();
    const [met, graded] = await Promise.all([
      ticked.has(MEET_STEP) ? Promise.resolve(true) : metWords(ownerId, day.words),
      ticked.has(REVIEW_STEP) ? Promise.resolve(CLOSING_REVIEW) : closingGraded(ownerId, ticks, day.id),
    ]);

    const withDerived = new Set(ticked);
    if (met) withDerived.add(MEET_STEP);
    if (graded >= CLOSING_REVIEW) withDerived.add(REVIEW_STEP);
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
  const lastTick = justFinished ? ticks.lastAt.get(justFinished) : undefined;
  const finishedToday = Boolean(lastTick && lastTick >= clock.startOfDay(now));

  return { ...standing, finishedToday };
}

/**
 * How many of the closing round's answers are in, for the screen that asks.
 *
 * Read separately rather than returned above, because only one screen prints
 * it and the reading above is on Today.
 */
export async function closingProgress(
  ownerId: string, programme: Programme, dayId: string,
): Promise<{ graded: number; needed: number }> {
  const ticks = await ticksFor(ownerId, programme);
  return {
    graded: Math.min(CLOSING_REVIEW, await closingGraded(ownerId, ticks, dayId)),
    needed: CLOSING_REVIEW,
  };
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
    prisma.review.count({ where: { ownerId, reviewedAt: { gte: since }, rating: { gte: 2 } } }),
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
 */
export async function ladderPosition(
  ownerId: string, target: Level,
): Promise<LadderProgress> {
  const bands = levelsTo(target);

  /*
    One count per band, asked at once. Five at the very most, each an indexed
    read, and none of them needs another's answer. A `groupBy` over the words
    would be one statement and then a second read to find out which band each
    word is in, which is more work for a smaller number of round trips on a
    query that is already cheap.
  */
  const counts = await Promise.all(bands.map((band) => prisma.card.count({
    where: {
      ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 2,
      lexeme: { cefr: band },
    },
  })));
  const knownAt = Object.fromEntries(bands.map((band, at) => [band, counts[at]!]));

  return ladderProgress(
    target,
    knownAt,
    (level) => ({ title: LEVEL_INFO[level].title, arrival: LEVEL_INFO[level].arrival }),
  );
}

/** The band a learner said they were aiming at, or the top of the ladder. */
export function targetFrom(stored: string | null | undefined): Level {
  const wanted = (stored ?? "").trim().toUpperCase();
  return (LEVELS as readonly string[]).includes(wanted) ? (wanted as Level) : "B1";
}
