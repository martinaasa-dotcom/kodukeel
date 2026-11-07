/**
 * THE RULES OF CHECK YOURSELF, KEPT APART FROM THE SCREEN.
 *
 * Pure, so the grade a word earns is tested rather than driven. The screen is
 * `app/(app)/review/common/[group]/check/CheckSession.tsx`.
 */

/** Which side is shown: English shown and Estonian typed, or the other way round. */
export type CheckDirection = "en-et" | "et-en";

/**
 * How many goes a word gets. A learner checking what they already know has
 * often got the word and slipped, so a miss is one more go rather than the
 * answer, and the second go is where the hint ladder opens.
 */
export const CHECK_TRIES = 2;

/**
 * What a right answer earns, on the scheduler's own scale.
 *
 * `suggested` is the marker's: Good for a clean hit, Hard for a dropped
 * diacritic or a slip of the hand. Right on the second go is never better than
 * Hard, because the word did not come back first time. A hint lowers it
 * further, which the caller applies with the ladder's own ceiling.
 */
export function checkRating(suggested: 1 | 2 | 3, missesBefore: number): 1 | 2 | 3 {
  if (missesBefore <= 0) return suggested;
  return Math.min(suggested, 2) as 1 | 2;
}

/** The two directions as they are stored, one per value of `CheckDirection`. */
export const STORED_DIRECTION: Readonly<Record<CheckDirection, "EN_ET" | "ET_EN">> = {
  "en-et": "EN_ET",
  "et-en": "ET_EN",
};

export type StoredDirection = (typeof STORED_DIRECTION)[CheckDirection];

/** What one answer came to, as it is stored. */
export const CHECK_OUTCOMES = ["RIGHT", "NEARLY", "MISSED"] as const;
export type CheckOutcome = (typeof CHECK_OUTCOMES)[number];

/** A stored direction read back off the wire or a backup file, or nothing. */
export function checkDirectionFrom(value: unknown): StoredDirection | null {
  return value === "EN_ET" || value === "ET_EN" ? value : null;
}

/** A stored outcome read back off the wire or a backup file, or nothing. */
export function checkOutcomeFrom(value: unknown): CheckOutcome | null {
  return typeof value === "string" && (CHECK_OUTCOMES as readonly string[]).includes(value)
    ? (value as CheckOutcome)
    : null;
}

/**
 * What an answer comes to, from the server's own marking of what was typed.
 *
 * `verdict` is `checkAnswer`'s. Right first time is RIGHT; a slip, or right on
 * the second go, is NEARLY; anything else is MISSED. `missesBefore` comes from
 * the browser and can only ever lower an outcome, never raise one, so a forged
 * request cannot record a word as known without typing it.
 */
export function checkOutcome(verdict: string, missesBefore: number): CheckOutcome {
  if (verdict === "wrong" || verdict === "form") return "MISSED";
  if (verdict === "correct" && missesBefore <= 0) return "RIGHT";
  return "NEARLY";
}

/** Where a word stands in one direction: its newest outcome and when, or nothing yet. */
export interface LastCheck {
  outcome: CheckOutcome;
  at: number;
}

/**
 * THE ORDER A CHECK ASKS ITS WORDS IN: WHAT NEEDS WORK FIRST.
 *
 * Missed last time, then nearly, then never checked, then right, and among
 * the words that were right the longest ago first, since that is the memory
 * most likely to have faded. Inside the first three groups the order is the
 * caller's (a shuffle), so two checks running do not ask in the same order.
 */
export function needsWorkFirst<T>(words: readonly T[], last: (word: T) => LastCheck | undefined): T[] {
  const rank = (w: T) => {
    const l = last(w);
    if (!l) return 2;
    return l.outcome === "MISSED" ? 0 : l.outcome === "NEARLY" ? 1 : 3;
  };
  return words
    .map((word, i) => ({ word, i, r: rank(word), at: last(word)?.at ?? 0 }))
    .sort((a, b) => a.r - b.r || (a.r === 3 ? a.at - b.at : 0) || a.i - b.i)
    .map((x) => x.word);
}

/** Whether a word is one to go over: missed or nearly, the last time it was checked. */
export function toGoOver(last: LastCheck | undefined): boolean {
  return last !== undefined && last.outcome !== "RIGHT";
}

/**
 * WHICH WORDS A CHECK ASKS: THE FIFTY MOST COMMON, THE NEXT FIFTY, ALL OF THEM,
 * OR THE ONES TO GO OVER.
 *
 * The operator's call, over the four parts of twenty-five the Practice round
 * uses: a check asks each word once, so fifty is a sitting here where twenty-five
 * is one there, and "1 to 25" said nothing about which words a learner was
 * choosing. The ranges are the corpus's own order (`lib/collections/frequency.ts`).
 */
export const CHECK_RANGES = ["missed", "most", "next", "all"] as const;
export type CheckRange = (typeof CHECK_RANGES)[number];

/** Where each fixed range starts and stops in the list, zero-based and end-exclusive. */
export const RANGE_SLICE: Readonly<Record<Exclude<CheckRange, "missed">, readonly [number, number]>> = {
  most: [0, 50],
  next: [50, 100],
  all: [0, 100],
};

/** A range read off the address, or nothing. */
export function checkRangeFrom(value: unknown): CheckRange | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && (CHECK_RANGES as readonly string[]).includes(raw) ? (raw as CheckRange) : null;
}

/** The words a range holds, in list order, given where each stood last time in this direction. */
export function wordsIn<T>(range: CheckRange, words: readonly T[], last: (word: T) => LastCheck | undefined): T[] {
  if (range === "missed") return words.filter((w) => toGoOver(last(w)));
  const [from, to] = RANGE_SLICE[range];
  return words.slice(from, to);
}
