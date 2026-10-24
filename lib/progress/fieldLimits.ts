import { MAX_CHARS as EXAMPLE_MAX_CHARS } from "@/lib/dict/examples";

/**
 * How long a field somebody types may be, wherever it is written.
 *
 * Moved out of app/actions.ts so the bodies that moved into `lib/progress/` for
 * a second door read the same ceilings the actions do (D2 in
 * docs/44-sixth-batch.md), rather than a copy of them.
 *
 * Every one of these reaches a shared row a stranger reads, which is reason
 * enough to bound it: a translation is a sentence, not megabytes into the
 * database, and a lemma is a word. Truncating rather than rejecting: over-long
 * input is almost always a paste accident, and losing the whole entry to a
 * stray clipboard is the worse outcome.
 */
export const LIMITS = {
  lemma: 80,
  translation: 200,
  /** One sentence: the same ceiling the reader applies, so nothing is stored unshowable. */
  example: EXAMPLE_MAX_CHARS,
  form: 80,
  government: 300,
  taskTitle: 200,
  taskNotes: 2000,
} as const;

/** What a saved page is called on its list. */
export const MAX_SCAN_TITLE = 80;
