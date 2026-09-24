/**
 * Target's clock, before the learner's own pace is applied to it.
 *
 * Out here rather than in `TargetSession.tsx` because the page has to read it
 * too: the page works out the seconds from the stored pace and hands them
 * down, and a server component importing a value from a `"use client"` module
 * is handed a reference rather than the value (`lib/games/emojiBoard.ts` is the
 * same move for the same reason).
 *
 * Only the start and the floor are lengths. The step is how much each hit
 * tightens the next shot, which is the round's pressure rather than its
 * length, so a learner who asked for twice as long gets twice as long to
 * answer and the same sense of the clock closing in.
 */

/** Seconds for the first shot. */
export const TARGET_START_S = 8;
/** The least time a shot ever gets, however far in you are. */
export const TARGET_FLOOR_S = 3.5;
/** How much of a second each hit takes off the clock. */
export const TARGET_STEP_S = 0.25;
/** The clock ticks in tenths, so a scaled length is rounded to one. */
export const TARGET_TICK_S = 0.1;
