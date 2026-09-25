import { caseAccuracy, type CaseAccuracy } from "@/lib/stats/history";

/**
 * Answers at a case, pooled across the class, before it may be named.
 * The same figure the class board has always used.
 */
export const MIN_CLASS_CASE_REVIEWS = 10;

/**
 * Distinct students behind a case before the class aggregate may name it.
 *
 * `weakestCases` is the one fact about a class allowed to leave the app in a
 * letter, on the argument that it is about the group and nobody in it. That
 * argument needs a group. With one active student "the class is weakest at
 * the partitive" is that student's own weak case, sent to a shared staffroom
 * mailbox under the class's name; with two, the teacher can tell which of the
 * two it was. Three is the smallest group where the figure no longer points
 * at one person, and a case practised by fewer is left out rather than
 * reported as a size, the way `lib/research/corpus.ts` leaves out a thin
 * cell. The per-student figure on the board is `weakestCase`, gated on its
 * own floor in `roster.ts`, and is never pooled through here.
 */
export const MIN_CLASS_CASE_STUDENTS = 3;

/** The cases a class as a whole is weakest at, weakest first, never fewer than three students behind one. */
export function classWeakestCases(
  reviews: readonly { ownerId: string; targetCase: string | null; rating: number }[],
  limit = 5,
): CaseAccuracy[] {
  const students = new Map<string, Set<string>>();
  for (const r of reviews) {
    if (!r.targetCase) continue;
    const held = students.get(r.targetCase) ?? new Set<string>();
    held.add(r.ownerId);
    students.set(r.targetCase, held);
  }
  return caseAccuracy(
    reviews.map((r) => ({ targetCase: r.targetCase, rating: r.rating })),
    MIN_CLASS_CASE_REVIEWS,
  )
    .filter((c) => (students.get(c.grammCase)?.size ?? 0) >= MIN_CLASS_CASE_STUDENTS)
    .slice(0, limit);
}
