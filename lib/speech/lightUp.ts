import { soundKey } from "@/lib/estonian/sounds";
import { core } from "./reconcile";

/**
 * WHICH WORDS OF A LINE ON THE SCREEN HAVE BEEN HEARD, IN ORDER.
 *
 * Saying a sentence along with the screen is the bridge between hearing
 * Estonian and saying your own (docs/41-fifth-batch.md, VB-2): each word lights
 * up as the recognizer hears it. A word is lit when it is heard at or after the
 * last word lit, compared after the folds an English ear makes
 * (`lib/estonian/sounds.ts`), so `linna` said as `lina` still lights. A word
 * not heard is simply not lit. Nothing is ever marked wrong here: lighting
 * means the recognizer understood the word, not that it was said well.
 *
 * The same walk is what finds the word said in a gap (VB-8): the heard word
 * that falls between the lit word before the gap and the lit word after it.
 */

/** The words of a line as they are lit: its tokens as written, and the key each is compared on. */
export interface LineWord {
  readonly text: string;
  readonly key: string;
}

export function lineWords(line: string): LineWord[] {
  return line
    .normalize("NFC")
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, key: soundKey(core(text)) }));
}

/** For each word of the line, whether it has been heard yet, in order. */
export function lightUp(line: readonly LineWord[], heard: string): boolean[] {
  const said = heard.normalize("NFC").split(/\s+/).map((w) => soundKey(core(w))).filter(Boolean);
  const lit = new Array<boolean>(line.length).fill(false);
  let from = 0;
  for (let i = 0; i < line.length; i++) {
    const key = line[i]!.key;
    if (!key) {
      // Punctuation on its own counts as reached once the word before it is.
      lit[i] = i === 0 || lit[i - 1]!;
      continue;
    }
    const at = said.indexOf(key, from);
    if (at !== -1) {
      lit[i] = true;
      from = at + 1;
    }
  }
  return lit;
}

/** How much of the line was heard, 0 to 1, for a quiet "you said most of it" rather than a score. */
export function shareLit(lit: readonly boolean[]): number {
  return lit.length === 0 ? 0 : lit.filter(Boolean).length / lit.length;
}

/**
 * The word said where a line has a gap: whatever was heard between the last
 * known word before the gap and the first known word after it. `null` where
 * the words around the gap were not both heard, or nothing was said between
 * them, so the box is filled only when the alignment is certain.
 */
export function wordInGap(before: readonly string[], after: readonly string[], heard: string): string | null {
  const said = heard.normalize("NFC").split(/\s+/).filter(Boolean);
  const keys = said.map((w) => soundKey(core(w)));
  let start = 0;
  if (before.length > 0) {
    const last = soundKey(core(before[before.length - 1]!));
    const at = keys.lastIndexOf(last);
    if (at === -1) return null;
    start = at + 1;
  }
  let end = said.length;
  if (after.length > 0) {
    const next = soundKey(core(after[0]!));
    const at = keys.indexOf(next, start);
    if (at === -1) return null;
    end = at;
  }
  const between = said.slice(start, end).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
  return between.length > 0 ? between.join(" ") : null;
}
