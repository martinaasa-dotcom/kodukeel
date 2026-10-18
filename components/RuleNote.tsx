"use client";

import { Lightbulb, TriangleAlert } from "lucide-react";

import { Braced } from "@/components/Braced";
import { useT } from "@/components/Locale";

/**
 * A GRAMMAR RULE ON A SCREEN: THE POINT, THEN THE TRAP, AS TWO THINGS.
 *
 * `lib/estonian/grammar.ts` gives every case and every topic a one-line
 * summary and the one mistake an English speaker makes with it, and four
 * screens drew those two lines four ways: a yellow note on the topic page, a
 * butter card under its own heading on the case page, a 12px caption on the
 * build-a-word walk, and two gray paragraphs one after the other in the
 * workbook's box. That last one was reported as too many words to take in,
 * and the reason was the shape rather than the length: a point and a warning
 * set as one run of gray prose are read as one long sentence.
 *
 * So the point is a line in the body ink with a lightbulb, and the warning is
 * a callout with its own heading, "Watch out", in the tint the palette keeps
 * for "nearly, a warning that isn't a failure" (`--hard-soft`). Each can be
 * found by the eye before it is read. One component, so a fifth screen cannot
 * invent a fifth drawing.
 *
 * Both take the English and translate it here, keyed on the English like
 * every other line (`lib/copy/i18n/areas/grammarTopics.ts` and
 * `grammarCases.ts` already carry every summary and every warning), so a
 * server page and a client round hand it the same thing. No Estonian: the two
 * lines come from the module that holds none.
 */
export function RuleNote({ summary, watchOut, className = "" }: {
  summary: string;
  watchOut: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={`flex flex-col gap-3 ${className}`} data-rule-note>
      <p className="flex items-start gap-2.5 text-base font-semibold leading-snug" style={{ color: "var(--ink)" }}>
        <Lightbulb size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} />
        <span><Braced text={t(summary)} /></span>
      </p>
      <WatchOut text={watchOut} />
    </div>
  );
}

/** The one mistake an English speaker makes, as a callout with its own heading. */
export function WatchOut({ text, className = "" }: { text: string; className?: string }) {
  const t = useT();
  return (
    <div className={`rule-watch ${className}`} data-watch-out>
      <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--hard-ink)" }} />
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--hard-ink)" }}>
          {t("Watch out")}
        </p>
        <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink)" }}><Braced text={t(text)} /></p>
      </div>
    </div>
  );
}
