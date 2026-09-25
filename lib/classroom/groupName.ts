/**
 * A class or workplace name, cleaned the way a member's display name is.
 *
 * It was `trim().slice(0, 60)`, which keeps U+200B and U+202E: a name of two
 * zero-width spaces passed the length check and rendered as nothing, and a
 * bidi override can make the name read as something else. This name is seen
 * by every member on the join screen and goes into the subject line of the
 * weekly letter to the teacher, so it takes the rules `cleanDisplayName` in
 * `app/actions.ts` applies: NFC, no control, format or unassigned code point
 * (`\p{C}`), whitespace collapsed, and at least one letter or digit. A line
 * break becomes a space first, so two words are not glued into one. Empty
 * means refused.
 */
import { visibleLine } from "@/lib/security/visibleText";

export const GROUP_NAME_MAX = 60;

export function cleanGroupName(value: unknown): string {
  if (typeof value !== "string") return "";
  // `visibleLine` strips every control character, a line break among them, so
  // the break becomes a space first or two words are glued into one. The cut
  // is then its own, by code point, so an emoji is never halved.
  return visibleLine(value.replace(/[\r\n\t]+/g, " "), GROUP_NAME_MAX);
}
