/**
 * A record of study: what the log can say about somebody's time here, and
 * nothing it cannot.
 *
 * A learner who has studied for a year sometimes needs to show somebody that
 * they did: an employer paying for it, a teacher, an integration adviser. A
 * certificate is the wrong answer, because nothing in this app has been
 * checked by an examiner and in Estonia a level is proved by the state
 * examination alone. What the app does hold is a record of study, which is a
 * true thing with a date on it: hours, days, answers, and the measurements it
 * took, each named for what it is.
 *
 * Pure. The rows are gathered in `lib/progress/record.ts`.
 */
import { studyHours, type TimedReview } from "./pace";

/** Said on the record itself, where anybody reading it will see it. */
export const NOT_A_CERTIFICATE =
  "This is a record of study kept by Kodukeel from its own log. It is not a certificate, and nothing on it has been checked by an examiner.";

/** The one thing that does prove a level, named so the record points at it. */
export const WHAT_PROVES_A_LEVEL =
  "In Estonia a language level is proved by the state examination, which Harno runs.";

export interface StudyTotals {
  /** Hours in sittings, by the same rule the plan reads a pace with. */
  readonly hours: number;
  /** Calendar days, in the learner's zone, with at least one answer. */
  readonly activeDays: number;
  /** Answers graded, every mode included. */
  readonly answers: number;
  /** The learner's own day keys for the first and the latest answer. */
  readonly firstDay: string | null;
  readonly lastDay: string | null;
}

/**
 * Totals over the whole log.
 *
 * Days are counted on the learner's calendar rather than the server's, so the
 * caller hands in the day key of their own clock: a record reading "31 days"
 * to somebody who studied on 32 evenings in Tallinn is a record with a wrong
 * number on it, and this is the one screen a stranger may be shown.
 */
export function studyTotals(reviews: readonly TimedReview[], dayKey: (at: Date) => string): StudyTotals {
  if (reviews.length === 0) {
    return { hours: 0, activeDays: 0, answers: 0, firstDay: null, lastDay: null };
  }
  const days = new Set<string>();
  let first = reviews[0]!.reviewedAt;
  let last = reviews[0]!.reviewedAt;
  for (const review of reviews) {
    days.add(dayKey(review.reviewedAt));
    if (review.reviewedAt < first) first = review.reviewedAt;
    if (review.reviewedAt > last) last = review.reviewedAt;
  }
  return {
    hours: studyHours(reviews),
    activeDays: days.size,
    answers: reviews.length,
    firstDay: dayKey(first),
    lastDay: dayKey(last),
  };
}
