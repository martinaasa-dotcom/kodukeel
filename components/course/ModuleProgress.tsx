import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { Card, Meter, SectionTitle, StatTile } from "@/components/ui";
import { DateText } from "@/components/DateText";
import { LadderBar } from "@/components/course/LadderBar";
import { fillNodes } from "@/components/TemplateNodes";
import {
  eveningsAhead, gainLabel, goalReading, levelReading, pctLabel, type ClimbReading,
} from "@/lib/course/moduleDone";
import type { Programme } from "@/lib/course";
import type { Level } from "@/lib/collections/syllabus";
import type { ModuleDoneFigures } from "@/lib/progress/moduleDone";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { formatDurationIn } from "@/lib/time/duration";
import type { Zone } from "@/lib/time/day";

/**
 * WHERE THE LEARNER STANDS, ONCE TODAY'S MODULE IS DONE.
 *
 * This replaced a card reading "Where you are, 1 of 6" over a thin bar, which
 * was reported as meaningless: it counted evenings ticked in one part, and the
 * questions somebody has at the end of an evening are how far into the level
 * they are, how far toward their own goal, what today added, how many words
 * they now have and how much is left. So the screen answers those, in that
 * order, and each in the unit the learner thinks in.
 *
 * ONE HUE FOR EVERY READING. A figure about the learner is the accent in steps
 * (docs/14-design-system.md §1), never the sky and blush a marked answer wears,
 * because none of this is right or wrong. Today's gain is written in
 * `--accent-deep` with an arrow, and "+0%" is never printed: an evening that
 * moved nothing on a figure says nothing about it.
 *
 * NOTHING IS PASSED OFF AS CHECKED. The goal figure counts levels credited
 * from the learner's standing, which is what the climb on Today prints, and
 * the climb below it draws that half hatched and says how much of it is
 * checked. A gain today is a word the scheduler graduated today, never an
 * evening ticked (`lib/progress/moduleDone.ts`).
 */
export function ModuleProgress({
  figures, programme, programmes, daysDone, learnerLevel, partLabel, zone, locale,
}: {
  figures: ModuleDoneFigures;
  programme: Programme;
  programmes: readonly Programme[];
  daysDone: number;
  learnerLevel: Level;
  partLabel: string;
  zone: Zone;
  locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const { goal, levelLadder } = figures;
  const working = programme.level;
  const goalRead = goalReading(goal, figures.gainedAt);
  const stop = (levelLadder ?? goal).milestones.find((m) => m.level === working);
  const levelRead = stop ? levelReading(stop, figures.gainedAt[working] ?? 0) : null;
  const sameLevel = goal.target === working;
  const ahead = eveningsAhead(programmes, programme, daysDone, goal.target);
  const evenings = (n: number) => <Figure>{locale === "en" ? (n === 1 ? "1 evening" : `${n} evenings`) : countOf(locale, n, "evening")}</Figure>;
  const words = (n: number) => <Figure>{countOf(locale, n, "word")}</Figure>;
  const knownBefore = Math.max(0, figures.wordsKnown - figures.knownToday);
  const metToday = Math.max(0, figures.wordsMet - figures.wordsMetBefore);

  return (
    <>
      {/*
        THE TWO FIGURES ASKED FOR, SIDE BY SIDE: HOW FAR THROUGH THE LEVEL BEING
        WALKED, AND HOW FAR TOWARD THE LEARNER'S OWN GOAL, EACH WITH WHAT TODAY
        ADDED. Where the goal is the level being walked there is one figure,
        since two panels saying the same number would be furniture.
      */}
      <Card data-module-progress>
        <SectionTitle hint={partLabel}>{t("How far you've come")}</SectionTitle>
        <div className={`mt-4 grid gap-4 ${levelRead && !sameLevel ? "sm:grid-cols-2" : ""}`}>
          {levelRead && (
            <Climb
              reading={levelRead}
              title={fill(t("Through {level}"), { level: working })}
              detail={fill(t("{counted} of {words} {level} words you know"), {
                counted: levelRead.counted, words: levelRead.words, level: working,
              })}
              locale={locale}
            />
          )}
          {!sameLevel && (
            <Climb
              reading={goalRead}
              title={fill(t(figures.goalChosen ? "To your goal, {target}" : "To {target}"), { target: goal.target })}
              detail={fill(t("{counted} of {words} words on the way there"), {
                counted: goalRead.counted, words: goalRead.words,
              })}
              locale={locale}
            />
          )}
        </div>
        {!figures.goalChosen && (
          <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
            {t("Set your own goal level in Settings and this reads how far you are from it.")}
          </p>
        )}
      </Card>

      {/* The whole climb, level by level, which is the picture of the figures above. */}
      <LadderBar progress={goal} partLabel={partLabel} learnerLevel={learnerLevel} locale={locale} />

      {/*
        THE WORDS, BEFORE AND NOW. "Before" is the start of today, because the
        question at the end of an evening is what this evening changed.
      */}
      <Card>
        <SectionTitle>{t("Your words")}</SectionTitle>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <StatTile
            value={figures.wordsKnown}
            label={t("Words you know")}
            hint={figures.knownToday > 0
              ? fill(t("{before} before today"), { before: knownBefore })
              : t("They count once they stick")}
          />
          <StatTile
            value={figures.wordsMet}
            label={t("Words you've met")}
            hint={metToday > 0 ? fill(t("{n} new today"), { n: metToday }) : undefined}
          />
          <StatTile
            value={figures.reviewsToday}
            label={t("Answers today")}
            hint={fill(t("{n} in all"), { n: figures.reviewsTotal })}
          />
        </div>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
          {t("A word counts as known once it has come back in your reviews days later and you still had it.")}
        </p>
      </Card>

      {/* WHAT IS STILL AHEAD, IN WORDS AND IN EVENINGS, off the course itself. */}
      <Card>
        <SectionTitle>{t("Still ahead")}</SectionTitle>
        <ul className="mt-3 grid gap-2 text-base" style={{ color: "var(--ink-2)" }} data-still-ahead>
          {ahead.inPart > 0 && (
            <AheadRow>
              {fillNodes(t("{evenings} left in {part}"), { evenings: evenings(ahead.inPart), part: programme.id.toUpperCase() })}
            </AheadRow>
          )}
          {levelRead && levelRead.left > 0 && (
            <AheadRow>
              {fillNodes(t("{words} and about {time} of evenings to finish {level}"), {
                words: words(levelRead.left),
                time: <Figure>{formatDurationIn(ahead.minutesInLevel / 60, locale, "long")}</Figure>,
                level: working,
              })}
            </AheadRow>
          )}
          {!sameLevel && ahead.toTarget !== null && ahead.toTarget > 0 && (
            <AheadRow>
              {fillNodes(t("{evenings} and {words} to {target}"), {
                evenings: evenings(ahead.toTarget), words: words(goalRead.left), target: goal.target,
              })}
            </AheadRow>
          )}
          {ahead.inPart === 0 && (!levelRead || levelRead.left === 0) && (
            <AheadRow>{fill(t("{level} is nearly behind you."), { level: working })}</AheadRow>
          )}
        </ul>
      </Card>

      {/* AND A LOOK BACK, which is the half that makes an evening feel like part of something. */}
      {figures.since && (
        <Card>
          <SectionTitle hint={fillNodes(t("since {date}"), {
            date: <DateText iso={figures.since.toISOString()} zone={zone} options={{ day: "numeric", month: "long", year: "numeric" }} />,
          })}
          >
            {t("Looking back")}
          </SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <StatTile value={figures.daysStudied} label={t("Days you sat down to it")} />
            <StatTile value={figures.reviewsTotal} label={t("Answers given")} />
            <StatTile value={figures.conversations} label={t("Conversations out there")} />
          </div>
        </Card>
      )}
    </>
  );
}

/** One figure on the climb: the percentage, today's gain beside it, and a meter. */
function Climb({ reading, title, detail, locale }: {
  reading: ClimbReading; title: string; detail: string; locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const gain = gainLabel(reading.gain);
  return (
    <div className="min-w-0 rounded-[var(--r)] border px-4 py-4" style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{title}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span data-figure className="tnum font-display text-4xl font-bold leading-none tracking-tight" style={{ color: "var(--ink)" }}>
          {pctLabel(reading.pct)}%
        </span>
        {gain && (
          <span className="tnum inline-flex items-center gap-1 whitespace-nowrap text-base font-semibold" style={{ color: "var(--accent-deep)" }} data-gain>
            <TrendingUp size={16} aria-hidden />
            {fill(t("{gain}% today"), { gain })}
          </span>
        )}
      </p>
      <div className="mt-3">
        <Meter pct={reading.pct} label={title} />
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>{detail}</p>
    </div>
  );
}

function AheadRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Figure({ children }: { children: ReactNode }) {
  return <b className="tnum" style={{ color: "var(--ink)" }}>{children}</b>;
}
