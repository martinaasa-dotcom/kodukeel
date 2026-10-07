"use client";

import { useModuleFocus, useModuleNext } from "./moduleFocus";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

/**
 * WHERE A READING ENDS, INSIDE TONIGHT'S MODULE.
 *
 * A reading has no finish screen, and that was the report the module was
 * built on: the learner read the page, kept scrolling, and met a drill that
 * was not part of tonight because nothing said the page was over. So the page
 * says so, and the way on is the next thing under the sentence saying it.
 * Pressing it ticks the reading, which is the one step a log cannot prove.
 *
 * A desktop's only, for the reason `ModuleNext` gives: a phone still has its
 * bar, and one way on per screen is the rule.
 */
export function ReadingEnd() {
  const focus = useModuleFocus();
  const next = useModuleNext();
  const t = useT();
  if (!focus || !next) return null;
  return (
    <div
      data-reading-end=""
      className="hidden flex-wrap items-center justify-between gap-4 rounded-[var(--r-xl)] border p-5 md:flex"
      style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
    >
      <div>
        <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>{t("That's the end of the page")}</p>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("Move on and that's step {n} of {of} done."), { n: focus.n, of: focus.of })}
        </p>
      </div>
      <div className="ml-auto">{next}</div>
    </div>
  );
}
