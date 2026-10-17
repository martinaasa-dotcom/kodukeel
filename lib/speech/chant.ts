import { core } from "./reconcile";

/**
 * A VERB TABLE SAID IN ONE BREATH, CUT BACK INTO ITS ROWS (docs/41-fifth-batch.md, VB-8).
 *
 * A class drills the present tense out loud, all six persons at once: `ma
 * loen, sa loed, ta loeb`, and on to `nad loevad`. The conjugation round
 * asked for that typed into five boxes because nothing could hear it. This is
 * the half that cuts a transcript of the chant back into the table's rows, so
 * each row lands in its own box and is marked by the round's own marker, the
 * same `checkAnswer` a typed row meets. Nothing here decides whether a form is
 * right.
 *
 * Two ways a chant is said, and both are read:
 *
 *   with the pronouns, `ma loen sa loed ta loeb`: each row is the words heard
 *   after its own pronoun and before the next pronoun heard, so a row said out
 *   of order or skipped still lands where it belongs, and a row whose pronoun
 *   was not heard is left empty for the learner;
 *
 *   without them, `loen loed loeb loeme loete loevad`: the words in the order
 *   the table asks them, and only where exactly one word was heard per row. A
 *   chant of five words for six rows cannot say which row it dropped, and
 *   guessing would put a right form in the wrong row, so it fills nothing.
 *
 * The pronouns are the caller's, read off the table it already shows (and its
 * long forms, `mina` beside `ma`), so this file holds no Estonian (ADR-005).
 * Pure: the native apps run it as it is (D24).
 */

/** One row of the table: every spelling of its pronoun the learner might say. */
export type ChantRow = readonly string[];

/** The form heard for each row, in the table's order, or null where it is not certain. */
export function splitChant(heard: string, rows: readonly ChantRow[]): (string | null)[] {
  const words = heard.normalize("NFC").split(/\s+/).map(core).filter(Boolean);
  const empty = rows.map(() => null);
  if (words.length === 0 || rows.length === 0) return empty;

  // Which row each heard word is the pronoun of, if any.
  const pronounOf = new Map<string, number>();
  rows.forEach((row, i) => {
    for (const spelling of row) {
      const key = core(spelling);
      // Two rows sharing a spelling cannot be told apart by it, so it marks neither.
      if (pronounOf.has(key) && pronounOf.get(key) !== i) pronounOf.set(key, -1);
      else pronounOf.set(key, i);
    }
  });
  const marks = words.map((w) => pronounOf.get(w));
  const anyPronoun = marks.some((m) => m !== undefined && m >= 0);

  if (!anyPronoun) {
    // In order, one word a row, or nothing at all.
    return words.length === rows.length ? words : empty;
  }

  const out: (string | null)[] = [...empty];
  for (let at = 0; at < words.length; at++) {
    const row = marks[at];
    if (row === undefined || row < 0) continue;
    // The words up to the next pronoun heard, of any row.
    let end = at + 1;
    while (end < words.length && marks[end] === undefined) end++;
    const said = words.slice(at + 1, end);
    // Said twice is a row the learner corrected themselves on: the later one stands.
    if (said.length > 0) out[row] = said.join(" ");
  }
  return out;
}
