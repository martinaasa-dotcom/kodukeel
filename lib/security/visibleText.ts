/**
 * Text one person types that another person is shown.
 *
 * A pupil's name on a teacher's roster, a class's name on the join screen a
 * stranger reads before joining, a homework title on every member's Today.
 * `trim()` was the whole of the cleaning on two of those three, and
 * `String.prototype.trim` does not remove U+200B, so two zero-width spaces
 * were a class name that passed the length check and rendered as nothing.
 * U+202E is worse: it reverses what follows it, so a title can be made to read
 * as something the teacher did not type and a name as another pupil's.
 *
 * `\p{C}` is every control, format, private-use, surrogate and unassigned code
 * point, which is the category all of those are in, and NFC first so a string
 * is compared and stored in one normalization.
 *
 * THE CUT IS BY CODE POINT, NOT BY UTF-16 UNIT. The version this replaced
 * stripped `\p{C}` and then took `.slice(0, 32)`, which counts UTF-16 units: a
 * name whose thirty-second unit fell inside an emoji kept the first half of a
 * surrogate pair, which is itself a `\p{C}` character and draws as a box. The
 * cleaning ran before the cut that made the thing it was cleaning.
 */

/** A one-line field: controls gone, runs of space folded, at least one letter or digit. */
export function visibleLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const cleaned = value.normalize("NFC").replace(/\p{C}/gu, "").replace(/\s+/g, " ").trim();
  const cut = Array.from(cleaned).slice(0, max).join("").trim();
  // A row of punctuation is the same "renders as nothing" fault wearing a
  // visible character.
  return /[\p{L}\p{N}]/u.test(cut) ? cut : "";
}

/**
 * A field that may run to several lines. The line breaks stay, since they are
 * how somebody lays out a note, and every other control and format character
 * goes. No letter is required: a note is optional and may legitimately be
 * empty.
 */
export function visibleProse(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/(?!\n)\p{C}/gu, "")
    .replace(/[^\S\n]+/g, " ")
    .trim();
  return Array.from(cleaned).slice(0, max).join("").trim();
}
