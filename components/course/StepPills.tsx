"use client";

import type { ReactNode, Ref } from "react";
import { Check } from "lucide-react";
import { useT } from "@/components/Locale";

/**
 * Where a step stands: the one on screen, one finished, one opened and left
 * without finishing it, and one not reached yet.
 */
export type PillState = "here" | "done" | "visited" | "ahead";

export interface Pill {
  readonly key: string;
  readonly label: ReactNode;
  readonly state: PillState;
  /** A step that can be gone back to. Never the one on screen, never one ahead. */
  readonly onPress?: () => void;
}

/**
 * THE STEPS OF A LESSON, OR THE STAGES INSIDE ONE, AS A ROW OF PILLS.
 *
 * One drawing for the lesson's six steps, the write step's four stages and
 * the retell's three, because three copies had drifted three ways: a step
 * skipped with the button at the foot was ticked as done, one opened ahead
 * was painted done with no tick, and the pill you could press back to was
 * painted inline, which beats the class hover, so a pointer over it changed
 * nothing. The state comes from what was actually finished, the tick goes
 * with it (a hue never says it alone), and the colors are classes
 * (`.step-pill` in globals.css) so the hover can show.
 */
export function StepPills({ label, pills, currentRef }: { label: string; pills: readonly Pill[]; currentRef?: Ref<HTMLElement> }) {
  const t = useT();
  return (
    <ol className="flex flex-wrap gap-2" aria-label={label}>
      {pills.map((p) => {
        const inner = (
          <>
            {p.state === "done" && <Check size={12} aria-hidden />}
            {p.label}
            {p.state === "done" && <span className="sr-only">{`, ${t("done")}`}</span>}
          </>
        );
        return (
          <li key={p.key}>
            {p.onPress && p.state !== "here" && p.state !== "ahead" ? (
              <button type="button" onClick={p.onPress} className="step-pill tap-tint" data-state={p.state}>{inner}</button>
            ) : (
              <span
                ref={p.state === "here" ? (currentRef as Ref<HTMLSpanElement>) : undefined}
                tabIndex={p.state === "here" && currentRef ? -1 : undefined}
                aria-current={p.state === "here" ? "step" : undefined}
                className="step-pill outline-none"
                data-state={p.state}
              >
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
