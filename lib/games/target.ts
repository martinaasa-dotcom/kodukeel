/**
 * How long Target gives a question.
 *
 * One question at a time against a shrinking clock: eight seconds for the
 * first, a quarter of a second off for every hit, never under three and a
 * half. The round tightens around whoever is playing it rather than around a
 * difficulty somebody picked.
 *
 * THE LEARNER'S PACE SCALES ALL THREE. These three numbers were typed into
 * the session and nobody could move them, which is WCAG 2.2.1, Timing
 * Adjustable, failed on a practice round: the Case Sprint and the daily quest
 * had been made adjustable and this was the third clock, left out. A learner
 * who reads slowly, who hears the card read out first, or who answers with one
 * hand is not playing a harder Target, they are shut out of it. So the
 * allowance is multiplied by the pace from `lib/ux/roundClock.ts`, the one
 * setting every timed practice round reads, and the shape of the round, the
 * start, the step and the floor, stays the same at every pace.
 *
 * Kept pure so the arithmetic can be driven without a browser; the session
 * counts down whatever this returns.
 */

/** Seconds for the first shot, at the standard pace. */
export const TARGET_START_S = 8;
/** The least a shot ever gets at the standard pace, however far in you are. */
export const TARGET_FLOOR_S = 3.5;
/** How much each hit takes off the next shot at the standard pace. */
export const TARGET_STEP_S = 0.25;

/** Seconds allowed for the next shot, after `hits` hits, at this pace multiplier. */
export function shotSeconds(hits: number, multiplier: number): number {
  const scale = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  const standard = Math.max(TARGET_FLOOR_S, TARGET_START_S - Math.max(0, hits) * TARGET_STEP_S);
  return standard * scale;
}
