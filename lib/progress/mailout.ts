/*
  WHAT A LETTER NEEDS TO KNOW, GATHERED FROM THE THINGS THAT ALREADY DERIVE IT.

  Nothing here computes anything. Every figure a letter prints is read back
  through the function the screen showing the same figure reads it through:
  `courseReading` for the evening, `ladderPosition` for the climb, `dailySummary`
  for the run of days, `wordOfDay` for the gift, `outThere` for the
  conversations. That is the rule this project keeps finding it has broken, and
  it is worth more here than anywhere else: a screen that disagrees with itself
  is a bug somebody notices and reports, and a letter that disagrees with the
  screen it links to is a bug nobody can see from inside the app at all.

  IT IS TWO PASSES, AND THAT IS WHAT KEEPS THE RUN CHEAP. Deciding whether
  somebody is owed a letter needs five small facts. Building the letter needs
  the whole course reading, the ladder and the dictionary. So the run asks the
  cheap question of everybody and the expensive one only of the handful who
  turned out to be owed something, which on any real evening is a small
  fraction of the deployment.

  THE CLOCK IS THE LEARNER'S, EVERYWHERE. Which day it is, which hour it is and
  which weekday it is are all read through `dayClock(zone)` with the zone the
  learner's own browser reported, for the reason `lib/time/day.ts` sets out at
  length: a server's midnight is nobody's, and this is a feature whose entire
  job is arriving at the right hour of somebody else's evening.
*/
import { prisma } from "@/lib/db";
import { dayClock } from "@/lib/time/day";
import { readSetting, readSettings, SETTING_KEYS, type SettingKey } from "@/lib/settings/store";
import { emailPrefsFrom } from "@/lib/email/prefs";
import { EMAIL_KINDS, type EmailKind } from "@/lib/email/letter";
import type { Candidate } from "@/lib/email/schedule";
import { AWAY_DAYS, UNCAPPED } from "@/lib/email/schedule";
import { weeksUntil } from "@/lib/assessment/goals";
import { courseReading, ladderPosition, programmeFor, targetFrom } from "@/lib/progress/course";
import { courseLevelFor } from "@/lib/progress/level";
import { examCountdown } from "@/lib/progress/countdown";
import { EVIDENCE_NOTE } from "@/lib/exam/readiness";
import type { ExamLevel } from "@/lib/exam/spec";
import { cohortKind, withoutMember } from "@/lib/classroom/cohort";
import { classRoster, workplaceRoster } from "@/lib/classroom/roster";
import {
  everyMilestoneTold, ladderWordsAt, milestoneMark, milestoneOwed, wordsLeftAt,
} from "@/lib/course/milestones";

import { wordOfDay } from "@/lib/progress/wordOfDay";
import { outThere } from "@/lib/progress/outThere";
import { dailySummary, deckSnapshot, SHIELD_MILESTONES } from "@/lib/progress/summary";
import { stageOf } from "@/lib/ux/disclosure";
import { errandForDay, errandPlaces, sceneForErrand, startedUnits } from "@/lib/collections/errands";
import { unitById } from "@/lib/collections/syllabus";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { parseReminderTime } from "@/lib/time/reminder";
import type { TonightInput } from "@/lib/email/letters/tonight";
import type { WelcomeInput } from "@/lib/email/letters/welcome";
import type { ComebackInput } from "@/lib/email/letters/comeback";
import type { WeeklyInput } from "@/lib/email/letters/weekly";
import type { ErrandInput } from "@/lib/email/letters/errand";
import type { DeadlineInput } from "@/lib/email/letters/deadline";
import type { ClassroomInput } from "@/lib/email/letters/classroom";
import type { WorddayInput } from "@/lib/email/letters/wordday";
import type { MilestoneInput } from "@/lib/email/letters/milestone";
import type { ShieldInput } from "@/lib/email/letters/shield";

/** A high-water mark to write once a letter has really gone. */
export interface Remember {
  readonly key: SettingKey;
  readonly value: string;
}

/**
 * How far back the run looks for somebody worth writing to.
 *
 * Bounded rather than open, and it is the difference between a run that costs
 * the same every evening and one that gets slower every month this app is
 * deployed. Somebody who has not opened it in three months is not going to be
 * brought back by a fifth reminder, and the coming-back letter has already
 * been sent to them once inside this window.
 */
export const LOOK_BACK_DAYS = 45;

/**
 * Who the run considers at all.
 *
 * Everybody who has graded a card or finished first run inside the window, and
 * nobody else. Read as ids so the expensive reads happen once the decision is
 * made rather than for everybody.
 */
/**
 * Which page of the roster this run looks at.
 *
 * A CAP ON A SORTED LIST IS NOT A CAP, IT IS AN EXCLUSION. The first version
 * ordered on the owner id and took the first two thousand, every run, for
 * ever: on a deployment with five thousand learners the same three thousand
 * were never considered, and not because they were quiet or had opted out but
 * because of where their id sorted. Nothing would have reported it. The letters
 * would simply have worked, for some people, and the operator would have read
 * the rest as a feature nobody wanted.
 *
 * It is the fault this project already has a rule about one directory over,
 * where the dictionary's suggestion row moved by one row a day and spent its
 * whole life inside the letter A. The answer there is the answer here: a walk
 * rather than a fixed window.
 *
 * The page turns with the hour, so a deployment larger than one page is
 * covered in `ceil(total / limit)` runs, which at the hourly schedule is under
 * a day for anything up to forty-eight thousand learners. Deterministic, so it
 * needs no stored cursor and two runs in the same hour look at the same page,
 * which is what the per-learner gap in `EmailSend` is there to make harmless.
 */
export function rosterPage(now: Date, total: number, limit: number): number {
  if (total <= limit) return 0;
  const pages = Math.ceil(total / limit);
  return (Math.floor(now.getTime() / 3_600_000) % pages) * limit;
}

/**
 * Who the run considers at all.
 *
 * Everybody who has graded a card or finished first run inside the window, one
 * page at a time. Read as ids so the expensive reads happen once the decision
 * is made rather than for everybody.
 */
export async function mailoutRoster(now: Date, limit: number): Promise<string[]> {
  const since = new Date(now.getTime() - LOOK_BACK_DAYS * 86_400_000);

  /*
    The sizes first, so the walk knows how far it has to reach, and both of
    them counted in Postgres. The reviewer half was a Prisma `distinct`, under
    a comment calling it a real `COUNT(DISTINCT)`, and Prisma deduplicates in
    the client and emits no `LIMIT` beside a `distinct`: both this count and
    the page below read every review on the deployment in the window, inside
    the transaction that holds the run's lock with a five-second limit, so a
    deployment with a real review log failed every hour and sent nothing.
  */
  const [counted, starters] = await Promise.all([
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT "ownerId") AS n FROM "Review" WHERE "reviewedAt" >= ${since}`,
    prisma.setting.count({
      where: { key: SETTING_KEYS.onboardedAt, value: { gte: since.toISOString() } },
    }),
  ]);
  const reviewers = Number(counted[0]?.n ?? 0);

  const [reviewed, settled] = await Promise.all([
    /*
      One row per learner, ordered and cut in Postgres. `ownerId` is the whole
      of what is ordered on and is distinct by construction, so the order is
      total and the walk over pages covers rather than skipping and repeating.
    */
    prisma.$queryRaw<{ ownerId: string }[]>`
      SELECT DISTINCT "ownerId" FROM "Review"
      WHERE "reviewedAt" >= ${since}
      ORDER BY "ownerId"
      LIMIT ${limit} OFFSET ${rosterPage(now, reviewers, limit)}`,
    /*
      And the people who finished first run and have not answered a card yet,
      who are exactly the ones a welcome is for and who a review-log query
      cannot see. Paged on their own count, since the two sets barely overlap:
      somebody who has reviewed is in the first and not usually in the second.
    */
    prisma.setting.findMany({
      /*
        `Setting` carries no timestamp, and this needs none: the value of this
        particular key *is* an ISO-8601 instant, and ISO-8601 was designed so
        that lexical order and chronological order are the same thing. So the
        string comparison is the date comparison, in the database, on the
        table's own primary key.

        Adding an `updatedAt` column to `Setting` was the other way and is a
        migration over every learner's every preference to answer one question
        in one scheduled run. It also would not have been the right column:
        what is wanted is when they finished first run, not when the row was
        last written, and those differ the moment anything rewrites a setting.
      */
      where: { key: SETTING_KEYS.onboardedAt, value: { gte: since.toISOString() } },
      select: { ownerId: true },
      // `(ownerId, key)` is the primary key and `key` is pinned by the filter,
      // so ordering on `ownerId` alone is already total here.
      orderBy: [{ ownerId: "asc" }, { key: "asc" }],
      skip: rosterPage(now, starters, limit),
      take: limit,
    }),
  ]);

  return [...new Set([...reviewed, ...settled].map((row) => row.ownerId))].slice(0, limit);
}

/**
 * The weekday where the learner is, 0 for Sunday.
 *
 * `DayClock` has no weekday of its own and does not need one: its day key is
 * already the local calendar date, so reading that back as a UTC date gives
 * the right weekday without a second zone conversion and without this file
 * knowing anything about zones. Parsed as `T00:00:00Z` explicitly, because a
 * bare `YYYY-MM-DD` handed to `new Date` is UTC in every engine and a bare
 * `YYYY-MM-DDT00:00:00` is local, and relying on which is which is how a
 * Sunday letter goes out on a Saturday night for half the world.
 */
function weekdayOn(clock: { dayKey(date?: Date): string }, now: Date): number {
  return new Date(`${clock.dayKey(now)}T00:00:00Z`).getUTCDay();
}

/** What the run needs to decide whether a bounce still applies. */
export async function undeliverableRow(ownerId: string): Promise<string | null> {
  return readSetting(ownerId, SETTING_KEYS.emailUndeliverable);
}

/** The five cheap facts the decision needs. */
/**
 * One letter over a day key, and the same one `recentDayKeys` would put on
 * Today.
 *
 * Here rather than inline because two letters draw a week strip now and two
 * copies of a date format is where one of them comes to say Mon and the other
 * M. `en-GB` and UTC are both deliberate: the key is already the learner's own
 * day, so the only job left is to name it, and naming it on the server's
 * locale is the fault `components/LocalDate.tsx` exists for.
 */
function dayLabel(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

export async function candidateFor(ownerId: string, now: Date): Promise<Candidate> {
  const settings = await readSettings(ownerId, [
    SETTING_KEYS.timeZone,
    SETTING_KEYS.emailsOff,
    SETTING_KEYS.emailUndeliverable,
    SETTING_KEYS.onboardedAt,
    SETTING_KEYS.reminderAt,
    SETTING_KEYS.goalDeadline,
    SETTING_KEYS.emailsOn,
  ]);

  const clock = dayClock(settings[SETTING_KEYS.timeZone]);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [lastReview, sends, sentThisWeek, programme] = await Promise.all([
    prisma.review.findFirst({
      where: { ownerId },
      orderBy: { reviewedAt: "desc" },
      select: { reviewedAt: true },
    }),
    /*
      The last send of each kind. One row per kind rather than a scan: the
      index is `[ownerId, kind, sentAt]`, so each of these is a single seek to
      the end of its own run of rows.
    */
    Promise.all(
      EMAIL_KINDS.map(async (kind): Promise<[EmailKind, Date | undefined]> => {
        const row = await prisma.emailSend.findFirst({
          where: { ownerId, kind },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true },
        });
        return [kind, row?.sentAt];
      }),
    ),
    /*
      THE WEEK'S COUNT, OVER THE KINDS THE CEILING IS ABOUT.

      `UNCAPPED` is excluded here rather than subtracted in the decision,
      because the word of the day is seven rows a week on its own: counted,
      it would spend the whole ceiling by Tuesday and silence every reminder
      for exactly the people who went and switched a letter on. The gaps are
      what bound those two, and `lib/email/schedule.ts` says so where it says
      which kinds they are.
    */
    prisma.emailSend.count({
      where: { ownerId, sentAt: { gte: weekAgo }, kind: { notIn: [...UNCAPPED] } },
    }),
    programmeFor(ownerId),
  ]);

  /*
    WHETHER TONIGHT IS FINISHED IS ONLY ASKED WHERE IT COULD MATTER.

    It is the one expensive fact in this set, at three queries, and it is
    needed only for somebody who has a course and whose evening has come
    round. Somebody away, somebody with no programme, or somebody it is two in
    the afternoon for is not going to be sent the evening letter whatever the
    answer, so the query is skipped and the honest default is that it is not
    finished, which is the state that makes the other gates decide.
  */
  const localHour = clock.hourOf(now);
  const reminderHour = settings[SETTING_KEYS.reminderAt]
    ? parseReminderTime(settings[SETTING_KEYS.reminderAt]).hour
    : null;
  const awayDays = lastReview
    ? Math.floor((now.getTime() - lastReview.reviewedAt.getTime()) / 86_400_000)
    : null;
  const couldBeTonight =
    programme !== null &&
    (awayDays === null || awayDays < AWAY_DAYS) &&
    localHour >= (reminderHour ?? 18) &&
    localHour < 22;

  const finishedToday =
    couldBeTonight && programme
      ? (await courseReading(ownerId, programme, clock, now)).finishedToday
      : false;

  const onboardedRaw = settings[SETTING_KEYS.onboardedAt];
  const onboardedAt = onboardedRaw ? new Date(onboardedRaw) : null;

  /*
    THE REGISTER'S ONE FACT, ASKED ON MONDAY MORNINGS AND NOT OTHERWISE.

    Somebody who runs no group is nearly everybody, so this is a cheap
    indexed read that answers no on almost every row it is asked about; the
    window is what keeps it from being asked at all on the other six days.
    An owner with nobody in the group yet is not a group: a register of
    nought people is a letter about nothing, and it is the state every class
    is in for the hour between being created and the code going on a board.
  */
  const runsGroup =
    weekdayOn(clock, now) === 1 && localHour >= 7 && localHour < 11
      ? (await prisma.classroomMember.count({
          where: {
            ownerId: { not: ownerId },
            classroom: { ownerId, archived: false },
          },
        })) > 0
      : false;

  /*
    AND THE WEEKS LEFT ON THE DATE THEY SET, WHICH IS A SETTING RATHER THAN A
    QUERY.

    `goalsFor` reads five keys and this needs one of them, so it is read
    directly: the decision only has to know whether the date is inside the
    window, and `letterInputFor` reads the whole goal properly when it turns
    out to be. Past is null rather than negative, which is the type's own rule
    and `weeksUntil`'s: a date already gone is its own verdict and there is no
    letter to write about it.
  */
  const deadlineRaw = settings[SETTING_KEYS.goalDeadline];
  const weeksLeft = deadlineRaw ? weeksUntil(deadlineRaw, now) : null;
  const deadlineWeeks = weeksLeft !== null && weeksLeft > 0 ? weeksLeft : null;

  /*
    THE THREE FACTS THE ERRAND LETTER TURNS ON, AND THEY ARE ASKED ONLY IN THE
    MORNING WHERE THE LEARNER IS.

    Each is a query, and the errand is the one letter that goes out in a
    three-hour window: outside it the answer cannot change what is sent, so
    asking would be three round trips per learner per run spent on a branch
    that is already closed. The same shape as `finishedToday` above, which is
    skipped outside the evening for the same reason.
  */
  const morning = localHour >= 8 && localHour < 11;
  const weekday = weekdayOn(clock, now);
  const couldBeErrand = morning && weekday !== 0;
  const errandFacts = couldBeErrand
    ? await (async () => {
        const [snapshot, conversations, cards, reviews] = await Promise.all([
          deckSnapshot(ownerId, now),
          outThere(ownerId, clock, now),
          prisma.card.count({ where: { ownerId, suspended: false } }),
          prisma.review.count({ where: { ownerId } }),
        ]);
        return {
          /*
            `stageOf` rather than a threshold of our own. A second answer to
            "has this learner started yet" is how the first one rots, which
            `lib/ux/disclosure.ts` states and an invariant enforces.
          */
          stage: stageOf({ totalCards: cards, reviewsAllTime: reviews }),
          conversations: conversations.total,
          hasErrand: snapshot.startedLemmas.size > 0,
        };
      })()
    : null;

  /*
    THE TWO PIECES OF NEWS, ASKED FOR IN THE SAME MORNING WINDOW AS THE ERRAND.

    Both are rare: five milestones exist per learner ever, and a shield covers
    a particular day once. So neither is worth a query on every run, and both
    are worth one in the window where the letter could actually go out. Outside
    it they answer null, which closes the branch rather than guessing at it.

    The high-water marks are what make "new" answerable. A shield is spent
    silently by whichever render or run resolves the streak first, and a level
    is passed at whatever moment the last of its words graduated, so neither
    can be read off what this particular run just did.
  */
  const news = morning
    ? await (async () => {
        const marks = await readSettings(ownerId, [
          SETTING_KEYS.milestoneToldFor,
          SETTING_KEYS.shieldToldFor,
          SETTING_KEYS.streakShieldDates,
          SETTING_KEYS.cefrGoal,
        ]);

        /*
          A day a shield covered that no letter has mentioned. Day keys sort
          lexically, which is what makes "newer than the last one we said" a
          string comparison; a row that will not parse means we know of none,
          which is said by saying nothing.
        */
        let shieldSpent: string | null = null;
        try {
          const parsed: unknown = JSON.parse(marks[SETTING_KEYS.streakShieldDates] ?? "[]");
          const told = marks[SETTING_KEYS.shieldToldFor] ?? "";
          const days = Array.isArray(parsed)
            ? parsed.filter((d): d is string => typeof d === "string" && d > told)
            : [];
          shieldSpent = days.sort().at(-1) ?? null;
        } catch {
          shieldSpent = null;
        }

        /*
          AND A LEVEL WHOSE WORDS ARE ALL GRADUATED, WHICH IS FIVE COUNTS AND
          IS WHY IT IS ASKED ONLY ONCE THE MARK LEAVES ROOM FOR AN ANSWER.

          Somebody already told about every level of their own climb can never
          have news again, so the ladder is not read for them at all.
        */
        const target = targetFrom(marks[SETTING_KEYS.cefrGoal]);
        const told = marks[SETTING_KEYS.milestoneToldFor];
        if (everyMilestoneTold(target, told)) {
          return { shieldSpent, milestoneReached: null };
        }

        const ladder = await ladderPosition(ownerId, target);
        return {
          shieldSpent,
          milestoneReached: milestoneOwed(ladder.milestones, told)?.level ?? null,
        };
      })()
    : null;

  return {
    ownerId,
    // Filled by the run, which is the only layer allowed to read an address.
    email: null,
    /*
      False here, and decided by the run. The stored block names the address
      that bounced rather than the learner, so it cannot be read without one,
      and the run is the only layer that may hold an address.
    */
    undeliverable: false,
    prefs: emailPrefsFrom(settings[SETTING_KEYS.emailsOff], settings[SETTING_KEYS.emailsOn]),
    dayKey: clock.dayKey(now),
    localHour,
    reminderHour,
    localWeekday: weekday,
    lastSent: new Map(
      sends.filter((entry): entry is [EmailKind, Date] => entry[1] !== undefined),
    ),
    sentThisWeek,
    lastReviewAt: lastReview?.reviewedAt ?? null,
    onboardedAt: onboardedAt && !Number.isNaN(onboardedAt.getTime()) ? onboardedAt : null,
    hasProgramme: programme !== null,
    finishedToday,
    /*
      Outside the errand's own window these say "not now" rather than a guess:
      `arriving` and nought conversations would both let the letter through on
      their own, so the pair that closes the branch is the honest default.
    */
    stage: errandFacts?.stage ?? "arriving",
    conversations: errandFacts?.conversations ?? 0,
    hasErrand: errandFacts?.hasErrand ?? false,
    milestoneReached: news?.milestoneReached ?? null,
    shieldSpent: news?.shieldSpent ?? null,
    runsGroup,
    deadlineWeeks,
  };
}

/**
 * The letter itself, for the handful the decision picked.
 *
 * This is the expensive half and it runs for one learner at a time, after the
 * cheap pass said they were owed something. Every figure is read back through
 * the function the screen showing the same figure reads it through, so a
 * letter and the page it links to cannot disagree.
 *
 * Returns null where the reading turns out to have nothing to say, which is a
 * real case rather than a defensive one: a programme can finish between the
 * two passes, and a letter about an evening that does not exist is worse than
 * no letter.
 */
export async function letterInputFor(
  ownerId: string,
  kind: EmailKind,
  origin: string,
  now: Date,
): Promise<
  | { kind: "tonight"; input: TonightInput }
  | { kind: "welcome"; input: WelcomeInput }
  | { kind: "comeback"; input: ComebackInput }
  | { kind: "weekly"; input: WeeklyInput }
  | { kind: "errand"; input: ErrandInput }
  /*
    THESE TWO CARRY A `remember`, WHICH IS WHAT STOPS THEM REPEATING.

    A milestone and a spent shield are announced once, and the mark that says
    so has to be written after the letter actually went rather than when it was
    decided: a mark written on a send that then failed is news nobody is ever
    told, and there is no second chance at a level somebody passes once. The
    run writes it on success, which is the only place that knows.
  */
  | { kind: "milestone"; input: MilestoneInput; remember: Remember }
  | { kind: "shield"; input: ShieldInput; remember: Remember }
  | { kind: "deadline"; input: DeadlineInput }
  | { kind: "classroom"; input: ClassroomInput }
  | { kind: "wordday"; input: WorddayInput }
  | null
> {
  const settings = await readSettings(ownerId, [
    SETTING_KEYS.timeZone,
    SETTING_KEYS.displayName,
    SETTING_KEYS.goalNote,
    SETTING_KEYS.goalReason,
    SETTING_KEYS.cefrGoal,
    SETTING_KEYS.reminderAt,
  ]);
  const clock = dayClock(settings[SETTING_KEYS.timeZone]);
  const name = settings[SETTING_KEYS.displayName]?.trim() || null;

  /*
    THE GIFT IS FETCHED ONCE AND SHARED BY THE THREE LETTERS THAT CARRY IT.

    `wordOfDay` excludes anything the learner has already met, so it is the
    same word their own Today card is showing them, which is the point: the
    letter is a copy of the app rather than a second stream of vocabulary.
  */
  const gift = async () => {
    const word = await wordOfDay(
      ownerId,
      clock.dayKey(now),
      clock.startOfDay(now),
      await courseLevelFor(ownerId),
    );
    return word
      ? {
          lemma: word.lemma,
          translation: word.translation,
          occasion: word.occasion?.note ?? null,
        }
      : null;
  };

  if (kind === "welcome") {
    const programme = await programmeFor(ownerId);
    const cards = await prisma.card.count({ where: { ownerId, suspended: false } });
    const opening = programme?.days[0];
    return {
      kind: "welcome",
      input: {
        name,
        origin,
        reminderAt: settings[SETTING_KEYS.reminderAt] ?? null,
        cardsWaiting: cards,
        opensOn: opening ? { title: opening.title, subtitle: opening.subtitle } : null,
        target: settings[SETTING_KEYS.cefrGoal]
          ? { level: settings[SETTING_KEYS.cefrGoal]!, deadline: null }
          : null,
      },
    };
  }

  if (kind === "comeback") {
    const [summary, kept, word, shieldRow] = await Promise.all([
      dailySummary(ownerId, now, clock),
      prisma.card.count({ where: { ownerId, suspended: false, state: 2 } }),
      gift(),
      readSetting(ownerId, SETTING_KEYS.streakShieldDates),
    ]);
    const last = await prisma.review.findFirst({
      where: { ownerId },
      orderBy: { reviewedAt: "desc" },
      select: { reviewedAt: true },
    });

    /*
      DID A SHIELD ACTUALLY COVER THIS GAP, RATHER THAN PROBABLY.

      This read `streak > 0 && shieldsAvailable >= 0 && streak >= 2`, and the
      middle term is a count, so it is always true: the whole condition was
      "their streak is at least two". The letter then told anybody with a
      surviving streak that a shield had covered their gap, which is a claim
      about a mechanic made on a guess. Somebody who reads it and opens the app
      to a broken streak has been told something false by the one letter whose
      job is to be reassuring.

      `streakShieldDates` is the record of which days a shield really covered,
      written by `resolveStreakFor`. A shield covered this gap when one of
      those days falls after the last review, which is exactly the question and
      is answerable rather than guessable. A row that will not parse means we
      do not know, which is said by saying nothing.
    */
    const shieldedDates: string[] = (() => {
      try {
        const parsed: unknown = JSON.parse(shieldRow ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === "string") : [];
      } catch {
        return [];
      }
    })();
    const gapStart = last ? clock.dayKey(last.reviewedAt) : null;
    const shieldUsed =
      gapStart !== null && summary.streak >= 2 && shieldedDates.some((day) => day > gapStart);

    return {
      kind: "comeback",
      input: {
        name,
        origin,
        daysAway: last ? clock.daysBetween(last.reviewedAt, now) : 0,
        wordsKept: kept,
        shieldUsed,
        streak: summary.streak,
        /*
          THE SMALLER ASK IS A REAL ROUND, NAMED.

          Match, because it is the shortest thing in the app that still grades
          through `gradeCard` like everything else, so doing it genuinely puts
          somebody back on the scheduler rather than only back on the screen.
        */
        smallStep: { title: "Eight pairs", href: `${origin}/review/match`, minutes: 2 },
        word,
      },
    };
  }

  if (kind === "weekly") {
    const target = targetFrom(settings[SETTING_KEYS.cefrGoal]);
    /*
      The seven days the strip draws, and the window the counts are read over,
      are the same seven days. `recentDayKeys(8)` runs seven days ago to today,
      so the strip drops today and the counts have to drop it too: a summary
      sent on Sunday morning that says "five of the last seven" over a card
      count including this morning is two readings of one week.
    */
    const weekKeys = clock.recentDayKeys(8, now).slice(0, 7);
    const weekStart = clock.shiftDay(now, 7);
    const weekEnd = clock.startOfDay(now);
    const window = { gte: weekStart, lt: weekEnd };

    const [ladder, reviews, held, conversations, programme] = await Promise.all([
      ladderPosition(ownerId, target),
      prisma.review.count({ where: { ownerId, reviewedAt: window } }),
      /*
        WORDS HELD, AND DELIBERATELY NOT WORDS GRADUATED THIS WEEK.

        The second is the figure a weekly summary wants and this app cannot
        derive it. A card carries its current FSRS state and no history of when
        it reached one, `Review` records ratings rather than transitions, and
        the only column that moves with a state change is `lastReview`, which
        is when it was last answered rather than when it was learned. So a
        card in Review state that was answered on Tuesday might have graduated
        on Tuesday or last March, and there is no honest way to tell them
        apart.

        Reporting it anyway, off `lastReview`, would have printed a plausible
        number that was wrong in exactly the direction that flatters: a week of
        ordinary reviews of long-known words would read as a week of learning
        them. This app's whole argument about derived progress is that a number
        nobody can check is worse than no number, so the letter says the one
        that is true, which is how many words the scheduler counts as theirs
        today.

        The figure that was wanted is worth having and needs a row written when
        a card changes state. That is a schema change and a decision about
        another append-only table, not something to smuggle in behind a count.
      */
      prisma.card.count({ where: { ownerId, suspended: false, state: 2 } }),
      outThere(ownerId, clock, now),
      programmeFor(ownerId),
    ]);

    const studiedKeys = new Set(
      (
        await prisma.review.findMany({
          where: { ownerId, reviewedAt: window },
          select: { reviewedAt: true },
        })
      ).map((row) => clock.dayKey(row.reviewedAt)),
    );

    const here = ladder.milestones.find((m) => m.state === "here");
    const reading = programme ? await courseReading(ownerId, programme, clock, now) : null;

    return {
      kind: "weekly",
      input: {
        name,
        origin,
        week: weekKeys.map((key) => ({
          label: dayLabel(key),
          studied: studiedKeys.has(key),
        })),
        reviews,
        held,
        conversations: conversations.total,
        ladder: {
          target,
          pct: ladder.pct,
          /* The credited half of that percentage, so the letter can name it.
             The same field the card on Today reads, rather than a second
             subtraction that could drift from it. */
          assumed: ladder.assumed,
          /*
            THE NEXT STOP'S OWN DISTANCE, NOT THE WHOLE CLIMB'S.

            This read `ladder.total - ladder.known`, which is how far the
            *target* is, under a sentence saying how far the next stop is. On
            somebody at A1 aiming for B1 that printed the distance to B1 beside
            the word A2, which is a letter being confidently wrong about the one
            number it exists to make concrete.

            `here.pct` is how far through that level's own words they are, so
            what is left of it is the share of that level's count. Rounded up,
            because "0 words away" from a stop they have not reached reads as a
            bug.
          */
          next: here ? { level: here.level, wordsAway: wordsLeftAt(here) } : null,
        },
        part:
          programme && reading?.current
            ? {
                title: programme.title,
                eveningsLeft: programme.days.length - reading.current.day.index + 1,
              }
            : null,
      },
    };
  }

  if (kind === "milestone" || kind === "shield") {
    /*
      The news was already resolved by `candidateFor`, and it is resolved again
      here rather than threaded through the decision: the two passes are
      minutes apart at most, the reads are the same, and a value carried across
      them is a value that can be stale in a way nothing would report.
    */
    const marks = await readSettings(ownerId, [
      SETTING_KEYS.milestoneToldFor,
      SETTING_KEYS.cefrGoal,
      SETTING_KEYS.streakShieldDates,
      SETTING_KEYS.shieldToldFor,
    ]);

    if (kind === "milestone") {
      const target = targetFrom(marks[SETTING_KEYS.cefrGoal]);
      const ladder = await ladderPosition(ownerId, target);
      /*
        The same level `candidateFor` decided was owed, read through the same
        rule rather than worked out again: the lowest passed one nobody has
        been told about. Written as "the highest passed one" here it would
        announce a level the scheduler is about to remember as a different
        one, which is a letter about A2 whose mark says A1.
      */
      const told = marks[SETTING_KEYS.milestoneToldFor];
      const reached = milestoneOwed(ladder.milestones, told);
      if (!reached) return null;

      const here = ladder.milestones.find((m) => m.state === "here");
      return {
        kind: "milestone",
        input: {
          name,
          origin,
          level: {
            key: reached.level,
            title: reached.title,
            arrival: reached.arrival,
            words: ladderWordsAt(reached.level),
          },
          /*
            THE CHECKED SHARE, AND NOT THE CREDITED ONE.

            `pct` counts the levels behind where somebody stands, which is
            right on a screen that prints the split beside it and wrong in
            this letter, whose whole argument is that the figure is what the
            scheduler decided you keep rather than what you have met. An
            estimate drawn as a meter under that sentence, in a letter read
            away from anything that could explain it, is the one thing the
            card on Today is careful not to do.
          */
          pct: ladder.verifiedPct,
          target,
          next: here ? { level: here.level, wordsAway: wordsLeftAt(here) } : null,
        },
        /* What was told plus this one, so a level finished out of order still
           gets its own letter on a later morning. */
        remember: {
          key: SETTING_KEYS.milestoneToldFor,
          value: milestoneMark(told, reached.level),
        },
      };
    }

    const summary = await dailySummary(ownerId, now, clock);
    let covered: string | null = null;
    try {
      const parsed: unknown = JSON.parse(marks[SETTING_KEYS.streakShieldDates] ?? "[]");
      const told = marks[SETTING_KEYS.shieldToldFor] ?? "";
      covered = (Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === "string" && d > told) : [])
        .sort()
        .at(-1) ?? null;
    } catch {
      covered = null;
    }
    if (!covered) return null;

    /*
      The week the gap sits in, drawn the way the Sunday summary draws one, so
      the learner can see which day was covered rather than being told a date.
    */
    const weekKeys = clock.recentDayKeys(8, now).slice(0, 7);
    const studiedKeys = new Set(
      (
        await prisma.review.findMany({
          where: { ownerId, reviewedAt: { gte: clock.shiftDay(now, 7), lt: clock.startOfDay(now) } },
          select: { reviewedAt: true },
        })
      ).map((row) => clock.dayKey(row.reviewedAt)),
    );

    return {
      kind: "shield",
      input: {
        name,
        origin,
        streak: summary.streak,
        remaining: summary.shieldsAvailable,
        /*
          Read off the app's own ladder rather than typed, so the letter cannot
          promise a milestone this app does not award.
        */
        nextAt: SHIELD_MILESTONES.find((m) => m > summary.streak) ?? null,
        week: weekKeys.map((key) => ({
          label: dayLabel(key),
          studied: studiedKeys.has(key),
        })),
      },
      remember: { key: SETTING_KEYS.shieldToldFor, value: covered },
    };
  }

  if (kind === "wordday") {
    /*
      THE GIFT ON ITS OWN, WHICH IS THE WHOLE LETTER.

      `gift()` above is the same fetch three other letters make, and it drops
      the example sentence because those three have no room for one. This
      letter is the sentence, so it reads `wordOfDay` itself rather than
      widening the shared shape for the one caller that wants the extra field.

      Null where the dictionary could answer for nothing at all, which returns
      no letter. That is the honest state rather than a defensive one: a
      deployment whose dictionary is empty has no word of the day on Today
      either, and a letter announcing that would be the app reporting a gap in
      itself to somebody who asked for a word.
    */
    const word = await wordOfDay(
      ownerId,
      clock.dayKey(now),
      clock.startOfDay(now),
      await courseLevelFor(ownerId),
    );
    if (!word) return null;
    return {
      kind: "wordday",
      input: {
        origin,
        word: {
          lemma: word.lemma,
          translation: word.translation,
          occasion: word.occasion?.note ?? null,
          example: word.example ? { et: word.example.et, en: word.example.en ?? null } : null,
        },
      },
    };
  }

  if (kind === "deadline") {
    /*
      THE COUNTDOWN CARD'S OWN READING, NOT A SECOND ONE.

      `examCountdown` is what Today draws and what the examination hub's
      countdown reads, and every figure in this letter comes off it: the band,
      the phrase, the confidence with its tier, the one thing in the way, and
      `distanceLine`'s own sentence. An invariant already fails on a screen
      writing its own sentence over `weeksWithFound`, and a letter is not a
      softer surface than a screen.

      Null where there is no phrase, which means no date was set. The decision
      only reaches this branch for somebody with weeks left on a date, so it
      is a state that can only arise between the two passes: somebody who
      cleared their deadline in the minute after the roster was read.
    */
    const countdown = await examCountdown(ownerId, now, clock);
    if (!countdown || !countdown.phrase) return null;
    return {
      kind: "deadline",
      input: {
        name,
        origin,
        band: countdown.band,
        label: countdown.label,
        phrase: countdown.phrase,
        distance: countdown.distance,
        confidence: countdown.confidence,
        evidence: EVIDENCE_NOTE[countdown.evidence],
        gap: countdown.gap?.title ?? null,
        onTrack: countdown.fits,
      },
    };
  }

  if (kind === "classroom") {
    /*
      THE GROUP, THROUGH WHICHEVER ROSTER ITS KIND CALLS FOR.

      Which query runs is the whole of the boundary between the two seats, as
      `lib/classroom/cohort.ts` says at length, so the letter picks by kind and
      never by which fields it feels like printing. A teacher's roster reads
      the class-wide case aggregate; a workplace's never selects a case at all,
      and the summary it returns has nowhere to put one.

      The first group they own, ordered on the primary key, because the letter
      is one letter: somebody running two classes gets the older one and the
      button opens the board with both on it. A digest per group would be two
      letters on one Monday morning, which is the thing the ceiling exists to
      stop, arriving through a loop.
    */
    const group = await prisma.classroom.findFirst({
      /*
        A GROUP WITH SOMEBODY IN IT, WHICH IS THE SAME QUESTION THE DECISION
        ASKED.

        Written as the oldest group they own, this and `candidateFor`'s
        `runsGroup` could name two different groups: somebody who ran a class
        last term and opened a new one this term was decided owed a register,
        and then this picked the empty old one and returned null. The letter
        never arrived, every Monday, and nothing looked wrong, since a
        gathering that answers null is skipped before a send is ever booked.
        Both halves ask for a group holding a member besides its owner now.
      */
      where: { ownerId, archived: false, members: { some: { ownerId: { not: ownerId } } } },
      orderBy: { id: "asc" },
      select: { id: true, name: true, kind: true, targetLevel: true },
    });
    if (!group) return null;

    /*
      SEVEN DAYS, OLDEST FIRST, EACH SAYING WHETHER ANYBODY STUDIED.

      The strip and the counts have to cover the same week or the drawing and
      the sentence above it describe two different things, which is the fault
      the weekly letter was corrected for. One window, read on the owner's own
      clock, since it is their Monday the letter arrives on.
    */
    const weekKeys = clock.recentDayKeys(8, now).slice(0, 7);
    const members = await prisma.classroomMember.findMany({
      where: { classroomId: group.id, ownerId: { not: ownerId } },
      select: { ownerId: true },
    });
    const ids = members.map((m) => m.ownerId);
    if (ids.length === 0) return null;
    const days = await prisma.review.findMany({
      where: {
        ownerId: { in: ids },
        reviewedAt: { gte: clock.shiftDay(now, 7), lt: clock.startOfDay(now) },
      },
      orderBy: { id: "asc" },
      select: { ownerId: true, reviewedAt: true },
    });
    const studied = new Set(days.map((d) => clock.dayKey(d.reviewedAt)));
    const week = weekKeys.map((key) => ({ label: dayLabel(key), studied: studied.has(key) }));

    /*
      ONE POPULATION AND ONE WINDOW FOR ALL FOUR FIGURES, WHICH IS WHY NONE OF
      THEM IS THE ROSTER'S.

      Both rosters answer for a screen and count the owner, who holds a
      `ClassroomMember` row of their own: a class of 24 students read 25 and a
      teacher who studied that morning was counted among those who practised.
      And their week is a rolling 168 hours including this morning where the
      strip is the seven whole days ending yesterday, so the sentence and the
      drawing under it described different weeks, which is the fault the weekly
      letter's own comment records.

      So the three headline figures are derived here from the one read the
      strip is already built from. What still comes from the roster is what
      only the roster can answer, the class-wide weakest case and the bands,
      and the count it hands over is the one a member is taken out of.
    */
    const practised = new Set(days.map((d) => d.ownerId));
    const headline = { members: ids.length, active: practised.size, reviews: days.length };

    if (cohortKind(group.kind) === "WORKPLACE") {
      const cohort = withoutMember(
        await workplaceRoster(group.id, group.targetLevel as ExamLevel, now),
        ownerId,
      );
      return {
        kind: "classroom",
        input: {
          origin,
          groupName: group.name,
          ...headline,
          week,
          detail: {
            kind: "WORKPLACE",
            level: cohort.level,
            onTrack: cohort.counts.likely,
            close: cohort.counts.close,
            needTime: cohort.counts.far,
            tooEarly: cohort.counts.unknown,
            evidence: EVIDENCE_NOTE[cohort.evidence],
          },
        },
      };
    }

    const roster = await classRoster(group.id, now);
    return {
      kind: "classroom",
      input: {
        origin,
        groupName: group.name,
        ...headline,
        week,
        detail: { kind: "CLASS", weakestCases: roster.weakestCases },
      },
    };
  }

  if (kind === "errand") {
    /*
      THE ERRAND IS THE APP'S OWN, READ THROUGH THE FUNCTION TODAY READS IT
      THROUGH.

      `errandForDay` over the units their deck has started, which is the same
      call `app/(app)/page.tsx` makes, so the letter and the card offer the
      same errand on the same day rather than two. That matters more here than
      anywhere: somebody who reads the letter, does the thing and then opens
      the app should not be handed a different task.
    */
    const snapshot = await deckSnapshot(ownerId, now);
    const errand = errandForDay(clock.dayKey(now), startedUnits(snapshot.startedLemmas));
    const unit = unitById(errand.unit);
    const scene = sceneForErrand(errand);

    /*
      ONE WORD OFF THE ERRAND'S OWN UNIT, AND THE DICTIONARY PICKS IT.

      An errand names a unit and never a word (ADR-005), so the letter may not
      choose one either: what it does is ask the dictionary for the unit's
      lemmas and print the first one the deployment can actually answer for,
      with the gloss the dictionary holds. A deployment whose dictionary is
      thin prints nothing, which is the state the letter renders rather than
      asserts away.
    */
    /*
      A LEMMA CAN HOLD TWO ENTRIES, SO WHICH ONE IS A DECISION.

      `hall` is a noun meaning frost and an adjective meaning grey, and a word
      somebody confirmed off a photograph sits beside the seeded one for any
      lemma at all. Taking the first row a query returns lets the ordering pick,
      which is the plan deciding what a learner reads; `oneEntryPerLemma` is
      the rule the dictionary itself leads with, so the letter and the entry it
      links to name the same word.

      Ordered on the primary key before that, because the rows are truncated: a
      cut over a loose order is the fault one rule further out.
    */
    const rows = unit
      ? await prisma.lexeme.findMany({
          where: { lemma: { in: [...unit.lemmas] }, translation: { not: "" } },
          orderBy: { id: "asc" },
          select: { id: true, lemma: true, pos: true, provenance: true, translation: true, forms: { select: { id: true } } },
        })
      : [];
    /*
      And the unit's own teaching order decides which word, rather than the
      band: a unit is written in the order a person would teach it, so its
      first word is the one somebody meeting this errand has most likely met.
    */
    const lemma = unit ? oneEntryPerLemma(rows, [...unit.lemmas])[0] ?? null : null;

    return {
      kind: "errand",
      input: {
        name,
        origin,
        errand: {
          says: errand.says,
          places: errandPlaces(errand),
          unitId: errand.unit,
          unitTitle: unit?.title ?? errand.unit,
          scene: scene ? { id: scene.id, title: scene.title } : null,
        },
        word: lemma ? { lemma: lemma.lemma, translation: lemma.translation } : null,
      },
    };
  }

  /* Tonight, which is the one the whole system is for. */
  const programme = await programmeFor(ownerId);
  if (!programme) return null;
  const [reading, word] = await Promise.all([
    courseReading(ownerId, programme, clock, now),
    gift(),
  ]);
  const current = reading.current;
  if (!current) return null;

  const done = current.done;
  /*
    THEIR OWN SENTENCE, PREFERRING THE NOTE THEY WROTE TO THE REASON THEY
    PICKED OFF A LIST.

    A free-text note is unmistakably theirs and a chosen reason is a label they
    agreed with, so the note wins where there is one. Neither is edited.
  */
  const theirWords = settings[SETTING_KEYS.goalNote]?.trim() || null;

  return {
    kind: "tonight",
    input: {
      name,
      origin,
      day: {
        title: current.day.title,
        subtitle: current.day.subtitle,
        part: current.day.part,
        canDo: current.day.canDo,
        newWords: current.day.words.length,
        steps: current.day.steps.map((step) => ({
          title: step.title,
          minutes: step.minutes,
          done: done.has(step.id),
        })),
      },
      theirWords,
      streak: (await dailySummary(ownerId, now, clock)).streak,
      word,
    },
  };
}
