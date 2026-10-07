import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, CalendarCheck, Check } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { learnerDayClock } from "@/lib/progress/dayClock";
import {
  closingProgress, courseReading, hasChosenProgramme, ladderReading, missingWords, openingPartFor,
  programmeFor,
} from "@/lib/progress/course";
import { courseLevelFor } from "@/lib/progress/level";
import type { Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { PROGRAMMES, dayById, holdAdvice, holdReason, newWordsIn, programmeAfter, unitOf } from "@/lib/course";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Meter, Page, SectionTitle, Stack } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { StepList } from "@/components/course/StepList";
import { StartProgramme } from "@/components/course/StartProgramme";
import { NextPart } from "@/components/course/NextPart";
import { CourseMove } from "@/components/course/CourseMove";
import { adaptOfferFor } from "@/lib/progress/adapt";
import { leanSentence, moveLabel, offerParts, offerTitle, type AdaptOffer, type LeanEffects, type Tilt } from "@/lib/course";
import { Speak } from "@/components/Speak";
import { Lettered } from "@/components/HeroLetters";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { stepsIn } from "@/lib/course";

export async function generateMetadata() {
  return titleFor("Today's module");
}

export const dynamic = "force-dynamic";

/**
 * THE EVENING, PLANNED IN ADVANCE, ON ONE SCREEN.
 *
 * Everything this app can do is on a menu somewhere, and that is what it was
 * reported with: a beginner opening it has to decide which of twenty rounds
 * tonight is before they can start, and deciding is both the expensive part of
 * an evening and the part a beginner is least able to do. This screen is the
 * decision already made. One day, eight words, four or five steps, one open at
 * a time, and a sentence at the end saying the evening is over.
 *
 * NOTHING UNDERNEATH IT IS NEW. Every step opens a screen that already
 * existed, and Learn, Practice, Review and every game stay exactly where they
 * were and work exactly as they did. What is new is that somebody who does not
 * want to choose no longer has to, and the work they do the other way still
 * counts: the two steps a review log can prove are read off it, whichever
 * screen the answers came from.
 *
 * FOUR STATES, AND THE THIRD IS THE ONE THAT WAS ASKED FOR. Not following a
 * programme; part way through today's module; finished it today, which says so
 * and offers tomorrow's rather than rolling straight on; and the whole thing
 * finished. The third is the one that makes this feel like a course rather
 * than a queue: an evening that ends is an evening somebody comes back from.
 */
export default async function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const ownerId = await requireUserId();
  const [programme, chosen, level, { next: startNow }, locale] = await Promise.all([
    programmeFor(ownerId),
    hasChosenProgramme(ownerId),
    courseLevelFor(ownerId),
    searchParams,
    localeFor(ownerId),
  ]);
  /* The screen's own words in the learner's language, and a unit's or a
     part's name the way the rest of the course reads it at their level. */
  const t = (english: string) => tr(locale, english);
  const ui = (et: string, en: string) => (uiWantsEnglish(level) ? t(en) : et);

  const evenings = PROGRAMMES.reduce((n, p) => n + p.days.length, 0);

  if (!programme) {
    /*
      WHERE SOMEBODY STARTS IS PAST THE LEVEL THEY HOLD, NOT THE BOTTOM. A
      learner a paper has measured at B1 does not want B1 again, let alone
      five parts of A1, and a beginner does not want the impersonal
      (`lib/course/placement.ts`). The whole ladder is on the screen
      underneath either way, because what makes this worth starting is seeing
      that it ends.
    */
    const opening = await openingPartFor(ownerId);
    const planned = fill(t("{evenings} short evenings, from your very first word all the way to C1. We've planned every one."), { evenings });
    return (
      <Page
        title={t("Your evenings, already planned")}
        lead={planned}
      >
        <Stack>
          <Card tone="accent">
            <SectionTitle hint={fill(t("{part}, {evenings}"), { part: opening.id.toUpperCase(), evenings: eveningsIn(locale, opening.days.length) })}>
              <span lang={uiWantsEnglish(level) ? undefined : "et"}>
                {ui(opening.title, opening.subtitle)}
              </span>
            </SectionTitle>
            <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t(opening.blurb)}
            </p>
            <div className="mt-4">
              <StartProgramme programmeId={opening.id} />
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
              {chosen
                ? t("You've been choosing what to do each evening, and that's fine. Starting this won't change anything else.")
                : opening.level === level
                  ? fill(t("It starts at {start}, where you are now. It's a plan to lean on, not a track you're stuck on, and everything else in the app stays where it is."), { start: opening.level })
                  : fill(t("It starts at {start}, the level after the {level} you already have. It's a plan to lean on, not a track you're stuck on, and everything else in the app stays where it is."), { start: opening.level, level })}
            </p>
          </Card>

          <Ladder learnerLevel={level} locale={locale} />
        </Stack>
      </Page>
    );
  }

  const clock = await learnerDayClock(ownerId);
  /* One instant for the whole render. The reading decides whether the closing
     step is finished and the line under it says how far off that is, and both
     answers are read off the deck at a moment: two `new Date()`s a few
     milliseconds apart can straddle a card's due time and print "0 of 0
     answers in" under a step the reading has already ticked. It is also what
     lets the count behind them be memoised, since the cache is keyed on the
     instant (`lib/progress/closing.ts`). */
  const now = new Date();
  const [reading, fit] = await Promise.all([
    courseReading(ownerId, programme, clock, now),
    adaptOfferFor(ownerId, programme, now),
  ]);
  const total = programme.days.length;

  if (reading.finished) {
    const after = programmeAfter(programme);
    /*
      WHETHER THE LOG SUPPORTS THE NEXT PART, AND SAYING SO WITHOUT LOCKING THE
      DOOR.

      Somebody can finish a part without having learned it: every step ticked,
      every word answered once, and the scheduler still watching four fifths of
      them come back wrong. Handing that person the next level is the false
      confidence this app is built against. So the reading is taken at the
      hand-off, which is the one moment it is worth anything, and it is a
      sentence rather than a wall. The way on sits right beside it: the learner
      is the authority on their own week, and an app that refused on the
      strength of a retention figure would be wrong about the person revising
      elsewhere and insufferable to everybody.
    */
    const verdict = after ? await ladderReading(ownerId, programme) : { kind: "ready" as const };
    return (
      <Page
        eyebrow={<span>{programme.id.toUpperCase()}</span>}
        title={fill(t("{part} is finished"), { part: ui(programme.title, programme.subtitle) })}
        lead={fill(t("All {total} evenings done. Every word you met is in your reviews now."), { total })}
      >
        <Stack>
          <Card tone={verdict.kind === "hold" ? "butter" : "sky"}>
            {verdict.kind === "hold" ? (
              <>
                <SectionTitle hint={t("our guess, not a rule")}>
                  {fill(t("Not ready for {part} yet"), { part: after!.id.toUpperCase() })}
                </SectionTitle>
                <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {holdReason(verdict, locale)}{" "}
                  {t("We'd give it a few more days to settle before you build the next part on it.")}
                </p>
                <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {holdAdvice(verdict, locale)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {/*
                    THE WAY PAST IS ON THE SAME CARD AS THE WARNING. It is a
                    reading of a review log and the learner knows things it
                    does not: a class on Tuesdays, a month in Tartu, or simply
                    a willingness to be uncomfortable. Saying so and then
                    hiding the button would be the app not meaning it.
                  */}
                  <NextPart
                    programmeId={after!.id}
                    label={fill(t("Start {part} anyway"), { part: after!.id.toUpperCase() })}
                    quiet
                  />
                  <ButtonLink href="/review" variant="primary">
                    {t("Review what's due")} <ArrowRight size={15} aria-hidden />
                  </ButtonLink>
                </div>
              </>
            ) : (
              <>
                <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {after
                    ? fill(t("Next is {part} ({about}). It picks up where this one stopped, and it only asks about things you've already met."), {
                      part: after.id.toUpperCase(), about: t(after.subtitle),
                    })
                    : t("That's the whole course, start to finish. Every word is in your reviews, and each one will come back just as you're about to forget it.")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/progress/readiness">{t("See what you could handle out there")}</ButtonLink>
                  {after
                    ? <NextPart programmeId={after.id} label={fill(t("Start {part}"), { part: after.id.toUpperCase() })} />
                    : (
                      <ButtonLink href="/learn" variant="primary">
                        {t("Open the course")} <ArrowRight size={15} aria-hidden />
                      </ButtonLink>
                    )}
                </div>
              </>
            )}
          </Card>
        </Stack>
      </Page>
    );
  }

  const standing = reading.current!;
  const day = standing.day;

  /*
    THE EVENING IS OVER, AND SAYING SO IS THE POINT.

    A course that rolled straight on to the next module would be a queue with
    chapter headings. What makes somebody come back tomorrow is being told
    today is done, so a day finished today shows that and offers the next one
    as a choice rather than as the page they land on. `?next=1` is how the
    choice is taken, and it stores nothing: pressing it just draws the day
    that was already current.
  */
  if (reading.finishedToday && !startNow) {
    const justDone = dayById(programme, programme.days[day.index - 2]?.id ?? "");
    return (
      <Page
        eyebrow={
          <span lang={uiWantsEnglish(level) ? undefined : "et"}>
            {programme.id.toUpperCase()}, {ui(programme.title, programme.subtitle)}
          </span>
        }
        title={t("That's tonight done")}
        lead={
          /*
            THE RUN OF EVENINGS IS THE ONE FIGURE WORTH SAYING HERE. "Six days
            in a row" is warmer than any adjective because it is about the
            learner and required us to have been looking. Under two it says
            nothing, since "one evening in a row" is a sentence nobody says.
          */
          reading.eveningsInARow >= 2
            ? fill(t("{run} evenings in a row now, and {done} of {total} done."), { run: reading.eveningsInARow, done: reading.daysDone, total })
            : fill(t("{done} of {total} evenings done. See you tomorrow."), { done: reading.daysDone, total })
        }
      >
        <Stack>
          <Lettered celebrate>
            <Card tone="accent" className="evening">
              <div className="flex items-start gap-3">
                <CalendarCheck size={22} aria-hidden style={{ color: "var(--accent-deep)" }} />
                <div className="min-w-0">
                  {justDone && (
                    <>
                      <p
                        className="text-lg font-semibold"
                        lang={uiWantsEnglish(level) ? undefined : "et"}
                        style={{ color: "var(--accent-deep)" }}
                      >
                        {ui(justDone.title, justDone.subtitle)}
                      </p>
                      <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                        {t(justDone.canDo)}
                      </p>
                    </>
                  )}
                  {/*
                    WHAT TOMORROW IS, AND SAYING SO WITHOUT LOOKING LIKE A REPEAT.

                    A unit of twenty words is three evenings, so tomorrow is very
                    often the same unit again, and naming it flatly read as
                    "come back tomorrow for the thing you just did". Where the
                    unit carries on it says so and says which slice; where it
                    changes it names the new one.
                  */}
                  <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                    {justDone && justDone.unitId === day.unitId
                      ? fill(t("Tomorrow you'll carry on with {unit}, part {n} of {of}."), { unit: ui(day.title, day.subtitle), n: day.part.n, of: day.part.of })
                      : uiWantsEnglish(level)
                        ? fill(t("Come back tomorrow for {unit}."), { unit: t(day.subtitle) })
                        : fill(t("Come back tomorrow for {unit} ({english})."), { unit: day.title, english: t(day.subtitle) })}
                    {" "}{t("Sleep does half the work of making tonight's words stick, so stopping here is part of the plan.")}
                  </p>
                </div>
              </div>
              {/*
                TONIGHT'S WORDS, ONCE MORE, OUT LOUD. The evening ended on a
                checklist, and what a learner has at the end of it is five words
                they met an hour ago. A row of them with a speaker apiece is the
                cheapest spaced repetition there is and the one moment somebody
                is glad to hear them: the words are theirs now. The Estonian
                alone and no gloss, since the closing review just asked for it.
              */}
              {justDone && justDone.words.length > 0 && (
                <div className="mt-4">
                  <p className="label-xs" style={{ color: "var(--ink-3)" }}>
                    {t("Hear tonight’s words once more")}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2" data-recap-words>
                    {justDone.words.map((word) => (
                      <li
                        key={word}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5"
                        style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
                      >
                        <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                          {word}
                        </span>
                        <Speak text={word} size={14} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href="/course?next=1">{t("Start the next one now")}</ButtonLink>
                <ButtonLink href="/" variant="primary">
                  {t("Back to Today")} <ArrowRight size={15} aria-hidden />
                </ButtonLink>
              </div>
            </Card>
          </Lettered>

          <CourseFit offer={fit.offer} tilt={fit.tilt} snoozed={fit.snoozed} effects={fit.effects} locale={locale} />

          <Card>
            <SectionTitle hint={fill(t("{done} of {total}"), { done: reading.daysDone, total })}>{t("Where you are")}</SectionTitle>
            <div className="mt-3">
              <Meter pct={Math.round((reading.daysDone / total) * 100)} label={t(programme.subtitle)} />
            </div>
          </Card>
        </Stack>
      </Page>
    );
  }

  const [closing, missing] = await Promise.all([
    closingProgress(ownerId, programme, day.id, now),
    missingWords(ownerId, day),
  ]);
  const unit = unitOf(day);
  const done = day.steps.filter((s) => standing.done.has(s.id)).map((s) => s.id);

  return (
    <Page
      eyebrow={
        <span lang={uiWantsEnglish(level) ? undefined : "et"}>
          {programme.id.toUpperCase()}, {ui(programme.title, programme.subtitle)}
        </span>
      }
      title={ui(day.title, day.subtitle)}
      titleLang={uiWantsEnglish(level) ? undefined : "et"}
      lead={uiWantsEnglish(level) ? undefined : t(day.subtitle)}
    >
      <Stack>
        {/*
          WHETHER THIS IS THE RIGHT PART, BEFORE TONIGHT STARTS. The offer to
          step down or skip ahead goes above the evening rather than under it,
          because a learner who is going to move should not do tonight's module
          of the part they are about to leave. Nothing at all here for a steady
          learner, which is nearly everybody nearly always.
        */}
        <CourseFit offer={fit.offer} tilt={fit.tilt} snoozed={fit.snoozed} effects={fit.effects} locale={locale} />

        <Card tone="night" className="md:p-9">
          {/*
            AND WHICH EVENING OF THE UNIT THIS IS, BESIDE WHICH DAY OF THE PART.

            The heading already says the claim under it is the unit's rather
            than tonight's, and that is not the same as saying which slice
            tonight is: a learner read "Say I, you, he, we and they" over an
            evening teaching four of the six and reported it, correctly, as
            the screen promising words it was not going to teach. The count
            is the one honest answer the screen has, since the claim itself
            is a person's sentence and a third of it is not a sentence.
          */}
          <SectionTitle
            hint={day.part.of > 1
              ? fill(t("Day {day} of {total}, part {n} of {of}"), { day: day.index, total, n: day.part.n, of: day.part.of })
              : fill(t("Day {day} of {days}"), { day: day.index, days: total })}
          >
            {day.part.of > 1 ? t("By the end of this unit") : t("By the end of tonight")}
          </SectionTitle>
          {/*
            THE UNIT'S OWN CLAIM, AND WHICH PART OF IT TONIGHT IS.

            A unit of twenty words is three evenings and all three are the same
            lesson, so the promise is the unit's and the heading says which
            third this is. Writing a smaller promise per evening was the other
            way and it is worse: nobody can say what a third of "describe your
            home" is, and inventing one would be the app claiming something a
            person did not write.
          */}
          <p className="font-display mt-2 text-2xl font-bold leading-snug md:text-3xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
            {t(day.canDo)}
          </p>
          {/* Three figures on one line, set as type rather than three boxes:
              three tiles broke onto two rows on a phone, one alone under two,
              and "tonight" said three times over was the card's heading again. */}
          <dl className="mt-6 grid grid-cols-3 divide-x rounded-[var(--r-lg)] border py-4" style={{ borderColor: "rgb(255 255 255 / 0.12)", background: "rgb(255 255 255 / 0.06)" }}>
            {[
              // An evening of words met before says so rather than "0 new words".
              newWordsIn(day) > 0
                ? { value: String(newWordsIn(day)), label: nounOnly(locale, newWordsIn(day), "new word", newWordsIn(day) === 1 ? "new word" : "new words") }
                : { value: String(day.words.length), label: locale === "en" ? "words again" : fill(t("{words} again"), { words: nounOnly(locale, day.words.length, "word", "words") }) },
              { value: standing.complete ? t("0m") : fill(t("{minutes}m"), { minutes: standing.minutesLeft }), label: t("left") },
              { value: `${standing.pct}%`, label: t("done") },
            ].map((figure) => (
              <div key={figure.label} className="flex flex-col-reverse items-center justify-end gap-1.5 px-2" style={{ borderColor: "rgb(255 255 255 / 0.12)" }}>
                <dt className="text-sm" style={{ color: "var(--ink-2)" }}>{figure.label}</dt>
                <dd data-figure className="tnum font-display whitespace-nowrap text-3xl sm:text-4xl font-bold leading-none" style={{ color: "var(--ink)" }}>{figure.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div>
          <SectionTitle hint={unit ? ui(unit.title, unit.subtitle) : undefined}>
            {t("Tonight’s words")}
          </SectionTitle>
          {/*
            Printed rather than hidden, because seeing the eight at the start is
            what makes an evening feel finite. The Estonian alone: the meanings
            are what the first step is for, and a gloss here would answer the
            question the ladder is about to ask.
          */}
          <ul className="mt-2 flex flex-wrap gap-2">
            {day.words.map((word) => (
              <li key={word}>
                <Chip tone={missing.includes(word) ? "neutral" : "good"} caseSensitive>
                  <span lang="et">{word}</span>
                </Chip>
              </li>
            ))}
          </ul>
          {missing.length > 0 && missing.length < day.words.length && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("A few of these aren't in your deck yet. The first step adds them.")}
            </p>
          )}
        </div>

        <div>
          <SectionTitle hint={fill(t("{minutes} min"), { minutes: day.minutes })}>{t("What you do tonight")}</SectionTitle>
          <div className="mt-2">
            <StepList
              programmeId={programme.id}
              dayId={day.id}
              steps={stepsIn(day, locale)}
              done={done}
              closing={closing}
            />
          </div>
        </div>

        {/*
          AN EXPLANATION WAITS TO BE ASKED. This sat on the list as a paragraph
          about which ticks the app can see, which is a fact about the review
          log put in front of somebody who came to do tonight's five words. It
          is worth knowing and it is not worth the room, which is the rule
          `components/Explain.tsx` exists for.
        */}
        <Explain label={t("How a step gets ticked")}>
          {t("Meeting the words and the review at the end tick themselves off as you answer. The others you tick yourself, because we can't tell which exercise an answer came from, and we'd rather admit that than pretend we were watching.")}
        </Explain>

        <Card>
          <SectionTitle hint={fill(t("{done} of {total} evenings"), { done: reading.daysDone, total })}>{t("This part")}</SectionTitle>
          <div className="mt-3">
            <Meter pct={Math.round((reading.daysDone / total) * 100)} label={t(programme.subtitle)} />
          </div>
          {/*
            ONE ROW PER UNIT, WITH A DOT PER EVENING. A unit taught over five
            evenings used to be five rows reading the same title with "1 of 5"
            to "5 of 5" after it, which made a nineteen-evening part look like a
            list of repeats. The dots say how many evenings and which are done;
            the line under the title says where in the part they fall.

            The badge counts the rows, one to seven, rather than repeating the
            first evening's number: 1, 2, 3, 5, 8, 12, 15 down the side of an
            ordered list reads as a list with items missing, and the evening is
            already printed in words one line down.
          */}
          <ol className="mt-4 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
            {courseRuns(programme.days).map((run, ordinal) => {
              const first = run[0]!;
              const last = run[run.length - 1]!;
              const state = last.index < day.index ? "done" : first.index <= day.index ? "now" : "ahead";
              return (
                <li key={first.id} data-course-day className="flex flex-col gap-1 rounded-[var(--r)] px-2 py-1.5 text-sm" style={state === "now" ? { background: "var(--accent-soft)" } : undefined}>
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      data-course-badge
                      className="tnum mt-px flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs"
                      style={{
                        background: state === "done" ? "var(--good-soft)"
                          : state === "now" ? "var(--surface)" : "var(--raised)",
                        color: state === "done" ? "var(--good-ink)"
                          : state === "now" ? "var(--accent-deep)" : "var(--ink-3)",
                      }}
                    >
                      {state === "done" ? <Check size={11} /> : ordinal + 1}
                    </span>
                    {/*
                      The number is its own column and the title wraps inside
                      the other one. As one wrapping row, a title longer than
                      the room beside the badge moved down whole and left the
                      number alone on the line above it.
                    */}
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        data-course-title
                        lang={uiWantsEnglish(level) ? undefined : "et"}
                        style={{ color: state === "ahead" ? "var(--ink-3)" : "var(--ink)" }}
                      >
                        {ui(first.title, first.subtitle)}
                      </span>
                      {state === "now" && <Chip tone="accent">{t("Tonight")}</Chip>}
                    </span>
                  </div>
                  {!uiWantsEnglish(level) && (
                    <span className="pl-7 text-xs" style={{ color: "var(--ink-3)" }}>{t(first.subtitle)}</span>
                  )}
                  {/* Every item carries this line, one evening or several, so the
                      list reads as relatives: a unit of one evening used to have
                      no second line and sat a line shorter than its neighbours. */}
                  {(
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-7">
                      {/* The words first and the strip after them: where the
                          row runs out of room the strip wraps under the words,
                          never the words under the strip, and nothing is held
                          to one line past the card's edge. */}
                      <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>
                        {run.length > 1
                          ? fill(t("evenings {from} to {to}"), { from: first.index, to: last.index })
                          : fill(t("evening {n}"), { n: first.index })}
                      </span>
                      <span aria-hidden className="flex shrink-0 items-center gap-1">
                        {run.map((d) => (
                          <span
                            key={d.id}
                            className="h-1.5 w-4 rounded-full"
                            style={{
                              background: d.index < day.index ? "var(--good)"
                                : d.index === day.index ? "var(--accent)" : "var(--rule)",
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {/* The part and the ladder it sits on are one question, where am I,
              so they are one card: the part in detail and the whole climb as a
              strip under it, rather than two cards of the same answer. */}
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--rule-soft)" }}>
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{fill(t("The whole course, {parts}"), { parts: partsIn(locale, PROGRAMMES.length) })}</p>
            <LadderBody here={programme.id} learnerLevel={level} locale={locale} />
          </div>
        </Card>

        {/* Everything else is in the rail already; what is worth one line is
            that this is optional and where to switch it off. */}
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {t("This is the easy way in, not the only one.")}{" "}
          {locale === "en"
            ? <><Link href="/settings" className="underline">Turn it off</Link> whenever you&apos;d rather choose for yourself.</>
            : <Linked template={t("{link} whenever you'd rather choose for yourself.")} href="/settings" label={t("Turn it off")} />}
        </p>
      </Stack>
    </Page>
  );
}

/**
 * The whole ladder, seventeen parts from A1.1 to C1.3.
 *
 * On the screen for the same reason a day prints its eight words at the top:
 * what makes a course worth starting is being able to see that it ends, and a
 * part on its own is a fortnight with nothing behind it. Grouped by level
 * rather than listed flat, because five rows of "A1.1, A1.2" is the shape
 * somebody already has in their head from a language school.
 */
function Ladder({ learnerLevel, locale }: { learnerLevel: Level; locale: Locale }) {
  return (
    <Card>
      <SectionTitle hint={partsIn(locale, PROGRAMMES.length)}>{tr(locale, "The whole course")}</SectionTitle>
      <LadderBody learnerLevel={learnerLevel} locale={locale} />
    </Card>
  );
}

/** The strip of parts and the list of them on a press, with no card of its own. */
function LadderBody({ here, learnerLevel, locale }: { here?: string; learnerLevel: Level; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  const groupLevels = [...new Set(PROGRAMMES.map((p) => p.level))];
  const wantsEnglish = uiWantsEnglish(learnerLevel);
  return (
    <>
      {/*
        THE LADDER AS A PICTURE FIRST, AND THE LIST ON A PRESS.

        Nineteen rows of part titles was the longest block on a screen whose
        job is tonight. What the ladder is there to say is that the course has
        an end and where you are on the way to it, and a strip of nineteen
        segments says both at a glance; the titles are one press away for
        somebody who wants to read them.
      */}
      <div aria-hidden className="mt-2 flex gap-1">
        {PROGRAMMES.map((p) => {
          const at = PROGRAMMES.findIndex((q) => q.id === here);
          const index = PROGRAMMES.indexOf(p);
          return (
            <span
              key={p.id}
              className="h-2.5 flex-1 rounded-full"
              style={{
                background: p.id === here ? "var(--accent)" : at >= 0 && index < at ? "var(--sky)" : "var(--raised)",
              }}
            />
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1 text-xs font-semibold" style={{ color: "var(--ink-3)" }}>
        {groupLevels.map((groupLevel) => (
          <span key={groupLevel} style={{ flex: PROGRAMMES.filter((p) => p.level === groupLevel).length }}>
            {groupLevel}
          </span>
        ))}
      </div>
      <details className="explain mt-3">
        <summary>{t("Every part, by name")}</summary>
      <div className="mt-3 flex flex-col gap-4">
        {groupLevels.map((groupLevel) => (
          <div key={groupLevel}>
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{groupLevel}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {PROGRAMMES.filter((p) => p.level === groupLevel).map((p) => (
                <li key={p.id} data-course-day className="flex items-baseline gap-2 text-sm">
                  {/* The part's number is a column of its own, for the reason
                      the evening list above gives: in one wrapping row a
                      title that did not fit beside it left it alone on a line. */}
                  <span
                    data-course-badge
                    className="tnum w-12 shrink-0 whitespace-nowrap font-semibold"
                    style={{ color: p.id === here ? "var(--accent-deep)" : "var(--ink-2)" }}
                  >
                    {p.id.toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span data-course-title lang={wantsEnglish ? undefined : "et"} style={{ color: "var(--ink)" }}>
                      {uiText(learnerLevel, p.title, t(p.subtitle))}
                    </span>
                    <span style={{ color: "var(--ink-3)" }}>
                      {eveningsIn(locale, p.days.length)}
                    </span>
                    {p.id === here && <Chip tone="accent">{t("You are here")}</Chip>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      </details>
    </>
  );
}

/**
 * The part's evenings in runs, one run per unit: consecutive evenings with
 * the same title are one unit taught over several nights.
 */
function courseRuns<T extends { title: string; part: { n: number; of: number } }>(days: readonly T[]): T[][] {
  const runs: T[][] = [];
  for (const d of days) {
    const current = runs[runs.length - 1];
    if (current && current[0]!.title === d.title && d.part.n > 1) current.push(d);
    else runs.push([d]);
  }
  return runs;
}

/**
 * THE COURSE MEETING SOMEBODY WHERE THEIR ANSWERS SAY THEY ARE.
 *
 * Three shapes and one silence. An offer with a move is a card saying what the
 * answers show, what the delivery is already doing about it and why the move
 * would help, with the move beside "not now". An offer with no move honest to
 * make is the same card as news, with an acknowledgement. A snoozed offer is
 * one line saying the lean is still on, because the lean is not a question and
 * a learner who said "not now" is still owed the truth about how they are being
 * treated. And a steady learner gets nothing (`lib/course/adapt.ts`).
 *
 * Butter for running hard and mint for flying, which is what those two hues
 * already mean on every marked answer in the app, and the heading says it in
 * words as well, since a hue is never the only thing carrying a distinction.
 */
function CourseFit({ offer, tilt, snoozed, effects, locale }: {
  offer: AdaptOffer | null;
  tilt: Tilt;
  snoozed: boolean;
  effects: LeanEffects;
  locale: Locale;
}) {
  if (offer) {
    const text = offerParts(offer, effects, locale);
    return (
      <Card tone={offer.reading.kind === "struggling" ? "butter" : "sky"}>
        <div data-course-fit={offer.reading.kind}>
          <SectionTitle hint={tr(locale, "based on your last two weeks")}>{offerTitle(offer, locale)}</SectionTitle>
          <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {text.lead}
          </p>
          <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {text.advice}
          </p>
          {text.lean && (
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {text.lean}
            </p>
          )}
          <div className="mt-4">
            <CourseMove
              kind={offer.move?.kind ?? null}
              label={offer.move ? moveLabel(offer.move, locale) : null}
            />
          </div>
        </div>
      </Card>
    );
  }
  const lean = snoozed ? leanSentence(tilt, effects, locale) : "";
  if (lean) {
    return (
      <p className="text-sm" data-course-fit="lean" style={{ color: "var(--ink-2)" }}>
        {lean}
      </p>
    );
  }
  return null;
}

/** "12 evenings", in the reader's own plural. English keeps the line it always printed. */
function eveningsIn(locale: Locale, n: number): string {
  return locale === "en" ? `${n} evenings` : countOf(locale, n, "evening");
}

/** "18 parts", the same way. */
function partsIn(locale: Locale, n: number): string {
  return locale === "en" ? `${n} parts` : countOf(locale, n, "part");
}

/**
 * The noun of a count whose number is set apart in large type, in the form
 * that number takes: "5" over "new words", or over «новых слов».
 */
function nounOnly(locale: Locale, n: number, noun: string, english: string): string {
  if (locale === "en") return english;
  return countOf(locale, n, noun).replace(/^\d+\s/, "");
}

/** A sentence with one link in it, wherever the reader's language puts the link. */
function Linked({ template, href, label }: { template: string; href: string; label: string }) {
  const [before, after = ""] = template.split(/\{\w+\}/);
  return (
    <>
      {before}
      <Link href={href} className="underline">{label}</Link>
      {after}
    </>
  );
}
