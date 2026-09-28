import { Chip } from "@/components/ui";
import { RUNG_LABEL, type Rung } from "@/lib/readiness/rungs";

/**
 * A rung is a reading of the log, not a verdict on an answer, so it is one hue
 * in steps (docs/14-design-system.md, "A reading is not a verdict"): lead is
 * the accent at full strength, take part a step under, follow a step under
 * that, lost the faintest, and not started is the empty track. It was sky,
 * butter and blush, a traffic light over somebody's progress, and the bar on
 * Progress read as red and green to the person it was about. The words and the
 * counts beside every bar say which rung is which; the strength says "more".
 */
export const RUNG_CHIP: Record<Rung, "accent" | "neutral"> = {
  lead: "accent",
  takePart: "accent",
  follow: "neutral",
  lost: "neutral",
  unmet: "neutral",
};

/** The fill for a rung in a bar or a legend dot. */
export const RUNG_FILL: Record<Rung, string> = {
  lead: "var(--scale-4)",
  takePart: "var(--scale-3)",
  follow: "var(--scale-2)",
  lost: "var(--scale-1)",
  unmet: "var(--scale-track)",
};

/** The ink for text about a rung, on a plain surface. */
export const RUNG_INK: Record<Rung, string> = {
  lead: "var(--accent-deep)",
  takePart: "var(--accent-deep)",
  follow: "var(--ink-2)",
  lost: "var(--ink-2)",
  unmet: "var(--ink-3)",
};

export function RungChip({ rung }: { rung: Rung }) {
  return <Chip tone={RUNG_CHIP[rung]}>{RUNG_LABEL[rung]}</Chip>;
}
