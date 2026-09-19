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
 * carries a tick, the one being worked on carries a pin and its own share in
 * words, and the ones ahead are outlines. The whole strip is `aria-hidden` and
 * the list under it is what a screen reader gets, because a row of dots is a
 * picture of a list and the list is the thing.
 *
 * Server-rendered and still: this sits on the screen somebody glances at from
 * a bus stop, and a bar that animated on every load would be the third thing
 * moving on it.
 */
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
  const { milestones, pct, target, known, total, here, arrived } = progress;
  const wantsEnglish = uiWantsEnglish(learnerLevel);

  return (
    <Card>
      <SectionTitle hint={`${known} of ${total} words`}>
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
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(pct, 1.5)}%`,
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
                  : stop.state === "here" ? "var(--accent-soft)" : "var(--surface)",
                border: `2px solid ${stop.state === "ahead" ? "var(--rule)" : "transparent"}`,
                color: stop.state === "passed" ? "var(--good-ink)" : "var(--accent-deep)",
              }}
            >
              {stop.state === "passed" ? <Check size={11} />
                : stop.state === "here" ? <MapPin size={11} />
                : <Flag size={10} style={{ color: "var(--ink-3)" }} />}
            </span>
          </span>
        ))}
      </div>

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
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
        {arrived
          ? "You know every word this level asks for. None of them count as new any more."
          : here
            ? <>
                {pct}% of the way. This moves when a word sticks, not when an evening is
                ticked, so it follows your review queue
                {partLabel ? <>, and you are on {partLabel}</> : null}.
              </>
            : "Pick a target in Settings and this becomes the one number worth watching."}
      </p>
    </Card>
  );
}
