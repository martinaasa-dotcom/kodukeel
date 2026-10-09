import { Award, BookOpen, Headphones, MessagesSquare, Mic, MicOff, PenLine } from "lucide-react";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { NO_VALUE } from "@/lib/copy/values";
import { PRE_A1, type Confidence, type Placement, type SkillResult } from "@/lib/assessment/types";
import { levelLabel } from "./PlanPanel";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import type { ReactNode } from "react";
import { Lettered } from "@/components/HeroLetters";

/**
 * The result, said plainly.
 *
 * Four numbers and a paragraph of caveats, in that order, because the caveats
 * are the part that makes the numbers usable. A learner told "you are B1" by an
 * app they met half an hour ago will either believe it and sit an exam they fail,
 * or disbelieve it and ignore everything else here. Told "reading looks B1,
 * writing looks A2, from nine questions, which is thin", they have something
 * they can actually use.
 */

const SKILL_META: Record<string, { icon: typeof BookOpen; label: string; note: string }> = {
  reading: { icon: BookOpen, label: "Reading", note: "What words mean and which ending fits, in real sentences from the dictionary." },
  listening: { icon: Headphones, label: "Listening", note: "Estonian audio with nothing written down." },
  writing: { icon: PenLine, label: "Writing", note: "Typing the missing word, with the ending the sentence needs." },
  speaking: { icon: Mic, label: "Speaking", note: "How you rated yourself. It's never scored, and never part of your level." },
};

const CONFIDENCE_COPY: Record<Confidence, string> = {
  rough: "That's not many questions, so treat this as a first guess rather than a measurement.",
  indicative: "Enough to point in the right direction, but not enough to be sure of the exact level.",
  reasonable: "Enough to be worth acting on, though it's still not an exam.",
};

/** A figure with one decimal, written with the comma Russian and Ukrainian use. */
function decimal(n: number, locale: Locale): string {
  return locale === "en" ? String(n) : String(n).replace(".", ",");
}

function SkillRow({ result, locale }: { result: SkillResult; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  const meta = SKILL_META[result.skill]!;
  const Icon = meta.icon;
  const speaking = result.skill === "speaking";

  return (
    <li className="flex items-start gap-4 border-t py-4 first:border-t-0" style={{ borderColor: "var(--rule)" }}>
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--raised)", color: "var(--ink-2)" }}
      >
        <Icon size={17} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t(meta.label)}</span>
          <span className="tnum text-lg font-bold" style={{ color: "var(--accent-deep)" }}>
            {speaking
              ? result.selfRating
                ? fill(t("{n} of 4, your own rating"), { n: decimal(Math.round(result.selfRating * 10) / 10, locale) })
                : NO_VALUE
              : result.measured
                ? levelLabel(result.level, locale)
                : t("not measured")}
          </span>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>{t(meta.note)}</p>
        {!speaking && result.bands.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.bands.map((band) => (
              <Chip
                key={band.band}
                tone={band.ratio >= 2 / 3 ? "good" : band.ratio >= 0.5 ? "hard" : "again"}
                title={fill(t("{credit} of {items} at {band}"), { credit: decimal(Math.round(band.credit * 10) / 10, locale), items: band.items, band: band.band })}
              >
                {band.band} {Math.round(band.ratio * 100)}%
              </Chip>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export function ResultPanel({ result, heading = "Where you are", locale = "en" }: {
  result: Placement;
  heading?: ReactNode;
  /**
   * The language the panel is written in. The signed-in level check hands in
   * the learner's own; first run is drawn outside the shell and in English,
   * so it passes nothing.
   */
  locale?: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const measured = result.skills.filter((s) => s.measured && s.skill !== "speaking");
  const overall = levelLabel(result.overall, locale);

  return (
    <div className="flex flex-col gap-5" lang={locale}>
      <Lettered celebrate className="mb-2">
        <Card tone="night" className="md:p-9">
          <p className="label-xs" style={{ color: "var(--butter-ink)" }}>{typeof heading === "string" ? t(heading) : heading}</p>
          <p className="font-display mt-3 text-6xl font-bold leading-none xl:text-8xl" style={{ color: "var(--ink)" }}>
            {overall}
          </p>
          {result.nearly && (
            <p className="mt-2 text-lg font-semibold" style={{ color: "var(--accent-deep)" }}>
              {fill(t("A solid {level}, and nearly {next}."), { level: overall, next: levelLabel(result.nearly, locale) })}
            </p>
          )}
          <p className="mt-3 max-w-[58ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t(result.overall === null
              ? "Nothing got measured, so there's no level to show. That's a blank, not a zero."
              : result.overall === PRE_A1
                ? "You're not at A1 yet, and that's where almost everybody starts. It's a starting point, not a verdict."
                : result.nearly
                  ? "Your skills averaged out between two levels, so this shows the lower one. You're near the top of it, not the bottom."
                  : "This is the average of the skills we measured. One weak section doesn't drag the whole level down, and one strong one doesn't carry it.")}
            {result.ceiling && result.ceiling !== result.overall && (
              <> {fill(t("Your strongest skill looks like {level}, which is good to know too."), { level: levelLabel(result.ceiling, locale) })}</>
            )}
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            {countOf(locale, result.itemsAnswered, "scored question")}
            {result.decisive > 0 && result.decisive < result.itemsAnswered
              ? fill(t(", {n} of them at the levels that decided it"), { n: result.decisive })
              : ""}.{" "}
            {t(CONFIDENCE_COPY[result.confidence])}
          </p>
        </Card>
      </Lettered>

      <Card>
        <SectionTitle hint={fill(t("{n} of 3 skills measured"), { n: measured.length })}>{t("Skill by skill")}</SectionTitle>
        <ul className="flex flex-col">
          {result.skills.map((skill) => <SkillRow key={skill.skill} result={skill} locale={locale} />)}
        </ul>
      </Card>

      <Card>
        <SectionTitle>{t("What this is not")}</SectionTitle>
        {/* Four limits, each a mark and a line: a list of four paragraphs was
            the longest thing on the screen and said less than its first words. */}
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: <Award size={17} aria-hidden />, head: "Not a certificate", body: "The exams that count are the state ones, from A2 to C1. This was half an hour in an app." },
            { icon: <MicOff size={17} aria-hidden />, head: "Not a score of your speaking", body: "Just how confident you said you felt, and it's left out of your level." },
            { icon: <MessagesSquare size={17} aria-hidden />, head: "Not a conversation", body: "Reading at your own pace is easier than following Estonian at full speed." },
            { icon: <BookOpen size={17} aria-hidden />, head: "Built from this dictionary", body: "It covers a lot, but not the whole language." },
          ].map((limit) => (
            <li key={limit.head} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>
                {limit.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold" style={{ color: "var(--ink)" }}>{t(limit.head)}</span>
                <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{t(limit.body)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
