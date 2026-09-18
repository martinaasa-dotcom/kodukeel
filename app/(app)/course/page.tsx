import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowRight, BookOpen, CalendarCheck, Check, GraduationCap } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { learnerDayClock } from "@/lib/progress/dayClock";
import {
  closingProgress, courseReading, hasChosenProgramme, ladderReading, missingWords, openingPart,
  programmeFor,
} from "@/lib/progress/course";
import { courseLevelFor } from "@/lib/progress/level";
import type { Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { PROGRAMMES, dayById, holdAdvice, holdReason, programmeAfter, unitOf } from "@/lib/course";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Meter, Note, Page, SectionTitle, Stack, StatTile } from "@/components/ui";
import { StepList } from "@/components/course/StepList";
import { StartProgramme } from "@/components/course/StartProgramme";
import { NextPart } from "@/components/course/NextPart";
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
  searchParams: Promise<{ next?: string }>;
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
      WHERE SOMEBODY STARTS IS THEIR OWN LEVEL, NOT THE BOTTOM. A learner a
      paper has measured at B1 does not want five parts of A1 to reach the
      material they came for, and a beginner does not want the impersonal. The
      whole ladder is on the screen underneath either way, because what makes
      this worth starting is seeing that it ends.
    */
    const opening = openingPart(level);
    return (
      <Page
        title="A course, decided in advance"
        lead={`${evenings} evenings from nothing to C1, with the choosing already done.`}
      >
        <Stack>
          {opening ? (
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
                  ? "You said you would rather choose your own evening. Nothing in the rest of the app changed, and nothing will if you start this."
                  : `Starting at ${opening.level} because that is where you stand. It is a suggestion, not a track: everything you already use stays where it is.`}
              </p>
            </Card>
          ) : (
            <Card>
              <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                The ladder stops at C1 and you are past it. There is nothing here to lead you
                through that you have not met.
              </p>
            </Card>
          )}

          <Ladder learnerLevel={level} />
        </Stack>
      </Page>
    );
  }

  const clock = await learnerDayClock(ownerId);
  const reading = await courseReading(ownerId, programme, clock);
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
        lead={`All ${total} modules, and every word in them is in the schedule now.`}
      >
        <Stack>
          <Card tone={verdict.kind === "hold" ? "butter" : "mint"}>
            {verdict.kind === "hold" ? (
              <>
                <SectionTitle hint="a reading, not a rule">
                  Not ready for {after!.id.toUpperCase()} yet
                </SectionTitle>
                <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {holdReason(verdict)} Kodukeel would keep you on what you have for a few more
                  days before the next part rather than stack a harder one on top of it.
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
                        up where this left off and nothing in it needs anything you have not met.</>
                    : <>That is the end of the ladder. What keeps these words is the review queue,
                        which has every one of them and goes on asking at the moment you are about
                        to forget.</>}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/progress/readiness">See what you could do out there</ButtonLink>
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
                    ? <>Tomorrow carries on with {uiText(level, day.title, day.subtitle)}, part {day.part.n} of {day.part.of}.</>
                    : uiWantsEnglish(level)
                      ? <>Come back tomorrow for {day.subtitle}.</>
                      : <>Come back tomorrow for {day.title}, {day.subtitle.toLowerCase()}.</>}
                  {" "}Sleep is half of what makes today stick, so stopping here is the course
                  working rather than you giving up.
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
    closingProgress(ownerId, programme, day.id),
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
        <Card tone="accent">
          <SectionTitle hint={`Day ${day.index} of ${total}`}>
            {day.part.of > 1 ? `Part ${day.part.n} of ${day.part.of} toward` : "When you finish this"}
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
          <p className="mt-2 text-lg leading-relaxed" style={{ color: "var(--ink)" }}>
            {day.canDo}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile value={day.words.length} label="New words" tone="mint" />
            <StatTile
              value={standing.complete ? "0" : `${standing.minutesLeft}m`}
              label="Left tonight"
              tone="sky"
            />
            <StatTile value={`${standing.pct}%`} label="Through it" tone="butter" />
          </div>
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
              The plain ones are not in your deck yet. The first step puts them there.
            </p>
          )}
        </div>

        <div>
          <SectionTitle hint={`${day.minutes} min`}>What tonight is</SectionTitle>
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

        <Note tone="neutral">
          Two of these are read off your own answers rather than ticked: meeting the words, and the
          closing review. The rest are yours to tick, because a review row does not record which
          round wrote it and the app would rather say so than pretend it watched.
        </Note>

        <Card>
          <SectionTitle hint={`${reading.daysDone} of ${total}`}>The whole course</SectionTitle>
          <div className="mt-3">
            <Meter pct={Math.round((reading.daysDone / total) * 100)} label={programme.subtitle} />
          </div>
          <ol className="mt-4 flex flex-col gap-1.5">
            {programme.days.map((d) => {
              const state = d.index < day.index ? "done" : d.index === day.index ? "now" : "ahead";
              return (
                /*
                  TWO LINES RATHER THAN ONE TRUNCATED CAPTION.

                  The day's own name and its caption used to share a
                  `flex items-center` row with no wrap, so a long subtitle
                  (English ones run longer than the Estonian titles they
                  stand in for at A1, e.g. "Asking for help, and calling
                  for it") was cut short with an ellipsis, or, worse, sat
                  hard against a name with none to spare. Neither is read
                  in full, which is the one thing a 273-evening list has to
                  get right. The caption gets its own line, indented under
                  the badge, and wraps instead of clipping.
                */
                <li key={d.id} className="flex flex-col gap-0.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                      style={{
                        background: state === "done" ? "var(--good-soft)"
                          : state === "now" ? "var(--accent-soft)" : "var(--raised)",
                        color: state === "done" ? "var(--good-ink)"
                          : state === "now" ? "var(--accent-deep)" : "var(--ink-3)",
                      }}
                    >
                      {state === "done" ? <Check size={11} /> : d.index}
                    </span>
                    <span
                      lang={uiWantsEnglish(level) ? undefined : "et"}
                      style={{ color: state === "ahead" ? "var(--ink-3)" : "var(--ink)" }}
                    >
                      {uiText(level, d.title, d.subtitle)}
                    </span>
                    {state === "now" && <Chip tone="accent">Tonight</Chip>}
                  </div>
                  {(uiWantsEnglish(level) ? d.part.of > 1 : true) && (
                    <span className="pl-7 text-xs" style={{ color: "var(--ink-3)" }}>
                      {uiWantsEnglish(level)
                        ? `${d.part.n}/${d.part.of}`
                        : d.part.of > 1 ? `${d.subtitle}, ${d.part.n}/${d.part.of}` : d.subtitle}
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
      <div className="mt-3 flex flex-col gap-4">
        {groupLevels.map((groupLevel) => (
          <div key={groupLevel}>
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{groupLevel}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {PROGRAMMES.filter((p) => p.level === groupLevel).map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span
                    className="tnum font-semibold"
                    style={{ color: p.id === here ? "var(--accent-deep)" : "var(--ink-2)" }}
                  >
                    {p.id.toUpperCase()}
                  </span>
                  <span lang={wantsEnglish ? undefined : "et"} style={{ color: "var(--ink)" }}>
                    {uiText(learnerLevel, p.title, p.subtitle)}
                  </span>
                  <span style={{ color: "var(--ink-3)" }}>
                    {p.days.length} evenings
                  </span>
                  {p.id === here && <Chip tone="accent">You are here</Chip>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
