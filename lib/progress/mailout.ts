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
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { emailPrefsFrom } from "@/lib/email/prefs";
import { EMAIL_KINDS, type EmailKind } from "@/lib/email/letter";
import type { Candidate } from "@/lib/email/schedule";
import { AWAY_DAYS } from "@/lib/email/schedule";
import { courseReading, ladderPosition, programmeFor, targetFrom } from "@/lib/progress/course";
import { courseLevelFor } from "@/lib/progress/level";
import { wordsLeftAt } from "@/lib/course/milestones";
import { dailySummary } from "@/lib/progress/summary";
import { wordOfDay } from "@/lib/progress/wordOfDay";
import { outThere } from "@/lib/progress/outThere";
import { parseReminderTime } from "@/lib/time/reminder";
import type { TonightInput } from "@/lib/email/letters/tonight";
import type { WelcomeInput } from "@/lib/email/letters/welcome";
import type { ComebackInput } from "@/lib/email/letters/comeback";
import type { WeeklyInput } from "@/lib/email/letters/weekly";

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
export async function mailoutRoster(now: Date, limit: number): Promise<string[]> {
  const since = new Date(now.getTime() - LOOK_BACK_DAYS * 86_400_000);

  const [reviewed, settled] = await Promise.all([
    prisma.review.findMany({
      where: { reviewedAt: { gte: since } },
      distinct: ["ownerId"],
      select: { ownerId: true },
      /*
        Ends on the primary key, because `ownerId` is not unique in `Review`
        and a `take` over a loose order is the plan deciding which learners a
        run considers. Arbitrary is survivable here, since anybody missed this
        hour is picked up the next; arbitrary and *unstable* is not, because
        the same learner could sit past the cap every hour of the evening.
      */
      orderBy: [{ ownerId: "asc" }, { id: "asc" }],
      take: limit,
    }),
    /*
      And the people who finished first run and have not answered a card yet,
      who are exactly the ones a welcome is for and who a review-log query
      cannot see.
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

/** The five cheap facts the decision needs. */
export async function candidateFor(ownerId: string, now: Date): Promise<Candidate> {
  const settings = await readSettings(ownerId, [
    SETTING_KEYS.timeZone,
    SETTING_KEYS.emailsOff,
    SETTING_KEYS.emailUndeliverable,
    SETTING_KEYS.onboardedAt,
    SETTING_KEYS.reminderAt,
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
    prisma.emailSend.count({ where: { ownerId, sentAt: { gte: weekAgo } } }),
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

  return {
    ownerId,
    // Filled by the run, which is the only layer allowed to read an address.
    email: null,
    undeliverable: settings[SETTING_KEYS.emailUndeliverable] === "1",
    prefs: emailPrefsFrom(settings[SETTING_KEYS.emailsOff]),
    dayKey: clock.dayKey(now),
    localHour,
    reminderHour,
    localWeekday: weekdayOn(clock, now),
    lastSent: new Map(
      sends.filter((entry): entry is [EmailKind, Date] => entry[1] !== undefined),
    ),
    sentThisWeek,
    lastReviewAt: lastReview?.reviewedAt ?? null,
    onboardedAt: onboardedAt && !Number.isNaN(onboardedAt.getTime()) ? onboardedAt : null,
    hasProgramme: programme !== null,
    finishedToday,
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
    const [summary, kept, word] = await Promise.all([
      dailySummary(ownerId, now, clock),
      prisma.card.count({ where: { ownerId, suspended: false, state: 2 } }),
      gift(),
    ]);
    const last = await prisma.review.findFirst({
      where: { ownerId },
      orderBy: { reviewedAt: "desc" },
      select: { reviewedAt: true },
    });
    return {
      kind: "comeback",
      input: {
        name,
        origin,
        daysAway: last ? clock.daysBetween(last.reviewedAt, now) : 0,
        wordsKept: kept,
        shieldUsed: summary.streak > 0 && summary.shieldsAvailable >= 0 && summary.streak >= 2,
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
          // One letter, and the same one `recentDayKeys` would put on Today.
          label: new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
            weekday: "narrow",
            timeZone: "UTC",
          }),
          studied: studiedKeys.has(key),
        })),
        reviews,
        held,
        conversations: conversations.total,
        ladder: {
          target,
          pct: ladder.pct,
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
