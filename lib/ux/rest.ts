/**
 * MOTION THAT STARTS BY ITSELF RESTS WITHIN FIVE SECONDS (WCAG 2.2.2).
 *
 * Moving or auto-updating content that starts on its own, runs beside other
 * content and goes on past five seconds needs a way to pause it, and a page of
 * decoration has no business carrying pause buttons. So every idle loop a
 * public page draws runs a whole number of cycles that ends inside five
 * seconds of starting and then rests on its still frame, which is where every
 * loop here starts and ends, so stopping is not a jump. The letters on the
 * landing card do it in `lib/ux/letterMotion.ts`, the CSS loops under
 * `.motion-rests` in `app/globals.css`, and the two cards that turn on a
 * timer count their steps through `stepsWithin`.
 *
 * What answers a press, a hover or a scroll is not held to it: it starts
 * because somebody did something, and it ends when they stop.
 */
export const MOTION_LIMIT_MS = 5000;

/** How many timed steps of `stepMs` fit before the motion has to rest. */
export function stepsWithin(stepMs: number): number {
  if (!(stepMs > 0)) return 0;
  return Math.floor(MOTION_LIMIT_MS / stepMs);
}
