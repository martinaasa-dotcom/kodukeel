/**
 * A name a class is going to see, cleaned.
 *
 * `trim().slice(0, 32)` was the whole of it, and `String.prototype.trim` does
 * not remove U+200B: two zero-width spaces are a two-character string that
 * passes the `!name` check and renders as nothing on the roster, so a member
 * could sit in a class with no name at all. U+202E is worse, because it
 * reverses what follows it and can be used to make one pupil's row read as
 * another's. The roster is the one screen in this app where a stranger's text
 * is shown to a teacher beside real pupils' names.
 *
 * `\p{C}` is every control, format and unassigned code point, which is the
 * category both of those are in, and NFC first so a name is compared and
 * stored in one normalization. At least one letter or digit, because a row
 * of punctuation is the same "renders as nothing" fault wearing a visible
 * character.
 */
export function cleanDisplayName(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value.normalize("NFC").replace(/\p{C}/gu, "").replace(/\s+/g, " ").trim().slice(0, 32);
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : "";
}
