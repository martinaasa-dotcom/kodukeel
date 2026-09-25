import type { ReplayItem } from "@/lib/srs/replay";
import type { RatingValue } from "@/lib/srs/scheduler";

/**
 * What a finished match board is worth, one grade per pair.
 *
 * Kept pure and out of `app/actions.ts` so the rule can be driven without a
 * session or a database: the action around it resolves the owner and hands
 * this to `applyGradeBatch`, which is the half already tested against Postgres.
 *
 * A pair found first time is a Good; one that took a wrong guess first is a
 * Hard. Never Easy, since a board is recognition among eight rather than
 * evidence that an interval should jump, and never Again, since every pair on
 * a finished board was in the end found.
 *
 * THE DURATION IS ZERO. A board is solved slowly at the start and by
 * elimination at the end, so no honest per-answer time exists, and zero is
 * what `lib/stats/pace.ts` reads as "not timed".
 *
 * The input is JSON off the wire whatever the caller's types say, so every
 * field is checked, a row missing an id or a card is dropped rather than
 * guessed at, and the list is cut at `limit` before anything is built.
 */
export function matchGrades(input: unknown, limit: number, now: number): ReplayItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, limit).flatMap((one) => {
    const row = (one ?? {}) as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const cardId = typeof row.cardId === "string" ? row.cardId : "";
    if (!id || !cardId) return [];
    const rating: RatingValue = row.missed === true ? 2 : 3;
    return [{ id, cardId, rating, durationMs: 0, reviewedAt: now }];
  });
}
