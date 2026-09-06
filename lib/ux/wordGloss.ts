/**
 * WHETHER THE DICTIONARY IS PUT UNDER EVERY WORD OF A SENTENCE.
 *
 * `lib/dict/glossed.ts` underlines every word of an attested sentence the
 * dictionary can vouch for, and the panel under the sentence says which
 * headword the spelling belongs to, which form of it this is, what it means,
 * and offers to keep it. It exists because a first meeting used to be one
 * glossed word inside six that were not, and because a learner stuck in the
 * middle of a conversation has nowhere else to look.
 *
 * IT IS ALSO SIX MORE UNDERLINES ACROSS A SENTENCE SOMEBODY IS READING. That
 * was reported plainly by somebody using it: the dotted rules and the panel
 * opening under the pointer are a second thing happening on a card whose whole
 * job is one sentence, and a learner who can already read the line is being
 * offered help they did not ask for on every word of it. Which of those two
 * people somebody is cannot be detected, for the same reason the letter bar
 * cannot be: a reader who never opens a word looks exactly like one who does
 * not need to. So it is asked, and the answer is theirs.
 *
 * ON IS THE DEFAULT AND STAYS THE DEFAULT, for the reason `letterBar.ts` gives
 * about itself: a missing row is everybody who used this before the question
 * existed, and reading absence as "off" would quietly take the dictionary out
 * from under every sentence in the app for people who never asked for that.
 *
 * OFF MEANS THE LOOKUP NEVER HAPPENS, rather than a screen drawing it and
 * hiding it. Both screens that show a glossed sentence already draw the plain
 * marked sentence when the dictionary was not consulted, because "the page did
 * not look" was always a state, so turning this off is the producer not asking
 * and costs a round trip rather than adding one.
 */

export type WordGloss = "on" | "off";

export const DEFAULT_WORD_GLOSS: WordGloss = "on";

/** A stored answer, or the default when it is absent or unrecognised. */
export function wordGlossFrom(value: string | undefined | null): WordGloss {
  return value === "off" ? "off" : DEFAULT_WORD_GLOSS;
}

/**
 * The two answers, worded once.
 *
 * Settings shows the standing answer and the panel itself carries the way out,
 * and they are the same choice: somebody who presses "turn this off" under a
 * word and then goes looking for it a month later has to meet the words they
 * were shown when they turned it off.
 */
export const WORD_GLOSS_CHOICES: { value: WordGloss; label: string; detail: string }[] = [
  {
    value: "on",
    label: "Underline every word",
    detail: "Tap any word in a sentence to see what it means.",
  },
  {
    value: "off",
    label: "Leave the sentence alone",
    detail: "Just the sentence, with the word being taught marked.",
  },
];
