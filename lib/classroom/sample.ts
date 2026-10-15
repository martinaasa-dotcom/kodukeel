import type { ClassSummary, RosterEntry } from "./roster";

/**
 * AN INVENTED CLASS, FOR SHOWING A TEACHER WHAT THE ROSTER LOOKS LIKE.
 *
 * `/teachers` draws this with the class page's own roster list, so somebody
 * deciding whether to put a code on a board can see exactly what they would
 * see, before they have a class. Nothing here is read from the database or
 * built from a real class: eight first names nobody signed up with, ids that
 * start `sample-`, and figures chosen to show the range a real week has, one
 * learner far ahead with a streak, one quiet for nine days, one who has not
 * started, and two whose hardest case has enough answers behind it to name.
 *
 * Ordered as `classRoster` orders a class, most reviews this week first, and
 * the class's totals are the sums of the rows, which `sample.test.ts` holds.
 */

const joined = (day: number) => new Date(Date.UTC(2026, 8, day, 9, 0, 0));

const ENTRIES: RosterEntry[] = [
  { ownerId: "sample-liis", displayName: "Liis", role: "STUDENT", joinedAt: joined(1), reviewsThisWeek: 214, streak: 23, wordsKnown: 412, daysSinceLastReview: 0, weakestCase: null },
  { ownerId: "sample-oleksandr", displayName: "Oleksandr", role: "STUDENT", joinedAt: joined(1), reviewsThisWeek: 131, streak: 9, wordsKnown: 268, daysSinceLastReview: 0, weakestCase: { grammCase: "PARTITIVE", accuracy: 52, total: 31 } },
  { ownerId: "sample-triin", displayName: "Triin", role: "STUDENT", joinedAt: joined(2), reviewsThisWeek: 96, streak: 5, wordsKnown: 230, daysSinceLastReview: 1, weakestCase: null },
  { ownerId: "sample-anastasia", displayName: "Anastasia", role: "STUDENT", joinedAt: joined(1), reviewsThisWeek: 74, streak: 3, wordsKnown: 187, daysSinceLastReview: 0, weakestCase: { grammCase: "ILLATIVE", accuracy: 61, total: 18 } },
  { ownerId: "sample-marko", displayName: "Marko", role: "STUDENT", joinedAt: joined(3), reviewsThisWeek: 48, streak: 2, wordsKnown: 120, daysSinceLastReview: 2, weakestCase: null },
  { ownerId: "sample-sofia", displayName: "Sofia", role: "STUDENT", joinedAt: joined(4), reviewsThisWeek: 22, streak: 0, wordsKnown: 75, daysSinceLastReview: 4, weakestCase: null },
  { ownerId: "sample-dmitri", displayName: "Dmitri", role: "STUDENT", joinedAt: joined(2), reviewsThisWeek: 0, streak: 0, wordsKnown: 64, daysSinceLastReview: 9, weakestCase: null },
  { ownerId: "sample-rasmus", displayName: "Rasmus", role: "STUDENT", joinedAt: joined(8), reviewsThisWeek: 0, streak: 0, wordsKnown: 0, daysSinceLastReview: null, weakestCase: null },
];

const CLASS_CASES = [
  { grammCase: "PARTITIVE", accuracy: 57, total: 164 },
  { grammCase: "ILLATIVE", accuracy: 64, total: 97 },
];

export const SAMPLE_CLASS: ClassSummary = {
  entries: ENTRIES,
  weakestCases: CLASS_CASES,
  sharedCases: CLASS_CASES,
  totalReviewsThisWeek: ENTRIES.reduce((sum, e) => sum + e.reviewsThisWeek, 0),
  activeThisWeek: ENTRIES.filter((e) => e.reviewsThisWeek > 0).length,
};
