import { ALPHABET } from "./sounds";

/**
 * SPELLING A WORD OUT LOUD, LETTER BY LETTER, IN THE NATIVE SPEAKER'S VOICE.
 *
 * Estonian is read the way it is written, so nobody needs the letters' names
 * to read. Where they are needed is the moment a learner living here meets
 * every week: spelling their own name at a doctor's desk, an email address
 * down a phone line, a street at the bank, and being spelled something back.
 * The names are not the English ones, and each is a recording a native
 * speaker made (`lib/audio/native.ts`, `letter-*`).
 *
 * This is the pure half: which recording each character of a text is. A
 * letter Estonian has a name for is that name; a letter it has none for but
 * carries a mark on one it has (é, ç) is read as the bare letter, which is how anybody here spells José; a space, a hyphen or an
 * apostrophe is a pause; anything else (a digit, a letter of another
 * alphabet) is shown and skipped, never guessed at. Nothing here writes
 * Estonian: every name a learner hears is a recording a person made.
 */

export type SpellPart =
  | { readonly kind: "letter"; readonly char: string; readonly letter: string; readonly clip: string }
  | { readonly kind: "pause"; readonly char: string }
  | { readonly kind: "other"; readonly char: string };

/** The longest text a learner may have spelled at once: a long name and a surname. */
export const SPELL_MAX = 40;

/** Between two letters, and at a space: a breath, and a longer one where the word ends. */
export const LETTER_GAP_MS = 140;
export const PAUSE_GAP_MS = 520;

const BY_LETTER: ReadonlyMap<string, string> = new Map(ALPHABET.map((a) => [a.letter, a.clip]));
const PAUSES = /^[\s\-\u2010\u2011'\u2019.]$/u;

/** The alphabet letter a character is spelled as, or null where Estonian has no name for it. */
export function letterOf(char: string): string | null {
  const up = char.toLocaleUpperCase("et");
  if (BY_LETTER.has(up)) return up;
  const bare = up.normalize("NFD").replace(/\p{M}/gu, "");
  return bare.length === 1 && BY_LETTER.has(bare) ? bare : null;
}

/** A text, character by character, as what is said for each. Cut at `SPELL_MAX`. */
export function spellOut(text: string): SpellPart[] {
  const chars = [...text.trim()].slice(0, SPELL_MAX);
  const parts: SpellPart[] = [];
  for (const char of chars) {
    const letter = letterOf(char);
    if (letter) parts.push({ kind: "letter", char, letter, clip: BY_LETTER.get(letter)! });
    else if (PAUSES.test(char)) {
      // Two pauses in a row are one pause.
      if (parts.at(-1)?.kind !== "pause") parts.push({ kind: "pause", char });
    } else parts.push({ kind: "other", char });
  }
  while (parts.at(-1)?.kind === "pause") parts.pop();
  return parts;
}

/**
 * Whether a dictionary word can be a round of "letter by letter": one word,
 * three to ten letters, every letter one Estonian has a name for. Longer than
 * ten and it is a test of memory rather than of hearing the names.
 */
export function spellableWord(lemma: string): boolean {
  const chars = [...lemma];
  if (chars.length < 3 || chars.length > 10) return false;
  return chars.every((c) => /\p{L}/u.test(c) && BY_LETTER.has(c.toLocaleUpperCase("et")));
}

/**
 * How a typed answer compares with the word, letter by letter, for marking:
 * right where the letter is in place, wrong elsewhere. Case does not count,
 * because nobody can hear it; a letter with its mark dropped does, because
 * `ä` and `a` have two different names and hearing that is the exercise.
 */
export function compareSpelling(typed: string, word: string): { exact: boolean; letters: readonly boolean[] } {
  const a = [...typed.trim().toLocaleLowerCase("et")];
  const b = [...word.toLocaleLowerCase("et")];
  const letters = b.map((c, i) => a[i] === c);
  return { exact: a.length === b.length && letters.every(Boolean), letters };
}
