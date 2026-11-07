/**
 * AGAIN, FASTER, AS ARITHMETIC (B1 on, `components/course/AgainFaster.tsx`).
 *
 * Three windows that shrink, and for each go the words that came across and
 * how many a minute that was. A minute is reckoned on the time the learner
 * actually spoke (or typed) inside the window, floored at five seconds so a
 * one-word go said in a second does not read as sixty words a minute.
 *
 * Pure: no React, no Prisma, no clock.
 */

/** The three windows, in seconds: the 4/3/2 exercise, scaled to one answer. */
export const FASTER_SECONDS = [90, 60, 45] as const;

/**
 * The windows one again-faster runs in, at the standard pace: its own where it
 * names them (B2 shortens them part by part, §13.5), B1's three otherwise.
 */
export function fasterWindows(faster: { readonly seconds?: readonly number[] }): readonly number[] {
  return faster.seconds ?? FASTER_SECONDS;
}

export interface Go {
  /** The window this go had. */
  readonly window: number;
  /** Words that came across. */
  readonly words: number;
  /** Words a minute, rounded. */
  readonly perMinute: number;
  /**
   * What came across, as the recognizer wrote it down or the learner typed
   * it: what today's pattern is read off after the go (`fasterChecks.ts`).
   */
  readonly said: string;
  /** Whether it was said into the microphone, so the screen can say a heard ending may be the recognizer's. */
  readonly spoken: boolean;
}

export function goOf(said: string, took: number, windowSeconds: number, spoken = false): Go {
  const words = [...said.matchAll(/\p{L}+/gu)].length;
  const seconds = Math.max(5, Math.min(windowSeconds, Number.isFinite(took) ? took : windowSeconds));
  return { window: windowSeconds, words, perMinute: words === 0 ? 0 : Math.round((words / seconds) * 60), said: said.trim(), spoken };
}
