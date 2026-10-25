/**
 * MOTION THAT STARTS BY ITSELF RESTS WITHIN FIVE SECONDS (WCAG 2.2.2).
 *
 * Moving or auto-updating content that starts on its own, runs beside other
 * content and goes on past five seconds needs a way to pause it, and a screen
 * of decoration has no business carrying pause buttons. So every idle loop
 * anywhere in the app, public page or signed in, runs a whole number of
 * cycles, or a fraction of one that stops on a frame worth stopping on, that
 * ends inside five seconds of starting and then rests. The mark, Anu, the
 * mascot, a scene's people, the situations board's lamps, Today's leading card
 * and the quest's button do it in `app/globals.css` and `app/hero-fan.css`,
 * the letters on the landing card in `lib/ux/letterMotion.ts`, and the two
 * landing cards that turn on a timer count their steps through `stepsWithin`.
 * `scripts/invariants/motion-rests.ts` holds every stylesheet and every inline
 * animation in `app/` and `components/` to it.
 *
 * What answers a press, a hover or a scroll is not held to it: it starts
 * because somebody did something, and it ends when they stop. Nor is a
 * spinner or a set of dots shown only while something loads, which the
 * criterion exempts, nor a running clock that is the activity itself.
 */
export const MOTION_LIMIT_MS = 5000;

/** How many timed steps of `stepMs` fit before the motion has to rest. */
export function stepsWithin(stepMs: number): number {
  if (!(stepMs > 0)) return 0;
  return Math.floor(MOTION_LIMIT_MS / stepMs);
}
