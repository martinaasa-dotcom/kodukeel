/**
 * THE MODEL TEXT WITH ITS KEY WORDS TAKEN OUT (B1 on, the Write step's frame).
 *
 * A writing evening's `uses` are what its text turns on, and each stands in
 * the model as whole words (`lessonProblems` holds it to that). The frame is
 * the model cut at each use: plain text, then a gap the use fills, then plain
 * text, so the learner writes the text back with the evening's grammar in
 * their own hand before writing one of their own. The first time a use
 * stands in the text is the gap; later ones stay as written, so a sentence
 * is never all holes.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { foldedPhrase, spokenPhrase } from "./sameSentence";
import type { WriteTask } from "./types";

export type FramePart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "gap"; readonly answer: string; readonly en: string; readonly n: number };

export interface FrameLine {
  readonly en: string;
  readonly parts: readonly FramePart[];
}

/** The model cut at its uses, sentence by sentence. */
export function frameOf(write: Pick<WriteTask, "model" | "uses">): FrameLine[] {
  const used = new Set<string>();
  let n = 0;
  return write.model.map((line) => {
    const parts: FramePart[] = [];
    let rest = line.et;
    for (;;) {
      let best: { at: number; len: number; use: WriteTask["uses"][number] } | null = null;
      for (const use of write.uses) {
        if (used.has(use.et)) continue;
        const re = new RegExp(`(?<![\\p{L}])${escape(use.et)}(?![\\p{L}])`, "iu");
        const m = re.exec(rest);
        // The earliest use, and at the same place the longest, so `kui ka` is one gap rather than `kui` and a stray `ka`.
        if (m && (best === null || m.index < best.at || (m.index === best.at && m[0].length > best.len))) best = { at: m.index, len: m[0].length, use };
      }
      if (!best) break;
      if (best.at > 0) parts.push({ kind: "text", text: rest.slice(0, best.at) });
      parts.push({ kind: "gap", answer: rest.slice(best.at, best.at + best.len), en: best.use.en, n: n++ });
      used.add(best.use.et);
      rest = rest.slice(best.at + best.len);
    }
    if (rest) parts.push({ kind: "text", text: rest });
    return { en: line.en, parts };
  });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * How a gap was filled: as written, right but for a letter an English keyboard
 * lacks, or not. As words, so a stray space, a full stop or a capital is never
 * what the gap is marked on, and read the way the other markers read them
 * (`spokenPhrase`), so `pole` is `ei ole` and `Mina` is `Ma` here too.
 */
export function markGap(typed: string, answer: string): "right" | "nearly" | "wrong" {
  const a = spokenPhrase(typed);
  const b = spokenPhrase(answer);
  if (a === b) return "right";
  if (a.length > 0 && foldedPhrase(a) === foldedPhrase(b)) return "nearly";
  return "wrong";
}

/**
 * Which uses a draft has in it, as whole words inside one sentence. Read the
 * way `markGap` reads a gap: a letter with a mark typed without it, a capital,
 * two spaces between the words, `pole` for `ei ole` and `Mina` for `Ma` are
 * still the use, since the tick says it is in the text and the dictionary's
 * reading after it is what names a slip.
 */
export function usesIn(draft: string, uses: WriteTask["uses"]): boolean[] {
  const pieces = draft.split(/[.!?;:]+/u).map((p) => foldedPhrase(spokenPhrase(p)).split(" ").filter(Boolean));
  return uses.map((use) => {
    const words = foldedPhrase(spokenPhrase(use.et)).split(" ").filter(Boolean);
    return words.length > 0 && pieces.some((p) => p.some((_, i) => words.every((w, j) => p[i + j] === w)));
  });
}

/** The words in a draft. */
export function wordCount(text: string): number {
  return [...text.matchAll(/\p{L}+/gu)].length;
}
