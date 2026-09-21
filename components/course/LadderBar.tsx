import { Check, Flag, MapPin } from "lucide-react";
import { Card, Chip, SectionTitle } from "@/components/ui";
import type { LadderProgress } from "@/lib/course";
import { LEVEL_INFO, type Level } from "@/lib/collections/syllabus";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";

/**
 * THE CLIMB TO THE BAND SOMEBODY SAID THEY WERE AIMING AT.
 *
 * A learner picks a target in their first ninety seconds and then never hears
 * about it again except as a date on a plan. This is the answer to "how close
 * am I", every morning, in the unit they think in: the levels, as stops, with
 * the fill between them moving a little every evening.
 *
 * THE STOPS ARE WHY IT IS NOT JUST A BAR. Eleven percent of an unnamed thing
 * says almost nothing, and nothing ever arrives. Five named stops mean the
 * next one is always in sight, the one behind is a thing that happened, and a
 * fortnight of evenings visibly moves the marker between them.
 *
 * A HUE IS NEVER THE ONLY THING SAYING WHICH STATE A STOP IS IN. A passed stop
 * carries a tick, the one being worked on carries a pin, a credited one carries
 * a filled dot and its own checked share in words, and the ones ahead are
 * outlines. The whole strip is `aria-hidden` and the list under it is what a
 * screen reader gets, because a row of dots is a picture of a list and the list
 * is the thing.
 *
 * TWO BANDS, AND THE SECOND ONE IS NAMED WHEREVER IT IS DRAWN. The levels
 * behind where somebody stands are counted toward the climb, so a B1 learner
 * opens on a bar that agrees with the B1.1 evening under it rather than one
 * reporting that this app's review log has never been asked about A1. What
 * makes that honest rather than flattering is that the assumption is never
 * drawn as a check: the solid fill is what the scheduler has graduated, the
 * soft band is what is taken on trust, both numbers are printed, and the second
 * turns into the first a word at a time as the evenings go by.
 *
 * Server-rendered and still: this sits on the screen somebody glances at from
 * a bus stop, and a bar that animated on every load would be the third thing
 * moving on it.
 */
/**
 * "A1", "A1 and A2", "A1, A2 and B1". Written out rather than joined on commas
 * because this lands in the middle of a sentence somebody reads once.
 */
function joinLevels(levels: readonly string[]): string {
  if (levels.length <= 1) return levels[0] ?? "";
  return `${levels.slice(0, -1).join(", ")} and ${levels.at(-1)}`;
}

export function LadderBar({ progress, partLabel, learnerLevel }: {
  progress: LadderProgress;
  /** Which part of the ladder they are on, for the line under the bar. */
  partLabel?: string;
  /**
   * The learner's own level, so a stop's name reads in English until they
   * reach A2, exactly as the rest of the course chrome does
   * (`lib/copy/uiLanguage.ts`). `stop.title` itself only ever carries the
   * Estonian name; the English one is looked up here rather than threaded
   * through `LadderProgress`, which stays a fact about words known and
   * carries no opinion about how it is read.
   */
  learnerLevel: Level;
}) {
  const { milestones, pct, verifiedPct, target, verified, credited, total, here, arrived, standing } = progress;
  const wantsEnglish = uiWantsEnglish(learnerLevel);
  /*
    Words counted from where they stand and not yet checked, which is the one
    figure that makes the two bands legible: the rest of the bar is theirs by
    the scheduler's own verdict. Derived here rather than carried, because it
    is a subtraction of two fields that already travel together and a third
    field is a third thing to keep in step.
  */
  const assumed = credited - verified;
  const assumedLevels = milestones.filter((m) => m.state === "assumed").map((m) => m.level);

  return (
    <Card>
      <SectionTitle hint={`${credited} of ${total} words`}>
        {arrived ? `You have reached ${target}` : `On the way to ${target}`}
      </SectionTitle>

      {/*
        The track. One rounded rail, a fill, and a stop sitting on it per
        level, positioned by its own share of the climb so the gaps between
        stops are honestly the sizes of the levels rather than five equal
        fifths: A1 really is half the way to B1 and the picture should say so.
      */}
      <div className="relative mt-5 mb-2" aria-hidden>
        <div
          className="h-2.5 w-full rounded-full"
          style={{ background: "var(--raised)" }}
        />
        {assumed > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, background: "var(--accent-soft)" }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(verifiedPct, 1.5)}%`,
            background: "linear-gradient(90deg, var(--mint) 0%, var(--accent) 100%)",
          }}
        />
        {milestones.map((stop) => (
          <span
            key={stop.level}
            className="absolute -translate-x-1/2"
            style={{ left: `${stop.at}%`, top: "-5px" }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{
                background: stop.state === "passed" ? "var(--good-soft)"
                  : stop.state === "here" ? "var(--accent-soft)"
                    : stop.state === "assumed" ? "var(--raised)" : "var(--surface)",
                border: `2px solid ${stop.state === "ahead" ? "var(--rule)" : "transparent"}`,
                color: stop.state === "passed" ? "var(--good-ink)" : "var(--accent-deep)",
              }}
            >
              {stop.state === "passed" ? <Check size={11} />
                : stop.state === "here" ? <MapPin size={11} />
                  : stop.state === "assumed"
                    ? (
                      /* A filled dot rather than a tick: counted is not checked,
                         and the two may not wear one mark. */
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--ink-3)" }}
                      />
                    )
                    : <Flag size={10} style={{ color: "var(--ink-3)" }} />}
            </span>
          </span>
        ))}
      </div>

      {/*
        BOTH NUMBERS, UNDER THE BAND EACH OF THEM DREW.

        A reader who is told 690 of 1430 and nothing else has been handed an
        estimate wearing a measurement's clothes, which is the one thing this
        card may not do. A reader told only the 46 has been handed the fault
        this replaced. So the two sit side by side, each beside its own colour,
        and the swatches are `aria-hidden` because the words already say it.
      */}
      {assumed > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: "var(--ink-2)" }}>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span className="tnum">{verified} checked</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: "var(--accent-soft)" }}
            />
            <span className="tnum">{assumed} assumed</span>
          </span>
        </p>
      )}

      {/*
        The stops in words, which is what a screen reader gets and what
        anybody reads once the picture has told them roughly where they are.
      */}
      <ol className="mt-5 flex flex-col gap-2">
        {milestones.map((stop) => (
          <li key={stop.level} className="flex flex-col gap-1">
            {/*
              THE LEVEL NAME AND THE ARRIVAL SENTENCE STOP COMPETING FOR ROOM.
              Both used to sit on one `flex-wrap` line, so on a phone the
              unbreakable Estonian level name (font-semibold, no truncate) took
              whatever width it wanted and the arrival sentence, the one thing
              actually explaining "you are here", was squeezed into whatever
              was left and clipped to a word or two. The sentence gets a line
              of its own now, indented under the badge, and can wrap freely
              instead of being truncated.
            */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span
                className="tnum w-7 shrink-0 text-sm font-bold"
                style={{
                  color: stop.state === "ahead" ? "var(--ink-3)" : "var(--ink)",
                }}
              >
                {stop.level}
              </span>
              <span
                lang={wantsEnglish ? undefined : "et"}
                className="min-w-0 text-sm font-semibold"
                style={{ color: "var(--ink)" }}
              >
                {uiText(learnerLevel, stop.title, LEVEL_INFO[stop.level].titleEn)}
              </span>
              {stop.state === "passed" && <Chip tone="good">Done</Chip>}
              {stop.state === "assumed" && <Chip tone="neutral">Assumed</Chip>}
              {stop.state === "here" && <Chip tone="accent">{stop.pct}% through</Chip>}
              {stop.state === "ahead" && (
                <span className="text-sm" style={{ color: "var(--ink-3)" }}>
                  {stop.parts} parts
                </span>
              )}
            </div>
            <span className="pl-7 text-sm" style={{ color: "var(--ink-3)" }}>
              {stop.arrival}
            </span>
            {/*
              WHAT AN ASSUMPTION HAS BEHIND IT SO FAR, ON THE STOP IT IS ABOUT.

              This is the line that makes the credit worth having rather than a
              nicer way of saying nothing: it is nought on the first morning and
              it climbs on its own, so a learner who spends an evening on a word
              from a level they were credited with can see where it landed.
            */}
            {stop.state === "assumed" && (
              <span className="tnum pl-7 text-sm" style={{ color: "var(--ink-3)" }}>
                {stop.verified} of {stop.words} checked so far.
              </span>
            )}
          </li>
        ))}
      </ol>

      {/*
        WHERE THE CREDITED HALF CAME FROM, IN THE LEARNER'S OWN TERMS.

        A number somebody cannot account for is a number they stop believing,
        and this one arrives on their first morning with nothing behind it that
        they did here. So the sentence names the answer the app is holding and
        which of the two kinds it is: a check they sat is worth saying out loud,
        and a level they ticked in Settings is worth saying is theirs to correct.
      */}
      {standing && assumed > 0 && (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
          {standing.kind === "measured"
            ? `Your level check put you at ${standing.level}, so `
            : `You told us you are at ${standing.level}, so `}
          {joinLevels(assumedLevels)} {assumedLevels.length === 1 ? "is" : "are"} counted as
          yours. Nothing below your own level is waiting to be done again.
        </p>
      )}

      <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
        {arrived
          ? "You know every word this level asks for. None of them count as new any more."
          : here
            ? <>
                {pct}% of the way. The checked share moves when a word sticks, not when an
                evening is ticked, so it follows your review queue
                {partLabel ? <>, and you are on {partLabel}</> : null}.
              </>
            : standing
              ? `Every level up to ${target} is counted as yours. What is left is checking them, which is what the evenings do.`
              : "Pick a target in Settings and this becomes the one number worth watching."}
      </p>
    </Card>
  );
}
