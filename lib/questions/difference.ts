/**
 * HOW TWO RIGHT ANSWERS DIFFER WHEN THEIR ENGLISH IS THE SAME.
 *
 * The contrast panel (`components/round/SameMeaning.tsx`) says "here is how
 * they differ" and then prints the two glosses, which is where the course
 * writes a difference ("(something)" against "(doing)"). Where the two glosses
 * are the same string it was printing "do you speak English?" twice under a
 * sentence promising a difference, which a learner reported as not explaining
 * anything, and they were right: the two ways of asking whether somebody speaks
 * English differ in exactly the one thing English lost, which "you" it is.
 *
 * So the words the two phrases do not share are read, and a pair that is the
 * informal "you" against the polite one is named as that, through the register
 * `lib/estonian/pronouns.ts` already records for the two. Anything else is
 * left unexplained rather than guessed at, and the panel then says the
 * dictionary gives both one meaning instead of promising a difference it
 * cannot name.
 *
 * Which pronoun a spelling belongs to is the dictionary's, handed in as a
 * lookup over the entries' own stored forms, so `sa` is `sina` because Ekilex
 * files it there. This file holds no Estonian at all (ADR-005).
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */

import { youRegisterOf, type YouRegister } from "@/lib/estonian/pronouns";

/** The word in one phrase that says which "you" it is. */
export interface RegisterNote {
  /** The spelling as the phrase has it, which is what the panel quotes. */
  readonly spelling: string;
  readonly register: YouRegister;
}

/** The words of a phrase, lower-cased, punctuation dropped. */
function wordsOf(text: string): string[] {
  return text.toLocaleLowerCase("et").split(/[^\p{L}\p{M}]+/u).filter(Boolean);
}

/** The words of `a` that `b` does not have, counted as a multiset. */
function onlyIn(a: readonly string[], b: readonly string[]): string[] {
  const left = new Map<string, number>();
  for (const word of b) left.set(word, (left.get(word) ?? 0) + 1);
  const out: string[] = [];
  for (const word of a) {
    const n = left.get(word) ?? 0;
    if (n > 0) left.set(word, n - 1);
    else out.push(word);
  }
  return out;
}

function noteFor(words: readonly string[], pronounOf: (spelling: string) => string | null): RegisterNote | null {
  const found = words
    .map((spelling) => {
      const lemma = pronounOf(spelling);
      const register = lemma ? youRegisterOf(lemma) : null;
      return register ? { spelling, register } : null;
    })
    .filter((n): n is RegisterNote => n !== null);
  // One "you" on this side, or the phrase is saying something this cannot read.
  return found.length === 1 ? found[0]! : null;
}

/**
 * Which "you" each phrase uses, where that is what tells them apart, or null.
 *
 * Both sides have to name one and they have to be different registers: a
 * phrase with no "you" beside one with the polite one differs in more than
 * register, and saying otherwise would be a claim this cannot check.
 */
export function registerContrast(
  a: string,
  b: string,
  pronounOf: (spelling: string) => string | null,
): readonly [RegisterNote, RegisterNote] | null {
  const aw = wordsOf(a);
  const bw = wordsOf(b);
  const left = noteFor(onlyIn(aw, bw), pronounOf);
  const right = noteFor(onlyIn(bw, aw), pronounOf);
  if (!left || !right || left.register === right.register) return null;
  return [left, right];
}
