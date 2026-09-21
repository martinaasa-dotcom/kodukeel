/**
 * Turning the review log into the pictures a learner (or a teacher) can act on.
 *
 * Everything here is a pure function over plain timestamps and ratings, with no
 * Prisma types in sight — the page hands it rows, it hands back buckets. That
 * keeps the interesting logic (day boundaries, empty ranges, off-by-one at the
 * edges of a heatmap) unit-testable without a database.
 *
 * All bucketing uses the learner's own calendar day, which means every
 * function here takes a `DayClock`. It is not a decoration: these run on the
 * server, and a server's midnight is the deployment's rather than the
 * learner's, so a heatmap built without one draws somebody's evening on the
 * wrong square. See lib/time/day.ts.
 */

import { REQUEST_RETENTION } from "@/lib/srs/scheduler";
import { dayClock, type DayClock } from "@/lib/time/day";

export interface ReviewPoint {
  reviewedAt: Date;
  rating: number;
}

export interface DayBucket {
  /** `YYYY-MM-DD`. */
  day: string;
  count: number;
  /** 0 (nothing) to 4 (a heavy day), for the heatmap's color ramp. */
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * A GitHub-style contribution grid over the last `days` days.
 *
 * The intensity scale is relative to the learner's own busiest day rather than
 * a fixed number: 20 reviews is a big day for someone with a small deck and a
 * quiet one for someone with 500 cards, and a fixed scale would tell one of
 * them a lie.
 */
export function buildHeatmap(
  dates: Date[],
  days = 182,
  from: Date = new Date(),
  clock: DayClock = dayClock(),
): DayBucket[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = clock.dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys = clock.recentDayKeys(days, from);
  const busiest = Math.max(0, ...keys.map((k) => counts.get(k) ?? 0));

  return keys.map((day) => {
    const count = counts.get(day) ?? 0;
    return { day, count, level: intensity(count, busiest) };
  });
}

function intensity(count: number, busiest: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (busiest <= 1) return 4;
  const ratio = count / busiest;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export interface RatingBreakdown {
  again: number;
  hard: number;
  good: number;
  easy: number;
  total: number;
  /** Share rated Good or Easy, 0–100. `null` when there is nothing to average. */
  accuracy: number | null;
}

export function ratingBreakdown(reviews: { rating: number }[]): RatingBreakdown {
  const b = { again: 0, hard: 0, good: 0, easy: 0, total: 0, accuracy: null as number | null };
  for (const r of reviews) {
    if (r.rating === 1) b.again++;
    else if (r.rating === 2) b.hard++;
    else if (r.rating === 3) b.good++;
    else if (r.rating === 4) b.easy++;
    else continue;
    b.total++;
  }
  if (b.total > 0) b.accuracy = Math.round(((b.good + b.easy) / b.total) * 100);
  return b;
}

export interface DailyLoad {
  day: string;
  reviews: number;
  /** Percent recalled that day, or `null` on a day with no reviews. */
  accuracy: number | null;
}

/** Reviews and accuracy per day, oldest first — the "how am I trending" chart. */
export function dailyLoad(
  reviews: ReviewPoint[],
  days = 30,
  from: Date = new Date(),
  clock: DayClock = dayClock(),
): DailyLoad[] {
  const tally = new Map<string, { total: number; ok: number }>();
  for (const r of reviews) {
    const key = clock.dayKey(r.reviewedAt);
    const entry = tally.get(key) ?? { total: 0, ok: 0 };
    entry.total++;
    if (r.rating >= 3) entry.ok++;
    tally.set(key, entry);
  }

  return clock.recentDayKeys(days, from).map((day) => {
    const entry = tally.get(day);
    return {
      day,
      reviews: entry?.total ?? 0,
      accuracy: entry && entry.total > 0 ? Math.round((entry.ok / entry.total) * 100) : null,
    };
  });
}

export interface CaseAccuracy {
  grammCase: string;
  total: number;
  accuracy: number;
}

/**
 * Accuracy per grammatical case.
 *
 * `minReviews` guards against the cruellest kind of false signal: one missed
 * comitative card reading as "0% — comitative is your weakness".
 */
export function caseAccuracy(
  reviews: { targetCase: string | null; rating: number }[],
  minReviews = 3,
): CaseAccuracy[] {
  const tally = new Map<string, { ok: number; total: number }>();
  for (const r of reviews) {
    if (!r.targetCase) continue;
    const entry = tally.get(r.targetCase) ?? { ok: 0, total: 0 };
    entry.total++;
    if (r.rating >= 3) entry.ok++;
    tally.set(r.targetCase, entry);
  }

  return [...tally.entries()]
    .filter(([, v]) => v.total >= minReviews)
    .map(([grammCase, v]) => ({
      grammCase,
      total: v.total,
      accuracy: Math.round((v.ok / v.total) * 100),
    }))
    /*
      And it ends on the case, because the two keys above are not a total order
      and `[0]` of this list is the case Today names and the daily quest drills.
      The tally is a `Map`, so two cases matching on accuracy and on count came
      back in the order they first appeared in the review rows: which case a
      learner is sent to practise decided by which one they happened to answer
      first, months ago, and unexplainable to them. Arbitrary and stated beats
      arbitrary and silent.
    */
    .sort((a, b) =>
      a.accuracy - b.accuracy
      || b.total - a.total
      || a.grammCase.localeCompare(b.grammCase));
}

/** The busiest hour of the day, for the "you study best at…" line. Null when thin. */
export function bestStudyHour(
  reviews: ReviewPoint[],
  minReviews = 20,
  clock: DayClock = dayClock(),
): number | null {
  if (reviews.length < minReviews) return null;
  const hours = new Array<number>(24).fill(0);
  for (const r of reviews) hours[clock.hourOf(r.reviewedAt)]!++;
  let best = 0;
  for (let h = 1; h < 24; h++) if (hours[h]! > hours[best]!) best = h;
  return hours[best]! > 0 ? best : null;
}

/**
 * True retention, and what it says about the schedule.
 *
 * The recall rate shown elsewhere on the Progress page counts every answer,
 * including the first sight of a brand-new card — which nobody is expected to
 * know, and which therefore drags the number down and means nothing. FSRS asks a
 * narrower question: of the cards it believed you had *learned* and scheduled to
 * come back today, how many did you actually recall? That is the number the
 * scheduler is steering, and the only one worth comparing to its target.
 *
 * `stateBefore` on the review log is what makes this answerable at all: it
 * records the FSRS state the card was in when the question was asked, so a
 * mature review can be told apart from a learning step after the fact. It is one
 * of the reasons the log is append-only.
 */
export const REVIEW_STATE = 2;

/** The target the scheduler is configured for, read from it rather than repeated. */
export const RETENTION_TARGET = Math.round(REQUEST_RETENTION * 100);

/** Below this many mature reviews the number is noise, and says so. */
export const RETENTION_MINIMUM = 30;

export interface RetentionReading {
  /** Mature reviews counted. Learning and relearning answers are excluded. */
  reviews: number;
  recalled: number;
  /** Percent recalled, 0–100. `null` until there is enough to say. */
  retention: number | null;
  target: number;
  verdict: "unknown" | "on-target" | "above" | "below";
  headline: string;
  /**
   * What to do about it, and **not** what the figure is.
   *
   * Every one of these opened by reading the percentage and the target back
   * out ("You are remembering 82% of your long-term cards, and the schedule is
   * built for 90%"), on a card that draws the percentage in a 78px ring, puts
   * it in the ring's own label, and prints the recalled-of-reviews count and
   * the target on the line underneath. The same two numbers, four times, in
   * one panel. Advice is the half none of that can carry, so advice is what is
   * left: the figures are the card's to print and this is the sentence saying
   * what to change.
   */
  advice: string;
}

export function retentionReading(
  reviews: { rating: number; stateBefore: number }[],
  target = RETENTION_TARGET,
  minimum = RETENTION_MINIMUM,
): RetentionReading {
  const mature = reviews.filter((r) => r.stateBefore === REVIEW_STATE);
  const recalled = mature.filter((r) => r.rating >= 3).length;
  const count = mature.length;

  if (count < minimum) {
    return {
      reviews: count,
      recalled,
      retention: null,
      target,
      verdict: "unknown",
      headline: "Not enough long-term reviews yet",
      // The one branch whose figures are not on the card already, because the
      // ring has nothing to draw and prints a dash.
      advice: `It takes about ${minimum} reviews of cards the scheduler thought you knew. You have ${count}.`,
    };
  }

  const retention = Math.round((recalled / count) * 100);
  // Four points either way is inside the noise for a few hundred reviews, and a
  // number that twitches between verdicts every session teaches nothing.
  const drift = retention - target;

  if (drift > 4) {
    return {
      reviews: count, recalled, retention, target,
      verdict: "above",
      headline: "You are remembering more than expected",
      advice: "Comfortable rather than wrong. There is room for more new words each day, so raise the daily goal in Settings.",
    };
  }

  if (drift < -4) {
    return {
      reviews: count, recalled, retention, target,
      verdict: "below",
      headline: "You are forgetting more than expected",
      advice: "Usually too many new cards at once. Ease off new words for a week, and read up on whichever case the list below keeps flagging.",
    };
  }

  return {
    reviews: count, recalled, retention, target,
    verdict: "on-target",
    headline: "The schedule is working",
    advice: "Exactly where it should be. Nothing to change.",
  };
}
