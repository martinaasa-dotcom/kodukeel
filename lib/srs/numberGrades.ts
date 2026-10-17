import type { ReplayItem } from "@/lib/srs/replay";

/**
 * What a finished numbers round is worth (docs/41-fifth-batch.md, VB-7).
 *
 * The shape `matchGrades` takes, for its reason: a round hands in once, one
 * write for the whole round, through `applyGradeBatch`. Every row is a number
 * word the learner said or typed in a right answer, and it is a Good and only
 * ever a Good: the round grades a word up where it was recalled and writes
 * nothing where the answer was wrong or given in digits (D4), so there is no
 * second rating to pass. Never Easy, since reading one number off a clock is
 * not evidence that an interval should jump.
 *
 * The duration is zero, which `lib/stats/pace.ts` reads as "not timed": a
 * spoken answer has no typing time and nothing here scores how fast anybody
 * spoke (D9).
 *
 * JSON off the wire whatever the caller's types say: every field is checked,
 * a row missing an id or a card is dropped, a card named twice is graded
 * once, and the list is cut at `limit` before anything is built.
 */
export function numberGrades(input: unknown, limit: number, now: number): ReplayItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.slice(0, limit).flatMap((one) => {
    const row = (one ?? {}) as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const cardId = typeof row.cardId === "string" ? row.cardId : "";
    if (!id || !cardId || seen.has(cardId)) return [];
    seen.add(cardId);
    return [{ id, cardId, rating: 3, durationMs: 0, reviewedAt: now, ...(row.spoken === true ? { spoken: true } : {}) }];
  });
}
