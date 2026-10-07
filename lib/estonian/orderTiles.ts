/**
 * THE TILES OF A SENTENCE-BUILDING ROUND: THE WORDS AND THE PUNCTUATION.
 *
 * The round used to set the words alone and print the punctuation back when
 * the sentence was shown whole, on the argument that a comma clinging to a
 * tile gives the clause boundary away. That argument is about a comma glued
 * to a word, and it left the learner never once deciding where a comma goes
 * in a language whose commas follow rules (before `et`, `kuna`, `kui`, between
 * clauses) and never once deciding whether the sentence is a question. It was
 * reported off two screens: `Kas sa tahad ka kooki? – Muidugi!` asked for
 * with no question mark or dash to place, and `Pean uue telefoni ostma, kuna vana läks
 * katki.` with no comma. So a mark is a tile of its own, the learner places
 * it, and it counts toward the right answer.
 *
 * Nothing here writes Estonian. A tile is a word the dictionary's own sentence
 * held or a mark it held, in the order it held them (ADR-005).
 *
 * Pure: no React, no database. The marking works on texts, so the lesson, the
 * round and a test all read one rule.
 */
import { ESTONIAN_WORD } from "./cloze";
import { orderIsRight, readOrder, type OrderVerdict } from "./wordOrder";

/**
 * The dash a line of speech opens with, and the one a pair of dashes sets off.
 * Written as an escape because it is read here rather than printed: this
 * module reads a dash out of an Estonian sentence somebody recorded, and the
 * copy rules that ban the character on a screen ban it in source as well, so
 * the code names it by its code point (the way `ImportPanel`'s separator does).
 */
const DASH = "\u2013";
const EM_DASH = "\u2014";

/** The marks that become tiles. A dash is normalised to the en dash. */
const MARKS = new Set([",", ".", "!", "?", ":", ";", DASH]);

/** A word or one mark: the alternation `matchAll` walks a sentence with. */
const TOKEN = new RegExp(`${ESTONIAN_WORD.source}|[,.!?;:]|[${DASH}${EM_DASH}]|(?<=\\s)-(?=\\s)`, "gu");
const RUN_OF_MARKS = new RegExp(`[,.!?;:${DASH}${EM_DASH}-]{2,}`, "u");
const SPACED_DASH = new RegExp(`\\s+[${DASH}-]\\s+`, "g");

/** Whether a tile is a mark rather than a word. */
export function isMark(tile: string): boolean {
  return MARKS.has(tile);
}

/**
 * Every word and mark of a sentence, in order, as the tiles of the round.
 * A hyphen inside a word stays in the word; a dash standing alone between
 * spaces is a mark of its own.
 */
export function orderTokens(sentence: string): string[] {
  return [...sentence.trim().matchAll(TOKEN)].map((m) => {
    const t = m[0];
    return t === EM_DASH || t === "-" ? DASH : t;
  });
}

/**
 * Whether a sentence can be set as tiles without losing anything on the way.
 *
 * The tiles are the words and the six marks, so a sentence carrying anything
 * else (a digit, a quotation mark, a bracket, an ellipsis, a doubled mark)
 * would be rebuilt into something other than the sentence it was, and the
 * answer shown afterwards would not match what had been asked for.
 */
export function isOrderable(sentence: string): boolean {
  const text = sentence.trim();
  if (!text) return false;
  const rest = text.replace(TOKEN, "").replace(/\s+/g, "");
  if (rest.length > 0) return false;
  // A run of marks that is not a pair a person writes (`?!` is not set).
  if (RUN_OF_MARKS.test(text.replace(SPACED_DASH, " "))) return false;
  const tokens = orderTokens(text);
  const words = tokens.filter((t) => !isMark(t));
  if (words.length < 4 || words.length > 12) return false;
  const lowered = words.map((w) => w.toLowerCase());
  return new Set(lowered).size === lowered.length;
}

/** What a mark is called, for the button that places it. */
export function markName(mark: string): string {
  switch (mark) {
    case ",": return "comma";
    case ".": return "full stop";
    case "!": return "exclamation mark";
    case "?": return "question mark";
    case ":": return "colon";
    case ";": return "semicolon";
    case DASH: return "dash";
    default: return mark;
  }
}

/**
 * The tiles as they are written down: a mark closes up to the word before it,
 * and a dash stands off on both sides, which is how the recording had it.
 */
export function joinTokens(tokens: readonly string[]): string {
  let out = "";
  for (const tile of tokens) {
    if (out === "") out = tile;
    else if (tile === DASH) out += ` ${DASH}`;
    else if (isMark(tile)) out += tile;
    else out += " " + tile;
  }
  return out;
}

/** The index of every word that opens a sentence, in a token list. */
function sentenceStartsAt(tokens: readonly string[]): number[] {
  const starts: number[] = [];
  let expecting = true;
  tokens.forEach((tile, i) => {
    if (isMark(tile)) {
      if (tile === "." || tile === "?" || tile === "!" || tile === DASH) expecting = true;
      return;
    }
    if (expecting) starts.push(i);
    expecting = false;
  });
  return starts;
}

/** The words that open a sentence of this text, as the recording spelled them. */
export function sentenceStarters(sentence: string): string[] {
  const tokens = orderTokens(sentence);
  return sentenceStartsAt(tokens).map((i) => tokens[i]!);
}

/**
 * The tiles as a learner sees them, with the capital taken off every word
 * that only has one because it opens a sentence.
 *
 * `Muidugi` after a dash is capital for the position and said as `muidugi`
 * is a tile that tells nobody which one comes first. Only a word the caller
 * has said is an ordinary one (`lowerable`, decided on the server against the
 * forms list) loses its capital, since a name keeps it wherever it stands,
 * and only at the start of a sentence: a capital in the middle is a name.
 */
export function orderFaces(tokens: readonly string[], lowerable: ReadonlySet<string>): string[] {
  const out = [...tokens];
  for (const at of sentenceStartsAt(tokens)) {
    const word = tokens[at]!;
    const first = word[0] ?? "";
    if (first === first.toLowerCase() || !lowerable.has(word)) continue;
    out[at] = first.toLowerCase() + word.slice(1);
  }
  return out;
}

/** Where each mark sits: how many words come before it, and which mark it is. */
function markPlan(tokens: readonly string[]): string[] {
  const plan: string[] = [];
  let words = 0;
  for (const tile of tokens) {
    if (isMark(tile)) plan.push(`${words}${tile}`);
    else words++;
  }
  return plan;
}

export interface BuiltVerdict extends OrderVerdict {
  /** Every mark is where the recording had it. */
  punctuationRight: boolean;
}

/**
 * How a built sentence stands to the recorded one, words and marks together.
 *
 * The words are read exactly as before (`readOrder`: the writer's own order
 * or another one Estonian allows), and the marks are read by where they fall:
 * how many words come before each one. That is what survives an allowed
 * reordering, since the alternatives never carry a word across a comma, so a
 * mark that is right in the writer's order is right in the variant.
 */
export function readBuiltOrder(
  built: readonly string[],
  original: string,
  alsoRight: readonly string[],
): BuiltVerdict {
  const verdict = readOrder(built.filter((t) => !isMark(t)), original, alsoRight);
  const want = markPlan(orderTokens(original));
  const got = markPlan(built);
  const punctuationRight = want.length === got.length && want.every((m, i) => m === got[i]);
  return { ...verdict, punctuationRight };
}

/** Whether the build counts as right: the order is allowed and the marks are placed. */
export function buildIsRight(verdict: BuiltVerdict): boolean {
  return orderIsRight(verdict.reading) && verdict.punctuationRight;
}
