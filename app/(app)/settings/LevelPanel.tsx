"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCourseLevel } from "@/app/actions";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { LEVELS, type Level } from "@/lib/collections/syllabus";
import { Explain } from "@/components/Explain";

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
 * It is a row of five chips rather than a card each, because there is nothing
 * to explain per option that the line underneath does not say once, and this
 * is a screen somebody is scanning. What it says out loud is what it changes,
 * since a picker whose effect is invisible reads as decoration: the course
 * opens where you point it, and the words offered in review, practice and the
 * dictionary move with it.
 *
 * `router.refresh()` rather than a local guess about what the server holds.
 * Which level wins is `courseLevelFor`'s decision, not this component's: a
 * fresh level check outranks a choice made before it, and the honest way to
 * show that is to re-render from the answer the server actually gives.
 */
export function LevelPanel({ current, measured }: {
  current: Level;
  /** True when a level check is what the app is currently going on. */
  measured: boolean;
}) {
  const [level, setLevel] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Level) => {
    if (next === level) return;
    setLevel(next);
    start(async () => {
      const landed = await setCourseLevel(next).then(() => true).catch(() => false);
      if (!landed) { setLevel(level); return; }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ChoiceGroup ariaLabel="Your level" className="flex flex-wrap gap-2">
        {LEVELS.map((option) => (
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
      <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
        {measured
          ? "This is where your last level check put you. If it doesn't feel right, pick another. We'll go with yours until your next check."
          : "Change it whenever it doesn't feel right. If you take a level check, its result will replace this."}
      </p>
      <Explain label="What the level decides">
        Your level decides which part of the course you&rsquo;re on, which new words come next, and
        which words the games and the dictionary suggest. If you change it, tonight&rsquo;s module
        moves to match. Nothing you&rsquo;ve already learned is lost, and
        finished evenings stay finished.
      </Explain>
    </div>
  );
}
