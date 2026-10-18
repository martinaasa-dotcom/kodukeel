import { Flame, GraduationCap, Trophy } from "lucide-react";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";
import { filled } from "@/components/Filled";
import { caseByKey } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";
import type { RosterEntry } from "@/lib/classroom/roster";

/** The name a class uses, never the Latin one. See CLAUDE.md on case names. */
const caseName = (key: string) => caseByKey(key as CaseKey)?.et ?? key.toLowerCase();

/**
 * A class's roster, one row a member: rank, name, and the effort figures a
 * teacher sees, with the one case each member finds hardest for the teacher
 * alone. Drawn by the class page from the class's own summary and by
 * `/teachers` from an invented one, so the public sample is the real drawing
 * rather than a picture of it.
 */
export function RosterList({ entries, viewerId, isTeacher, locale }: {
  entries: RosterEntry[];
  viewerId: string;
  isTeacher: boolean;
  locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((entry, i) => {
        const isYou = entry.ownerId === viewerId;
        const quiet = entry.daysSinceLastReview === null || entry.daysSinceLastReview > 6;
        return (
          <li
            key={entry.ownerId}
            className="flex flex-wrap items-center gap-3 rounded-[var(--r)] border px-4 py-3"
            style={{
              borderColor: isYou ? "transparent" : "var(--edge)",
              background: isYou ? "var(--accent-soft)" : "var(--surface)",
              boxShadow: isYou ? "none" : "var(--depth-sm)",
            }}
          >
            <span className="tnum w-6 text-xs" style={{ color: "var(--ink-3)" }}>{i + 1}</span>
            {i === 0 && entry.reviewsThisWeek > 0
              ? <Trophy size={16} aria-hidden style={{ color: "var(--hard-ink)" }} />
              : <span className="w-4" aria-hidden />}
            {/*
              The name keeps at least 10rem, so where a translated count is
              long the streak and the count wrap under it, pushed to the right,
              rather than squeezing the name until its letters break apart.
            */}
            <span className="min-w-0 flex-1 basis-40">
              <span className="block text-base" style={{ color: "var(--ink)" }}>
                {entry.displayName}
                {entry.role === "TEACHER" && (
                  <GraduationCap size={13} aria-label={t("teacher")} className="ml-1.5 inline" style={{ color: "var(--ink-3)" }} />
                )}
              </span>
              {isTeacher && (
                <span className="block text-xs" style={{ color: quiet ? "var(--hard-ink)" : "var(--ink-3)" }}>
                  {entry.daysSinceLastReview === null
                    ? t("no reviews yet")
                    : entry.daysSinceLastReview === 0
                      ? t("reviewed today")
                      : fill(t("last review {days} ago"), { days: countOf(locale, entry.daysSinceLastReview, "day") })}
                  {", "}{fill(t("{words} known"), { words: countOf(locale, entry.wordsKnown, "word") })}
                  {/* Said aloud, as a count: effort, never what was said (VB-14, ADR-019). */}
                  {entry.spokenThisWeek > 0 && <>{", "}{fill(t("answers said aloud: {n}"), { n: entry.spokenThisWeek })}</>}
                  {entry.weakestCase && (
                    <>
                      {", "}
                      {filled(t("weakest: {case}"), {
                        case: (
                          <span style={{ color: "var(--hard-ink)" }}>
                            <span lang="et">{caseName(entry.weakestCase.grammCase)}</span> ({entry.weakestCase.accuracy}%)
                          </span>
                        ),
                      })}
                    </>
                  )}
                </span>
              )}
            </span>
            <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--ink-2)" }}>
              {entry.streak}<Flame size={13} aria-hidden style={{ color: entry.streak > 0 ? "var(--hard-ink)" : "var(--ink-3)" }} />
            </span>
            <span className="tnum ml-auto min-w-24 whitespace-nowrap text-right text-sm" style={{ color: "var(--ink)" }}>
              {countOf(locale, entry.reviewsThisWeek, "review")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
