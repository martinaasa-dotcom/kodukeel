/**
 * A sentence cut into runs, with the whole-word occurrences of `form` flagged
 * so a caller can draw them differently.
 *
 * The boundaries are the same character class `sentenceWords` splits on
 * (`lib/dict/examples.ts`) rather than `\b`, which is defined on ASCII word
 * characters: `\bõun\b` does not mean what it looks like it means, because õ
 * is not one of them. Returns a single
 * unmarked run when there is nothing to mark, so the caller has one shape to
 * render either way.
 */
export function splitOnForm(sentence: string, form: string | null): { text: string; match: boolean }[] {
  const wanted = form?.trim();
  if (!wanted) return [{ text: sentence, match: false }];

  // No hyphen in this class. It is only special inside a character class, and
  // the pattern below interpolates outside one, where `\-` is an invalid escape
  // under the `u` flag and throws rather than failing to match: every
  // hyphenated Estonian word went through here, `üle-eestiline` included.
  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{M}-])(${escaped})(?![\\p{L}\\p{M}-])`, "giu");

  const runs: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const hit of sentence.matchAll(pattern)) {
    const at = hit.index;
    if (at > last) runs.push({ text: sentence.slice(last, at), match: false });
    runs.push({ text: hit[0], match: true });
    last = at + hit[0].length;
  }
  if (last < sentence.length) runs.push({ text: sentence.slice(last), match: false });

  return runs.length > 0 ? runs : [{ text: sentence, match: false }];
}
