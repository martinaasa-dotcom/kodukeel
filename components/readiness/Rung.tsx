import { Chip } from "@/components/ui";
import { RUNG_LABEL, type Rung } from "@/lib/readiness/rungs";

/**
 * One hue per rung, and each hue keeps the meaning the design system gives it
 * (docs/14-design-system.md §1): sky is known, so it is the rung you could
 * lead; butter is nearly, so it is following without answering; blush is
 * missed, so it is being lost. Take part wears the accent, which is the app's
 * own color and not a verdict, because it is the rung in the middle and the
 * one most people are on. Not started wears no hue at all: it was sky, which
 * meant "new", until sky became "known" and the two could not share it.
 */
export const RUNG_CHIP: Record<Rung, "good" | "accent" | "hard" | "again" | "neutral"> = {
  lead: "good",
  takePart: "accent",
  follow: "hard",
  lost: "again",
  unmet: "neutral",
};

export const RUNG_TILE: Record<Rung, "sky" | "accent" | "butter" | "blush" | "rule"> = {
  lead: "sky",
  takePart: "accent",
  follow: "butter",
  lost: "blush",
  unmet: "rule",
};

/** The ink for text about a rung, on a plain surface. */
export const RUNG_INK: Record<Rung, string> = {
  lead: "var(--sky-ink)",
  takePart: "var(--accent-deep)",
  follow: "var(--butter-ink)",
  lost: "var(--blush-ink)",
  unmet: "var(--ink-3)",
};

export function RungChip({ rung }: { rung: Rung }) {
  return <Chip tone={RUNG_CHIP[rung]}>{RUNG_LABEL[rung]}</Chip>;
}
