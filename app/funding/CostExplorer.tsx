"use client";

import { useMemo, useState } from "react";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { Meter } from "@/components/ui";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { TrParts } from "@/components/TrParts";
import {
  ASSUMPTIONS, DEFAULT_SHAPE, MODEL_CAP_USD, SCALE_LADDER, TUTOR_MODELS,
  billFor, ladderFor, type Line, type Meter as MeterFigure, type Phrase, type Shape, type TutorMode,
} from "@/lib/funding/model";

/**
 * The bill, with the size of the thing left to the reader.
 *
 * Everything above this on the page is a number we chose. This is the part
 * where somebody who thinks we chose wrongly can say so and see what it does,
 * which is the only version of "open about what it costs" that survives
 * contact with a reader who does not trust us yet.
 *
 * One slider carries it, because there is one question: how many people. The
 * rest are chips, and each one is there because it moves the total by enough
 * to argue about. Nothing here is a preference to be remembered; it is a
 * question being asked of the arithmetic, so none of it is stored and a reload
 * puts it back where it started.
 *
 * IT NAMES NO SERVICE. Every line it draws comes from the registry in
 * `lib/funding/services.ts`, so a tool added there appears here, in the chart,
 * in the ladder and in the totals without this file being touched.
 */

/** Where the slider's hundred stops land: one learner up to a hundred thousand. */
const STOPS = 100;
const DECADES = 5;

function learnersAt(stop: number): number {
  const raw = Math.pow(10, (stop / STOPS) * DECADES);
  if (raw < 10) return Math.max(1, Math.round(raw));
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / magnitude) * magnitude;
}

function stopFor(learners: number): number {
  return Math.round((Math.log10(Math.max(1, learners)) / DECADES) * STOPS);
}

/** How a figure is grouped and pointed for the reader: 50,000 and 0.45 in
 * English, 50 000 and 0,45 in Russian and Ukrainian, where a comma is the
 * decimal point and would read 50,000 as fifty. */
const numberTag = (locale: Locale) => (locale === "en" ? "en-GB" : locale);

const count = (n: number, locale: Locale) => Math.round(n).toLocaleString(numberTag(locale));

/** Dollars written where the reader writes them: "$1,234" in English and
 * "1 234 $" in Russian and Ukrainian, where the sign follows the figure. The
 * narrow symbol, because en-GB otherwise prints "US$". */
function money(usd: number, locale: Locale): string {
  const whole = usd >= 1000;
  return new Intl.NumberFormat(numberTag(locale), {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(whole ? Math.round(usd) : usd);
}

/**
 * The per-learner figure, in whatever unit stops it reading as zero.
 *
 * It runs from tens of dollars down to a few cents across the range this page
 * covers, and `$0.055` is a number a reader has to count the noughts on. Cents
 * below a dollar is the same rule `lib/time/duration.ts` applies to a stretch
 * of study: the unit is part of the number.
 */
function perLearner(usd: number, t: T, locale: Locale): string {
  if (usd >= 1) return money(usd, locale);
  const cents = usd * 100;
  if (locale === "en") {
    if (cents >= 10) return `${Math.round(cents)} cents`;
    if (cents >= 0.1) return `${cents.toFixed(1)} cents`;
    return "under a tenth of a cent";
  }
  if (cents >= 10) return centsIn(Math.round(cents), locale);
  if (cents >= 0.1) return centsIn(Number(cents.toFixed(1)), locale);
  return t("under a tenth of a cent");
}

/**
 * "12 cents", "12 центов", "1.5 цента". A fraction takes the genitive
 * singular in both languages (1,5 цента), which is the second of the three
 * forms rather than the one `Intl.PluralRules` picks for it.
 */
function centsIn(n: number, locale: Locale): string {
  if (Number.isInteger(n)) return countOf(locale, n, "cent");
  return `${String(n).replace(".", ",")} ${tr(locale, "cents", "fraction")}`;
}

function amount(figure: MeterFigure, t: T, locale: Locale): string {
  if (figure.as === "gb") {
    const gb = figure.used;
    if (gb < 1) return `${Math.round(gb * 1000)} MB`;
    if (gb < 1000) return `${gb.toLocaleString(numberTag(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`;
    return `${(gb / 1000).toLocaleString(numberTag(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TB`;
  }
  if (figure.as === "hours") {
    return figure.used < 1
      ? fill(t("{n} min"), { n: Math.round(figure.used * 60) })
      : fill(t("{n} hours"), { n: count(figure.used, locale) });
  }
  return count(figure.used, locale);
}

function allowance(figure: MeterFigure, t: T, locale: Locale): string {
  return figure.as === "gb"
    ? fill(t("{amount} included"), { amount: figure.included < 1 ? `${figure.included * 1000} MB` : `${count(figure.included, locale)} GB` })
    : figure.as === "hours"
      ? fill(t("{n} hours included"), { n: count(figure.included, locale) })
      : fill(t("{amount} included"), { amount: count(figure.included, locale) });
}

/** What a line says on its right-hand side, whichever shape it is. */
function figureFor(line: Line, t: T, locale: Locale): { text: string; muted: boolean } {
  const { cost } = line;
  if (cost.kind === "charged") return { text: money(cost.usd, locale), muted: cost.usd === 0 };
  if (cost.kind === "partOf") return { text: t("inside another line"), muted: true };
  if (cost.kind === "given") return { text: t("given"), muted: true };
  return { text: fill(t("{who} pays"), { who: t(cost.who) }), muted: true };
}

function planFor(line: Line, t: T): string {
  const { cost } = line;
  if (cost.kind === "charged") return t(cost.plan);
  if (cost.kind === "partOf") return t("No bill of its own");
  if (cost.kind === "given") return t("Public, and asks for nothing");
  return t("Not the operator's to pay");
}

/**
 * A line the model built with figures in it, in the reader's language. English
 * reads the sentence the model wrote, unchanged. Russian and Ukrainian read
 * its template translated, with every number written the way they write one
 * and every label in a list translated and joined the way their language joins
 * a list. A line with no template is a fixed sentence and goes through `t`.
 */
function said(english: string, as: Phrase | undefined, t: T, locale: Locale): string {
  if (locale === "en" || !as) return t(english);
  const values = Object.fromEntries(Object.entries(as.values).map(([key, value]) => {
    if (typeof value === "number") return [key, value.toLocaleString(numberTag(locale))];
    if (typeof value === "string") return [key, value];
    if ("n" in value) {
      return [key, value.n.toLocaleString(numberTag(locale), { minimumFractionDigits: value.digits, maximumFractionDigits: value.digits })];
    }
    return [key, new Intl.ListFormat(locale, { type: "conjunction" }).format(value.map((label) => t(label)))];
  }));
  return fill(t(as.template), values);
}

/**
 * The unit beside an assumption's figure. Russian and Ukrainian take the
 * unit's form from the number (one page, two pages, five pages are three
 * different words), so there the unit is a counted noun keyed on its English.
 */
function unitFor(value: number, unit: string, t: T, locale: Locale): string {
  if (locale === "en") return t(unit);
  return countOf(locale, value, unit).slice(String(value).length + 1);
}

/** The translator a client component gets from `useT`. */
type T = (english: string, context?: string) => string;

export function CostExplorer() {
  const t = useT();
  const locale = useLocale();
  const [shape, setShape] = useState<Shape>(DEFAULT_SHAPE);
  const set = <K extends keyof Shape>(key: K, value: Shape[K]) =>
    setShape((was) => ({ ...was, [key]: value }));

  const bill = useMemo(() => billFor(shape), [shape]);
  const ladder = useMemo(() => ladderFor(shape), [shape]);
  const tallest = Math.max(...ladder.map((r) => r.bill.totalUsd), 1);

  return (
    <div className="space-y-6">
      <div
        className="rounded-[var(--r-lg)] border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth-sm)" }}
      >
        <label htmlFor="learners" className="label-xs block" style={{ color: "var(--ink-3)" }}>
          {t("People using it in a month")}
        </label>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum text-3xl font-bold leading-none" style={{ color: "var(--ink)" }}>
            {count(shape.learners, locale)}
          </span>
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            {shape.learners === 1 ? t("one person") : t("learners")}
          </span>
        </div>

        <input
          id="learners"
          type="range"
          className="range mt-1"
          min={0}
          max={STOPS}
          step={1}
          value={stopFor(shape.learners)}
          onChange={(e) => set("learners", learnersAt(Number(e.target.value)))}
          aria-valuetext={fill(t("{n} learners"), { n: count(shape.learners, locale) })}
        />
        {/*
          One label per decade, because the slider is logarithmic and evenly
          spaced labels are only honest if they are evenly spaced *in the thing
          being measured*. The first version read 1, 100, 10,000, 100,000 across
          a justified row, which put 100 at the halfway mark on a scale where it
          sits at two fifths, on a page whose whole argument is that its numbers
          can be checked.
        */}
        <p aria-hidden className="tnum flex justify-between text-xs" style={{ color: "var(--ink-3)" }}>
          <span>1</span><span>10</span><span>100</span><span>1k</span><span>10k</span><span>100k</span>
        </p>

        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Every month, all of it")}</p>
          <p className="tnum mt-1 text-4xl font-bold leading-none" style={{ color: "var(--accent-deep)" }}>
            {money(bill.totalUsd, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {fill(t("{each} a learner, and every cent of it an invoice somebody sends. In US dollars and net of VAT, which is how the vendors quote their own prices."), {
              each: perLearner(bill.perLearnerUsd, t, locale),
            })}
          </p>
          {bill.creditedUsd > 0 && (
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
              <TrParts
                template="Not counted above: buying the speech this app is given would come to a further {money} a month. Nobody has ever asked for it."
                parts={{ money: <strong>{money(bill.creditedUsd, locale)}</strong> }}
              />
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceGroup label={t("How hard they study")} select="one">
          {([
            [3, 10, "Lightly"],
            [5, 15, "The default"],
            [7, 30, "Hard"],
          ] as const).map(([days, reviews, name]) => (
            <ChoiceChip
              key={name}
              selected={shape.sessionsPerWeek === days && shape.reviewsPerSession === reviews}
              onSelect={() => setShape((was) => ({
                ...was, sessionsPerWeek: days, reviewsPerSession: reviews,
              }))}
            >
              {t(name, "study")}
            </ChoiceChip>
          ))}
        </ChoiceGroup>

        <ChoiceGroup label={t("Cards read themselves aloud")} select="one">
          <ChoiceChip selected={shape.audio} onSelect={() => set("audio", true)}>{t("On", "switch")}</ChoiceChip>
          <ChoiceChip selected={!shape.audio} onSelect={() => set("audio", false)}>{t("Off", "switch")}</ChoiceChip>
        </ChoiceGroup>

        <ChoiceGroup label={t("The tutor")} select="one">
          {([
            ["paid", "On"],
            ["off", "No key"],
          ] as const).map(([mode, name]) => (
            <ChoiceChip
              key={mode}
              selected={shape.tutor === mode}
              onSelect={() => set("tutor", mode as TutorMode)}
            >
              {t(name, "switch")}
            </ChoiceChip>
          ))}
        </ChoiceGroup>

        <ChoiceGroup label={t("Which model answers")} select="one">
          {TUTOR_MODELS.map((model) => (
            <ChoiceChip
              key={model.id}
              disabled={shape.tutor === "off"}
              selected={shape.tutorModel === model.id}
              onSelect={() => set("tutorModel", model.id)}
            >
              {model.name}
            </ChoiceChip>
          ))}
        </ChoiceGroup>

        <ChoiceGroup label={t("Years of reviews already stored")} select="one">
          {[1, 3, 5, 10].map((years) => (
            <ChoiceChip key={years} even selected={shape.years === years} onSelect={() => set("years", years)}>
              {years}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
      </div>

      {bill.modelCapBinds && (
        <p
          className="rounded-[var(--r)] px-4 py-3 text-sm"
          style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
        >
          <TrParts
            template="The model line stops at {money}, and it stops there in the running app too. The daily budget in {file} has no off switch, so this is a ceiling rather than a forecast."
            parts={{ money: money(MODEL_CAP_USD, locale), file: <code>lib/usage/quota.ts</code> }}
          />
        </p>
      )}

      <div>
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Where it goes")}</h3>
        <ul className="space-y-2">
          {bill.lines.map((line) => {
            const figure = figureFor(line, t, locale);
            const meters = line.cost.kind === "charged" ? line.cost.meters ?? [] : [];
            return (
              <li
                key={line.service.id}
                className="rounded-[var(--r-lg)] border p-4"
                style={{ background: "var(--surface)", borderColor: "var(--rule)" }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {t(line.service.name)}
                  </span>
                  <span
                    className="tnum text-base font-bold"
                    style={{ color: figure.muted ? "var(--ink-3)" : "var(--ink)" }}
                  >
                    {figure.text}
                  </span>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
                  {planFor(line, t)}
                  {line.cost.kind === "given" && line.cost.licence
                    ? `, ${line.cost.licence}`
                    : ""}
                </p>
                {line.cost.kind === "given" && (
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                    {said(line.cost.gives, line.cost.givesAs, t, locale)}
                    {line.cost.wouldCostUsd
                      ? fill(t(", which would come to {money} a month to buy."), { money: money(line.cost.wouldCostUsd, locale) })
                      : "."}
                  </p>
                )}
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {said(line.cost.why, "whyAs" in line.cost ? line.cost.whyAs : undefined, t, locale)}
                </p>

                {meters.some((m) => m.included > 0) && (
                  <ul className="mt-3 space-y-2">
                    {meters.filter((m) => m.included > 0).map((figureRow) => {
                      const pct = (figureRow.used / figureRow.included) * 100;
                      const past = pct > 100;
                      return (
                        <li key={figureRow.label}>
                          <p className="tnum flex flex-wrap justify-between gap-x-2 text-xs" style={{ color: "var(--ink-3)" }}>
                            <span>{t(figureRow.label)}</span>
                            <span>{fill(t("{amount} of {allowance}"), { amount: amount(figureRow, t, locale), allowance: allowance(figureRow, t, locale) })}</span>
                          </p>
                          <div className="mt-1">
                            <Meter
                              pct={pct}
                              height={6}
                              label={fill(t("{label}, {amount} against {allowance}"), { label: t(figureRow.label), amount: amount(figureRow, t, locale), allowance: allowance(figureRow, t, locale) })}
                              tone={past ? "var(--blush)" : "var(--accent)"}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>
          {t("The same app at every size")}
        </h3>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {t("Each bar is ten times the learners of the one before it, and the heights are logarithmic, so a bar twice as tall is a bill many times larger. The shape to look at is the steps.")}
        </p>

        {/*
          The chart and its labels are two flex rows with the same children, so
          a bar and its number line up by construction rather than by a margin
          somebody guessed. Both are hidden from a reader using a screen reader,
          because the table underneath is the same six numbers said properly.
        */}
        <div aria-hidden>
          <div className="flex items-end gap-1.5" style={{ height: 96 }}>
            {ladder.map((rung) => {
              const height = Math.max(4, (Math.log10(rung.bill.totalUsd + 1) / Math.log10(tallest + 1)) * 100);
              const here = rung.learners === nearestRung(shape.learners);
              return (
                <span
                  key={rung.learners}
                  className="flex-1 rounded-t-[var(--r-sm)]"
                  style={{
                    height: `${height}%`,
                    background: here ? "var(--accent)" : "var(--accent-soft)",
                    border: `1px solid ${here ? "var(--accent)" : "var(--rule)"}`,
                    borderBottom: "none",
                  }}
                />
              );
            })}
          </div>
          <div className="flex gap-1.5 border-t pt-1" style={{ borderColor: "var(--rule)" }}>
            {ladder.map((rung) => (
              <span
                key={rung.learners}
                className="tnum flex-1 text-center text-xs"
                style={{
                  color: rung.learners === nearestRung(shape.learners) ? "var(--accent-deep)" : "var(--ink-3)",
                }}
              >
                {shorten(rung.learners)}
              </span>
            ))}
          </div>
        </div>

        {/* Focusable, because a region that scrolls sideways on a phone has to be
            reachable by a keyboard as well as a finger. */}
        <div className="scroll-host mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label={t("What the app costs at each size")}>
          <table className="w-full text-sm">
            <caption className="sr-only">
              {t("What the app costs a month at each size, and what that is per learner")}
            </caption>
            <thead>
              <tr style={{ color: "var(--ink-3)" }}>
                <th scope="col" className="label-xs py-1 pr-3 text-left">{t("Learners")}</th>
                <th scope="col" className="label-xs py-1 text-right">{t("A month")}</th>
                <th scope="col" className="label-xs py-1 pl-3 pr-3 text-right">{t("Given")}</th>
                <th scope="col" className="label-xs py-1 text-right">{t("Each")}</th>
              </tr>
            </thead>
            <tbody>
              {ladder.map((rung) => (
                <tr
                  key={rung.learners}
                  className="border-t"
                  style={{
                    borderColor: "var(--rule)",
                    color: rung.learners === nearestRung(shape.learners) ? "var(--ink)" : "var(--ink-2)",
                    fontWeight: rung.learners === nearestRung(shape.learners) ? 600 : 400,
                  }}
                >
                  <td className="tnum py-1.5 pr-3">{count(rung.learners, locale)}</td>
                  <td className="tnum py-1.5 text-right">{money(rung.bill.totalUsd, locale)}</td>
                  <td className="tnum py-1.5 pl-3 pr-3 text-right">{money(rung.bill.creditedUsd, locale)}</td>
                  <td className="tnum py-1.5 text-right">{perLearner(rung.bill.perLearnerUsd, t, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {t("The floor is the interesting end. The plans, the tooling, the mail and the domain come to about three hundred dollars a month before a single learner arrives, and most of that does not move when they do. So the first thousand people are nearly free to serve, and the cost per head falls by roughly a factor of ten for each decade. What grows instead is speech and the database, so past ten thousand the shape is set by how much is said aloud and how many years of reviews are being kept.")}
        </p>
      </div>

      <details className="rounded-[var(--r-lg)] border p-4" style={{ borderColor: "var(--rule)" }}>
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {fill(t("The {count} numbers we had to judge rather than measure"), { count: ASSUMPTIONS.length })}
        </summary>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {t("Everything else on this page came off a stopwatch, a database or somebody’s published price list. These are judgments, and they are here so you can disagree with a specific one rather than with the total.")}
        </p>
        <ul className="mt-3 space-y-3">
          {ASSUMPTIONS.map((a) => (
            <li key={a.id}>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {t(a.what)}: <span className="tnum">{a.value}</span> {unitFor(a.value, a.unit, t, locale)}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>{t(a.why)}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** A rung's learner count, short enough to sit under a bar on a phone. */
function shorten(learners: number): string {
  if (learners >= 1000) return `${learners / 1000}k`;
  return String(learners);
}

/** Which rung of the ladder the slider is nearest, for marking one of them. */
function nearestRung(learners: number): number {
  return SCALE_LADDER.reduce((best, rung) =>
    Math.abs(Math.log10(rung) - Math.log10(Math.max(1, learners)))
      < Math.abs(Math.log10(best) - Math.log10(Math.max(1, learners))) ? rung : best);
}
