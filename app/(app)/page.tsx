import { Suspense } from "react";
import { Lettered } from "@/components/HeroLetters";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { redirect } from "next/navigation";
import { LEARN_BATCH } from "@/lib/learn/ladder";
import { ArrowRight, Check, Flame, Shield } from "lucide-react";
import { prisma } from "@/lib/db";
import { currentLearner, requireUserId } from "@/lib/auth/session";
import { dailySummary, deckSnapshot, pathWithProgress } from "@/lib/progress/summary";
import { reviewQueue } from "./review/queue";
import { KeepCurrent } from "@/components/KeepCurrent";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { measuredPaceFor } from "@/lib/progress/plan";
import { minutesForCards, ownCardsPerMinute } from "@/lib/stats/pace";
import { wordOfDay } from "@/lib/progress/wordOfDay";
import { outThereToday } from "@/lib/progress/outThere";
import { readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { nextUnit as pickNextUnit } from "@/lib/collections/syllabus";
import { courseLevelFor } from "@/lib/progress/level";
import type { Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import type { DayClock } from "@/lib/time/day";
import { shows, stageOf, TODAY_CARDS } from "@/lib/ux/disclosure";
import { hiddenSlotsFrom, orderTodayCards, todayOrderFrom } from "@/lib/ux/todayOrder";
import { ButtonLink } from "@/components/Button";
import { NamedIcon } from "@/components/icons";
import { Card, CardLink, Empty, Meter, Page, Ring, SectionTitle, Stack, StatTile } from "@/components/ui";
import { LocalDate } from "@/components/LocalDate";
import { dateLine } from "@/lib/time/estonianDate";
import type { TaskView } from "@/components/TaskRow";
import { TodayPlan } from "@/components/TodayPlan";
import { eventsOn, kindFrom, span, KIND_LABEL, KIND_TONE } from "@/lib/ux/schedule";
import { featuredTitle, GAME_OF_THE_DAY, PUZZLE_STAND_IN, type FeaturedGame } from "@/lib/ux/weekGames";
import { taughtAtDayStart } from "@/lib/progress/moduleScope";
import { puzzleFor } from "@/lib/progress/sonad";
import { crosswordFor } from "@/lib/progress/crossword";
import { WordOfDayCard } from "@/components/WordOfDay";
import { offered } from "@/lib/tutor/provider";
import { SayItToday } from "@/components/SayItToday";
import { errandForDay } from "@/lib/collections/errands";
import { sceneForErrand } from "@/lib/collections/errandScenes";
import { errandRehearsal } from "@/lib/scenes/rehearse";
import { startedUnits } from "@/lib/collections/syllabus";
import { courseReading, ladderPosition, moduleReached, programmeFor, targetFrom } from "@/lib/progress/course";
import { unitsThrough } from "@/lib/course";
import { SCENES, sceneById } from "@/lib/scenes/catalogue";
import { doneSceneTasks } from "@/lib/progress/homework";
import { minutesFor } from "@/lib/scenes/run";
import { sceneOfDay } from "@/lib/scenes/ofTheDay";
import { SonadPreview } from "@/components/SonadPreview";
import { TahedPreview } from "@/components/TahedPreview";
import { LadderBar } from "@/components/course/LadderBar";
import { unitById } from "@/lib/collections/syllabus";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { programmeAfter, stepCard, stepsIn } from "@/lib/course";
import { moveBlockedFor } from "@/lib/progress/checks";
import { HeroFan } from "@/components/HeroFan";
import { fillNodes } from "@/components/TemplateNodes";
import { JokeOfDayCard } from "@/components/JokeOfDay";
import { GoodNewsSlot } from "@/components/GoodNewsSlot";
import { jokesForThisVisit } from "@/lib/progress/jokeOfDay";
import { wordGlossFrom } from "@/lib/ux/wordGloss";

export async function generateMetadata() {
  return titleFor("Today");
}

export const dynamic = "force-dynamic";

/**
 * Today. The home dashboard.
 *
 * A page of modules, each answering one question at a glance and each with a
 * way through to the screen that answers it properly: what is due now, what the
 * course does next, what is written down for today, what keeps going wrong, and
 * one word out of the dictionary chosen by the date. A learner should be able
 * to read this page in about fifteen seconds and know what their day looks
 * like, or press one button and start.
 *
 * The modules are declared first and laid out second, further down, which is
 * the shape this file wanted from the beginning: what a card *is* and which
 * column it sits in are two questions, and they were tangled together in one
 * six-hundred-line return statement.
 *
 * What it leads with depends on how far in the learner is — see
 * `lib/ux/disclosure.ts` for the rule and the argument. The short version: this
 * page used to render eleven panels to everybody, and on day one most of them
 * were reporting on an empty review log. A streak of nought, a goal ring at
 * nought percent and a "word to revisit" pulled from a deck nobody has read yet
 * are not information, and somebody meeting the app for the first time had to
 * scroll past all of them to find the one button that matters. Then the same
 * rule was drawn too wide and day one became two cards on an empty page, which
 * is the other way of getting it wrong.
 *
 * Nothing here is deleted for anybody. Every panel a stage holds back is one
 * click away in the rail, in the palette and on its own page.
 *
 * What each card is *about* is the other half of it. The first card used to
 * carry five unrelated things stacked with no headings between them: the due
 * counts, the goal ring, the button, the level bar, the week strip and a note
 * about shields. The streak was a number at the top and its own picture a
 * hundred pixels lower with an XP meter wedged in between, which is one thing
 * told in three places. So the do-now card is now only what to do now, and
 * everything that reports on the run of days is one card that says so.
 */
export default async function TodayPage() {
  const ownerId = await requireUserId();
  const now = new Date();
  /*
    FOUR ANSWERS THAT NEED NOTHING FROM EACH OTHER, SO THEY ARE ASKED AT ONCE.

    Three of them were `await`s in a row and the fourth was read at the very
    end of the page, after everything else had finished. On a socket on the
    same machine that is a rounding error; against a hosted Postgres each one
    is a round trip, and this page made fourteen of them one after another,
    which was measured by giving every query a 20ms delay and watching the page
    take four hundred milliseconds to answer a database that was idle.

    The clock is a settings read and the settings are the same read, so those
    two are now one query between them (lib/settings/store.ts). What is left is
    the deck, and the level this learner placed at.
  */
  const [clock, snapshot, settings, placement, locale] = await Promise.all([
    /*
      The learner's own midnight, not this server's. Every day-shaped figure on
      this page reads it: the streak, the goal ring, the quests and the week
      strip. Without it they all break at the deployment's midnight, which on
      Vercel is UTC — see lib/time/day.ts for what that cost.
    */
    learnerDayClock(ownerId),
    deckSnapshot(ownerId, now),
    readSettings(ownerId, [
      SETTING_KEYS.onboardedAt, SETTING_KEYS.displayName, SETTING_KEYS.cefrPlacement,
      SETTING_KEYS.todayOrder, SETTING_KEYS.goalTarget, SETTING_KEYS.wordGloss,
    ]),
    /*
      Which level the course opens at. It was read last, after everything else
      on the page had finished, and it depends on none of it: the placement and
      the latest level check, both of which this request can ask for straight
      away.
    */
    courseLevelFor(ownerId),
    localeFor(ownerId),
  ]);
  /*
    THE PAGE'S OWN WORDS IN THE LEARNER'S LANGUAGE. `t` is a fixed line; `say`
    is a line with a count in it, where English keeps the sentence it always
    printed and Russian and Ukrainian get a template with the noun already in
    the right one of their three plural forms.
  */
  const t = (english: string) => tr(locale, english);
  const say = (english: string, template: string, values: Readonly<Record<string, string | number>>) =>
    locale === "en" ? english : fill(tr(locale, template), values);
  /* A unit's or a part's name: the Estonian from A2 up, and below it the
     English line in the reader's own language where it has been translated. */
  const ui = (et: string, en: string) => (uiWantsEnglish(placement) ? t(en) : et);

  // A brand-new learner gets the wizard instead of an empty dashboard. Anyone
  // with a deck or a finished setup never sees it again.
  if (!settings[SETTING_KEYS.onboardedAt] && snapshot.totalCards === 0) redirect("/start");

  const [summary, units, fetchedTasks, countedOpen, countedLate, conversations, events, weekReviews, learner, pace, [programme, courseNow], review] = await Promise.all([
    dailySummary(ownerId, now, clock),
    pathWithProgress(ownerId, snapshot),
    /*
      Enough to group and to count what is left over, not enough to be a
      second tasks page. It is one indexed read on a small table and it stays
      in this batch rather than waiting for the stage, because knowing the
      stage needs the summary and a second round trip costs more than this
      query does.
    */
    prisma.task.findMany({
      where: { ownerId, completed: false },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    /*
      And how many there are, which the twelve cannot say: the panel's hint
      read its count off the rows it drew, so twenty waiting read as twelve
      left. Late is a due date before the learner's own midnight, which is
      `bucketFor`'s "overdue" asked of the table rather than of the rows.
    */
    prisma.task.count({ where: { ownerId, completed: false } }),
    prisma.task.count({ where: { ownerId, completed: false, dueAt: { lt: clock.startOfDay(now) } } }),
    /*
      Every open conversation a class set, because "done" for one is a run of
      it rather than a tick (D4) and the counts above cannot see that. A class
      sets a handful, so this is a small read; which are done is one more
      query after the batch, and none where there are none.
    */
    prisma.task.findMany({
      where: { ownerId, completed: false, sceneId: { not: null } },
      select: { id: true, sceneId: true, createdAt: true, dueAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 50,
    }),
    /*
      The learner's own calendar. In this batch for the same reason the tasks
      are: it is one indexed read on a small table, and a second round trip to
      decide whether to draw one card costs more than the read does. Which of
      them fall on today is `eventsOn`, which is pure and needs no query.
    */
    prisma.studyEvent.findMany({
      where: { ownerId },
      orderBy: [{ startMinute: "asc" }, { id: "asc" }],
      take: 50,
    }),
    prisma.review.findMany({
      where: { ownerId, reviewedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
      select: { reviewedAt: true },
    }),
    currentLearner(),
    /*
      How much of this app the learner actually does, off the log. Read here
      once for the two things below that quote a pace: the minutes the cards
      waiting will take, at this learner's own rate, and the countdown's line
      on whether that pace reaches the date.
    */
    measuredPaceFor(ownerId, now),
    /*
      Whether the learner is following a planned program, which decides what
      this page leads with. In this batch rather than after it because it needs
      nothing from anything else here, and a second round trip to answer a
      question the hero depends on is a round trip paid on every morning.

      AND THE READING OF IT, CHAINED ON RATHER THAN WAITED FOR. The module is
      the hero and `courseReading` needs nothing but the program, the clock
      and the instant, so it starts the moment the program is known instead
      of after the word of the day has been fetched: two to four round trips
      that used to sit at the end of the page now run beside the batch.
    */
    programmeFor(ownerId).then(async (programme) => [
      programme,
      programme ? await courseReading(ownerId, programme, clock, now) : null,
    ] as const),
    /*
      THE SITTING REVIEW WILL HOLD, built by the review page's own builder,
      because "20 due" over a session of one card is the app contradicting
      itself on the one press it asks for. Counting the list is the only
      count that cannot drift from it (see app/(app)/review/queue.ts).
    */
    reviewQueue(ownerId, null, now),
  ]);

  const stage = stageOf({ totalCards: snapshot.totalCards, reviewsAllTime: summary.reviewsAllTime });

  // A conversation the class set is off the list the moment a run of it is finished.
  const conversationsDone = await doneSceneTasks(ownerId, conversations);
  const tasks = fetchedTasks.filter((task) => !conversationsDone.has(task.id));
  const openTasks = countedOpen - conversationsDone.size;
  const lateTasks = countedLate - conversations.filter((c) => conversationsDone.has(c.id) && c.dueAt !== null && c.dueAt < clock.startOfDay(now)).length;

  /*
    Everything below here is asked for only where it is shown. The point of the
    disclosure rule is to stop rendering panels nobody can read yet, and a page
    that still runs their queries has kept the cost and thrown away the reason.
  */
  const errand = shows(stage, "errand") ? errandForDay(summary.dayKey, startedUnits(snapshot.startedLemmas)) : null;
  /* Sõnad, every day, for now. See the game card below for why, and for the
     fall-back where the module has not taught enough words to build a board. */
  const [featured, reached] = await Promise.all([
    withPuzzleReady(ownerId, summary.dayKey, GAME_OF_THE_DAY),
    programme ? moduleReached(ownerId) : null,
  ]);
  const sceneToday = sceneOfDay(
    summary.dayKey,
    SCENES,
    reached ? new Set(unitsThrough(reached.programme, reached.day.index)) : programme ? new Set<string>() : null,
  );
  // The cards the learner hid in Settings: not dealt, and the two that cost a
  // read are not even asked for.
  const hiddenCards = hiddenSlotsFrom(settings[SETTING_KEYS.todayOrder]);
  /* Whether the joke and the good news put the dictionary under their words,
     which is the learner's own underline setting (lib/ux/wordGloss.ts) and
     off unless they turned it on. */
  const linked = wordGlossFrom(settings[SETTING_KEYS.wordGloss]) === "on";
  const [word, outside, ladder, jokes] = await Promise.all([
    shows(stage, "word") ? wordOfDay(ownerId, summary.dayKey, clock.startOfDay(now), placement, { forLevel: true }) : null,
    // Whether the day's question has been answered, and the month behind it,
    // off one read rather than one for each.
    errand ? outThereToday(ownerId, clock, now) : null,
    /*
      Held to `starting` rather than drawn from the first minute, for the
      reason the disclosure rule gives about every other figure computed from
      an empty log: a bar at nought percent under a heading about a target is
      not information, it is the app reporting that nothing has happened yet,
      which the learner knows. The query is only run where it is drawn, and it
      is asked in this batch because it needs the stage and the settings and
      nothing the other four return.
    */
    shows(stage, "streak")
      ? ladderPosition(ownerId, targetFrom(settings[SETTING_KEYS.goalTarget]))
      : null,
    /*
      The joke, one of the two cards that ask nothing of anybody: a table and,
      where the underlines are on, one dictionary read. A new draw on every
      visit, so coming back to Today or reloading it is another joke. The good news is not awaited here
      at all; it streams in on its own (`GoodNewsSlot`), because it is three
      feeds and a model and this page may not wait on somebody else's server
      for the one card that is a pleasure rather than the point.
    */
    shows(stage, "joke") && !hiddenCards.has("joke") ? jokesForThisVisit({ linked }) : null,
  ]);

  const today = dateLine(now, clock.zone);
  /*
    What Review will actually put in front of them: the length of the very
    list that screen builds, due cards and the unseen ones a session trickles
    in. It was a tally over the whole deck reasoning about that list, and it
    printed "20 due" over a session that asked one card.
  */
  const toReview = review.cards.length;
  /*
    WHAT IS DUE, AND NOTHING ELSE, for the strip that says "due". The sitting
    above includes up to ten unseen cards that Review trickles in with no daily
    limit, so a learner who answered twenty cards was told "10 due" straight
    afterwards: the next ten unseen cards had taken the place of the ones just
    done. A strip called "due" that can never reach nought is a list that
    cannot be finished, and an unseen card is new rather than due.
  */
  const dueCount = review.due.length;
  // What is due, as Review will ask it, marked where more is due than a sitting holds.
  const dueNow = review.dueMore ? `${review.due.length}+` : review.due.length;
  /** Words waiting on the ladder, in words rather than in cards. */
  const toLearn = snapshot.learnCount;
  const name = settings[SETTING_KEYS.displayName]?.trim() || (learner.name === "you" ? "" : learner.name);
  /*
    The course decides what comes next, not this page. Its own rule respects
    where the learner placed: picking the first unfinished unit in order sent a
    B1 learner back to greetings, which is how somebody decides an app is not
    for them. `nextUnit` prefers finishing something already started, then the
    first open unit at or above their level.
  */
  const nextSyllabusUnit = pickNextUnit({
    doneUnitIds: new Set(units.filter((u) => u.state === "done").map((u) => u.unit.id)),
    startedUnitIds: new Set(units.filter((u) => u.state === "learning").map((u) => u.unit.id)),
    placement,
  });
  // A1 is the lessons rather than units (docs/43-lessons.md), so an A1 unit is never offered here.
  const nextUnit = nextSyllabusUnit && nextSyllabusUnit.level !== "A1"
    ? units.find((u) => u.unit.id === nextSyllabusUnit.id)
    : undefined;

  const reviewedDays = new Set(weekReviews.map((r) => clock.dayKey(r.reviewedAt)));
  const week = clock.recentDayKeys(7, now).map((day) => ({
    day,
    done: reviewedDays.has(day),
    isToday: day === summary.dayKey,
  }));


  /*
    THE MODULES.

    Declared here and laid out below, because what a card is and which column
    it sits in are two questions and they had been one six-hundred-line return
    statement. Each is null when the disclosure rule says this learner is not
    ready for it, which lets the layout below be read as a layout rather than
    as a nest of conditions.
  */

  /*
    THE ONE THING THE APP EXISTS TO GET YOU TO DO, ACROSS THE WHOLE WIDTH.

    It spans both columns and is the only card that does, because it is the
    only card that is not one of several. On a wide screen it is a row rather
    than a stack: the figures on the left and the button on the right, so a
    wide card is not a wide empty card with a button in it. On the first
    morning there are no figures worth printing (`shows` holds a due count of
    nought and a goal ring at nought back, and it is right to), so the left
    half says what the button is going to do instead, in the ladder's own
    terms: meet, pick the meaning, put it back in its sentence.
  */
  const figures = shows(stage, "streak") ? (
    <div className="flex flex-wrap items-center gap-4">
      {/*
        One figure, what is due. A "New words" tile sat beside it and read
        1,282 for somebody following the course, which is every word the deck
        holds that the ladder has not met: a number nobody can act on, and the
        October feedback asked what it was for. The button underneath already
        says how many new words are next, in a batch somebody can do.
      */}
      <div className="w-full sm:w-auto sm:min-w-[160px]">
        <StatTile value={dueNow} label={t("Due now")} tone="accent" />
      </div>
      {/* On a phone the ring wraps onto its own line, where a bare
          circle says nothing — so it is captioned there and only there. */}
      <div className="flex items-center gap-3">
        <Ring
          pct={summary.goalPct}
          size={74}
          thickness={8}
          label={fill(t("{done} of today's {goal} reviews done"), { done: summary.reviewsToday, goal: summary.dailyGoal })}
        >
          <span
            className="tnum text-base font-bold"
            style={{ color: "var(--ink)" }}
          >
            {summary.goalPct}%
          </span>
        </Ring>
        {/*
          Shown at every width. It was `sm:hidden`, so from 640 up the card
          carried two labeled tiles and one unlabeled circle reading
          100%, with the meaning in an aria-label and nowhere else. Past
          the goal it said "24 of 15 reviews", which reads as a counting
          fault rather than as a day gone well.
        */}
        <div aria-hidden>
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Daily goal")}</p>
          <p className="tnum mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            {summary.reviewsToday >= summary.dailyGoal
              ? fill(t("{done} done, goal met"), { done: summary.reviewsToday })
              : fill(t("{done} of {goal} reviews"), { done: summary.reviewsToday, goal: summary.dailyGoal })}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  /*
    Which of the three days this is: words waiting to be learned, cards
    waiting to be reviewed, or neither. `learnFirst` is the first of those.

    THE FIRST BUTTON ON A DECK NOBODY HAS READ YET IS NOT "REVIEW". A deck
    arrives whole and every card in it is unseen, so on day one there is
    nothing due and there never was: the old page counted the new cards a
    review session would trickle in and called them due, which put "Start
    your first review" over a screen whose whole first minute is teaching.
    Learning is what there is to do, so that is what the button says, and it
    goes on saying it on any day the schedule is clear and there are still
    words waiting.
  */
  const learnFirst = toLearn > 0 && (toReview === 0 || stage === "arriving");
  const caughtUp = !learnFirst && toReview === 0;
  /*
    THE ONE CARD ON THE PAGE THAT EXISTS TO SAY WHAT TO DO NOW, SAYING IT.

    With nothing due this was a sentence and no control, and it pointed
    "below" at practice tiles that sat in the other column. The lead above
    already says there is nothing due. So the note is one line and the next
    unit is a button, which is the honest next thing on a day the learner has
    earned.
  */
  /*
    THE ONE THING THE LEAD ABOVE DOES NOT ALREADY SAY.

    This was a green `Note` reading "You are caught up. Reviewing early does
    not help you remember more, so now is a good time to learn something new",
    drawn under a hero whose own line reads "Nothing due right now. A good time
    to meet some new words." Two thirds of it was the sentence directly above
    it in a colored box, and the third that was not is the only part a learner
    could not have worked out: that coming back early buys nothing. So the
    reason is what is left, in the app's own voice rather than in a panel,
    because a neutral fact painted mint reads as a reward for having done
    nothing.
  */
  const caughtUpNote = (
    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
      {t("Going over cards before they’re due doesn’t help them stick. Take the break, or start something new.")}
    </p>
  );
  const orReview = say(
    `Or review ${toReview} due card${toReview === 1 ? "" : "s"}`,
    "Or review {cards} that are due",
    { cards: countOf(locale, toReview, "card") },
  );
  const actions = learnFirst ? (
    <>
      <ButtonLink href="/learn/new" variant="primary" size="lg" className="w-full">
        {stage === "arriving"
          ? t("Meet your first words")
          : say(`Learn ${Math.min(toLearn, LEARN_BATCH)} new words`, "Learn {words}", { words: countOf(locale, Math.min(toLearn, LEARN_BATCH), "new word") })}{" "}
        <ArrowRight size={17} aria-hidden />
      </ButtonLink>
      {toReview > 0 && (
        <ButtonLink href="/review" variant="secondary" className="w-full justify-center">
          {orReview} <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      )}
    </>
  ) : !caughtUp ? (
    <>
      <ButtonLink href="/review" variant="primary" size="lg" className="w-full">
        {t("Start reviewing")} <ArrowRight size={17} aria-hidden />
      </ButtonLink>
      {toLearn > 0 && (
        <ButtonLink href="/learn/new" variant="secondary" className="w-full justify-center">
          {say(`Or learn ${Math.min(toLearn, LEARN_BATCH)} new words`, "Or learn {words}", { words: countOf(locale, Math.min(toLearn, LEARN_BATCH), "new word") })} <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      )}
    </>
  ) : (
    <>
      {nextUnit ? (
        <ButtonLink href={`/learn/${nextUnit.unit.id}/lesson`} variant="secondary" className="w-full justify-center">
          {fill(t("Start {unit}"), { unit: ui(nextUnit.unit.title, nextUnit.unit.subtitle) })} <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      ) : (
        <ButtonLink href="/practice" variant="secondary" className="w-full justify-center">
          {t("Go and practice")} <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      )}
    </>
  );

  /*
    What the left half says on a morning with no figures. Which is to say, on
    the first one: what the ladder will do with the words, or, where the deck
    already has cards to answer, how to answer them.
  */
  const opening = figures ? null : caughtUp ? caughtUpNote : learnFirst ? (
    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
      {say(
        `${toLearn} new word${toLearn === 1 ? " is" : "s are"} waiting for you, and you’ll take them ${LEARN_BATCH} at a time. You see each word in a sentence, pick what it means, then fill it back into the sentence yourself.`,
        "New words waiting for you: {words}. You'll take them {batch} at a time. You see each word in a sentence, pick what it means, then fill it back into the sentence yourself.",
        { words: countOf(locale, toLearn, "word"), batch: LEARN_BATCH },
      )}
    </p>
  ) : (
    <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
      {t("Most cards ask you to type or pick the answer. A few just show it and ask whether you knew it. Be honest there: that’s how the app knows when to bring each word back.")}
    </p>
  );

  /*
    THE EVENING ALREADY PLANNED, WHICH IS WHAT THIS PAGE LEADS WITH WHERE THERE IS ONE.

    The card below it is the honest answer to "what now" for somebody choosing
    their own evening: what is due, what is waiting, and two buttons. For
    somebody following a program it is the wrong question, because the
    program has already answered it, and two answers on one screen is the
    thing a planned course exists to remove. So the hero is the module: which
    day, what it makes you able to do, the one step that is next, and a button
    that opens it.

    IT REPLACES THE HERO AND NOTHING ELSE. Every other card on this page is
    untouched and the cap is unchanged, so the program costs nobody a panel.
    And it stands down the moment the module is finished for the day, which is
    the point of a course that ends: the ordinary card comes back, saying there
    is nothing due, which is true and is the right thing to be told.
  */
  const courseDay = courseNow?.current ?? null;
  const courseStep = courseDay?.next ?? null;
  /* An evening still to do, which is one condition and was written out twice:
     the hero draws the module off it and the line above the hero has to agree,
     or the page says "today's module is the whole evening" over a card that
     has just said the evening is over. */
  const moduleTonight = Boolean(courseNow && courseDay && !courseNow.finishedToday && courseStep);
  /*
    A PART FINISHED ON AN EARLIER DAY IS NOT A DAY OFF FROM THE COURSE.

    The October feedback asked why Today showed the generic card. Finishing
    the last evening of a part leaves no current day, so the module hero had
    nothing to draw and the page fell back to "what's due", on every morning
    after, until the learner went and found the next part themselves. The
    hero is the next part's first evening instead, and its button goes to the
    course screen, where the hand-off between parts is (the reading of
    whether the words have settled, and the way on). A part finished today
    keeps the "done" card below, so the evening still ends.
  */
  const nextPart = programme && courseNow?.finished ? programmeAfter(programme) ?? null : null;
  const nextPartDay = nextPart && !courseNow?.finishedToday ? nextPart.days[0] ?? null : null;
  // A part of the A1 lessons ends in a check, and until it is passed the hero is the check.
  const partCheck = nextPartDay && programme ? await moveBlockedFor(ownerId, programme, nextPart!) : null;

  const nextPartCard = nextPart && nextPartDay ? (
    <HeroFan
      bright
      eyebrow={partCheck
        ? fill(t("Before {part}"), { part: nextPart.id.toUpperCase() })
        : fill(t("Next up: {part}"), { part: nextPart.id.toUpperCase() })}
      title={partCheck
        ? (partCheck.final ? fill(t("The {level} check"), { level: programme!.level }) : t("A short check"))
        : ui(nextPartDay.title, nextPartDay.subtitle)}
      titleLang={partCheck || uiWantsEnglish(placement) ? undefined : "et"}
      text={partCheck
        ? fill(t("You finished {part}. Pass a short check of what it taught, and {next} opens."), { part: programme!.id.toUpperCase(), next: nextPart.id.toUpperCase() })
        : fill(t("You finished {part}. {canDo}"), { part: programme!.id.toUpperCase(), canDo: t(nextPartDay.canDo) })}
      action={
        <ButtonLink href={partCheck ? `/course/check/${partCheck.id}` : "/course"} variant="primary" size="lg" className="whitespace-nowrap">
          {partCheck ? t("Take the check") : fill(t("Start {part}"), { part: nextPart.id.toUpperCase() })} <ArrowRight size={17} aria-hidden />
        </ButtonLink>
      }
      nextLabel={t("Next")}
      cardsLabel={partCheck
        ? t(partCheck.final ? "about ten minutes" : "about five minutes")
        : fill(t("{minutes} min to go today"), { minutes: stepsIn(nextPartDay, locale).reduce((m, step) => m + step.minutes, 0) })}
      cards={partCheck
        ? [{ label: t("Check"), detail: t(partCheck.final ? "about ten minutes" : "about five minutes"), icon: "ClipboardCheck", state: "now" }]
        : stepsIn(nextPartDay, locale).map((step, at) => ({
          ...stepCard(step, locale),
          detail: fill(t("{minutes} min"), { minutes: step.minutes }),
          state: at === 0 ? "now" : "later",
        }))}
    />
  ) : null;

  const courseCard = nextPartCard ?? (moduleTonight && courseDay && courseStep ? (
    /*
      THE EVENING AS A FAN OF ITS STEPS, AND THE ONE BRIGHT HERO IN THE APP.

      Every other page draws the same card in the night's grays, so this is
      the one that is lit: what the learner can do by the end of it on the
      left, and today's steps dealt out on the right, the finished ones ringed,
      the next one lifted and breathing, the rest in the brand mix.
    */
    <HeroFan
      bright
      eyebrow={`${t("Today’s module")}, ${fill(t("day {day} of {days}"), { day: courseDay.day.index, days: programme!.days.length })}`}
      title={ui(courseDay.day.title, courseDay.day.subtitle)}
      titleLang={uiWantsEnglish(placement) ? undefined : "et"}
      text={t(courseDay.day.canDo)}
      action={
        <ButtonLink href="/course" variant="primary" size="lg" className="whitespace-nowrap">
          {courseDay.pct === 0 ? t("Start today's module") : t("Keep going")} <ArrowRight size={17} aria-hidden />
        </ButtonLink>
      }
      nextLabel={t("Next")}
      cardsLabel={fill(t("{minutes} min to go today"), { minutes: courseDay.minutesLeft })}
      cards={stepsIn(courseDay.day, locale).map((step) => {
        const done = courseDay.done.has(step.id);
        return {
          ...stepCard(step, locale),
          detail: done ? t("done") : fill(t("{minutes} min"), { minutes: step.minutes }),
          state: done ? "done" : step.id === courseStep.id ? "now" : "later",
        };
      })}
    />
  ) : courseNow?.finishedToday ? (
    <Card tone="accent" className="evening flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
      <div className="min-w-0 flex-1">
        <SectionTitle
          hint={courseNow.eveningsInARow >= 2
            ? fill(t("{done} of {days} done, {run} evenings in a row"), { done: courseNow.daysDone, days: programme!.days.length, run: courseNow.eveningsInARow })
            : fill(t("{done} of {days} done"), { done: courseNow.daysDone, days: programme!.days.length })}
        >
          {t("Today’s module")}
        </SectionTitle>
        <p className="mt-1 text-md font-semibold md:text-lg" style={{ color: "var(--accent-deep)" }}>
          {t("Today’s module is done.")}
        </p>
        <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {courseDay
            ? courseDay.day.part.n > 1
              ? fillNodes(t("Tomorrow you’ll continue with “{unit}”, part {n} of {of}."), {
                unit: <b lang={uiWantsEnglish(placement) ? undefined : "et"}>{ui(courseDay.day.title, courseDay.day.subtitle)}</b>,
                n: courseDay.day.part.n, of: courseDay.day.part.of,
              })
              : uiWantsEnglish(placement)
                ? fillNodes(t("See you tomorrow for “{unit}”."), { unit: <b>{t(courseDay.day.subtitle)}</b> })
                : fillNodes(t("See you tomorrow for “{unit}” ({english})."), { unit: <b lang="et">{courseDay.day.title}</b>, english: t(courseDay.day.subtitle) })
            : nextPart
              ? fillNodes(t("That was the last evening of {part}. Tomorrow you start {next}."), {
                part: <b>{programme!.id.toUpperCase()}</b>,
                next: <b>{nextPart.id.toUpperCase()}</b>,
              })
              : t("That was the very last evening of the course. Every word you met along the way will keep coming back in your reviews.")}
        </p>
      </div>
      <div className="flex flex-col gap-3 lg:w-[19rem] lg:shrink-0">
        <ButtonLink href="/course" variant="secondary" className="w-full justify-center">
          {t("See what’s next")} <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      </div>
    </Card>
  ) : null);

  const doNowCard = courseCard ?? (snapshot.totalCards === 0 ? (
    <Card>
      <Empty
        title={t("No cards yet")}
        body={t("Choose a unit to begin with. Its words become cards you can learn, hear and practice.")}
        action={<ButtonLink href="/learn" variant="primary">{t("Choose your first unit")}</ButtonLink>}
      />
    </Card>
  ) : (
    <Card tone="night" className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
      <div className="min-w-0 flex-1">
        {/*
          WHY THIS CARD AND NOT TODAY'S MODULE, said in one line. It is drawn
          only where there is no evening to lead with: the planned course is
          switched off, or every part of it is done.
        */}
        {(!programme || courseNow?.finished) && (
          <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }} data-hero-reason>
            {!programme
              ? fillNodes(t("The planned course is off, so this is what's due. {turnOn}"), {
                turnOn: <Link href="/course" className="underline underline-offset-2">{t("Turn it back on")}</Link>,
              })
              : t("You've finished the whole course, so this is what's due.")}
          </p>
        )}
        {figures ?? opening}
      </div>
      {/*
        Nineteen rem, which is the width the primary button was always drawn
        at on a phone and is wide enough for "Or learn 5 new words" on one
        line. Fixed rather than a fraction, so the button is the same object
        on every morning whatever the other half holds.
      */}
      <div className="flex flex-col gap-3 lg:w-[19rem] lg:shrink-0">{actions}</div>
    </Card>
  ));

  /*
    What is on today, from the learner's own calendar, which is the second half
    of the Calendar card. Which events fall on today is `eventsOn`, pure and
    needing no query; the rows themselves come off the batch above.
  */
  const todayEvents = eventsOn(
    events.map((e) => ({
      id: e.id, title: e.title, notes: e.notes, kind: kindFrom(e.kind),
      startMinute: e.startMinute, durationMinutes: e.durationMinutes,
      weekdays: e.weekdays, onDate: e.onDate,
    })),
    clock.dayKey(now),
  );
  const eventsList = todayEvents.length > 0 ? (
    <ul className="flex flex-col gap-2">
      {todayEvents.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 rounded-[var(--r)] px-3.5 py-3"
          style={{ background: `var(--${KIND_TONE[e.kind]}-soft)` }}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {e.title}
            </span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              {t(KIND_LABEL[e.kind])}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: "var(--ink-2)" }}>
            {span(e.startMinute, e.durationMinutes)}
          </span>
        </li>
      ))}
    </ul>
  ) : null;

  /*
    Everything that reports on the run of days, in one card that says so. The
    streak, the week it is drawn from, the shields that protect it and the XP
    the same reviews earned are one story, and they used to be told in three
    places inside the card above.
  */
  const streakShown = shows(stage, "streak");
  const calendarCard = streakShown || eventsList ? (

    /* Reaching for the card flickers the flame, and on a day the run was
       kept it catches once as the page arrives. A run that has not been kept
       today stays still: the flame is not there to nag. */
    <div data-hop-on="hover" data-hop-end="flame-flicker">
    <Card className="flex h-full flex-col gap-4">
      <SectionTitle
        hint={streakShown
          ? fill(t("{n} reviewed today"), { n: summary.reviewsToday })
          : todayEvents.length === 1 ? t("one thing today") : fill(t("{things} today"), { things: countOf(locale, todayEvents.length, "thing") })}
      >
        {t("Calendar")}
      </SectionTitle>

      {/*
        The run is a number and a word, set like type, with the week under it.
        It was a boxed tile of its own inside this card, a card inside a card
        for one figure, which is the dashboard shape `StatTile` warns about.
      */}
      {streakShown && (<>
      <p className="flex items-baseline gap-2">
        <Flame size={18} aria-hidden className={`${summary.reviewsToday > 0 && summary.streak > 0 ? "flame-lit" : "flame"} self-center`} style={{ color: "var(--butter-ink)" }} />
        <span className="tnum font-display text-3xl font-bold leading-none" style={{ color: "var(--ink)" }}>{summary.streak}</span>
        <span className="text-base" style={{ color: "var(--ink-2)" }}>
          {locale === "en" ? (summary.streak === 1 ? "day in a row" : "days in a row") : daysInARow(locale, summary.streak)}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {/* A week at a glance: the streak, made concrete. */}
        <div className="flex min-w-[210px] flex-1 items-center justify-between gap-2">
          {week.map((d, i) => (
            <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              {/*
                Sized to the column it is in, up to 36px, rather than
                36px whatever the column turned out to be. Seven of
                these, six gaps and the card's own padding come to more
                than a 360px phone has, so the last circle was drawn 2px
                over the card's right border. `aspect-square` keeps it a
                circle at whatever width it ends up with.
              */}
              <span
                // A reviewed day springs in with its tick, one after another
                // across the week, so the run of days reads as a run rather than
                // as seven dots.
                className={`${d.done ? "day-done " : ""}flex aspect-square w-full max-w-9 items-center justify-center rounded-full text-xs font-bold`}
                /*
                  The ring is what makes a reviewed day visible.

                  Mint on the card is 2.52:1 and the white tick inside
                  it is the same, which is under the 3:1 a graphic needs
                  to carry meaning. This is not a reason to repaint
                  mint: mint means "recalled" and that is the whole of
                  what this circle says. It is the case
                  `.choice-card[data-on]` in globals.css already solved,
                  in the words written there: where a fill would swallow
                  the contrast, double the rule instead. Three channels,
                  one of them hue.

                  `--sky-ink` gives the circle a 5.79:1 boundary in
                  light. In dark it is the mint itself, where the fill
                  already clears 11:1 and needs no help.
                */
                style={{
                  background: d.done ? "var(--sky)" : "var(--raised)",
                  // `--on-sky`, not `--surface`: white on this fill is
                  // 2.52:1 and the tick is the channel carrying
                  // "reviewed" without relying on the color.
                  color: d.done ? "var(--on-sky)" : "var(--ink-3)",
                  /*
                    Today was marked with a 2px outline at a 2px offset, which
                    is this app's focus ring exactly, sitting permanently on a
                    span nobody can focus. A reader who tabs sees the real one
                    move and this one stay, which reads as the page being
                    stuck. It is an inset ring instead: inside the circle,
                    where no focus ring in this app ever sits, and the letter
                    under it carries the same color so the mark is not the
                    ring alone.
                  */
                  boxShadow: d.isToday
                    ? "inset 0 0 0 2px var(--accent-deep)"
                    : d.done
                      ? "inset 0 0 0 1.5px var(--sky-ink)"
                      : "none",
                  animationDelay: d.done ? `${i * 60}ms` : undefined,
                }}
                aria-hidden
              >
                {d.done ? "✓" : ""}
              </span>
              <span className="sr-only">
                {d.isToday
                  ? fill(t(d.done ? "{day} (today): reviewed" : "{day} (today): no reviews"), { day: d.day })
                  : fill(t(d.done ? "{day}: reviewed" : "{day}: no reviews"), { day: d.day })}
              </span>
              <span
                className="text-2xs font-semibold"
                style={{ color: d.isToday ? "var(--accent-deep)" : "var(--ink-3)" }}
              >
                {weekdayLetter(d.day)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {summary.shieldsAvailable > 0 && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-3)" }}>
          <Shield size={13} aria-hidden style={{ color: "var(--accent-deep)" }} />
          {say(
            `${summary.shieldsAvailable} streak shield${summary.shieldsAvailable === 1 ? "" : "s"} saved up, so missing a day won’t break your run.`,
            "Streak shields saved up: {shields}. Missing a day won't break your run.",
            { shields: summary.shieldsAvailable },
          )}
        </p>
      )}
      </>)}

      {eventsList}

      <CardLink href="/calendar" className="mt-auto self-start">
        {eventsList ? t("See your whole week") : t("Plan your week")}
      </CardLink>

      {/*
        THE XP AND THE LEVEL BAR ARE NOT HERE, AND THAT IS THE POINT OF THE
        CARD. A run of days is something to keep; a bar towards level 7 is a
        report on how much has been done, which is the question `/progress`
        exists for and already answers with the same figures, ring and all.
        Two readings of one number on two screens is how they start to
        disagree, and the one that goes is the one on the screen with two
        minutes to spend.
      */}
    </Card>
    </div>
  ) : null;

  /* What a teacher has assigned, under headings rather than loose dates. Only
     drawn when there is something in it: the manual homework list is gone, so
     a learner studying alone has nothing to put here and no reason to see it. */
  const planCard = shows(stage, "tasks") && tasks.length > 0 ? (
    <TodayPlan tasks={tasks.map((task) => taskView(task, locale))} open={openTasks} late={lateTasks} clock={clock} now={now} locale={locale} />
  ) : null;

  /*
    The one panel that is about leaving the app. It asks whether any Estonian
    was spoken to anybody yesterday, and offers an errand drawn from the units
    this deck has started where the answer is no. See lib/collections/errands.ts.
  */
  const errandCard = errand && outside ? (
    <SayItToday
      errand={errand}
      scene={sceneForErrand(errand)?.id ?? null}
      answered={outside.answered}
      conversations={outside.conversations}
      days={outside.days}
      unitTitle={(() => {
        const errandUnit = unitById(errand.unit);
        if (!errandUnit) return errand.unit;
        return ui(errandUnit.title, errandUnit.subtitle);
      })()}
      sayOnce={(() => {
        /* The scene's first line and the learner's own answer, from the bank and the picks (VB-4). */
        const scene = sceneForErrand(errand);
        return scene ? errandRehearsal(scene, placement) : null;
      })()}
    />
  ) : null;

  /* The one panel here that is not about this learner's own deck. */
  const wordCard = shows(stage, "word")
    ? <WordOfDayCard word={word} canTranslate={offered("translate")} locale={locale} />
    : null;

  /*
    NOT WHERE THE COURSE IS ON. The module at the top of this page is the next
    unit, already planned to the evening, and a second card offering the same
    words as a lesson was two answers to "what do I learn next" on one screen:
    on a beginner's first night it showed the module's own unit half full
    (the deck holds its cards from first run) under "Pick up where you left
    off", about words they had not yet met. Off the course, it is the answer.
  */
  const nextCard = shows(stage, "next") && nextUnit && !programme ? (

    <Card>
      <SectionTitle hint={nextUnit.unit.cefr}>{t("Your next unit")}</SectionTitle>
      <div className="flex items-center gap-3">
        <NextUnitIcon name={nextUnit.unit.icon} />
        <div className="min-w-0">
          <p
            lang={uiWantsEnglish(placement) ? undefined : "et"}
            className="text-lg font-bold leading-tight"
            style={{ color: "var(--ink)" }}
          >
            {ui(nextUnit.unit.title, nextUnit.unit.subtitle)}
          </p>
          {!uiWantsEnglish(placement) && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{t(nextUnit.unit.subtitle)}</p>
          )}
        </div>
      </div>
      {/* The can-do statement, not the blurb: what you will be able to
          do is a better reason to press the button than what the unit
          is about. */}
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(nextUnit.unit.canDo)}</p>
      <div className="mt-3.5">
        <Meter
          pct={nextUnit.pct}
          label={fill(t("{unit}: {pct}% complete"), { unit: ui(nextUnit.unit.title, nextUnit.unit.subtitle), pct: nextUnit.pct })}
        />
      </div>
      <ButtonLink href={`/learn/${nextUnit.unit.id}/lesson`} className="mt-4 w-full">
        {nextUnit.state === "learning" ? t("Pick up where you left off") : t("Start this unit")}
        <ArrowRight size={15} aria-hidden />
      </ButtonLink>
    </Card>
  ) : null;

  /*
    THE GAME OF THE DAY, WHICH IS SÕNAD.

    The week table (`lib/ux/weekGames.ts`) used to rotate a different round
    through this card every day, and the feedback on it was that Today should
    lead with the one game that is eye-catching on sight. Sõnad is that, so it
    is the game of the day every day for now, drawn with a small example board
    so a stranger can see what pressing it will give them, and the table is
    kept for the day this is made dynamic again. Every other round is still on
    /practice, in the palette and at its own URL. Where the module has not yet
    taught enough words to build today's puzzle the card falls back to the round
    the first evenings deal, as it always did, and says so plainly.

    That fall-back is Tähed, and it is what a beginner sees every morning of
    their first week, so it carries an example round of its own
    (`components/TahedPreview.tsx`) for the same reason Sõnad does.
  */
  const gameCard = featured.href === "/sonad" ? (
    <SonadPreview href={featured.href} why={t(featured.why)} locale={locale} />
  ) : featured.href === PUZZLE_STAND_IN.href ? (
    <TahedPreview href={featured.href} why={t(featured.why)} locale={locale} />
  ) : (
    <Card className="flex h-full flex-col">
      <SectionTitle>{t("Today’s game")}</SectionTitle>
      <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(featured.why)}</p>
      <div className="mt-3 flex justify-center">
        <ButtonLink href={featured.href} variant="primary">
          {t(featuredTitle(featured.href) ?? "Play")} <ArrowRight size={15} aria-hidden />
        </ButtonLink>
      </div>
    </Card>
  );

  /*
    THE JOKE AND THE GOOD NEWS, THE FOURTH ROW.

    Two cards that are there to make the morning a little better and teach a
    little on the way: a Juku joke out of `lib/collections/jokes.ts`, and one
    happy headline from ERR (and two behind it) picked by `lib/news/goodNews.ts`. Both put the
    dictionary under every word where the learner turned the underlines on
    (lib/ux/wordGloss.ts), both are true on the first morning, and the
    news card is simply absent on an hour it found nothing good to say.
  */
  const jokeCard = jokes && jokes.length > 0 ? <JokeOfDayCard jokes={jokes} linked={linked} /> : null;
  const newsCard = shows(stage, "news") && !hiddenCards.has("news")
    ? <Suspense fallback={null}><GoodNewsSlot linked={linked} /></Suspense>
    : null;

  /*
    TODAY'S CONVERSATION, CHOSEN BY THE DATE.

    The thing `docs/22-real-life.md` says this app is for is a conversation
    somebody has outside it, and the rehearsal is the nearest thing inside it,
    so it gets a card of its own rather than one day in seven. Which scene is
    `sceneOfDay`, held to the ones the course has reached for a learner it
    holds, so the card never offers a conversation whose words the evenings
    have not handed over; where there is none yet it is absent.
  */
  const conversationCard = sceneToday ? (
    <Card className="flex h-full flex-col">
      <SectionTitle hint={say(`about ${minutesFor(sceneToday)} minutes`, "about {minutes}", { minutes: countOf(locale, minutesFor(sceneToday), "minute", "gen") })}>{t("Today’s conversation")}</SectionTitle>
      <p className="text-base font-semibold leading-snug" style={{ color: "var(--ink)" }}>{t(sceneToday.title)}</p>
      <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{t(sceneToday.place)}</p>
      <div className="mt-auto flex justify-center pt-4">
        <ButtonLink href={`/situations/${sceneToday.id}`} variant="primary">
          {t("Start the conversation")} <ArrowRight size={15} aria-hidden />
        </ButtonLink>
      </div>
    </Card>
  ) : null;

  /*
    THE CLIMB TO THE BAND THEY SAID THEY WERE AIMING AT.

    A learner picks a target in their first ninety seconds and then never hears
    about it again except as a date on a plan. This is the answer to "how close
    am I", in the unit they think in, on the screen they open every morning.

    Held to `starting` rather than drawn from the first minute: see the read
    itself, which is asked beside the module's up at the hero.
  */
  const ladderCard = ladder ? (
    <LadderBar
      progress={ladder}
      partLabel={programme && courseDay ? fill(t("{part}, day {day}"), { part: programme.id.toUpperCase(), day: courseDay.day.index }) : undefined}
      learnerLevel={placement}
      locale={locale}
    />
  ) : null;

  /*
    THE WAY BACK TO THE CARDS, WHEN THE HERO IS TODAY'S MODULE.

    The line under the greeting used to say how many cards were due and that
    they would come up at the end of the module, and the feedback on it was
    that it was busy and added little: this page is for the module that is due
    today. What it was for is the learner who does not feel like anything new
    tonight, so they get a smaller card under the hero that points at the
    words already outstanding, and the greeting stands alone. It is a plain
    link in a white card rather than a second button, since the hero already
    has the one loud action. Once nothing is due it says the review is done
    instead (below).
  */
  /*
    WHEN THERE IS NOTHING DUE, THE STRIP SAYS THE REVIEW IS DONE.

    A learner who went through their cards and came back to Today was shown
    the same card as before, with a number on it, which reads as nothing having
    counted. So a day on which they reviewed something and nothing is left due
    says so, with the figure off the log (`reviewsToday`, derived like every
    other number here, nothing stored). It carries one quiet way to go on, for
    the learner who wants more: new words if the ladder has any, otherwise the
    unseen cards Review would trickle in. It is an offer and not a count, and
    it never calls those cards due. On a day nothing has been reviewed and
    nothing is due there is nothing to say, so the strip is absent.
  */
  const reviewedToday = summary.reviewsToday;
  const moreHref = toLearn > 0 ? "/learn/new" : review.fresh.length > 0 ? "/review" : null;
  const reviewStrip = !(moduleTonight || courseNow?.finishedToday) ? null : dueCount > 0 ? (
    <Card className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
      <p className="text-base" style={{ color: "var(--ink)" }}>
        <span className="font-semibold">{t("Review cards")}</span>
        <span style={{ color: "var(--ink-2)" }}>
          {" "}{say(`(${toReview} due, if you’d rather practice what you know)`, "({cards} due, if you'd rather practice what you know)", { cards: countOf(locale, toReview, "card") })}
        </span>
      </p>
      <CardLink href="/review">{t("Review now")}</CardLink>
    </Card>
  ) : reviewedToday > 0 ? (
    <Card className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4" data-review-done>
      <p className="text-base" style={{ color: "var(--ink)" }}>
        <Check size={17} aria-hidden className="mr-1.5 inline-block align-[-3px]" style={{ color: "var(--accent-deep)" }} />
        <span className="font-semibold">{t("Review done for today")}</span>
        <span style={{ color: "var(--ink-2)" }}>
          {" "}{say(`(${reviewedToday} reviewed, nothing else due)`, "({cards} reviewed, nothing else due)", { cards: countOf(locale, reviewedToday, "card") })}
        </span>
      </p>
      {moreHref && (
        <Link
          href={moreHref}
          className="inline-flex items-center gap-1.5 text-base font-semibold underline underline-offset-2"
          style={{ color: "var(--accent-deep)" }}
        >
          {t("A few more, if you like")} <ArrowRight size={15} aria-hidden />
        </Link>
      )}
    </Card>
  ) : null;

  return (
    <Page route="/"
      /*
        THE ONE DATE IN THIS APP THAT IS NOT WRITTEN THE READER'S WAY.

        Everywhere else a date is something the app is reporting back and its
        shape belongs to whoever is reading it, which is what `LocalDate` is
        for. This one is the first Estonian a learner meets each morning:
        the weekday name and the month name are two of the nineteen words every
        course teaches in its first fortnight, and a date is the one piece of
        Estonian that needs no gloss to be useful, because the reader already
        knows what today is. See lib/time/estonianDate.ts, which reads it
        out of CLDR and writes none of it.

        AND IT IS THE ESTONIAN ALONE. The line carried the English weekday
        beside it as a cross-reference, which is the shape the grammar screens
        take with the Latin case names, and a date is the one place that shape
        buys nothing: the reader already knows what day it is, so the Estonian
        needs no gloss to be read, and printing "Saturday" beside `laupäev`
        answers a question nobody had while taking the guess that teaches the
        word. A build whose locale data has no Estonian gets the line it
        always had.
      */
      eyebrow={
        today ? (
          <span lang="et">{today}</span>
        ) : (
          <LocalDate
            iso={now.toISOString()}
            zone={clock.zone}
            options={{ weekday: "long", day: "numeric", month: "long" }}
            /*
              What the server writes, and what a reader sees if script never
              runs. Its zone is the learner's; only the shape of the reading is
              the deployment's until the browser has said otherwise.
            */
            fallback={new Intl.DateTimeFormat(undefined, {
              timeZone: clock.zone, weekday: "long", day: "numeric", month: "long",
            }).format(now)}
          />
        )
      }
      /* Ukrainian addresses a person in the vocative, which cannot be built
         from a name somebody typed, and the nominative in its place reads as
         a mistake. So the Ukrainian greeting goes without the name. */
      title={name && locale !== "uk" ? `${greeting(clock, now, placement, locale)}, ${name}` : greeting(clock, now, placement, locale)}
      lead={courseNow && (moduleTonight || courseNow.finishedToday)
        ? undefined
        : lead(stage, toReview, toLearn, ownCardsPerMinute(pace), locale)}
    >
      {/*
        ONE CARD ACROSS THE TOP, AND EIGHT UNDER IT AT THE MOST.

        The page used to be two columns from the top, the wide one for today
        and the narrow one for what is ahead. That is a sound reading order and
        it made a poor picture, because how much each column holds depends on
        how far in the learner is. So the one card that is not one of several,
        the thing to do now, goes across the whole width, and everything under
        it is handed to `Columns`, which balances the two by height in the
        browser and never splits a card.

        WHAT IS NEW IS THE CAP, AND IT IS THE WHOLE OF THIS PASS. Everything a
        stage allowed was drawn, which on a settled morning was fourteen cards:
        the quest and the game of the day saying "press something short" twice
        over, the sticking points and the weakest cases that Progress already
        draws under their own headings, three quest meters, an XP bar, six
        practice tiles, an exam forecast the hub prints in full, and a standing
        pitch for a tutor whose button is in the corner of every screen. None
        of that is wrong. All of it together is a page somebody scrolls rather
        than reads, on the one screen that has to survive being glanced at from
        a bus stop.

        So the cards are named by slot and the first `TODAY_CARDS` of them are
        drawn, in the learner's own order. The shipped order is the argument:
        what to say to a real person today, what is actually on today, the one
        short round, the run of days, a word, and then the course. It is a
        default rather than a rule, because a home page's reading order is a
        fact about the reader, and Settings is where it is changed; see
        lib/ux/todayOrder.ts. Everything below the cut is on its own page, in
        the rail and in the palette; nothing here is the only way to reach
        anything.
      */}
      {/* Asks the server again when this page is shown from a copy, so the
          review count above is the session Review is about to hold. */}
      <KeepCurrent renderedAt={now.getTime()} />
      <Stack className="min-w-0">
        {/* Today's card is the one big thing on this page, and the only one
            the letters lie on here, calm rather than hopping, since it is opened every
            evening. See `Lettered` in components/HeroLetters.tsx. */}
        <Lettered show={!!courseCard}>{doNowCard}</Lettered>
        {reviewStrip}
        {/*
          THE WHITE CARDS, TWO COLUMNS THAT EACH END WHERE THEY END. The order is
          still read in rows (game and word, calendar and conversation, progress
          and out there, the joke and the good news), so the cards are dealt left, right, left, right. But a
          card is as tall as what is in it and no taller: they used to be
          stretched to share a height with the one beside them, which left the
          word of the day a screen of empty white under its button and made the
          page read as a spreadsheet. Two independent columns instead, starting
          at the same height so the first two cards read as a pair, and neither
          padded out to match the other, so everything under them settles where
          it settles.

          Under `lg` it is one column in the dealt order: the column wrappers
          are `display: contents` and each card carries its position as `order`,
          so there is one list of cards and not a second copy for the phone.
        */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
          {(() => {
            const dealt = orderTodayCards({
              game: gameCard,
              word: wordCard,
              calendar: calendarCard,
              conversation: conversationCard,
              ladder: ladderCard,
              errand: errandCard,
              plan: planCard,
              joke: jokeCard,
              news: newsCard,
              next: nextCard,
            }, todayOrderFrom(settings[SETTING_KEYS.todayOrder]), hiddenCards);
            const cards = dealt.slice(0, TODAY_CARDS);
            return [0, 1].map((side) => (
              <div
                key={side}
                className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6"
              >
                {cards.map((card, i) =>
                  i % 2 === side ? (
                    <div key={i} className="min-w-0 empty:hidden" style={{ order: i }} data-column-item>{card}</div>
                  ) : null,
                )}
              </div>
            ));
          })()}
        </div>
      </Stack>
    </Page>
  );
}

function NextUnitIcon({ name }: { name: string }) {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
    >
      <NamedIcon name={name} size={20} aria-hidden />
    </span>
  );
}

/**
 * The line under the greeting.
 *
 * A beginner is told what to do; everybody else is told what is waiting. The
 * count and the minutes are the useful sentence once there is a routine, and
 * they are an instruction to nobody on the first morning.
 */
function lead(
  stage: "arriving" | "starting" | "settled",
  toReview: number,
  toLearn: number,
  /** This learner's own cards a minute, off the log. Null before it has one. */
  cardsPerMinute: number | null,
  locale: Locale,
): string {
  // Nothing due is only "a good moment for something new" while there is
  // something new. A deck whose words are all learned needs a unit, and saying
  // otherwise sends somebody to a screen with nothing on it.
  if (toReview === 0 && toLearn > 0) return tr(locale, "You're all caught up. A good moment to meet some new words.");
  if (toReview === 0) return tr(locale, "You're all caught up, and every word you've added is learned. Time for a new unit.");
  /*
    At the learner's own rate where the log has one, and at the one default
    the plan uses otherwise. This divided by six while the plan divided by
    three, so the morning promised half the time the plan was budgeting for
    the same cards. lib/stats/pace.ts holds the figure.
  */
  const minutes = minutesForCards(toReview, cardsPerMinute);
  const span = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (locale !== "en") {
    const values = { cards: countOf(locale, toReview, "card"), minutes: countOf(locale, minutes, "minute") };
    return fill(tr(locale, stage === "arriving"
      ? "Your first cards are ready: {cards}. That's about {minutes}."
      : "Cards waiting for you: {cards}. That's about {minutes}."), values);
  }
  if (stage === "arriving") {
    return `Your first ${toReview} card${toReview === 1 ? " is" : "s are"} ready. That's about ${span}.`;
  }
  return `${toReview} card${toReview === 1 ? " is" : "s are"} waiting for you. That's about ${span}.`;
}

function weekdayLetter(day: string): string {
  // Estonian weekday initials — E T K N R L P, the ones on every timetable here.
  const letters = ["P", "E", "T", "K", "N", "R", "L"];
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
  return letters[date.getDay()] ?? "?";
}

/*
  Which greeting, on the learner's clock rather than the server's. Rendered on
  the server, so "Tere hommikust" was the deployment's morning: at two in the
  morning in Tallinn this said good evening.

  ALL FOUR ARE GREETINGS A COURSE TEACHES, INCLUDING THE ONE FOR THE SMALL
  HOURS. This used to say "Still up" before five, which is an English remark
  about the reader rather than a greeting: it reads as the app noticing the
  hour and having an opinion about it, on the one line that is supposed to be
  the first Estonian somebody meets. `Tere` is what anybody says at an hour
  with no greeting of its own, it is the first phrase in the A1 unit, and it
  is right at every hour, which is what makes it the honest default here.

  A LEARNER AT A1 HAS NOT MET ANY OF THAT YET, so `uiWantsEnglish` reads the
  Estonian in English there instead, and hands it back the moment the course
  says they have reached A2 (`lib/copy/uiLanguage.ts`).
*/
function greeting(clock: DayClock, now: Date, level: Level, locale: Locale): string {
  const h = clock.hourOf(now);
  const et = h < 5 ? "Tere" : h < 11 ? "Tere hommikust" : h < 18 ? "Tere päevast" : "Tere õhtust";
  const en = h < 5 ? "Hello" : h < 11 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return uiText(level, et, tr(locale, en));
}

/** "6 days in a row", in the reader's own plural. English keeps its own two lines above. */
function daysInARow(locale: Locale, n: number): string {
  return fill(tr(locale, "{days} in a row"), { days: countOf(locale, n, "day") }).replace(/^\d+\s/, "");
}

/**
 * A `Task` row in the shape `TaskRow` can hold, which is a client component.
 *
 * A conversation a class set carries the scene's own title, in the reader's
 * language, and the address that opens it: it is done by having it, so the
 * row is a way in rather than a box to tick.
 */
function taskView(task: {
  id: string; title: string; tag: string; completed: boolean; dueAt: Date | null; sceneId: string | null;
}, locale: Locale): TaskView {
  const scene = task.sceneId ? sceneById(task.sceneId) : undefined;
  return {
    id: task.id,
    title: scene ? tr(locale, scene.title) : task.title,
    tag: task.tag, completed: task.completed,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    href: scene ? `/situations/${scene.id}` : null,
  };
}

/**
 * TODAY'S PUZZLE, OR A ROUND IN ITS PLACE WHERE THERE IS NO PUZZLE TO GIVE.
 *
 * Sõnad and the crossword are built, for a learner the module holds, out of
 * the words the evenings had taught when the day began (`taughtAtDayStart`),
 * and on the first evenings of A1 none of those has six letters and too few
 * of them cross. A card inviting somebody to a board that then says there is
 * no board is the app promising something it has just decided not to give,
 * so on those mornings the card leads with the round the module's own first
 * evenings deal instead. Asked only on the two days a puzzle is featured, and
 * only for a learner the module holds: anybody else's puzzle is the
 * dictionary's at their band, which is always there.
 */
async function withPuzzleReady(ownerId: string, day: string, row: FeaturedGame): Promise<FeaturedGame> {
  if (row.href !== "/sonad" && row.href !== "/crossword") return row;
  const taught = await taughtAtDayStart(ownerId, day);
  if (taught === null) return row;
  const level = await courseLevelFor(ownerId);
  const ready = row.href === "/sonad"
    ? await puzzleFor(ownerId, day, level)
    : await crosswordFor(ownerId, day, level);
  return ready ? row : PUZZLE_STAND_IN;
}
