/**
 * WHAT WAS SAID ALOUD THIS WEEK, READ OFF THE LOG (docs/39-speech.md SP-8,
 * docs/41-fifth-batch.md VB-14).
 *
 * "Said aloud this week: 23 answers, about 4 minutes" on Progress, derived from
 * `Review.spoken` on every request and never kept as a counter (ADR-014). The
 * minutes are the answers' own time on the card, which is the closest honest
 * figure the log has to time spent speaking; a tab left open is capped at ten
 * minutes a row by `writeGrade`, and a row nobody timed counts nothing. Where
 * no row was timed at all the sentence names no minutes rather than one.
 *
 * A count and a duration, said in plain ink and never as a verdict: speaking
 * more is not a score, and the app withdrew its streaks of that kind. Pure.
 */
export interface SpokenWeek {
  /** Answers given aloud in the last seven days. */
  readonly answers: number;
  /**
   * Their time on the card, in whole minutes, at least one where any of them
   * was timed. Null where none was: a conversation's grades and a numbers
   * round write no time, and "about 1 minute" over answers nobody timed would
   * be a figure the log does not hold.
   */
  readonly minutes: number | null;
}

export const SPOKEN_WINDOW_DAYS = 7;

export function spokenThisWeek(
  rows: readonly { reviewedAt: Date; durationMs: number; spoken: boolean }[],
  now: Date,
): SpokenWeek {
  const from = now.getTime() - SPOKEN_WINDOW_DAYS * 86_400_000;
  let answers = 0;
  let ms = 0;
  for (const row of rows) {
    if (!row.spoken) continue;
    const at = row.reviewedAt.getTime();
    if (at < from || at > now.getTime()) continue;
    answers += 1;
    ms += Math.max(0, row.durationMs);
  }
  return { answers, minutes: ms === 0 ? null : Math.max(1, Math.round(ms / 60_000)) };
}
