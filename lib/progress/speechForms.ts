import { coldBudget, isExactForm } from "@/lib/dict/forms";
import { isOff } from "@/lib/usage/switches";

/**
 * WHICH OF THE WORDS JUST HEARD ARE ESTONIAN SPELLINGS AT ALL, FOR EITHER DOOR.
 *
 * Half of the unsure rule (docs/39-speech.md section 3.6): a word the forms
 * list does not hold is drawn dotted, and only such a word may be repaired
 * (`lib/speech/reconcile.ts`). The forms list is 15 MB of shards on the server
 * (`lib/dict/forms.ts`), so a screen asks once a turn is finished, with the
 * words and nothing else: `/api/speech/forms` and `POST /api/v1/speech/forms`
 * both call this (D2 in docs/44-sixth-batch.md). Words only: no audio reaches
 * this (ADR-028), and nothing sent here is kept.
 */

/** One turn rarely holds more than a dozen words; this bounds a hostile request, not an honest one. */
export const MAX_WORDS = 60;
export const MAX_WORD = 40;

/** A turn asks once. Sixty a minute is a turn a second, which nobody speaking reaches. */
export const FORMS_PER_MINUTE = 60;

/**
 * How many shards of the forms list one request may read cold. A spoken turn
 * shares a handful; a request built to name a different large shard per word is
 * the one this stops (`ColdBudget` in lib/dict/forms.ts). A word past it is
 * answered as not a known spelling, which draws it dotted rather than refusing
 * the turn.
 */
export const COLD_SHARDS_PER_REQUEST = 12;

export type FormsAnswer =
  | { ok: true; known: string[]; asked: string[] }
  | { ok: false; refusal: "invalid" | "switched_off" };

export async function heardSpellings(body: unknown): Promise<FormsAnswer> {
  // Only the recognizer asks this, and `PAID_OFF=speech` takes it away (docs/41-fifth-batch.md D15).
  if (isOff("speech")) return { ok: false, refusal: "switched_off" };
  const raw = typeof body === "object" && body !== null ? (body as { words?: unknown }).words : undefined;
  if (!Array.isArray(raw)) return { ok: false, refusal: "invalid" };
  const words = raw
    .filter((word): word is string => typeof word === "string")
    .map((word) => word.normalize("NFC").trim().toLocaleLowerCase("et"))
    .filter((word) => word.length > 0 && word.length <= MAX_WORD)
    .slice(0, MAX_WORDS);
  const distinct = [...new Set(words)];
  const budget = coldBudget(COLD_SHARDS_PER_REQUEST);
  const answers = await Promise.all(distinct.map(async (word) => [word, await isExactForm(word, budget)] as const));
  return { ok: true, known: answers.filter(([, known]) => known).map(([word]) => word), asked: distinct };
}
