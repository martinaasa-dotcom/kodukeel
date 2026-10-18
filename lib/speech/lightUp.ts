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
      lit[i] = i > 0 && lit[i - 1]!;
      continue;
    }
    const at = said.indexOf(key, from);
    if (at !== -1) {
      lit[i] = true;
      from = at + 1;
    }
  }
  /* A mark that opens the line (the dash before a reply) has no word before
     it, so it is reached with the first word after it: lit by nothing heard
     would be a line that starts half lit before anybody has spoken. */
  const first = line.findIndex((word) => word.key);
  if (first > 0) for (let i = 0; i < first; i++) lit[i] = lit[first]!;
  return lit;
}

/**
 * How each word of the line came across: heard exactly as it is spelled,
 * understood but heard as a different spelling, or not heard.
 *
 * `lightUp` compares after the folds an English ear makes, so `üks` heard as
 * `uks` and `kuus` heard as `kus` both light: the word was understood, which
 * is what lighting promises. But in those cases the model did write the
 * difference down, and on the line it is the one thing the app hears that
 * says anything about a sound. `npm run measure:confidence` measured it: of 96
 * native recordings of sixteen course words in six voices, 87 lit and every
 * one of those was heard exactly as spelled; of 294 recordings of the same
 * words said with a vowel, an umlaut or a length wrong, 148 lit and 43 of
 * those were heard as a different spelling. The model's own confidence was no use
 * for the same question (at the line that catches most, it doubts 44% of the
 * native words), so this is the middle state and the number is not.
 *
 * It is one-sided by construction and the screen has to say so: `close` is
 * strong evidence a word did not sound as spelled, and `clear` is no evidence
 * that it did, because the model writes most words said with an accent as the
 * word meant (docs/39-speech.md section 3.5). It never grades anything and
 * never says a sound was wrong; it says what was heard ("we heard uks").
 *
 * The lit set is exactly `lightUp`'s over the same reading, asserted, so the
 * two can never disagree about which words came across.
 */
export type WordClarity = "clear" | "close" | "missing";

export interface LineClarity {
  readonly clarity: readonly WordClarity[];
  /** For each `close` word, the spelling it was heard as; `null` elsewhere. */
  readonly heardAs: readonly (string | null)[];
}

export function clarityOf(
  line: readonly LineWord[],
  heard: readonly { readonly text: string; readonly heard: string }[],
): LineClarity {
  /* A word of the reading as `lightUp` splits `understood`: a repair can turn one
     heard word into two ("kirjutusretsepti" read as "kirjutas retsepti"), and
     both halves carry what was heard in their place. */
  const said: { key: string; text: string; heard: string }[] = [];
  for (const w of heard) {
    for (const piece of w.text.normalize("NFC").split(/\s+/).filter(Boolean)) {
      const key = soundKey(core(piece));
      if (key) said.push({ key, text: piece, heard: w.heard });
    }
  }
  const clarity = new Array<WordClarity>(line.length).fill("missing");
  const heardAs = new Array<string | null>(line.length).fill(null);
  let from = 0;
  for (let i = 0; i < line.length; i++) {
    const word = line[i]!;
    if (!word.key) {
      // Punctuation takes the state of the word before it, as `lightUp` lights it.
      clarity[i] = i > 0 && clarity[i - 1] !== "missing" ? "clear" : "missing";
      continue;
    }
    const at = said.findIndex((s, j) => j >= from && s.key === word.key);
    if (at === -1) continue;
    from = at + 1;
    const as = said[at]!.heard;
    if (core(as) === core(word.text)) clarity[i] = "clear";
    else {
      clarity[i] = "close";
      heardAs[i] = core(as) || as;
    }
  }
  const first = line.findIndex((word) => word.key);
  if (first > 0) for (let i = 0; i < first; i++) clarity[i] = clarity[first] === "missing" ? "missing" : "clear";
  return { clarity, heardAs };
}

/**
 * The `data-lit` a word is drawn with: lit, lit with what it was heard as
 * beside it (`app/globals.css` draws the wavy underline), or not lit. While a
 * turn is still being said only `lightUp`'s two states exist, and `null`
 * stands for that.
 */
export function litAttr(lit: boolean, clarity: WordClarity | null): "true" | "close" | "false" {
  if (clarity === null) return lit ? "true" : "false";
  return clarity === "close" ? "close" : clarity === "clear" ? "true" : "false";
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
  /*
    Only words count as landmarks. A line's text around a gap carries its
    punctuation as tokens of their own (`.` after a gap at the end, `, kultuur`
    after one mid-sentence), and nobody says a full stop, so a landmark that is
    a mark would never be found and the box would never be filled. Measured on
    the workbook's own lines: a quarter of them end in a mark straight after
    the gap.
  */
  const spoken = (words: readonly string[]) => words.map(core).filter(Boolean);
  const beforeWords = spoken(before);
  const afterWords = spoken(after);
  /*
    A figure beside the gap is no landmark either: the line writes `300` and a
    recognizer writes the number out in words, so what lies between the
    landmarks would be the number and the word together. Rather than guess
    where one ends, the box is left for typing.
  */
  const figure = (w: string | undefined) => w !== undefined && !/\p{L}/u.test(w);
  if (figure(beforeWords[beforeWords.length - 1]) || figure(afterWords[0])) return null;
  const beforeKeys = beforeWords.map(soundKey).filter(Boolean);
  const afterKeys = afterWords.map(soundKey).filter(Boolean);
  let start = 0;
  if (beforeKeys.length > 0) {
    /*
      The words before the gap are walked in order, the way `lightUp` walks a
      line, so a word said again after the gap ("Ma ... ja ma ...") is not
      taken for the one before it. Where the walk loses the last of them (a
      word skipped while reading) its last occurrence anywhere stands in.
    */
    let from = 0;
    let lastAt = -1;
    beforeKeys.forEach((key, i) => {
      const at = keys.indexOf(key, from);
      if (at === -1) return;
      from = at + 1;
      if (i === beforeKeys.length - 1) lastAt = at;
    });
    const at = lastAt !== -1 ? lastAt : keys.lastIndexOf(beforeKeys[beforeKeys.length - 1]!);
    if (at === -1) return null;
    start = at + 1;
  }
  let end = said.length;
  if (afterKeys.length > 0) {
    const at = keys.indexOf(afterKeys[0]!, start);
    if (at === -1) return null;
    end = at;
  }
  const between = said.slice(start, end).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
  return between.length > 0 ? between.join(" ") : null;
}

/** A line with a gap, as `whichGap` reads it: the text either side of the gap. */
export interface GapLine {
  readonly id: string;
  readonly before: string;
  readonly after: string;
}

/** Less of a line's own words than this, heard, and a reading is not taken to be that line. */
export const GAP_LINE_SHARE = 0.5;

/**
 * Which line of a page was read aloud, and the word said in its gap.
 *
 * A page has several gaps and a learner reads one line at a time. The line
 * whose box has the caret is taken first, since that is where they are
 * looking; otherwise the line most of whose own words were heard, provided at
 * least half were, so a reading of one line never fills another's box. `null`
 * where no line fits or no gap can be aligned, and the box waits for typing.
 */
export function whichGap(
  lines: readonly GapLine[], heard: string, focused: string | null = null,
): { readonly id: string; readonly word: string } | null {
  const split = (text: string) => text.split(/\s+/).filter(Boolean);
  const share = (line: GapLine) => shareLit(lightUp(lineWords(`${line.before} ${line.after}`).filter((w) => w.key), heard));
  const read = (line: GapLine) => {
    const word = wordInGap(split(line.before), split(line.after), heard);
    return word === null ? null : { id: line.id, word };
  };
  const mine = focused === null ? undefined : lines.find((l) => l.id === focused);
  if (mine && share(mine) >= GAP_LINE_SHARE) {
    const got = read(mine);
    if (got) return got;
  }
  let best: { id: string; word: string } | null = null;
  let bestShare = GAP_LINE_SHARE;
  for (const line of lines) {
    const s = share(line);
    if (s < bestShare) continue;
    const got = read(line);
    if (!got) continue;
    if (best === null || s > bestShare) {
      best = got;
      bestShare = s;
    }
  }
  return best;
}
