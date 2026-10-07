import type { Mark } from "@/lib/games/sonad";

/**
 * WHAT EACH OF THE THREE LOOKS LIKE, SHARED BY THE BOARD AND ITS PREVIEW.
 *
 * Sõnad's board is a client component and Today's preview of it is a server
 * one, and a plain value cannot cross from the first to the second, so the
 * tables live here, in a module with no directive. The argument for them (three
 * kinds of object, hue as the second signal, a ring as the part that is not
 * colour, an ink for each fill) is the one written at the top of
 * `app/(app)/sonad/SonadSession.tsx`.
 */
export const HUE: Record<Mark, { bg: string; ink: string; ring: string }> = {
  here: { bg: "var(--sky)", ink: "var(--on-sky)", ring: "transparent" },
  elsewhere: { bg: "var(--butter-soft)", ink: "var(--butter-ink)", ring: "var(--butter-ink)" },
  absent: { bg: "var(--raised)", ink: "var(--ink-3)", ring: "transparent" },
};

/** How thick each ring is, which is the half of the signal that is not color. */
export const RING: Record<Mark, string> = { here: "0", elsewhere: "3px", absent: "0" };

/**
 * And the third channel, for a reader who gets neither the fill nor the ring.
 *
 * A fill and a ring are two signals and both of them are visual. Every circle
 * that has been marked says what it is in words, and the row announces its
 * tally once rather than reading 36 labels out on every guess, which is what
 * an `aria-live` on the whole board was doing.
 */
export const SPOKEN: Record<Mark, string> = {
  here: "in place",
  elsewhere: "in the word, elsewhere",
  absent: "not in the word",
};

export const EMPTY = { bg: "transparent", ink: "var(--ink)", ring: "var(--rule)" };
