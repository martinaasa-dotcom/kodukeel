"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRoundPace } from "@/app/actions";
import { ChoiceSegment } from "@/components/Choice";
import { ROUND_PACES, roundLengthIn, secondsFor, SPRINT_SECONDS, type RoundPace } from "@/lib/ux/roundClock";
import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

/**
 * How long a timed round runs.
 *
 * Each option says what it does to the sprint as well as what it is, because
 * "five times as long" is a ratio and "five minutes" is the thing somebody is
 * choosing. The quest stretches from its own two minutes by the same figure,
 * and Target from its eight seconds a question.
 */
export function RoundPacePanel({ current }: { current: RoundPace }) {
  const t = useT();
  const locale = useLocale();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: RoundPace) => {
    setValue(next);
    start(async () => {
      const landed = await setRoundPace(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("How much time the timed games give you")}
      value={value}
      disabled={pending}
      onSelect={pick}
      options={ROUND_PACES.map((option) => ({
        id: option.id,
        title: t(option.label),
        detail: fill(t("{length} in the sprint. {detail}"), { length: roundLengthIn(locale, secondsFor(SPRINT_SECONDS, option.id)), detail: t(option.detail) }),
      }))}
    />
  );
}
