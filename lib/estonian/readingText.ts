/**
 * A pasted text, as paragraphs of sentences, with every character kept.
 *
 * Reading mode (`/read`) shows a learner's own Estonian back to them with the
 * dictionary under every word. The text is theirs, so nothing is changed: a
 * paragraph is what a blank line separates, a sentence ends at a stop, a
 * question mark, an exclamation mark or an ellipsis followed by a space, and
 * joining the pieces gives back the paragraph exactly. Splitting only decides
 * where one sentence's speaker button goes; a stop after an abbreviation that
 * starts a new piece costs a button, never a word.
 */

/** How much text a reader may paste at once. */
export const MAX_READING_CHARS = 4000;

const SENTENCE_END = /(?<=[.!?…])["»”)]*\s+/u;

export function readingParagraphs(text: string): string[][] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => splitSentences(paragraph));
}

function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let rest = paragraph;
  for (;;) {
    const m = SENTENCE_END.exec(rest);
    if (!m) break;
    const end = m.index + m[0].length;
    const sentence = rest.slice(0, end).trim();
    if (sentence) out.push(sentence);
    rest = rest.slice(end);
  }
  if (rest.trim()) out.push(rest.trim());
  return out;
}
