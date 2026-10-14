import { editDistance } from "@/lib/estonian/answer";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { tidyForm } from "@/lib/estonian/whichCase";
import { looksLikeSentence } from "@/lib/estonian/writing";
import { acceptedUses, type RequiredWord } from "@/lib/exam/written";

/**
 * MARKING FIVE SENTENCES ABOUT ONE PICTURE, WITHOUT A MODEL.
 *
 * "Say what you see" asks for five sentences, one per box, and the screen does
 * not let the learner move on until every box holds one. What can be decided
 * without asking anybody is decided here, so the answer is the same with the
 * model off, and a model that is wrong about Estonian cannot overturn it:
 *
 * - **Is it a sentence?** At least three words. Nothing else is guessed about
 *   whether it is grammatical, because that is an opinion and a model's.
 * - **Is it Estonian?** Every word is checked against the forms list. A word
 *   the list cannot place is named, which catches the typo and the dropped
 *   õ before anything else does. A capital in the middle of a sentence is a
 *   name and is not asked about, since the list holds no capitals.
 * - **Which things in the picture did it use?** A form of one of them, read
 *   off the dictionary's own forms for that thing (`acceptedUses`). This is
 *   credit and never a condition: the picture is a spark for the imagination
 *   ("who are they, what are they doing?"), so a sentence about a farm under a
 *   picture of a market is a sentence the learner made up, which is the
 *   exercise. Nothing here marks a sentence down for leaving the scene.
 * - **Is it new?** The same sentence twice is one sentence.
 *
 * The forms list is a file read and so is async, which is why the caller
 * resolves the spellings and hands this the set it found: the marking itself
 * is a pure function of its inputs and can be driven by a test.
 *
 * Nothing here writes Estonian. Every spelling it prints back is one the
 * learner wrote.
 */

/** One thing in the picture, with the forms the dictionary holds for it. */
export interface PictureWord extends RequiredWord {
  readonly emoji: string;
  /** The English gloss, which is what the reveal prints beside the word. */
  readonly translation: string;
}

export interface SentenceMark {
  /** At least three words. */
  readonly isSentence: boolean;
  /** The words the forms list could not place, as the learner wrote them. */
  readonly unknown: readonly string[];
  /** The lemmas of the things in the picture the sentence uses, in picture order. Credit, never a condition. */
  readonly mentions: readonly string[];
  /** The same sentence as an earlier box. */
  readonly repeated: boolean;
  /** Opens on a capital and closes on a full stop, a question mark or an exclamation mark. */
  readonly tidy: boolean;
  /** At least half the words are ones the forms list could not place, which is not a typo. */
  readonly garbled: boolean;
  /** A sentence, nothing misspelled, not a repeat. Says nothing about the scene. */
  readonly sound: boolean;
}

export interface PictureMark {
  readonly sentences: readonly SentenceMark[];
  /** How many boxes are sound. */
  readonly sound: number;
  /** The lemmas used anywhere across the five, in picture order. */
  readonly mentioned: readonly string[];
}

/** The words of a sentence as they are written, with a hyphenated compound whole. */
export function writtenWords(sentence: string): string[] {
  return [...sentence.matchAll(ESTONIAN_WORD)].map((m) => m[0]);
}

/**
 * The spellings worth asking the forms list about: every word of every
 * sentence, lowercased, once. A word capitalised away from the start of a
 * sentence is a name and is left out, since the list holds none.
 */
export function spellingsToCheck(sentences: readonly string[]): string[] {
  const out = new Set<string>();
  for (const sentence of sentences) {
    let afterStop = true;
    const text = sentence.trim();
    for (const match of text.matchAll(new RegExp(`${ESTONIAN_WORD.source}|[.!?]`, "gu"))) {
      const token = match[0];
      if (token === "." || token === "!" || token === "?") { afterStop = true; continue; }
      const capital = token[0] !== token[0]!.toLowerCase();
      if (!(capital && !afterStop)) out.add(token.toLowerCase());
      afterStop = false;
    }
  }
  return [...out];
}

export function markPicture(
  words: readonly PictureWord[],
  sentences: readonly string[],
  /** Which of the spellings from `spellingsToCheck` the forms list knows. */
  known: ReadonlySet<string>,
): PictureMark {
  const accepted = words.map((word) => ({ word, uses: acceptedUses(word) }));
  const seen = new Set<string>();

  const marks = sentences.map((raw): SentenceMark => {
    const sentence = raw.trim();
    const isSentence = looksLikeSentence(sentence);

    const unknown: string[] = [];
    let counted = 0;
    let afterStop = true;
    for (const match of sentence.matchAll(new RegExp(`${ESTONIAN_WORD.source}|[.!?]`, "gu"))) {
      const token = match[0];
      if (token === "." || token === "!" || token === "?") { afterStop = true; continue; }
      const capital = token[0] !== token[0]!.toLowerCase();
      const isName = capital && !afterStop;
      afterStop = false;
      if (isName) continue;
      counted += 1;
      if (!known.has(token.toLowerCase()) && !unknown.includes(token)) unknown.push(token);
    }
    const garbled = counted > 0 && unknown.length * 2 >= counted;

    const written = new Set(writtenWords(sentence).map(tidyForm).filter(Boolean));
    const mentions = accepted
      .filter(({ uses }) => [...written].some((w) => uses.has(w)))
      .map(({ word }) => word.lemma);

    const key = writtenWords(sentence).map((w) => w.toLowerCase()).join(" ");
    const repeated = key !== "" && seen.has(key);
    if (key !== "") seen.add(key);

    const first = sentence[0] ?? "";
    const tidy = first !== "" && first !== first.toLowerCase() && /[.!?]$/.test(sentence);

    return {
      isSentence, unknown, mentions, repeated, tidy, garbled,
      sound: isSentence && unknown.length === 0 && !repeated,
    };
  });

  const mentioned = words.map((w) => w.lemma).filter((lemma) => marks.some((m) => m.mentions.includes(lemma)));
  return { sentences: marks, sound: marks.filter((m) => m.sound).length, mentioned };
}

/** One form swapped for another the dictionary vouches for. */
export interface Swap {
  readonly from: string;
  readonly to: string;
}

/**
 * THE CLOSEST FORM THE DICTIONARY VOUCHES FOR, FOR A WORD IT COULD NOT PLACE.
 *
 * `sibuleid` is not in the forms list and `sibulaid`, the form the dictionary
 * holds for `sibul`, is one letter away. That is a correction this app may
 * show, because the replacement is a spelling a lexicographer recorded and
 * the learner's own sentence is untouched around it (ADR-005). It reaches
 * only the words of the picture, whose forms are in hand, and it is silent
 * where it would be guessing: one letter on a short word, two on a long one,
 * a tie between two equally near forms, or a word that is already one of them.
 */
export function suggestSwaps(unknown: readonly string[], vouched: Iterable<string>): Swap[] {
  const pool = [...new Set([...vouched].map((v) => v.toLowerCase()).filter(Boolean))];
  const swaps: Swap[] = [];
  for (const word of unknown) {
    const folded = word.toLowerCase();
    const max = folded.length >= 7 ? 2 : folded.length >= 5 ? 1 : 0;
    if (max === 0 || pool.includes(folded)) continue;
    let best = max + 1;
    let found: string[] = [];
    for (const candidate of pool) {
      const d = editDistance(folded, candidate, max);
      if (d > max) continue;
      if (d < best) { best = d; found = [candidate]; } else if (d === best) found.push(candidate);
    }
    if (found.length === 1) swaps.push({ from: word, to: found[0]! });
  }
  return swaps;
}

/**
 * The learner's own sentence with each swap put in. Only a whole word is
 * replaced, and a capital at the start of the word is kept.
 */
export function applySwaps(sentence: string, swaps: readonly Swap[]): string {
  let out = sentence;
  for (const { from, to } of swaps) {
    out = out.replace(new RegExp(ESTONIAN_WORD.source, "gu"), (word) => {
      if (word.toLowerCase() !== from.toLowerCase()) return word;
      return word[0] !== word[0]!.toLowerCase() ? to[0]!.toUpperCase() + to.slice(1) : to;
    });
  }
  return out;
}

/** One sentence with its wrong forms put right. */
export interface Correction {
  /** Which box, from 0. */
  readonly index: number;
  /** The learner's own sentence with only the swapped words changed. */
  readonly text: string;
  readonly swaps: readonly Swap[];
  /**
   * Words the dictionary could not place and found nothing near enough to put
   * in their place, as the learner wrote them. The sentence above still holds
   * them, so the screen says so rather than presenting it as finished.
   */
  readonly left: readonly string[];
}

/** Every spelling an entry accepts, mapped to the headwords it is a form of. */
export type WordFamily = ReadonlyMap<string, ReadonlySet<string>>;

/** The farthest a model's swap may reach for a word no headword claims, which is a typo. */
const TYPO_REACH = 3;

/**
 * WHETHER A SWAP KEEPS THE SAME WORD.
 *
 * The model chooses among forms the dictionary supplied, and the dictionary now
 * supplies the forms of every word the learner wrote as well as of the things in
 * the picture. So a fix that changes `vaatab` to `ootavad` would be a vouched
 * form and a different verb: the learner's own word is replaced by one they did
 * not choose, which is a rewrite and not a correction. A swap is allowed where
 * the two spellings share a headword, and where the written word belongs to no
 * headword at all (a typo) only when the form offered is within a few letters
 * of it.
 */
export function sameWordIn(family: WordFamily): (from: string, to: string) => boolean {
  return (from, to) => {
    const a = family.get(from.toLowerCase());
    if (!a || a.size === 0) return editDistance(from.toLowerCase(), to.toLowerCase(), TYPO_REACH) <= TYPO_REACH;
    const b = family.get(to.toLowerCase());
    return !!b && [...a].some((lemma) => b.has(lemma));
  };
}

/**
 * THE CORRECTED LIST AT THE END OF A PICTURE.
 *
 * Two sources and one gate. A swap the model proposed is kept only when the
 * word it replaces is one the learner wrote and the form it offers is one the
 * dictionary supplied; a word the forms list could not place gets the nearest
 * supplied form (`suggestSwaps`). Either way every Estonian character shown
 * that the learner did not type is a form from `vouched`, and nothing is
 * rewritten around it. A sentence with nothing to swap has no entry, so
 * word-order advice stays in Anu's note where it can be said in words.
 *
 * `sameWord` is asked of every swap the model proposed. Without it any vouched
 * form may stand in for any written word, which was safe while the vouched
 * forms were those of the things in the picture and is not once they include
 * the forms of everything the learner wrote.
 */
export function correctionsFor(
  sentences: readonly string[],
  marks: readonly SentenceMark[],
  vouched: readonly string[],
  proposed: readonly (readonly { wrong: string; right: string }[])[] = [],
  sameWord: (from: string, to: string) => boolean = () => true,
): Correction[] {
  const vouchedSet = new Set(vouched.map((v) => v.toLowerCase()).filter(Boolean));
  const out: Correction[] = [];
  sentences.forEach((sentence, index) => {
    const written = new Set(writtenWords(sentence).map((w) => w.toLowerCase()));
    const swaps: Swap[] = [];
    for (const fix of proposed[index] ?? []) {
      const from = fix.wrong.trim().toLowerCase();
      const to = fix.right.trim().toLowerCase();
      if (!written.has(from) || !vouchedSet.has(to) || from === to) continue;
      if (!sameWord(from, to)) continue;
      if (swaps.some((x) => x.from.toLowerCase() === from)) continue;
      swaps.push({ from: fix.wrong.trim(), to });
    }
    const notSwapped = (marks[index]?.unknown ?? []).filter((w) => !swaps.some((x) => x.from.toLowerCase() === w.toLowerCase()));
    const nearest = suggestSwaps(notSwapped, vouchedSet);
    swaps.push(...nearest);
    const left = notSwapped.filter((w) => !nearest.some((x) => x.from.toLowerCase() === w.toLowerCase()));
    if (swaps.length > 0) out.push({ index, text: applySwaps(sentence, swaps), swaps, left });
  });
  return out;
}
