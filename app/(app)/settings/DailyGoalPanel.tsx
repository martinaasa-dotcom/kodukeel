"use client";

import { useState, useTransition } from "react";
import { setDailyGoal } from "@/app/actions";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

const PRESETS = [
  { label: "Casual", value: 10 },
  { label: "Regular", value: 15 },
  { label: "Serious", value: 25 },
  { label: "Intense", value: 40 },
] as const;

export function DailyGoalPanel({ currentGoal }: { currentGoal: number }) {
  const t = useT();
  const [goal, setGoal] = useState(currentGoal);
  const [, startTransition] = useTransition();

  const pick = (value: number) => {
    const was = goal;
    setGoal(value);
    // A preset that did not reach the server goes back to the one that did.
    startTransition(() => {
      void setDailyGoal(value).catch(() => setGoal(was));
    });
  };

  return (
    /*
      No `disabled` while the write is in flight. The chosen preset is local
      state and moves on the click, so disabling the row only made the answer
      you just gave un-hoverable for a moment, which reads as the control
      breaking rather than as it working.
    */
    <ChoiceGroup ariaLabel={t("Daily goal")} className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <ChoiceChip key={p.value} selected={goal === p.value} onSelect={() => pick(p.value)}>
          {fill(t("{label}, {n} a day"), { label: t(p.label), n: p.value })}
        </ChoiceChip>
      ))}
    </ChoiceGroup>
  );
}
