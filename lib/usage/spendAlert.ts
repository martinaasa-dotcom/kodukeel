/**
 * WHEN THE DAY'S MODEL SPEND IS WORTH TELLING THE OPERATOR ABOUT.
 *
 * The global daily cap is the hard ceiling on the bill, and the first anybody
 * heard of reaching it was learners being refused. So the ledger asks, as it
 * books each call, whether that booking carried the day's total across half
 * of the cap, four fifths of it, or all of it, and the call path reports the
 * crossing through the error log, whose one-a-kind-a-day rule turns it into
 * one mail per line per day.
 *
 * Pure: the ledger already holds the total before the booking, the booking
 * and the cap inside its transaction, so this adds no query.
 */
export const SPEND_THRESHOLDS = [50, 80, 100] as const;
export type SpendThreshold = (typeof SPEND_THRESHOLDS)[number];

/** The highest line `after` reaches that `before` did not, or null. */
export function thresholdCrossed(before: number, after: number, cap: number): SpendThreshold | null {
  if (!(cap > 0)) return null;
  let crossed: SpendThreshold | null = null;
  for (const pct of SPEND_THRESHOLDS) {
    const line = (cap * pct) / 100;
    if (after >= line && before < line) crossed = pct;
  }
  return crossed;
}

/**
 * The fixed sentence for each line. It is the error's fingerprint, so it holds
 * no figure, not even the line's own: a message carrying the amount would be
 * a new kind of error on every booking, and every booking would be mailed. So
 * the lines are said in words, and the figures go in the record's `extra`.
 */
export const SPEND_MESSAGE: Record<SpendThreshold | "fallback", string> = {
  50: "Daily model spend passed half of the cap",
  80: "Daily model spend passed four fifths of the cap",
  100: "Daily model spend reached the cap",
  fallback: "The fallback model budget for today is spent",
};
