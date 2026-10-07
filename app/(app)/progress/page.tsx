import { InsideHere } from "@/components/InsideHere";
import { readableFront } from "@/lib/copy/caseHint";
import { Suspense } from "react";
import { ClipboardCheck, Compass, FileText, Flame, Footprints, Shield } from "lucide-react";
import { outThere } from "@/lib/progress/outThere";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { CEFR_LEVELS } from "@/lib/estonian/types";
import { dailySummary, deckSnapshot, pathWithProgress } from "@/lib/progress/summary";
import { learnerDayClock } from "@/lib/progress/dayClock";
import {
  bestStudyHour, buildHeatmap, caseAccuracy, ratingBreakdown,
  retentionReading,
} from "@/lib/stats/history";
import { stickingPoints } from "@/lib/stats/sticking";
import { ButtonLink } from "@/components/Button";
import { DrillLink } from "@/components/DrillLink";
import { Heatmap } from "@/components/Heatmap";
import { ShareProgress } from "@/components/ShareProgress";
import { StickingPoints } from "@/components/StickingPoints";
import { WeakestCases } from "@/components/WeakestCases";
import { NotAutomatic } from "@/components/NotAutomatic";
import { confusions } from "@/lib/stats/confusions";
import { answerTimeReading } from "@/lib/stats/answerTime";
import { ReadinessPanel } from "@/components/readiness/Summary";
import { readinessPicture } from "@/lib/progress/readiness";
import { caseReviewsFor } from "@/lib/progress/cases";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Board, BoardSkeleton } from "./Board";
import { numberSetting, readSettings, SETTING_KEYS } from "@/lib/settings/store";
import { lemmasByCardLexeme } from "@/lib/dict/facts";
import { courseLevelFor } from "@/lib/progress/level";
import { RollNumber } from "@/components/motion/RollNumber";
import { Card, Empty, Meter, Page, Ring, SectionTitle, Stack, Stat } from "@/components/ui";
import { NO_VALUE } from "@/lib/copy/values";
import { formatHour } from "@/lib/time/clock";
import { Explain } from "@/components/Explain";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { RETENTION_MINIMUM } from "@/lib/stats/history";

export async function generateMetadata() {
  return titleFor("Progress");
}

export const dynamic = "force-dynamic";

const HEATMAP_DAYS = 182;

export default async function ProgressPage() {
  const ownerId = await requireUserId();
  const now = new Date();
  // Every figure below is a fact about a *day*, and this page renders on the
  // server, whose midnight is the deployment's. See lib/time/day.ts.
  const [clock, snapshot, level, locale] = await Promise.all([
    learnerDayClock(ownerId), deckSnapshot(ownerId, now),
    // Which level the course is teaching, for what the case panel says while
    // it is empty: at A1 there are no case cards to answer, by design.
    courseLevelFor(ownerId),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);

  const [summary, units, reviews, deck, caseReviews, shieldRow, readiness, outside] = await Promise.all([
    dailySummary(ownerId, now, clock),
    pathWithProgress(ownerId, snapshot),
    prisma.review.findMany({
      where: { ownerId, reviewedAt: { gte: new Date(now.getTime() - HEATMAP_DAYS * 86_400_000) } },
      /*
        `durationMs`, `slot` and `reachedSlot`. The first has been collected
        since the scheduler was built and, until the plan began reading it as
        the length of a sitting, was read by nothing; nothing had ever read it
        as the time on one answer. The other two are what the flash and scene
        rounds work out about a wrong answer and used to print and drop.
        `lib/stats/answerTime.ts` and `lib/stats/confusions.ts` are the
        readers, and they cost this query three columns over rows it already
        reads.
      */
      select: {
        reviewedAt: true, rating: true, targetCase: true, stateBefore: true, cardId: true,
        durationMs: true, slot: true, reachedSlot: true,
      },
      orderBy: { reviewedAt: "asc" },
    }),
    /*
      ONE READ OF THE DECK, NOT TWO, AND ONE ROUND TRIP RATHER THAN FOUR.

      This page used to read every card twice: once here for the CEFR
      breakdown and again below, sequentially, for the cards that keep coming
      back. Both asked for the lemma through the relation, which Prisma serves
      as a second statement carrying every lexeme id it just read, so the two
      reads were four round trips over the same rows. They are one read with
      both sets of columns, and the lemma comes out of the shared dictionary
      (lib/dict/facts.ts).
    */
    prisma.card.findMany({
      where: { ownerId },
      select: {
        id: true, front: true, back: true, cardType: true, targetCase: true,
        lapses: true, reps: true, suspended: true, state: true, lexemeId: true,
      },
    }),
    /*
      Read separately from the charts above, and on purpose.

      This page's reading of the panel was the considered one, over the last
      half-year, and Practice and the grammar index each answered it over an
      arbitrary five thousand rows of all time. So the same learner could be
      told 100% here and 50% there about the same case on the same day. The
      panel is one component and one calculation already; this makes it one
      input too, and the window is the one this page already used.
    */
    caseReviewsFor(ownerId, now),
    // The shields lived on Settings, which is where you change things, not
    // where you find out how you are doing. This is a reading.
    readSettings(ownerId, [SETTING_KEYS.streakShields]),
    /*
      Which of the course's situations this learner could follow, take part
      in or lead, counted. Beside the case and vocabulary panels rather than
      under them, because it is the reading of "how am I doing" that answers
      in the terms somebody outside the app asks it in.
    */
    readinessPicture(ownerId, now),
    // Conversations reported from outside the app, which is the number the
    // readiness reading is a forecast of.
    outThere(ownerId, clock, now),
  ]);
  const shields = numberSetting(shieldRow[SETTING_KEYS.streakShields], 0);

  // The lemma behind each card, out of the dictionary the whole deployment
  // shares rather than a second statement per deck read. lib/dict/facts.ts.
  const entries = await lemmasByCardLexeme(deck.map((card) => card.lexemeId));
  const lemmaOf = (id: string | null) =>
    (id === null ? undefined : entries.get(id)?.lemma) ?? null;

  // The cards that keep coming back. Lapses live on the card's own FSRS state;
  // the accuracy beside them is counted from the log above.
  const sticking = stickingPoints(
    deck.map((c) => ({
      id: c.id, lemma: lemmaOf(c.lexemeId), front: readableFront(c.front), back: c.back,
      cardType: c.cardType, targetCase: c.targetCase,
      lapses: c.lapses, reps: c.reps, suspended: c.suspended,
    })),
    reviews,
  );

  const heatmap = buildHeatmap(reviews.map((r) => r.reviewedAt), HEATMAP_DAYS, now, clock);
  const breakdown = ratingBreakdown(reviews);
  // The narrower, more useful number: how often a card the scheduler believed
  // you knew actually came back. The recall rate above counts first sights too.
  const retention = retentionReading(reviews);
  const cases = caseAccuracy(caseReviews);
  /*
    Read off the rows the heatmap already fetched rather than a query of their
    own: same owner, same half-year, and this page's own argument about
    `caseReviewsFor` is that two windows over one question is how the two
    answers drift.
  */
  const pace = answerTimeReading(reviews);
  const mixedUp = confusions(reviews);
  const hour = bestStudyHour(reviews, 20, clock);

  // Vocabulary reach by CEFR: known words per level, against what the deck holds.
  const byLevel = new Map<string, { total: Set<string>; known: Set<string> }>();
  for (const card of deck) {
    const word = card.lexemeId === null ? undefined : entries.get(card.lexemeId);
    if (!word) continue;
    const { lemma } = word;
    const level = word.cefr ?? NO_VALUE;
    const entry = byLevel.get(level) ?? { total: new Set<string>(), known: new Set<string>() };
    entry.total.add(lemma);
    if (snapshot.knownLemmas.has(lemma)) entry.known.add(lemma);
    byLevel.set(level, entry);
  }

  const pathKnown = units.reduce((s, u) => s + u.known, 0);
  const pathTotal = units.reduce((s, u) => s + u.available, 0);

  if (reviews.length === 0 && snapshot.totalCards === 0) {
    return (
      <Page route="/progress" title={t("Progress")} lead={t("How your Estonian is really going, worked out fresh from your answers every time you look.")}>
        <Empty
          title={t("No history yet")}
          body={t("Answer your first cards and the charts will start filling in.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Learn your first words")}</ButtonLink>}
        />
      </Page>
    );
  }

  return (
    <Page route="/progress"
      title={t("Progress")}
      lead={t("How your Estonian is really going, worked out fresh from your answers every time you look.")}
      /*
        The three other readings of "how am I doing", reached from the page
        that asks it. Each is a `within` in `lib/ux/nav.ts` rather than a row
        in the rail, and a `within` nobody wired up is a screen reachable only
        through the command palette: the level check was linked here and the
        mock paper and the deck were not.
      */
      actions={
        <span className="flex flex-wrap gap-2">
          <ButtonLink href="/assess">
            <Compass size={15} aria-hidden /> {t("Level check")}
          </ButtonLink>
          <ButtonLink href="/exam">
            <ClipboardCheck size={15} aria-hidden /> {t("Mock exam")}
          </ButtonLink>
          <ButtonLink href="/progress/record">
            <FileText size={15} aria-hidden /> {t("Record of study")}
          </ButtonLink>
        </span>
      }
    >
      <Stack>
        {/*
          WHAT THIS LEARNER HAS DONE, WHICH IS FOUR FIGURES AND NOT A SCORE.

          This card opened with a level ring, an Estonian level title and an XP
          total, and three quest meters counting towards the same currency sat
          under it. All of that was withdrawn: it was a second scoring system
          beside the ones that mean something on this page, and a learner
          reading down got several ways of being scored before reaching the one
          that says what to drill. Nothing was lost with it, because XP was
          derived from the review log on every request and never stored
          (ADR-014), so there is no column holding anybody's old total.

          The streak stays, and so do the shields, because they answer a
          different question: not how well, but whether you turned up. The
          shields moved here from the badge shelf they were paid out beside.
        */}
        {/* Two by two on a phone, where four figures in a row wrapped three and
            one; one row where there is room. The share button closes the row
            on a wide screen and takes its own line under the figures on a
            phone, where it is easiest to reach. Level with the top rather than
            centred: a centred row drops a figure whose label wraps to two
            lines, so "Shields banked" sat off the three beside it. */}
        <Card tone="night" className="grid grid-cols-2 items-start gap-x-6 gap-y-6 sm:flex sm:flex-wrap sm:gap-10">
          <Stat
            value={<span className="inline-flex items-center gap-1.5"><RollNumber value={summary.streak} /><Flame size={18} aria-hidden style={{ color: "var(--hard-ink)" }} /></span>}
            label={t("Day streak")}
          />
          <Stat value={snapshot.knownCards} label={t("Cards known")} />
          <Stat value={breakdown.accuracy === null ? NO_VALUE : `${breakdown.accuracy}%`} label={t("Answered right")} />
          <Stat
            value={<span className="inline-flex items-center gap-1.5"><RollNumber value={shields} /><Shield size={16} aria-hidden style={{ color: "var(--accent-deep)" }} /></span>}
            label={t(shields === 1 ? "Shield banked" : "Shields banked")}
          />
          <span className="col-span-2 sm:ml-auto sm:self-center"><ShareProgress /></span>
          {/* What the shield figure beside it means, behind a press rather than
              standing under four figures in 13px grey. It is an explanation
              rather than a status, which is `Explain`'s own rule: somebody who
              wants to know what a shield is can ask, and everybody else gets
              the four numbers they came for. */}
          <div className="col-span-2 w-full">
            <Explain label={t("What a shield does")}>
              {t("A shield keeps your streak alive through one missed day. You earn one at 7, 30 and 100 days.")}
            </Explain>
          </div>
        </Card>

        {/*
          Two by two, by the page's width rather than the window's, so no panel
          is left alone at half the width with nothing beside it. What sticks
          and which endings are weakest are one question asked twice; what was
          reported from outside and how many words are held are the other.
          The daily bar chart that used to sit under the history repeated the
          heatmap's days and the recall rate the figures above already carry,
          so it went.
        */}
        <div className="@container">
          <div className="grid gap-5 @xl:grid-cols-2">
            <section className="flex flex-col">
              <SectionTitle>{t("How much is actually sticking")}</SectionTitle>
              {/*
                On the card's own surface, with the verdict carried by the ring's
                colour and the headline. A whole panel painted peach was the
                loudest thing on the page, and loud in the direction of alarm, over
                a number that asks for a week of fewer new words.
              */}
              <Card className="flex-1">
                {/* The ring and the headline share a row; the advice under them
                    takes the card's whole width on a phone, where beside a 78px
                    ring it ran to nine lines of four words. */}
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-3">
                  <span className="sm:row-span-2">
                  <Ring
                    pct={retention.retention ?? 0}
                    size={78}
                    tone="var(--accent)"
                    label={
                      retention.retention === null
                        ? t("Not enough reviews of older cards yet to tell how much is sticking")
                        : fill(t("You remembered {pct}% of your older cards, against a {target}% target"), { pct: retention.retention, target: retention.target })
                    }
                  >
                    <span className="tnum text-lg font-bold" style={{ color: "var(--ink)" }}>
                      {retention.retention === null ? NO_VALUE : `${retention.retention}%`}
                    </span>
                  </Ring>
                  </span>
                  <p className="text-md font-bold sm:self-end" style={{ color: "var(--ink)" }}>
                    {t(retention.headline)}
                  </p>
                  <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:self-start">
                    <p className="max-w-[62ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                      {retention.verdict === "unknown"
                        ? fill(t("We need about {minimum} reviews of words you already knew before this means anything. You have {count} so far."), { minimum: RETENTION_MINIMUM, count: retention.reviews })
                        : t(retention.advice)}
                    </p>
                    <p className="tnum mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                      {fill(t("{recalled} of {reviews} older cards remembered. Your target is {target}%."), { recalled: retention.recalled, reviews: retention.reviews, target: retention.target })}
                    </p>
                  </div>
                </div>
              </Card>
            </section>
            <section className="flex flex-col">
              <SectionTitle hint={t("weakest first")}>{t("Cases")}</SectionTitle>
              <Card className="flex-1">
                <WeakestCases
                  cases={cases}
                  locale={locale}
                  empty={
                    /*
                      Said off where the course is. A1 asks for no case at all
                      and leaves the endings to A2, so "add a unit with nouns"
                      sent a beginner off to do something that would not have
                      filled this panel.
                    */
                    level === "A1" ? (
                      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                        {t("The cases start at A2. Until then the course gives you words and phrases, and this fills in once you’re putting endings on them.")}
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                        {t("You haven’t answered any case cards yet. They come with the units that put endings on nouns, in")}{" "}
                        <Link href="/learn" className="underline" style={{ color: "var(--accent-deep)" }}>{t("Learn")}</Link>.
                      </p>
                    )
                  }
                />
                {/*
                  The forms that come back right and slowly, and the pairs that
                  get swapped, are a reading of the same endings the bars above
                  are about, so they sit under them rather than under a heading
                  of their own at the foot of the page.
                */}
                {(pace.slow.length > 0 || mixedUp.length > 0) && (
                  <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--rule-soft)" }}>
                    <NotAutomatic slow={pace.slow} mixedUp={mixedUp} medianMs={pace.medianMs} locale={locale} />
                  </div>
                )}
              </Card>
            </section>
          </div>
        </div>

        <section>
          <SectionTitle hint={hour === null ? fill(t("last {days}"), { days: countOf(locale, HEATMAP_DAYS, "day") }) : fill(t("{days} days, most at {hour}"), { days: HEATMAP_DAYS, hour: formatHour(hour) })}>
            {t("Study history")}
          </SectionTitle>
          <Card>
            <Heatmap days={heatmap} locale={locale} />
          </Card>
        </section>

        {readiness.totalReviews > 0 && <ReadinessPanel summary={readiness.summary} locale={locale} />}

        <div className="@container">
          <div className="grid gap-5 @xl:grid-cols-2">
            <section className="flex flex-col">
              <SectionTitle hint={fill(t("last {days}"), { days: countOf(locale, outside.days, "day") })}>{t("Real conversations")}</SectionTitle>
              <Card className="flex-1">
                {outside.total === 0 ? (
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {t("Nothing here yet. Each morning, Today asks whether you spoke Estonian to anyone the day before, and your answers show up here.")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/*
                      The first figure counts the days something was said, not the
                      days the question was answered: "not yesterday" is an honest
                      answer and counting it here would report a fortnight of them
                      back as a fortnight of conversations. lib/collections/errands.ts
                      is where that is decided, for this panel and Today alike.
                    */}
                    {/*
                      Three columns rather than four, because there are five
                      figures now: `STUCK` is the answer a learner gives when
                      they spoke and ran out of words, and folding it into the
                      others would hide the commonest thing that happens out
                      there. Widening the grid to five was the other way and is
                      the one that puts "switched to English" through a column
                      a fifth narrower at the width `test-containment.mjs`
                      measures.
                    */}
                    {/* Columns by the room a label needs, not by the window: this
                        panel is half the page from `@xl`, so `lg:grid-cols-3` gave
                        "conversations" and its icon 53px of the 114 they need at
                        1024, and the word broke. 7.5rem is that label and icon. */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))] gap-3">
                      <Stat value={outside.total} label={t("conversations")} tone="var(--accent-deep)" icon={<Footprints size={14} aria-hidden />} />
                      <Stat value={outside.byOutcome.UNDERSTOOD} label={t("understood you")} />
                      <Stat value={outside.byOutcome.STUCK} label={t("you got stuck")} />
                      <Stat value={outside.byOutcome.SWITCHED} label={t("switched to English")} />
                      <Stat value={outside.byOutcome.BAILED} label={t("days with none")} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                      {outside.streak > 1 ? `${fill(t("{n} days in a row with a real conversation."), { n: outside.streak })} ` : ""}
                      {/*
                        The figure to watch, watched against the thirty days before,
                        because "it falls as your Estonian holds" over one count is a
                        promise with nothing to fall from. Only where there is a
                        month behind this one to set it against.
                      */}
                      {/*
                        The Stat above already prints how many switched. What it
                        cannot print is the month before it, which is the whole
                        reason the figure is worth watching, so that is all this
                        line carries now.
                      */}
                      {outside.previous.total > 0
                        ? fill(t("The month before, {switched} of {total} switched to English. These come from your own answers. Keep an eye on how often people switch to English: it falls as your Estonian gets stronger."), { switched: outside.previous.switched, total: outside.previous.total })
                        : t("These come from your own answers. Keep an eye on how often people switch to English: it falls as your Estonian gets stronger.")}
                    </p>
                  </div>
                )}
              </Card>
            </section>
            <section className="flex flex-col">
              <SectionTitle hint={fill(t("{known} of the course's {total}"), { known: pathKnown, total: pathTotal })}>{t("How many words you know")}</SectionTitle>
              <Card className="flex-1">
                <ul className="flex flex-col gap-2">
                  {CEFR_LEVELS.map((level) => {
                    const entry = byLevel.get(level);
                    if (!entry || entry.total.size === 0) return null;
                    const pct = Math.round((entry.known.size / entry.total.size) * 100);
                    return (
                      <li key={level} className="flex items-center gap-3 text-sm">
                        <span className="w-8" style={{ color: "var(--ink-2)" }}>{level}</span>
                        <span className="flex-1">
                          <Meter pct={pct} label={fill(t("{level}: {known} of {total} known"), { level, known: entry.known.size, total: entry.total.size })} height={5} />
                        </span>
                        <span className="tnum w-16 text-right text-xs" style={{ color: "var(--ink-3)" }}>
                          {entry.known.size}/{entry.total.size}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Explain label={t("What counts as known")}>
                  {t("A word only counts once you know every card for it, so the real number is probably a bit higher.")}{" "}
                  <Link href="/words" className="underline" style={{ color: "var(--accent-deep)" }}>
                    {t("See your deck card by card")}
                  </Link>.
                </Explain>
              </Card>
            </section>
          </div>
        </div>

        {sticking.length > 0 && (
          <section>
            <SectionTitle hint={t("learned and forgotten more than once")}>{t("Sticking points")}</SectionTitle>
            <StickingPoints points={sticking} />
            {/* The drill for exactly the cards listed above it. It used to be
                on the practice menu, five rows from anything saying which of
                your cards keep failing. */}
            <div className="mt-3">
              <DrillLink href="/review/clinic" />
            </div>
          </section>
        )}

        {/*
          THE BOARD IS THE LAST THING ON THIS PAGE AND IT WAS FOUR ROUND TRIPS
          IN FRONT OF THE FIRST.

          Finding the class, reading its name through the relation, then the
          roster: a chain nothing above it needed the answer to, at the bottom
          of a page of charts. Behind a boundary it is fetched while the rest
          of the page is already being read, which is what a `Suspense` is
          for, and it is three trips rather than four now that the name comes
          back beside the roster instead of in front of it. See ./Board.
        */}
        <Suspense fallback={<BoardSkeleton locale={locale} />}>
          <Board ownerId={ownerId} now={now} />
        </Suspense>

        <InsideHere place="/progress" title={tr(locale, "More about your progress")} locale={locale} />
      </Stack>
    </Page>
  );
}
