/**
 * Marking a dictation.
 *
 * Typing back a sentence you have only heard is the hardest thing the app asks
 * for, and the only exercise that tests listening, spelling and word boundaries
 * at once — Estonian runs its case endings straight onto the stem, so hearing
 * `toas` and writing `toa` is a real and specific failure rather than a slip.
 *
 * Which is exactly why a single right/wrong verdict would be useless. A learner
 * who got eleven words out of twelve needs to see *which* one, and whether they
 * missed the word or only its diacritics. So this aligns what was typed against
 * what was said, word by word, and labels each pairing.
 *
 * Alignment is Needleman–Wunsch rather than a naive zip: drop one word early in
 * a sentence and every later word shifts, so zipping would mark a nearly
 * perfect answer as entirely wrong. Sentences are a dozen words at most, so the
 * quadratic table costs nothing.
 *
 * Nothing here writes Estonian. It compares a typed string against a sentence
 * that came from Ekilex (ADR-005).
 */

import { droppedDiacritics, editDistance } from "./answer";
import { fold } from "@/lib/estonian/fold";

export type WordStatus =
  /** Typed exactly, ignoring case and punctuation. */
  | "right"
  /** The right word without its Estonian letters — `oues` for `õues`. */
  | "diacritics"
  /** One keystroke out. */
  | "typo"
  /**
   * The right words, run together or split apart — `kuuekuup` for `kuue
   * kuup`, or the reverse. Estonian runs no words together on its own, so
   * this is never a wrong word: it is the right ones with the space in the
   * wrong place, which is a spelling slip rather than a different sentence.
   */
  | "spacing"
  /** A different word in the same slot. */
  | "wrong"
  /** In the sentence, not in the answer. */
  | "missing"
  /** In the answer, not in the sentence. */
  | "extra";

export interface DictationWord {
  /** The word as the sentence has it, for display. Null for an extra word. */
  expected: string | null;
  /** The word as it was typed. Null for a word that was left out. */
  typed: string | null;
  status: WordStatus;
}

export interface DictationResult {
  words: DictationWord[];
  /** Words typed exactly right. */
  right: number;
  /** Words in the sentence. Extra words are counted as errors, not as length. */
  total: number;
  /** Percentage of the sentence typed exactly right, 0–100. */
  accuracy: number;
  verdict: "correct" | "diacritics" | "spacing" | "close" | "wrong";
  /** What to grade the card, unless the learner overrides it. */
  suggestedRating: 1 | 2 | 3;
  /** A one-line summary, ready to display. */
  note: string;
}

/** Lowercase and strip the punctuation a listener cannot hear. */
/*
  Punctuation that is not part of a word, stripped before two spellings are
  compared.

  Written with escapes rather than the characters themselves. This reads
  dashes, it never writes one, and a literal em dash sitting in a character
  class is indistinguishable from copy to the reader-copy guard that walks
  this file. It was rewritten into a comma once already, which quietly turned
  a stray dash in a dictated Ekilex sentence into a word the learner had to
  type.
*/
const PUNCTUATION = /[.,!?;:"'`\u00b4\u2019\u201c\u201d\u00ab\u00bb()\u2013\u2014]/g;

function normalise(word: string): string {
  return word
    .toLocaleLowerCase("et")
    .normalize("NFC")
    .replace(PUNCTUATION, "")
    .trim();
}

/** Words as typed, with anything that normalizes to nothing dropped. */
export function dictationWords(text: string): string[] {
  return text.split(/\s+/).map((w) => w.trim()).filter((w) => normalise(w).length > 0);
}

/** What one typed word can be, against one expected word. */
type Pairing = Exclude<WordStatus, "missing" | "extra" | "spacing">;

/**
 * A slipped keystroke, as opposed to a different form of the word.
 *
 * One edit apart is not enough on its own here: Estonian case endings *are* one
 * or two letters, so `toa` and `toas` are one edit apart and are the genitive
 * and the inessive. Forgiving that as a typo would forgive exactly the thing
 * dictation exists to test. So the ending has to survive — either the words are
 * the same length (a substitution somewhere inside) or they still end alike.
 */
function isTypo(expected: string, typed: string): boolean {
  if (expected.length < 4) return false;
  if (editDistance(typed, expected, 1) > 1) return false;
  if (expected.length === typed.length) return true;
  return expected.slice(-2) === typed.slice(-2);
}

/** How well two words match, and what to call it. */
function compare(expected: string, typed: string): Pairing {
  const e = normalise(expected);
  const t = normalise(typed);
  if (e === t) return "right";
  if (fold(e) === fold(t)) return "diacritics";
  if (isTypo(e, t)) return "typo";
  return "wrong";
}

/** Alignment cost: cheap for a match, dearer the further from one it gets. */
const COST: Record<Pairing, number> = { right: 0, diacritics: 0.4, typo: 0.6, wrong: 1.6 };
/** Leaving a word out, or inventing one, costs about as much as getting it wrong. */
const GAP = 1;
/**
 * Two expected words typed as one, or one typed as two — cheaper than a wrong
 * word and a missing one (1.6 + 1 = 2.6), because the content was heard
 * exactly right and only the space moved. Dearer than a typo, because a
 * dropped keystroke is a smaller slip than a whole word boundary.
 */
const SPACE_COST = 0.5;
/**
 * What a merge or split costs extra when it only lines up once the
 * diacritics are folded away too — a learner can drop both in one breath,
 * and `kuueoue` for `kuue õue` is still every word heard, just twice slipped
 * rather than once. The same weight `diacritics` carries on an ordinary pair.
 */
const DIACRITICS_IN_SPACE_COST = 0.4;
/**
 * How many expected words may run together, or one word may be typed as, in
 * one slip. Two covers the case this was built for; three catches a learner
 * who drops two spaces in a row without letting a run of five words vanish
 * into "extra" and "missing" for no gain — sentences here are a dozen words
 * at most, so the extra checks per cell cost nothing.
 */
const MAX_SPACE_WORDS = 3;

/** Every word in the span, normalised on its own and run together with nothing between. */
function joinSpan(words: readonly string[]): string {
  return words.map(normalise).join("");
}

/**
 * Whether a run of expected words reads as a run of typed words with the
 * spaces taken out: exactly, only once the diacritics are folded away too,
 * or not at all. The one guard between a stray space and a genuinely
 * different word, so this only ever forgives a space that was actually
 * dropped or added.
 */
function spaceMatch(wantSpan: readonly string[], gotSpan: readonly string[]): "exact" | "diacritics" | null {
  const want = joinSpan(wantSpan);
  const got = joinSpan(gotSpan);
  if (want === got) return "exact";
  if (fold(want) === fold(got)) return "diacritics";
  return null;
}

/**
 * The span itself carries no extra cost: two different spans can never both
 * match the same single word exactly (they would need different lengths of
 * letters), so there is nothing to break a tie between and nothing to prefer
 * a smaller reading over. What can vary is only whether the diacritics had
 * to be folded away to make the match.
 */
function spaceCost(match: "exact" | "diacritics"): number {
  return SPACE_COST + (match === "diacritics" ? DIACRITICS_IN_SPACE_COST : 0);
}

export function checkDictation(typed: string, expected: string): DictationResult {
  const want = dictationWords(expected);
  const got = dictationWords(typed);

  const words = align(want, got);
  const right = words.filter((w) => w.status === "right").length;
  const total = want.length;
  const accuracy = total === 0 ? 0 : Math.round((right / total) * 100);

  return { words, right, total, accuracy, ...judge(words, right, total, accuracy) };
}

/**
 * Needleman–Wunsch over words, then a walk back through the table to recover
 * which words were matched, dropped and invented.
 */
function align(want: string[], got: string[]): DictationWord[] {
  const rows = want.length;
  const cols = got.length;

  // table[i][j] = cost of aligning the first i expected words with the first j typed.
  const table: number[][] = Array.from({ length: rows + 1 }, () => Array<number>(cols + 1).fill(0));
  for (let i = 1; i <= rows; i++) table[i]![0] = i * GAP;
  for (let j = 1; j <= cols; j++) table[0]![j] = j * GAP;

  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      const pair = table[i - 1]![j - 1]! + COST[compare(want[i - 1]!, got[j - 1]!)];
      const skipExpected = table[i - 1]![j]! + GAP;
      const skipTyped = table[i]![j - 1]! + GAP;
      let best = Math.min(pair, skipExpected, skipTyped);
      // A run of expected words typed as one: `kuue kuup` typed `kuuekuup`.
      for (let span = 2; span <= Math.min(MAX_SPACE_WORDS, i); span++) {
        const match = spaceMatch(want.slice(i - span, i), [got[j - 1]!]);
        if (match) best = Math.min(best, table[i - span]![j - 1]! + spaceCost(match));
      }
      // One expected word typed as a run: a space (or two) landed inside it.
      for (let span = 2; span <= Math.min(MAX_SPACE_WORDS, j); span++) {
        const match = spaceMatch([want[i - 1]!], got.slice(j - span, j));
        if (match) best = Math.min(best, table[i - 1]![j - span]! + spaceCost(match));
      }
      table[i]![j] = best;
    }
  }

  const out: DictationWord[] = [];
  let i = rows;
  let j = cols;
  outer: while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const status = compare(want[i - 1]!, got[j - 1]!);
      if (table[i]![j] === table[i - 1]![j - 1]! + COST[status]) {
        out.push({ expected: want[i - 1]!, typed: got[j - 1]!, status });
        i--; j--;
        continue;
      }
    }
    if (j >= 1) {
      for (let span = 2; span <= Math.min(MAX_SPACE_WORDS, i); span++) {
        const match = spaceMatch(want.slice(i - span, i), [got[j - 1]!]);
        if (match && table[i]![j] === table[i - span]![j - 1]! + spaceCost(match)) {
          out.push({ expected: want.slice(i - span, i).join(" "), typed: got[j - 1]!, status: "spacing" });
          i -= span; j--;
          continue outer;
        }
      }
    }
    if (i >= 1) {
      for (let span = 2; span <= Math.min(MAX_SPACE_WORDS, j); span++) {
        const match = spaceMatch([want[i - 1]!], got.slice(j - span, j));
        if (match && table[i]![j] === table[i - 1]![j - span]! + spaceCost(match)) {
          out.push({ expected: want[i - 1]!, typed: got.slice(j - span, j).join(" "), status: "spacing" });
          i--; j -= span;
          continue outer;
        }
      }
    }
    if (i > 0 && table[i]![j] === table[i - 1]![j]! + GAP) {
      out.push({ expected: want[i - 1]!, typed: null, status: "missing" });
      i--;
      continue;
    }
    out.push({ expected: null, typed: got[j - 1]!, status: "extra" });
    j--;
  }
  return out.reverse();
}

/**
 * Whether a merged or split entry only lined up once the diacritics were
 * folded away too, i.e. `kuueoue` read as `kuue õue` rather than an exact
 * concatenation of it. The one place this is decided, so `wordNote` and
 * `judge` cannot count it two different ways.
 */
/**
 * How many spaces one merge or split moved.
 *
 * A `spacing` entry always holds exactly one word on one of its two sides, so
 * what it cost is the other side's word count less one: `Kuipaljukell` for
 * `Kui palju kell` is two spaces gone rather than one thing gone wrong. Both
 * notes counted entries, so two spaces dropped in a row were reported to
 * somebody looking at two of them as "one needs a space moved". The suite's
 * own case for that merge asserted the alignment and never the sentence.
 */
function spacesMoved(word: DictationWord): number {
  const expected = word.expected?.split(" ").length ?? 1;
  const typed = word.typed?.split(" ").length ?? 1;
  return Math.max(expected, typed) - 1;
}

function spacingHasDiacriticsSlip(word: DictationWord): boolean {
  if (word.status !== "spacing" || !word.expected || !word.typed) return false;
  return joinSpan(word.expected.split(" ")) !== joinSpan(word.typed.split(" "));
}

function judge(
  words: DictationWord[],
  right: number,
  total: number,
  accuracy: number,
): Pick<DictationResult, "verdict" | "suggestedRating" | "note"> {
  if (total === 0 || words.every((w) => w.typed === null)) {
    return { verdict: "wrong", suggestedRating: 1, note: "Nothing typed." };
  }

  if (right === total && words.length === total) {
    return { verdict: "correct", suggestedRating: 3, note: "Word for word." };
  }

  /*
    THE LEARNER HEARD EVERY WORD, WHICH IS THE HARD HALF.
    Dropping the Estonian letters and running two words together are both
    "the right sentence, marked down for spelling" rather than "the wrong
    sentence" — `kuuekuup` for `kuue kuup` is every letter the sentence has,
    in order, with nothing between two of them that should have been there.
    Grading that like an unheard sentence teaches the wrong lesson. A single
    gate here, rather than two `.every()` calls that could drift apart on
    which statuses they let through; the verdict below is still the more
    specific `diacritics` where no space moved, so the two continue to read
    as two different notes.
  */
  const heardEverything = words.every((w) =>
    w.status === "right" || w.status === "diacritics" || w.status === "spacing");
  if (heardEverything) {
    const spaced = words.filter((w) => w.status === "spacing");
    // A merge or split can itself have lost its diacritics, so that count is
    // folded in here rather than only ever coming from an ordinary pair.
    const slipped = words.filter((w) => w.status === "diacritics").length
      + spaced.filter(spacingHasDiacriticsSlip).length;

    if (spaced.length === 0) {
      return {
        verdict: "diacritics",
        suggestedRating: 2,
        note: slipped === 1
          ? "Every word heard, one is missing its Estonian letters."
          : `Every word heard, ${slipped} are missing their Estonian letters.`,
      };
    }

    const spaces = spaced.reduce((n, w) => n + spacesMoved(w), 0);
    const spaceNote = spaces === 1 ? "one space needs moving" : `${spaces} spaces need moving`;
    // "Word", because after a clause about spaces a bare "one" reads as a space.
    const diacriticsNote = slipped === 1
      ? "one word is missing its Estonian letters"
      : `${slipped} words are missing their Estonian letters`;
    return {
      verdict: "spacing",
      suggestedRating: 2,
      note: slipped > 0
        ? `Every word heard, but ${spaceNote}, and ${diacriticsNote}.`
        : `Every word heard, but ${spaceNote}.`,
    };
  }

  if (accuracy >= 60) {
    return {
      verdict: "close",
      suggestedRating: 2,
      note: `${right} of ${total} words exactly right.`,
    };
  }

  return {
    verdict: "wrong",
    suggestedRating: 1,
    note: total === right ? "Extra words crept in." : `${right} of ${total} words right, play it again.`,
  };
}

/**
 * What went wrong with one word, in words.
 *
 * THE DISTINCTION THIS EXERCISE EXISTS FOR WAS IN A TOOLTIP.
 *
 * `diacritics` and `typo` are the whole pedagogical claim of dictation: the
 * README promises the marking shows "whether you only lost its Estonian
 * letters", and that is a different lesson from a slipped finger. They were
 * rendered identically — same background, same ink, same "you: ‹typed›" line —
 * and told apart only by a `title` attribute, which is a hover tooltip. On a
 * phone, which is the device this app is measured on, hover does not happen,
 * so on the primary device the exercise's headline distinction was invisible.
 * `spacing` is the third such distinction: the words were heard exactly, and
 * only the space between two of them moved, which is not the same lesson as
 * either of the other two — and can happen alongside a dropped diacritic in
 * the very word the space moved out of.
 *
 * The main review flow already had this right: `checkAnswer` produces a
 * sentence and `ReviewSession` prints it. This is that, per word, and it
 * reuses `droppedDiacritics` rather than rewriting the loop, so the two
 * cannot drift apart on which letters they know about.
 *
 * `wrong`, `missing` and `extra` return null on purpose. What is already on
 * screen — the word that was expected, the word that was typed, "left out",
 * the strikethrough — says everything a label would, and a chip that explains
 * an obvious mistake at length is a chip nobody reads.
 *
 * Nothing here writes Estonian: every letter named comes out of the sentence
 * Ekilex recorded (ADR-005).
 */
export function wordNote(word: DictationWord): string | null {
  if (!word.expected || !word.typed) return null;

  if (word.status === "diacritics") {
    const dropped = droppedDiacritics(word.typed, word.expected);
    return dropped.length > 0 ? dropped.join(", ") : "the dots and tildes";
  }

  if (word.status === "typo") {
    // Deliberately not "which" keystroke. The point of separating this from a
    // dropped diacritic is that this one is a slip and that one is a thing to
    // learn; spelling out the slip would give the two the same weight again.
    return "one letter out";
  }

  if (word.status === "spacing") {
    // The words in `expected` outnumbering the words in `typed` is a merge
    // (two or more words run together); the other way round is a split.
    const spaces = spacesMoved(word);
    const spaceIssue = word.expected.split(" ").length > word.typed.split(" ").length
      ? (spaces === 1 ? "missing a space" : `missing ${spaces} spaces`)
      : (spaces === 1 ? "an extra space" : `${spaces} extra spaces`);
    // The same slip can lose a diacritic on the way, since folding the
    // diacritics away is what let the merge or split match at all.
    return spacingHasDiacriticsSlip(word) ? `${spaceIssue}, and its Estonian letters` : spaceIssue;
  }

  return null;
}
