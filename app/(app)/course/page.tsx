import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, BookOpen, CalendarCheck, Check, GraduationCap } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { learnerDayClock } from "@/lib/progress/dayClock";
import {
  closingProgress, courseReading, hasChosenProgramme, ladderReading, missingWords, openingPartFor,
  programmeFor,
} from "@/lib/progress/course";
import { courseLevelFor } from "@/lib/progress/level";
import type { Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { PROGRAMMES, dayById, holdAdvice, holdReason, programmeAfter, unitOf } from "@/lib/course";
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

export const metadata = { title: "Today's module" };

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
  const [programme, chosen, level, { next: startNow }] = await Promise.all([
    programmeFor(ownerId),
    hasChosenProgramme(ownerId),
    courseLevelFor(ownerId),
    searchParams,
  ]);

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
    return (
      <Page
        title="A course planned for you"
        lead={`${evenings} evenings from your first word to C1, each one already planned.`}
      >
        <Stack>
          <Card tone="accent">
            <SectionTitle hint={`${opening.id.toUpperCase()}, ${opening.days.length} evenings`}>
              <span lang={uiWantsEnglish(level) ? undefined : "et"}>
                {uiText(level, opening.title, opening.subtitle)}
              </span>
            </SectionTitle>
            <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {opening.blurb}
            </p>
            <div className="mt-4">
              <StartProgramme programmeId={opening.id} />
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
              {chosen
                ? "You chose to plan your own evenings. Nothing else in the app changed, and nothing will change if you start this."
                : opening.level === level
                  ? `It starts at ${opening.level}, which is where you stand. It is a suggestion, not a track, and everything you already use stays where it is.`
                  : `It starts at ${opening.level}, the level after the ${level} you already have. It is a suggestion, not a track, and everything you already use stays where it is.`}
            </p>
          </Card>

          <Ladder learnerLevel={level} />
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
        title={`${uiText(level, programme.title, programme.subtitle)} is finished`}
        lead={`All ${total} modules done, and every word in them is now in your review queue.`}
      >
        <Stack>
          <Card tone={verdict.kind === "hold" ? "butter" : "mint"}>
            {verdict.kind === "hold" ? (
              <>
                <SectionTitle hint="a reading, not a rule">
                  Not ready for {after!.id.toUpperCase()} yet
                </SectionTitle>
                <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {holdReason(verdict)} We would give what you have a few more days to settle
                  before starting the next part on top of it.
                </p>
                <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {holdAdvice(verdict)}
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
                    label={`Start ${after!.id.toUpperCase()} anyway`}
                    quiet
                  />
                  <ButtonLink href="/review" variant="primary">
                    Review what is due <ArrowRight size={15} aria-hidden />
                  </ButtonLink>
                </div>
              </>
            ) : (
              <>
                <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {after
                    ? <>Next is {after.id.toUpperCase()}, {after.subtitle.toLowerCase()}. It picks
                        up where this one left off, and it needs nothing you have not met.</>
                    : <>That is the end of the course. Your review queue holds every one of these
                        words, and it keeps asking just as you are about to forget them.</>}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/progress/readiness">See what you can do out there</ButtonLink>
                  {after
                    ? <NextPart programmeId={after.id} label={`Start ${after.id.toUpperCase()}`} />
                    : (
                      <ButtonLink href="/learn" variant="primary">
                        Open the course <ArrowRight size={15} aria-hidden />
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
            {programme.id.toUpperCase()} · {uiText(level, programme.title, programme.subtitle)}
          </span>
        }
        title="Today's module is learned"
        lead={
          /*
            THE RUN OF EVENINGS IS THE ONE FIGURE WORTH SAYING HERE. "Six days
            in a row" is warmer than any adjective because it is about the
            learner and required us to have been looking. Under two it says
            nothing, since "one evening in a row" is a sentence nobody says.
          */
          reading.eveningsInARow >= 2
            ? `${reading.daysDone} of ${total} done, and ${reading.eveningsInARow} evenings in a row. That is the evening.`
            : `${reading.daysDone} of ${total} done. That is the evening.`
        }
      >
        <Stack>
          <Card tone="mint">
            <div className="flex items-start gap-3">
              <CalendarCheck size={22} aria-hidden style={{ color: "var(--good-ink)" }} />
              <div className="min-w-0">
                {justDone && (
                  <>
                    <p
                      className="text-lg font-semibold"
                      lang={uiWantsEnglish(level) ? undefined : "et"}
                      style={{ color: "var(--ink)" }}
                    >
                      {uiText(level, justDone.title, justDone.subtitle)}
                    </p>
                    <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                      {justDone.canDo}
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
                    ? <>Tomorrow you carry on with {uiText(level, day.title, day.subtitle)}, part {day.part.n} of {day.part.of}.</>
                    : uiWantsEnglish(level)
                      ? <>Come back tomorrow for {day.subtitle}.</>
                      : <>Come back tomorrow for {day.title}, {day.subtitle.toLowerCase()}.</>}
                  {" "}Sleep is half of what makes today stick, so stopping now is the course
                  working, not you giving up.
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
                  Tonight&rsquo;s words, once more out loud
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
              <ButtonLink href="/course?next=1">Start the next one now</ButtonLink>
              <ButtonLink href="/" variant="primary">
                Back to Today <ArrowRight size={15} aria-hidden />
              </ButtonLink>
            </div>
          </Card>

          <CourseFit offer={fit.offer} tilt={fit.tilt} snoozed={fit.snoozed} effects={fit.effects} />

          <Card>
            <SectionTitle hint={`${reading.daysDone} of ${total}`}>Where you are</SectionTitle>
            <div className="mt-3">
              <Meter pct={Math.round((reading.daysDone / total) * 100)} label={programme.subtitle} />
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
          {programme.id.toUpperCase()} · {uiText(level, programme.title, programme.subtitle)}
        </span>
      }
      title={uiText(level, day.title, day.subtitle)}
      titleLang={uiWantsEnglish(level) ? undefined : "et"}
      lead={uiWantsEnglish(level) ? undefined : day.subtitle}
    >
      <Stack>
        {/*
          WHETHER THIS IS THE RIGHT PART, BEFORE TONIGHT STARTS. The offer to
          step down or skip ahead goes above the evening rather than under it,
          because a learner who is going to move should not do tonight's module
          of the part they are about to leave. Nothing at all here for a steady
          learner, which is nearly everybody nearly always.
        */}
        <CourseFit offer={fit.offer} tilt={fit.tilt} snoozed={fit.snoozed} effects={fit.effects} />

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
              ? `Day ${day.index} of ${total} · part ${day.part.n} of ${day.part.of}`
              : `Day ${day.index} of ${total}`}
          >
            {day.part.of > 1 ? "By the end of this unit" : "By the end of tonight"}
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
            {day.canDo}
          </p>
          {/* Three figures on one line, set as type rather than three boxes:
              three tiles broke onto two rows on a phone, one alone under two,
              and "tonight" said three times over was the card's heading again. */}
          <dl className="mt-6 grid grid-cols-3 divide-x rounded-[var(--r-lg)] border py-4" style={{ borderColor: "rgb(255 255 255 / 0.12)", background: "rgb(255 255 255 / 0.06)" }}>
            {[
              { value: String(day.words.length), label: "new words" },
              { value: standing.complete ? "0m" : `${standing.minutesLeft}m`, label: "left" },
              { value: `${standing.pct}%`, label: "done" },
            ].map((figure) => (
              <div key={figure.label} className="flex flex-col-reverse items-center gap-1.5 px-2" style={{ borderColor: "rgb(255 255 255 / 0.12)" }}>
                <dt className="text-sm" style={{ color: "var(--ink-2)" }}>{figure.label}</dt>
                <dd className="tnum font-display text-4xl font-bold leading-none" style={{ color: "var(--ink)" }}>{figure.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div>
          <SectionTitle hint={unit ? uiText(level, unit.title, unit.subtitle) : undefined}>
            Tonight&rsquo;s words
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
              The unmarked ones are not in your deck yet. The first step adds them.
            </p>
          )}
        </div>

        <div>
          <SectionTitle hint={`${day.minutes} min`}>What you do tonight</SectionTitle>
          <div className="mt-2">
            <StepList
              programmeId={programme.id}
              dayId={day.id}
              steps={day.steps}
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
        <Explain label="How a step gets ticked">
          Two steps tick themselves from your answers: meeting the words, and the closing
          review. You tick the rest yourself. The app cannot tell which round an answer came
          from, and it would rather say so than pretend it was watching.
        </Explain>

        <Card>
          <SectionTitle hint={`${reading.daysDone} of ${total}`}>The whole course</SectionTitle>
          <div className="mt-3">
            <Meter pct={Math.round((reading.daysDone / total) * 100)} label={programme.subtitle} />
          </div>
          {/*
            ONE ROW PER UNIT, WITH A DOT PER EVENING. A unit taught over five
            evenings used to be five rows reading the same title with "1 of 5"
            to "5 of 5" after it, which made a nineteen-evening part look like a
            list of repeats. The dots say how many evenings and which are done;
            the numbers say where in the part they fall.
          */}
          <ol className="mt-4 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
            {courseRuns(programme.days).map((run) => {
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
                      {state === "done" ? <Check size={11} /> : first.index}
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
                        {uiText(level, first.title, first.subtitle)}
                      </span>
                      {state === "now" && <Chip tone="accent">Tonight</Chip>}
                    </span>
                  </div>
                  {!uiWantsEnglish(level) && (
                    <span className="pl-7 text-xs" style={{ color: "var(--ink-3)" }}>{first.subtitle}</span>
                  )}
                  {run.length > 1 && (
                    <span className="flex flex-wrap items-center gap-1 pl-7">
                      {run.map((d) => (
                        <span
                          key={d.id}
                          aria-hidden
                          className="h-1.5 w-4 rounded-full"
                          style={{
                            background: d.index < day.index ? "var(--good)"
                              : d.index === day.index ? "var(--accent)" : "var(--rule)",
                          }}
                        />
                      ))}
                      <span className="tnum ml-1 text-xs" style={{ color: "var(--ink-3)" }}>
                        evenings {first.index} to {last.index}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        <Ladder here={programme.id} learnerLevel={level} />

        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          <BookOpen size={13} aria-hidden className="mr-1 inline align-[-2px]" />
          Everything else is still where it was:{" "}
          <Link href="/learn" className="underline">the whole course</Link>,{" "}
          <Link href="/practice" className="underline">every round</Link> and{" "}
          <Link href="/review" className="underline">the review queue</Link>. This is the short way,
          not the only one. <Link href="/settings" className="underline">Turn it off</Link> whenever
          you would rather choose.
          <GraduationCap size={13} aria-hidden className="ml-1 inline align-[-2px]" />
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
function Ladder({ here, learnerLevel }: { here?: string; learnerLevel: Level }) {
  const groupLevels = [...new Set(PROGRAMMES.map((p) => p.level))];
  const wantsEnglish = uiWantsEnglish(learnerLevel);
  return (
    <Card>
      <SectionTitle hint={`${PROGRAMMES.length} parts`}>The whole ladder</SectionTitle>
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
                background: p.id === here ? "var(--accent)" : at >= 0 && index < at ? "var(--mint)" : "var(--raised)",
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
        <summary>Every part, by name</summary>
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
                      {uiText(learnerLevel, p.title, p.subtitle)}
                    </span>
                    <span style={{ color: "var(--ink-3)" }}>
                      {p.days.length} evenings
                    </span>
                    {p.id === here && <Chip tone="accent">You are here</Chip>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      </details>
    </Card>
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
function CourseFit({ offer, tilt, snoozed, effects }: {
  offer: AdaptOffer | null;
  tilt: Tilt;
  snoozed: boolean;
  effects: LeanEffects;
}) {
  if (offer) {
    const text = offerParts(offer, effects);
    return (
      <Card tone={offer.reading.kind === "struggling" ? "butter" : "mint"}>
        <div data-course-fit={offer.reading.kind}>
          <SectionTitle hint="a reading of your last two weeks">{offerTitle(offer)}</SectionTitle>
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
              label={offer.move ? moveLabel(offer.move) : null}
            />
          </div>
        </div>
      </Card>
    );
  }
  const lean = snoozed ? leanSentence(tilt, effects) : "";
  if (lean) {
    return (
      <p className="text-sm" data-course-fit="lean" style={{ color: "var(--ink-2)" }}>
        {lean}
      </p>
    );
  }
  return null;
}
