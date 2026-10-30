"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCourseLevel, setCourseStart } from "@/app/actions";
import { Button } from "@/components/Button";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { HELD_CHOICES, type HeldChoice } from "@/lib/course/placement";
import { Explain } from "@/components/Explain";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";

/**
 * The level the app holds for you, changed by hand.
 *
 * Every other way this app arrives at a level is a measurement, and a
 * measurement is the wrong instrument for at least three ordinary situations.
 * Somebody was moved up in the class they sit in every Tuesday. Somebody sat
 * the real state examination and has the certificate. Somebody read a level
 * check taken on a bad evening and knows it is wrong. Until this button there
 * was no answer to any of them except taking the check again and hoping, and
 * a course that will not listen when you tell it where you are is a course you
 * stop telling things to.
 *
 * A LEVEL PICKED IS A LEVEL HELD, AND THE SCREEN SAYS WHERE IT SENDS YOU. A0
 * is "nothing yet"; every other chip is the level you have, and the course
 * opens on the next one (`lib/course/placement.ts`). Landing one level above
 * the chip you pressed is a surprise unless it is said, so the line under the
 * chips says it, and the start that goes over the level held first sits under
 * that, for anybody who would rather not move on yet.
 *
 * A REFUSAL IS SAID. Moving up through the lessons, A1 to B1, waits on their checks, and
 * the picker used to read any answer as success, so the chip moved and the
 * course did not, with nothing to say why. It puts the chip back and prints
 * the reason.
 *
 * `router.refresh()` rather than a local guess about what the server holds.
 * Which level wins is `courseLevelFor`'s decision, not this component's: a
 * fresh level check outranks a choice made before it, and the honest way to
 * show that is to re-render from the answer the server actually gives.
 */
export function LevelPanel({ current, measured, destinations, start: courseStart }: {
  current: HeldChoice;
  /** True when a level check is what the app is currently going on. */
  measured: boolean;
  /** The level each choice opens the course on, worked out on the server. */
  destinations: Record<HeldChoice, string>;
  /**
   * The two starts for the level held, where the learner is led and holds one:
   * going over it (`held`) or the level past it (`next`). Null where there is
   * only one start.
   */
  start: { held: string; next: string; goingOver: boolean } | null;
}) {
  const t = useT();
  const [level, setLevel] = useState(current);
  const [refused, setRefused] = useState<string | null>(null);
  const [pending, begin] = useTransition();
  const router = useRouter();
  /* The chip shown is the level the course is going over, so the line under it says so. */
  const goingOver = courseStart?.goingOver === true && level === current;

  const pick = (next: HeldChoice) => {
    if (next === level) return;
    setLevel(next);
    setRefused(null);
    begin(async () => {
      const result = await setCourseLevel(next).catch(() => null);
      if (!result) { setLevel(level); setRefused(t(NOT_REACHED)); return; }
      if (!result.ok) { setLevel(level); setRefused(t(result.error)); return; }
      router.refresh();
    });
  };

  const switchStart = (which: "held" | "next") => {
    setRefused(null);
    begin(async () => {
      const result = await setCourseStart(which).catch(() => null);
      if (!result) { setRefused(t(NOT_REACHED)); return; }
      if (!result.ok) { setRefused(t(result.error)); return; }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ChoiceGroup ariaLabel={t("Your level")} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {HELD_CHOICES.map((option) => (
          <ChoiceChip
            key={option}
            even
            disabled={pending}
            selected={level === option}
            onSelect={() => pick(option)}
          >
            {option}
          </ChoiceChip>
        ))}
      </ChoiceGroup>
      <p className="text-base" style={{ color: "var(--ink-2)" }} data-opens-on={destinations[level]}>
        {level === "A0"
          ? fill(t("A0 is just starting. You’ll start on {next}."), { next: destinations[level] })
          : goingOver
            ? fill(t("You have {level}, and you’re going over it before moving on to {next}."), { level, next: destinations[level] })
            : fill(t("You have {level}, so you’ll start on {next}."), { level, next: destinations[level] })}
      </p>
      {refused && (
        <p role="alert" className="text-base" style={{ color: "var(--ink-2)" }}>{refused}</p>
      )}
      {courseStart && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2" data-go-over>
          {!courseStart.goingOver && (
            <p className="text-base" style={{ color: "var(--ink-2)" }}>
              {fill(t("Rather go over {level} before moving on?"), { level: courseStart.held })}
            </p>
          )}
          <Button variant="ghost" disabled={pending} onClick={() => switchStart(courseStart.goingOver ? "next" : "held")}>
            {fill(t("Start on {level} instead"), { level: courseStart.goingOver ? courseStart.next : courseStart.held })}
          </Button>
        </div>
      )}
      <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
        {t(measured
          ? "This is where your last level check put you. If it doesn't feel right, pick another. We'll go with yours until your next check."
          : "Change it whenever it doesn't feel right. If you take a level check, its result will replace this.")}
      </p>
      <Explain label={t("What the level decides")}>
        {t("Your level decides which part of the course you’re on, which new words come next, and which words the games and the dictionary suggest. If you change it, today’s module moves to match. Nothing you’ve already learned is lost, and finished evenings stay finished.")}
      </Explain>
    </div>
  );
}
