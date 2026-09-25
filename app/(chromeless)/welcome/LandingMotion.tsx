"use client";

import { useEffect, useMemo, useState } from "react";
import { PARTS } from "@/lib/copy/values";
import { BANDS, PRE_A1, type Band, type Level } from "@/lib/assessment/types";
import { distanceLine, foundHours, project } from "@/lib/assessment/plan";
import { REASONS, impliedTarget } from "@/lib/assessment/goals";
import { formatDuration } from "@/lib/time/duration";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import type { DemoWord } from "./LandingDemo";

/**
 * One word, turning through its cases, under the headline.
 *
 * The page's claim is that a handful of stored forms and a set of regular
 * endings carry most of Estonian, and a headline can only assert that. This
 * shows it: the forms are the ones the case explorer below is built from,
 * read out of the dictionary and the app's own derivation on the server, so
 * nothing here is typed. The English under each is the question the case
 * answers, off `lib/estonian/cases.ts`.
 *
 * It is a picture of the explorer rather than a control, so the moving part
 * is hidden from a screen reader and one static sentence says the same
 * thing. It stops on hover, on focus inside the page's own card and for
 * anybody who asked for less movement, where it shows the first form and
 * holds it.
 */
export function HeroWord({ words }: { words: DemoWord[] }) {
  const frames = useMemo(
    () =>
      words.flatMap((w) =>
        w.cases
          .filter((c) => !c.principal && c.singular && c.english)
          .map((c) => ({
            lemma: w.lemma,
            form: (c.singular ?? "").split(PARTS)[0] ?? "",
            question: c.english ?? null,
          })),
      ),
    [words],
  );
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (frames.length < 2 || held) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % frames.length), 1700);
    return () => window.clearInterval(id);
  }, [frames.length, held]);

  const frame = frames[i % Math.max(1, frames.length)];
  if (!frame) return null;
  const first = frames[0]!;

  return (
    <div
      className="hero-word"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <p className="sr-only">
        For example, <span lang="et">{first.lemma}</span> becomes{" "}
        <span lang="et">{first.form}</span>, {first.question}
      </p>
      <div aria-hidden className="hero-word-row">
        <span lang="et" className="hero-word-lemma">{frame.lemma}</span>
        <span className="hero-word-arrow">→</span>
        <span key={`${frame.lemma}-${frame.form}`} lang="et" className="hero-word-form">
          {frame.form}
        </span>
      </div>
      <p aria-hidden key={`q-${i}`} className="hero-word-question">{frame.question}</p>
    </div>
  );
}

const START_LEVELS: readonly Level[] = [PRE_A1, ...BANDS.slice(0, 3)];
const TARGETS: readonly Band[] = BANDS.slice(1);
const MINUTES = [10, 15, 30] as const;
/** The reasons a stranger recognizes themselves in first, in the order first run asks them. */
const SITUATIONS = REASONS.filter((r) => ["living", "family", "work", "citizenship", "study"].includes(r.id));
const DAYS_PER_WEEK = 5;

function levelName(level: Level): string {
  return level === PRE_A1 ? "Nothing yet" : level;
}

/**
 * How long, worked out rather than promised.
 *
 * The arithmetic is `project` in `lib/assessment/plan.ts`, the same function
 * the plan on /assess and the countdown on Today are built from, fed the same
 * published guided learning hours and the same Estonian surcharge. Nothing is
 * rounded before it is divided. What a visitor picks is what first run asks
 * for, so the figure here is the figure they will be shown inside.
 *
 * The standing is `estimated`, because a stranger's own guess is what this
 * is, and the plan widens the far end for exactly that.
 */
export function PlanCalculator() {
  const [from, setFrom] = useState<Level>(PRE_A1);
  const [reasons, setReasons] = useState<string[]>(["living"]);
  const [to, setTo] = useState<Band>("B1");
  const [touchedTarget, setTouchedTarget] = useState(false);
  const [minutes, setMinutes] = useState<number>(15);

  const chosen = SITUATIONS.filter((r) => reasons.includes(r.id));
  const target = touchedTarget ? to : impliedTarget(reasons) ?? to;

  const plan = project({
    standing: { level: from, source: "estimated" },
    to: target,
    minutesPerDay: minutes,
    daysPerWeek: DAYS_PER_WEEK,
    weeksAvailable: null,
    found: foundHours(chosen),
  });

  const weeks = plan.weeksWithFound;
  const arrived = plan.verdict === "arrived";
  const span = weeks.high < 12
    ? `${weeks.low === weeks.high ? weeks.low : `${weeks.low} to ${weeks.high}`} weeks`
    : `${monthsOf(weeks.low)} to ${monthsOf(weeks.high)} months`;

  const toggle = (id: string) =>
    setReasons((now) => (now.includes(id) ? now.filter((r) => r !== id) : [...now, id]));

  return (
    <div className="plan-calc grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <div className="flex flex-col gap-6">
        <ChoiceGroup label="Why you are learning it" select="many">
          {SITUATIONS.map((r) => (
            <ChoiceChip key={r.id} selected={reasons.includes(r.id)} onSelect={() => toggle(r.id)}>
              {r.label}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Where you are now">
          {START_LEVELS.map((level) => (
            <ChoiceChip key={level} selected={from === level} onSelect={() => setFrom(level)}>
              {levelName(level)}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Where you want to be">
          {TARGETS.map((band) => (
            <ChoiceChip
              key={band}
              even
              selected={target === band}
              onSelect={() => { setTo(band); setTouchedTarget(true); }}
            >
              {band}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Time in the app, five evenings a week">
          {MINUTES.map((m) => (
            <ChoiceChip key={m} selected={minutes === m} onSelect={() => setMinutes(m)}>
              {formatDuration(m / 60)}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
      </div>

      <div className="plan-calc-answer flex flex-col justify-center rounded-[var(--r-xl)] p-6 md:p-8" aria-live="polite">
        {arrived ? (
          <>
            <p className="label-xs" style={{ color: "var(--accent-deep)" }}>You are there</p>
            <p className="mt-3 text-2xl font-bold leading-tight font-display" style={{ color: "var(--ink)" }}>
              {target} is behind you already.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Pick a level above it and the sum starts again.
            </p>
          </>
        ) : (
          <>
            <p className="label-xs" style={{ color: "var(--accent-deep)" }}>{target}, in about</p>
            <p className="plan-calc-figure mt-2 font-display font-bold" style={{ color: "var(--ink)" }}>
              {span}
            </p>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {distanceLine(plan)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Weeks as months, which is how anybody thinks about a year of evenings. */
function monthsOf(weeks: number): number {
  return Math.max(1, Math.round(weeks / 4.345));
}
