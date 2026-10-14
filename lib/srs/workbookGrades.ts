import type { ReplayItem } from "@/lib/srs/replay";
import { OUTCOME_RATING, type Outcome } from "@/lib/games/workbook";

/**
 * What a finished workbook page is worth, one grade per line that has a card.
 *
 * Kept pure and out of `app/actions.ts` so the rule can be driven without a
 * session or a database, which is `matchGrades`'s shape one round over: the
 * action resolves the owner and hands this to `applyGradeBatch`, the half
 * already tested against Postgres (ADR-016).
 *
 * What a line is worth is `OUTCOME_RATING`, which is the page's own table, so
 * the screen that says "right first time" and the log that records a Good
 * cannot disagree. The slot travels with the grade, because a page asks a
 * word in a form its card may not be about: the osastav of `tuba` graded on
 * its recognition card, and without the slot the log would record an answer
 * about a meaning. `writeGrade` checks both slots against the closed list
 * rather than trusting them.
 *
 * THE DURATION IS ZERO. A page is filled in whatever order the learner likes
 * and checked at once, so no honest time exists for one line, and zero is
 * what `lib/stats/pace.ts` reads as "not timed".
 *
 * ONE GRADE PER CARD. A line grades the card about its own slot where the
 * learner holds one and falls back to the word's nearest card where they do
 * not, so the pronoun page, which puts `mina` through five cases, could land
 * five grades on one card in one sitting and tell the scheduler five times
 * that the word was recalled. The worst of them is the one kept, with its own
 * slot: a page that went wrong on one line of a word went wrong on the word.
 *
 * The input is JSON off the wire whatever the caller's types say, so every
 * field is checked, a row missing an id, a card or a known outcome is dropped
 * rather than guessed at, and the list is cut at `limit` before anything is
 * built.
 */
export function workbookGrades(input: unknown, limit: number, now: number): ReplayItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const rows = input.slice(0, limit).flatMap((one) => {
    const row = (one ?? {}) as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const cardId = typeof row.cardId === "string" ? row.cardId : "";
    const outcome = typeof row.outcome === "string" && row.outcome in OUTCOME_RATING ? row.outcome as Outcome : null;
    if (!id || !cardId || !outcome || seen.has(id)) return [];
    seen.add(id);
    const slot = typeof row.slot === "string" && row.slot.length <= 40 ? row.slot : undefined;
    const reached = typeof row.reached === "string" && row.reached.length <= 40 ? row.reached : undefined;
    return [{
      id, cardId, rating: OUTCOME_RATING[outcome], durationMs: 0, reviewedAt: now,
      ...(slot ? { slot } : {}),
      ...(reached && reached !== slot ? { reachedSlot: reached } : {}),
    }];
  });
  const worst = new Map<string, ReplayItem>();
  for (const row of rows) {
    const held = worst.get(row.cardId);
    if (!held || row.rating < held.rating) worst.set(row.cardId, row);
  }
  return rows.filter((row) => worst.get(row.cardId) === row);
}
