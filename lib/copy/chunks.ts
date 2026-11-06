/**
 * A PARAGRAPH OF EXPLANATION, CUT INTO PIECES THE EYE CAN TAKE ONE AT A TIME.
 *
 * A lesson explains its idea in a few notes, and each note was drawn as one
 * run of prose: a sentence of English, a colon, a word or a whole line of
 * Estonian in braces, its meaning, then the next sentence. Four of those in a
 * row was reported as a wall of text that scares somebody off before they have
 * read a word of it, and the reason is the shape rather than the length: the
 * Estonian the note is about sits in the middle of a sentence, so it cannot be
 * found without reading everything around it.
 *
 * So a note is cut here and drawn as a card (`components/NoteChunks.tsx`):
 * one sentence per line, and where a sentence ends on what it is pointing at
 * (`...: {ma}, {sa} and {pole}`, `...: {Noh, kuidas läheb?}`), that Estonian
 * is lifted out of the sentence and set on a line of its own, as chips for
 * words and as an example with its own speaker for a sentence, with the
 * English after it as the example's meaning.
 *
 * Nothing is written or dropped: every character of the note is still on the
 * screen, in the order it was written, so a translated note (`lib/copy/i18n/`)
 * is cut by the same rule. Where a sentence does not end in that shape it is
 * left whole. Pure, so it is unit tested and a server page can use it.
 */

export interface NoteSentence {
  /** The sentence up to what it points at, or the whole sentence. Braces kept. */
  readonly text: string;
  /** The Estonian the sentence ends on, each without its braces. */
  readonly items: readonly string[];
  /** The English after the last item, "same as always", without its comma. */
  readonly gloss: string | null;
}

/** Splits text into braced and plain runs, keeping the braces on the braced ones. */
function runs(text: string): string[] {
  return text.split(/(\{[^{}]+\})/g).filter((r) => r.length > 0);
}

const SENTENCE_END = /([.!?…])\s+(?=[\p{Lu}{"“«(])/gu;

/**
 * The sentences of a note. A full stop inside braces belongs to the Estonian,
 * and a braced line ending in a question mark ends the English sentence too
 * when what follows starts a new one.
 */
export function sentencesOf(text: string): string[] {
  const out: string[] = [];
  let current = "";
  const parts = runs(text.trim());
  parts.forEach((part, i) => {
    if (part.startsWith("{")) {
      current += part;
      const next = (parts[i + 1] ?? "") + (parts[i + 2]?.[0] ?? "");
      const inner = part.slice(1, -1);
      if (/[.!?]$/.test(inner) && /^\s+[\p{Lu}{"“«(]/u.test(next)) {
        out.push(current.trim());
        current = "";
      }
      return;
    }
    let last = 0;
    // The next run's first character decides whether a final stop ends a sentence.
    const ahead = part + (parts[i + 1]?.[0] ?? "");
    for (const m of ahead.matchAll(SENTENCE_END)) {
      const end = m.index + m[1]!.length;
      current += part.slice(last, end);
      out.push(current.trim());
      current = "";
      last = end;
    }
    current += part.slice(last);
  });
  if (current.trim()) out.push(current.trim());
  return out.filter((s) => s.length > 0);
}

/**
 * The joiners allowed between items in a list after a colon: a comma, or the
 * word for "and", which a row of chips says without being written. Never
 * "or": a choice between two forms is the point of the sentence, so a
 * sentence with one stays whole.
 */
const JOINER = /^(?:,\s*|,?\s+(?:and|и|і|й|та|ja)\s+)$/u;

/**
 * One sentence, with what it ends on lifted out where it has that shape:
 * a colon (outside braces), then nothing but braced items and joiners, then
 * optionally a comma and a short gloss in plain text, and the end.
 */
export function pointOf(sentence: string): NoteSentence {
  const whole: NoteSentence = { text: sentence, items: [], gloss: null };
  const parts = runs(sentence);
  // The last colon outside braces.
  let colonPart = -1;
  let colonAt = -1;
  parts.forEach((p, i) => {
    if (p.startsWith("{")) return;
    const at = p.lastIndexOf(":");
    if (at >= 0) { colonPart = i; colonAt = at; }
  });
  if (colonPart < 0) return whole;
  const head = parts.slice(0, colonPart).join("") + parts[colonPart]!.slice(0, colonAt + 1);
  const rest = [parts[colonPart]!.slice(colonAt + 1), ...parts.slice(colonPart + 1)].filter((r) => r.length > 0);
  const first = rest[0];
  if (!first) return whole;
  const opensOnItem = first.startsWith("{");
  if (!opensOnItem && !/^\s*$/.test(first)) return whole;
  const tail = opensOnItem ? rest : rest.slice(1);
  const items: string[] = [];
  let gloss: string | null = null;
  for (let i = 0; i < tail.length; i++) {
    const r = tail[i]!;
    if (r.startsWith("{")) { items.push(r.slice(1, -1)); continue; }
    const isLast = i === tail.length - 1;
    if (!isLast) {
      if (!JOINER.test(r)) return whole;
      continue;
    }
    // After the last item: only a closing mark, or a comma and a gloss.
    const trimmed = r.trim();
    if (/^[.!?]?$/.test(trimmed)) continue;
    const g = /^,\s+([^{}:]+?)[.!?]?$/u.exec(r);
    if (!g || g[1]!.length > 80) return whole;
    gloss = g[1]!.trim();
  }
  if (items.length === 0 || head.trim().length < 8) return whole;
  return { text: head.trim(), items, gloss };
}

/** A note, cut into its sentences with what each points at lifted out. */
export function chunkNote(text: string): NoteSentence[] {
  return sentencesOf(text).map(pointOf);
}

/** Whether an item reads as a single word or short phrase, drawn as a chip. */
export function isChip(item: string): boolean {
  return item.split(/\s+/).length <= 2 && !/[.!?]$/.test(item);
}
