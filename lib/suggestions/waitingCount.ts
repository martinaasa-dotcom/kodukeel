import { prisma } from "@/lib/db";

/**
 * The count behind the reviewer's badge, apart from who may see it.
 *
 * Its own module so `recordSuggestion` can drop the held figure without
 * importing the sign-in machinery `waiting.ts` asks: a report written in an
 * integration test has no request to read an identity off. See `waiting.ts`
 * for what the figures are and why they are held.
 */
export interface ReviewWaiting {
  /** Open requests for a word to go into everybody's dictionary. */
  readonly words: number;
  /** Every other open report. */
  readonly other: number;
}

const HOLD_MS = 30_000;
let held: { at: number; value: ReviewWaiting } | null = null;

/** Drops the held figure, after a reviewer acts or a learner reports. */
export function forgetReviewWaiting(): void {
  held = null;
}

export async function countWaiting(): Promise<ReviewWaiting> {
  if (held && Date.now() - held.at < HOLD_MS) return held.value;
  const rows = await prisma.$queryRaw<{ words: boolean; n: number }[]>`
    SELECT ("category" = 'MISSING_WORD') AS "words", COUNT(DISTINCT "groupKey")::int AS "n"
    FROM "Suggestion"
    WHERE "status" = 'OPEN'
    GROUP BY 1`;
  const value = {
    words: rows.find((r) => r.words)?.n ?? 0,
    other: rows.find((r) => !r.words)?.n ?? 0,
  };
  held = { at: Date.now(), value };
  return value;
}

