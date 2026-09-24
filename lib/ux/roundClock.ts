/**
 * HOW LONG A TIMED ROUND RUNS, AND WHOSE CHOICE THAT IS.
 *
 * Three rounds in this app run to a clock: the Case Sprint at sixty seconds,
 * the daily quest at two minutes, and Target at eight seconds a shot that
 * tightens as the learner hits. Every one of those numbers was chosen for the
 * round it is in and every one was fixed, which is WCAG 2.2 success criterion
 * 2.2.1, Timing Adjustable, failed three times. The first two were brought
 * under this setting together and Target was missed, so an invariant now finds
 * every countdown in the app by its shape and holds its page to the pace. A learner who reads slowly, who is hearing
 * a card read out before answering it, or who types with one hand is not
 * playing a faster version of the same round. They are shut out of it.
 *
 * 2.2.1 is met by any one of three ways out: turn the limit off, extend it
 * once it is met, or let it be adjusted before it is met. The third is the one
 * taken here. Turning the clock off removes the round rather than opening it,
 * since what both of these are is a burst of volume against a stopwatch, and
 * an extension offered at the moment the time runs out interrupts the round it
 * is trying to rescue. Adjusting it beforehand leaves the round intact and
 * asks nothing of anybody mid-answer.
 *
 * A MULTIPLIER RATHER THAN A NUMBER OF SECONDS, because the rounds have
 * different bases for good reasons and one setting has to serve all of them.
 * Sixty seconds is right for flipping cards, two minutes is right for a round
 * that picks from four options and eight seconds is right for one shot at a
 * target, so a stored "180 seconds" would be generous in one and meaningless
 * in the others. What a learner is choosing is their own
 * pace, which is the same fact about them whichever round they open.
 *
 * TEN TIMES IS THE TOP OF THE TABLE, because that is the figure the criterion
 * itself names for an adjustment, and a ladder that stopped at double would
 * meet the letter of nothing.
 *
 * The mock examination's clock is deliberately not this setting's business. A
 * paper is imitating a timed state examination and untimed practice of a timed
 * paper measures something else, which `docs/16-exam.md` governs.
 *
 * Pure: a string in, a number of seconds out. No React, no Prisma, no clock.
 */

export const ROUND_PACES = [
  {
    id: "standard",
    label: "Standard",
    detail: "The round at the length it was written for.",
    multiplier: 1,
  },
  {
    id: "half-again",
    label: "Half again as long",
    detail: "A little more room on every card.",
    multiplier: 1.5,
  },
  {
    id: "double",
    label: "Twice as long",
    detail: "Time to read the card before answering it.",
    multiplier: 2,
  },
  {
    id: "five-times",
    label: "Five times as long",
    detail: "For hearing a card read out, or typing one-handed.",
    multiplier: 5,
  },
  {
    id: "ten-times",
    label: "Ten times as long",
    detail: "As long as the round can be. Nothing hurries you.",
    multiplier: 10,
  },
] as const;

export type RoundPace = (typeof ROUND_PACES)[number]["id"];

/**
 * The shipped pace, which a missing row reads as.
 *
 * A missing row has to be the behavior everybody already had, the way the
 * letter bar and the gloss language read theirs.
 */
export const DEFAULT_ROUND_PACE: RoundPace = "standard";

/** A stored value, or the default. Never throws: a stored row can be anything. */
export function roundPaceFrom(value: string | null | undefined): RoundPace {
  return ROUND_PACES.some((p) => p.id === value)
    ? (value as RoundPace)
    : DEFAULT_ROUND_PACE;
}

/**
 * The pace as a factor, for a round whose clock is not one length.
 *
 * `secondsFor` is right for a round that is one number of seconds long. Target
 * is not: it opens at eight seconds a shot and tightens toward a floor, and
 * both of those are fractions of a second apart, so a whole-second rounding
 * would move the standard round itself. It scales its own start and floor by
 * this instead.
 */
export function paceMultiplier(pace: RoundPace): number {
  return ROUND_PACES.find((p) => p.id === pace)?.multiplier ?? 1;
}

/**
 * How long a round of this base length runs at this pace, in whole seconds.
 *
 * Whole seconds because the clock counts down in them and a fraction would
 * spend a tick nobody is given. Rounded rather than floored, so the half again
 * of an odd base is not quietly shortened.
 */
export function secondsFor(baseSeconds: number, pace: RoundPace): number {
  return Math.round(Math.max(0, baseSeconds) * paceMultiplier(pace));
}

/**
 * A round's length in the unit somebody would say it in.
 *
 * "600 seconds" is arithmetic rather than a length of time, and the copy on
 * both start screens says how long the round runs. Seconds under two minutes,
 * where a minute would round away the difference between 60 and 90, and whole
 * minutes above wherever the figure is one.
 */
export function roundLength(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  if (whole >= 120 && whole % 60 === 0) {
    const minutes = whole / 60;
    return `${minutes} minutes`;
  }
  return `${whole} seconds`;
}
