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
 * - **Is it about the picture?** It uses a form of at least one thing in it,
 *   read off the dictionary's own forms for that thing (`acceptedUses`).
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
  /** The lemmas of the things in the picture the sentence uses, in picture order. */
  readonly mentions: readonly string[];
  /** The same sentence as an earlier box. */
  readonly repeated: boolean;
  /** Opens on a capital and closes on a full stop, a question mark or an exclamation mark. */
  readonly tidy: boolean;
  /** All four: a sentence, nothing misspelled, about the picture, not a repeat. */
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
    let afterStop = true;
    for (const match of sentence.matchAll(new RegExp(`${ESTONIAN_WORD.source}|[.!?]`, "gu"))) {
      const token = match[0];
      if (token === "." || token === "!" || token === "?") { afterStop = true; continue; }
      const capital = token[0] !== token[0]!.toLowerCase();
      const isName = capital && !afterStop;
      afterStop = false;
      if (!isName && !known.has(token.toLowerCase()) && !unknown.includes(token)) unknown.push(token);
    }

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
      isSentence, unknown, mentions, repeated, tidy,
      sound: isSentence && unknown.length === 0 && mentions.length > 0 && !repeated,
    };
  });

  const mentioned = words.map((w) => w.lemma).filter((lemma) => marks.some((m) => m.mentions.includes(lemma)));
  return { sentences: marks, sound: marks.filter((m) => m.sound).length, mentioned };
}
