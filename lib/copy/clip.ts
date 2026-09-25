/**
 * Cut a piece of somebody's text to at most `max` characters.
 *
 * `slice` counts UTF-16 units, so a cap that lands in the middle of an emoji
 * or any other character outside the Basic Multilingual Plane keeps half of
 * it: a lone surrogate, which Postgres receives as a replacement character
 * and every screen after that draws as one. This counts code points instead,
 * which is the unit a reader means by "a character", and never splits one.
 *
 * Pure, and the one way free text is capped on its way in; an invariant fails
 * on a `.trim().slice(0, n)` in `app/` or `lib/`.
 */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return Array.from(text).slice(0, max).join("");
}
