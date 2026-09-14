import { prisma } from "@/lib/db";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { courseLevelFor } from "@/lib/progress/level";
import { levelIndex } from "@/lib/collections/syllabus";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import type { DayClock } from "@/lib/time/day";
import {
  DEFAULT_PROGRAMME, MEET_STEP, PROGRAMMES, REVIEW_STEP, programmeById, programmeStanding,
  type CourseDay, type Programme, type ProgrammeStanding,
} from "@/lib/course";

/**
 * WHERE A LEARNER IS IN A PLANNED PROGRAMME, READ RATHER THAN STORED.
 *
 * `lib/course/` is the rule and holds no database; this is the half that asks
 * one, for the reason every pure layer in this app gives about itself.
 *
 * Which day somebody is on is the first day whose steps are not all finished,
 * and a step is finished in one of two ways. Two of them the review log
 * proves on its own and they are never written anywhere: meeting the day's
 * words leaves a mark on every one of their cards, and the closing review is
 * answers graded after the evening's last tick. The rest are ticked on the
 * course screen and land in `CourseStep`, append-only, one row, the unique key
 * making a second press a no-op rather than a second row.
 *
 * The whole reading is three queries whatever the size of the programme, which
 * is the same rule `classRoster` states about itself: the per-day alternative
 * is a count each, and this runs on the screen somebody opens every morning.
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
 * How many days one render will resolve the derived steps of.
 *
 * Two queries each, and the loop stops as soon as a day does not finish, which
 * is nearly always the first. The cap is a bound on the worst case rather than
 * an expected count.
 */
const MAX_RESOLVE = 4;

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
   * starts counting.
   *
   * PER DAY, AND THAT IS NOT A DETAIL. It was one timestamp for the whole
   * programme, the most recent tick anywhere, and the fault only shows up
   * across two evenings: finishing Monday's module and then ticking the first
   * round of Tuesday's moved the window forward, so Monday's closing round
   * counted nothing again, Monday stopped being finished, and the learner was
   * sent back to a day they had done. Found by driving two evenings in a
   * browser rather than by reading, because every unit test hands the reading
   * one day.
   *
   * Per day it is also monotonic in the right direction: a day's window never
   * moves once its last step is ticked, so answers only ever accumulate and a
   * finished day stays finished.
   */
  lastAt: Map<string, Date>;
}

async function ticksFor(ownerId: string, programme: Programme): Promise<Ticks> {
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
    WHERE A DAY'S CLOSING ROUND OPENS: after that day's own last tick, falling
    back to the start of the learner's own day where it has none. The fallback
    is the generous one and it costs nothing real, because the closing round is
    the last step of every day and reaching it means the rounds in front of it
    were ticked.
  */
  const opensAt = (dayId: string) => {
    const ticked = ticks.lastAt.get(dayId);
    const midnight = clock.startOfDay(now);
    return ticked && ticked > midnight ? ticked : midnight;
  };

  /*
    THE TICKS DECIDE WHICH DAY IS CURRENT, AND ONLY THAT DAY'S TWO DERIVED
    STEPS ARE WORTH A QUERY. Every day before it is finished by definition,
    since walking past a day is what finishing it means, and resolving all
    twelve would be two dozen queries on the screen somebody opens each
    morning.
  */
  let done = ticks.byDay as ReadonlyMap<string, ReadonlySet<string>>;
  let standing = programmeStanding(programme, done);
  const first = standing.current?.day.id ?? null;

  /*
    AND THE DAY IT ADVANCES TO IS RESOLVED TOO, WHICH IT WAS NOT.

    Resolving a day can finish it, and the day after was then drawn with its
    own two derived steps unknown: somebody who had met tomorrow's words
    through Learn saw tomorrow at nought percent with "meet the words" waiting
    for them. Found by driving it rather than by reading it, which is the only
    way that one shows up, because every unit test hands the reading a day that
    was already current.

    Bounded rather than a while loop. Each round is two queries and a day can
    only complete when its middle steps have been ticked, so in practice this
    runs once and occasionally twice; the cap is what stops a pathological deck
    from walking the whole programme on one render.
  */
  const resolved = new Set<string>();
  for (let round = 0; round < MAX_RESOLVE; round += 1) {
    const day = standing.current?.day;
    if (!day || resolved.has(day.id)) break;
    resolved.add(day.id);

    const ticked = ticks.byDay.get(day.id) ?? new Set<string>();
    const [met, graded] = await Promise.all([
      ticked.has(MEET_STEP) ? Promise.resolve(true) : metWords(ownerId, day.words),
      ticked.has(REVIEW_STEP) ? Promise.resolve(CLOSING_REVIEW) : gradedSince(ownerId, opensAt(day.id)),
    ]);

    const withDerived = new Set(ticked);
    if (met) withDerived.add(MEET_STEP);
    if (graded >= CLOSING_REVIEW) withDerived.add(REVIEW_STEP);

    done = new Map(done).set(day.id, withDerived);
    standing = programmeStanding(programme, done);
  }

  /*
    "Come back tomorrow" is a claim about when the day ended, and the only
    thing that knows is the last tick. A day finished by the closing round
    alone still has one, because the round before it was ticked, and a day
    with no ticks at all cannot finish: every day has a step in the middle
    that is not derived.
  */
  const lastFinished = first ? ticks.lastAt.get(first) : undefined;
  const finishedToday = Boolean(
    first && standing.current?.day.id !== first
    && lastFinished && lastFinished >= clock.startOfDay(now),
  );

  return { ...standing, finishedToday };
}

/**
 * How many of the closing round's answers are in, for the screen that asks.
 *
 * Read separately rather than returned above, because only one screen prints
 * it and the reading above is on Today.
 */
export async function closingProgress(
  ownerId: string, programme: Programme, dayId: string, clock: DayClock, now = new Date(),
): Promise<{ graded: number; needed: number }> {
  const ticks = await ticksFor(ownerId, programme);
  const ticked = ticks.lastAt.get(dayId);
  const midnight = clock.startOfDay(now);
  const opened = ticked && ticked > midnight ? ticked : midnight;
  return {
    graded: Math.min(CLOSING_REVIEW, await gradedSince(ownerId, opened)),
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
