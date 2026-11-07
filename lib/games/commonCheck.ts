/**
 * THE RULES OF CHECK YOURSELF, KEPT APART FROM THE SCREEN.
 *
 * Pure, so the grade a word earns is tested rather than driven. The screen is
 * `app/(app)/review/common/[group]/check/CheckSession.tsx`.
 */

/** Which side is shown: English shown and Estonian typed, or the other way round. */
export type CheckDirection = "en-et" | "et-en";

/**
 * How many goes a word gets. A learner checking what they already know has
 * often got the word and slipped, so a miss is one more go rather than the
 * answer, and the second go is where the hint ladder opens.
 */
export const CHECK_TRIES = 2;

/**
 * What a right answer earns, on the scheduler's own scale.
 *
 * `suggested` is the marker's: Good for a clean hit, Hard for a dropped
 * diacritic or a slip of the hand. Right on the second go is never better than
 * Hard, because the word did not come back first time. A hint lowers it
 * further, which the caller applies with the ladder's own ceiling.
 */
export function checkRating(suggested: 1 | 2 | 3, missesBefore: number): 1 | 2 | 3 {
  if (missesBefore <= 0) return suggested;
  return Math.min(suggested, 2) as 1 | 2;
}
