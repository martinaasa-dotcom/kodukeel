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
 * OFF IS THE DEFAULT, AND ON IS A CHOICE SOMEBODY MAKES IN SETTINGS. It was on
 * for everybody at first, on `letterBar.ts`'s argument that a missing row is
 * everybody who used the app before the question existed. The operator read the
 * card with the panel open under a word and called it busy, which it is: a
 * dotted rule under every word and a panel that opens as a pointer crosses the
 * line is two things happening on a card whose job is one sentence. So absence
 * reads as "off" for everybody, including the people who never answered, and
 * only a stored "on" draws the underlines. The sentence's own English line is
 * still printed under it either way, so nobody is left without a reading.
 *
 * OFF MEANS THE LOOKUP NEVER HAPPENS, rather than a screen drawing it and
 * hiding it. Both screens that show a glossed sentence already draw the plain
 * marked sentence when the dictionary was not consulted, because "the page did
 * not look" was always a state, so turning this off is the producer not asking
 * and costs a round trip rather than adding one.
 */

export type WordGloss = "on" | "off";

export const DEFAULT_WORD_GLOSS: WordGloss = "off";

/** A stored answer, or the default when it is absent or unrecognised. */
export function wordGlossFrom(value: string | undefined | null): WordGloss {
  return value === "on" ? "on" : DEFAULT_WORD_GLOSS;
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
    detail: "Every word in an example sentence is underlined. Tap one to see what it means.",
  },
  {
    value: "off",
    label: "Leave the sentence alone",
    detail: "You see the plain sentence, with only the new word highlighted.",
  },
];
