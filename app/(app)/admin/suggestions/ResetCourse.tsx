"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import { useReaderDate } from "@/components/LocalDate";
import { resetCourseFor } from "@/app/actions";
import { NOT_REACHED } from "@/lib/copy/values";

export interface ResetRow {
  ownerId: string;
  name: string | null;
  ticks: number;
  /** ISO, because a Date cannot cross to a client component. */
  lastAt: string | null;
}

/**
 * Course progress, one learner at a time or everybody at once.
 *
 * Nobody is reset until somebody presses. Each row resets that learner alone,
 * and the button under the list resets everybody on it; both ask once more
 * first, because neither can be undone. What goes is module progress only:
 * decks, the words in them, the dictionary and review history stay.
 */
export function ResetCourse({ rows }: { rows: readonly ResetRow[] }) {
  const [sure, setSure] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [said, setSaid] = useState<string | null>(null);
  const date = useReaderDate();

  const reset = (target: string, label: string) => {
    if (sure !== target) {
      setSure(target);
      return;
    }
    start(async () => {
      const result = await resetCourseFor(target).catch(() => null);
      if (!result) setSaid(NOT_REACHED);
      else if (!result.ok) setSaid(result.error);
      else setSaid(`Done: ${label} reset, with ${result.ticks} ticked steps cleared. Decks and the dictionary are untouched.`);
      setSure(null);
    });
  };

  return (
    <Card className="mt-8">
      <SectionTitle hint={`${rows.length} ${rows.length === 1 ? "learner" : "learners"}`}>
        Reset course progress
      </SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        A reset sends a learner back to the first evening of their level. Only their course progress
        goes. Their deck, its words, the dictionary and their review history all stay.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          Nobody has any course progress to reset.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((row) => {
            const label = row.name ?? "This learner";
            const asking = sure === row.ownerId;
            return (
              <li
                key={row.ownerId}
                className="flex flex-wrap items-center gap-3 rounded-[var(--r)] border px-3 py-2"
                style={{ borderColor: "var(--rule-soft)", background: "var(--surface)" }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {row.name ?? "No name set"}
                  </span>
                  <span className="tnum block text-sm" style={{ color: "var(--ink-2)" }}>
                    {row.ticks} ticks
                    {row.lastAt ? `, last on ${date(new Date(row.lastAt), { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </span>
                </span>
                {asking && (
                  <Button variant="ghost" size="sm" onClick={() => setSure(null)} disabled={pending}>
                    Cancel
                  </Button>
                )}
                <Button
                  variant={asking ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => reset(row.ownerId, label)}
                  disabled={pending}
                >
                  {asking ? "Yes, reset" : "Reset"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {sure === "all" && (
            <Button variant="ghost" onClick={() => setSure(null)} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button variant="danger" onClick={() => reset("all", "Everybody")} disabled={pending}>
            {sure === "all" ? `Yes, reset all ${rows.length}` : "Reset everybody"}
          </Button>
        </div>
      )}

      <p aria-live="polite" className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {said}
      </p>
    </Card>
  );
}
