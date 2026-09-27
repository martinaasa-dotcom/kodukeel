"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import { resetEveryonesCourse } from "@/app/actions";
import { NOT_REACHED } from "@/lib/copy/values";
import type { CourseResetPlan } from "@/lib/progress/courseReset";

/**
 * The course reset as a button, so it runs on the database connection the
 * site already has rather than on a secret nobody remembers setting.
 *
 * It says what it will do before it does it: who is left alone by name, how
 * many learners lose their module ticks, and that decks and their words stay.
 * The press asks once more, because it cannot be undone.
 */
export function ResetCourse({ plan }: { plan: CourseResetPlan }) {
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const [said, setSaid] = useState<string | null>(null);

  const press = () => {
    if (!sure) {
      setSure(true);
      return;
    }
    start(async () => {
      const result = await resetEveryonesCourse(plan.keep).catch(() => null);
      if (!result) setSaid(NOT_REACHED);
      else if (!result.ok) setSaid(result.error);
      else {
        setSaid(
          `Done. ${result.ticks} module ticks removed. ${result.kept} learner${result.kept === 1 ? "" : "s"} left alone. Decks and the dictionary are as they were.`,
        );
      }
      setSure(false);
    });
  };

  return (
    <Card className="mt-8">
      <SectionTitle>Reset course progress</SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Everybody starts the current course again from the first evening of their level. Only the
        module progress goes: decks, the words in them, the dictionary and review history all stay.
      </p>

      <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
        {plan.learners} learner{plan.learners === 1 ? "" : "s"} would be reset ({plan.ticks} ticks).
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        Left alone, because the name contains &ldquo;{plan.keep}&rdquo;:{" "}
        {plan.kept.length === 0
          ? "nobody matched, so everybody would be reset."
          : plan.kept.map((k) => k.names.join(", ")).join("; ")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {sure && (
          <Button variant="ghost" onClick={() => setSure(false)} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={press} disabled={pending || plan.learners === 0}>
          {sure ? "Yes, reset their progress" : "Reset course progress"}
        </Button>
      </div>
      <p aria-live="polite" className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {said}
      </p>
    </Card>
  );
}
