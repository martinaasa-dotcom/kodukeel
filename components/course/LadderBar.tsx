import { MapPin } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { Explain } from "@/components/Explain";
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
 * THE LEVELS ARE BLOCKS RATHER THAN DOTS, AND EVERY ONE OF THEM IS LABELLED.
 * It was a rail with five unlabelled circles on it, and it was reported in one
 * word: vague. Nothing on the strip said which level any of them was, the
 * circles were a picture of the list underneath without the list's own words,
 * and the one question somebody glances at this to answer, how far along am I,
 * was the one thing the picture could not say, because a dot sitting at the
 * end of A1 looks exactly like a dot sitting anywhere else.
 *
 * So each level is a block as wide as its own share of the climb, with its
 * name under it, and the row reads left to right from the start of A1 to the
 * target. The widths are the argument: A1 really is a third of the way to C1
 * and half the way to B1, and five equal fifths would say something false
 * about the shape of the language. How far somebody has come is then the
 * filled part of the row rather than a number they have to trust.
 *
 * WHAT FILLS A BLOCK IS ITS OWN WORDS, so a level is a progress bar in its own
 * right: the evening spent on one A2 word moves the A2 block and nothing else,
 * which is the thing a single fill across the whole climb hides.
 *
 * AND THE TWO KINDS OF FILL ARE TWO MATERIALS RATHER THAN TWO HUES. Solid is
 * what the scheduler has graduated; hatched is what is credited from the level
 * the learner stands at and not yet checked. The first version drew that
 * second band in `--accent-soft` on a `--raised` track, which in the light
 * theme is two percent of lightness apart: the half of the bar the whole
 * feature is about was invisible, which is the fault `Choice.tsx` has a
 * paragraph about, one component over. A hatch survives both themes, and it
 * reads as provisional rather than as a second colour nobody can name.
 *
 * NO HOVER, AND THAT IS NOT AN OMISSION. A tooltip is a hover, this app is
 * measured on a phone, and a label somebody has to point at to read is a label
 * for half the readers. Everything the strip could say on a hover is either
 * printed under it already or in the list below, which is also what a screen
 * reader gets: the strip is `aria-hidden`, because a row of blocks is a picture
 * of a list and the list is the thing.
 *
 * Server-rendered and still: this sits on the screen somebody glances at from
 * a bus stop, and a bar that animated on every load would be the third thing
 * moving on it.
 */
/**
 * "A1", "A1 and A2", "A1, A2 and B1". Written out rather than joined on commas
 * because this lands in the middle of a sentence somebody reads once.
 */
/**
 * WHAT A CREDITED WORD LOOKS LIKE, AND WHY IT IS A TEXTURE.
 *
 * Two hues would have to be told apart by somebody glancing at a 3px row on a
 * phone in the evening, and the two this palette has for the job are two
 * percent of lightness apart in the light theme, which is how the first
 * version of this band came to be invisible. Stripes are legible in both
 * themes at any size, they cannot be confused with the solid fill beside them
 * whatever the screen, and they carry the meaning without a second colour
 * anybody has to learn: this part is pencilled in.
 *
 * The angle is what keeps it from reading as a gap in the bar at small widths.
 */
const HATCH =
  "repeating-linear-gradient(115deg, var(--accent-soft) 0 5px, var(--accent) 5px 7px)";

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
  const { milestones, pct, target, verified, credited, assumed, total, here, arrived, standing } = progress;
  const wantsEnglish = uiWantsEnglish(learnerLevel);
  const assumedLevels = milestones.filter((m) => m.state === "assumed").map((m) => m.level);
  /* Where the row begins, which is the bottom of the ladder rather than a
     level anybody picked, and is read off the stops so the sentence and the
     blocks cannot name two different starts. */
  const start = milestones[0]?.level ?? "A1";

  return (
    <Card>
      <SectionTitle hint={`${credited} of ${total} words`}>
        {arrived ? `You have reached ${target}` : `On the way to ${target}`}
      </SectionTitle>

      {/*
        THE CLIMB, LEFT TO RIGHT, FROM THE START OF A1 TO WHAT THEY PICKED.

        One block per level, as wide as that level's own share of the words,
        each one filled by its own words. So the row answers two questions at a
        glance that the old rail answered neither of: how far along the whole
        thing somebody is, which is how much of the row is filled, and which
        part of it they are in, which is the block with the pin over it.
      */}
      <div className="mt-5" aria-hidden>
        <div className="flex h-3 w-full gap-[3px]">
          {milestones.map((stop, at) => {
            /*
              Inside a block, the solid part is this level's own checked words
              and the hatch is the rest of it where the level is credited. A
              level nobody has credited simply stops at its checked share, so
              the empty part of the row is honestly empty.
            */
            const checked = stop.words === 0 ? 100 : (stop.verified / stop.words) * 100;
            const trusted = stop.state === "assumed" ? 100 : 0;
            return (
              <span
                key={stop.level}
                className={`relative h-full overflow-hidden ${at === 0 ? "rounded-l-full" : ""} ${
                  at === milestones.length - 1 ? "rounded-r-full" : ""
                }`}
                style={{ width: `${stop.share}%`, background: "var(--raised)" }}
              >
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${trusted}%`,
                    background: HATCH,
                  }}
                />
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${checked}%`,
                    background: "linear-gradient(90deg, var(--mint) 0%, var(--accent) 100%)",
                  }}
                />
              </span>
            );
          })}
        </div>

        {/*
          THE NAMES, UNDER THE BLOCKS THEY BELONG TO.

          This is the half that was missing, and it is why no hover is wanted:
          the strip says what it is without being pointed at. The level being
          worked on carries the pin, so the mark and the name are one object
          rather than a circle a reader has to match up with a list.
        */}
        <div className="mt-1.5 flex w-full gap-[3px]">
          {milestones.map((stop) => (
            <span
              key={stop.level}
              className="tnum flex min-w-0 items-center justify-center gap-0.5 text-xs font-semibold"
              style={{
                width: `${stop.share}%`,
                color: stop.state === "ahead" ? "var(--ink-3)" : "var(--ink-2)",
              }}
            >
              {stop.state === "here" && (
                <MapPin size={11} style={{ color: "var(--accent-deep)" }} />
              )}
              {stop.level}
            </span>
          ))}
        </div>
      </div>

      {/*
        BOTH NUMBERS, UNDER THE MATERIAL EACH OF THEM DREW.

        A reader who is told 690 of 1430 and nothing else has been handed an
        estimate wearing a measurement's clothes, which is the one thing this
        card may not do. A reader told only the 46 has been handed the fault
        this replaced. So the two sit side by side, each beside the thing it
        looks like on the row above, and the swatches are `aria-hidden` because
        the words already say it.
      */}
      {assumed > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: "var(--ink-2)" }}>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-4 shrink-0 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--mint) 0%, var(--accent) 100%)" }}
            />
            <span className="tnum">{verified} checked</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-4 shrink-0 rounded-full"
              style={{ background: HATCH }}
            />
            <span className="tnum">{assumed} assumed</span>
          </span>
        </p>
      )}

      {/*
        The stops in words, which is what a screen reader gets and what
        anybody reads once the picture has told them roughly where they are.
      */}
      {/*
        THE STOPS AS TILES UNDER THE CLIMB, AND ONE SENTENCE FOR THE ONE YOU ARE ON.

        This was a list: every level's name, its state and the sentence saying
        what arriving there means, then two paragraphs about where the numbers
        come from. Eleven lines of grey prose under a picture that had already
        said most of it. The tiles carry each level's name and state; the
        sentence is printed for the level being worked on, which is the only
        one a learner acts on tonight; and the arithmetic is behind a press.
        A screen reader still hears every stop's sentence.
      */}
      <ol className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(milestones.length, 5)}, minmax(0, 1fr))` }}>
        {milestones.map((stop) => (
          <li
            key={stop.level}
            className="flex min-w-0 flex-col gap-1 rounded-[var(--r)] border px-2.5 py-2"
            style={{
              borderColor: stop.state === "here" ? "var(--accent)" : "var(--rule-soft)",
              background: stop.state === "here" ? "var(--accent-soft)" : "transparent",
            }}
          >
            <span className="flex items-center justify-between gap-1">
              <span
                className="tnum text-sm font-bold"
                style={{ color: stop.state === "ahead" ? "var(--ink-3)" : "var(--ink)" }}
              >
                {stop.level}
              </span>
              {stop.state === "passed" && <span className="text-xs font-semibold" style={{ color: "var(--good-ink)" }}>Done</span>}
              {stop.state === "here" && <span className="tnum text-xs font-semibold" style={{ color: "var(--accent-deep)" }}>{stop.pct}%</span>}
            </span>
            <span
              lang={wantsEnglish ? undefined : "et"}
              className="hidden text-xs leading-snug sm:block"
              style={{ color: stop.state === "ahead" ? "var(--ink-3)" : "var(--ink-2)" }}
            >
              {uiText(learnerLevel, stop.title, LEVEL_INFO[stop.level].titleEn)}
            </span>
            {stop.state === "assumed" && (
              <span className="tnum text-xs" style={{ color: "var(--ink-3)" }}>
                Assumed · {stop.verified}/{stop.words}
              </span>
            )}
            <span className="sr-only">{stop.state === "ahead" ? `${stop.parts} parts. ` : ""}{stop.arrival}</span>
          </li>
        ))}
      </ol>
      {milestones.filter((m) => m.state === "here").map((stop) => (
        <p key={stop.level} aria-hidden className="mt-4 text-base" style={{ color: "var(--ink)" }}>
          <span className="font-semibold">{stop.level}: </span>
          {stop.arrival}
        </p>
      ))}
      <div className="mt-3">
        <Explain label="What moves this bar">
          {arrived
            ? "You know every word this level asks for. None of them count as new any more."
            : here
              ? <>
                  {pct}% of the way from the start of {start} to {target}. The checked share moves
                  when a word sticks, not when an evening is ticked, so it follows your review
                  queue{partLabel ? <>, and you are on {partLabel}</> : null}.
                </>
              : standing
                ? `Every level up to ${target} is counted as yours. What is left is checking them, which is what the evenings do.`
                : "Pick a target in Settings and this becomes the one number worth watching."}
          {standing && assumed > 0 && (
            <>
              {" "}
              {standing.kind === "measured"
                ? `Your level check put you at ${standing.level}, so `
                : `You told us you are at ${standing.level}, so `}
              {joinLevels(assumedLevels)} {assumedLevels.length === 1 ? "is" : "are"} counted as
              yours. Nothing below your own level is waiting to be done again.
            </>
          )}
        </Explain>
      </div>
    </Card>
  );
}
