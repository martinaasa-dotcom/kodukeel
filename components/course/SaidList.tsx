"use client";

import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { LineFindings } from "@/components/course/LineFindings";
import { Speak } from "@/components/Speak";
import { VERDICT_CLASS } from "@/lib/ux/verdict";
import type { SaidResult } from "@/lib/course/lessons/said";
import { NOTES } from "@/lib/course/lessons/practice";

/**
 * EVERYTHING SAID ON THE SAY IT STEP, ONE SENTENCE AT A TIME.
 *
 * The step ended on one line, "You said today's Estonian out loud", and a
 * learner who had told a story back with two verbs in the wrong person had no
 * way to see that, then or later. This is the list instead: each thing asked,
 * what the learner said, what the two readings found (`LineFindings`), and
 * one way to say it, in the order it was asked. It is what the step shows
 * when it is over and what the lesson's recap shows when it is opened again.
 *
 * A row with nothing read (an answer the marker called the line, or one shown
 * without being answered) says what the marker said, or nothing.
 */
export function SaidList({ results, about }: { results: readonly SaidResult[]; about?: string }) {
  const t = useT();
  const locale = useLocale();
  if (results.length === 0) return null;
  return (
    <ol className="flex flex-col gap-5" data-said-list>
      {results.map((r, i) => (
        <li key={i} className="flex flex-col gap-2">
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{r.label}</p>
          {r.cue && <p className="text-base font-semibold" style={{ color: "var(--ink)" }}><LessonText text={r.cue} locale={locale} /></p>}
          <p className="text-base" style={{ color: "var(--ink-2)" }}>
            <span>{r.said ? t("You said:") : t("Not answered.")}</span>{" "}
            {r.said && <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{r.said}</span>}
          </p>
          {r.grade !== null
            ? <LineFindings grade={r.grade} differences={r.differences} findings={r.findings} about={r.kind === "retell" ? about : undefined} announced="list" />
            : r.note && r.said && (
              <div className={`verdict-panel ${r.note === NOTES.right ? VERDICT_CLASS.right : VERDICT_CLASS.nearly}`}><p>{t(r.note)}</p></div>
            )}
          {r.model && r.grade !== "right" && (
            <div className="flex flex-col gap-0.5">
              <p className="label-xs" style={{ color: "var(--ink-3)" }}>{r.kind === "retell" ? t("In the story:") : t("One way to say it")}</p>
              <div className="flex items-center gap-2">
                <Speak text={r.model} size={14} transient />
                <p lang="et" className="text-base font-bold" style={{ color: "var(--ink)" }}>{r.model}</p>
              </div>
              {r.modelEn && <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={r.modelEn} locale={locale} /></p>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
