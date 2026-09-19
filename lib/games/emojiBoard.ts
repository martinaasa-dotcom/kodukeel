/**
 * WHAT A TILE ON THE PICTURE BOARD IS, AND WHAT THE LINE OVER IT SAYS.
 *
 * Both of these lived in `EmojiSession.tsx`, which is `"use client"`, and the
 * page that draws the board is a server component that imported them from it.
 * A type crosses that line for free, because it is gone by the time anything
 * runs. A function does not: Next replaces every export of a client module
 * with a reference the server cannot call, so `boardLead(pairs)` on the
 * server threw "Attempted to call boardLead() from the server".
 *
 * It threw on one branch, which is why it shipped. With a deck big enough the
 * page renders the session and the client calls it; the empty state, which is
 * the board for anybody holding fewer than six nouns the dictionary has a
 * picture for, called it on the server and rendered the error screen instead.
 * A beginner met it and a full deck never did, so every check that had ever
 * opened the round was looking at the branch that works.
 *
 * So the two things both sides need live here, which is a module with no
 * React in it and no directive on it, and either side may read it.
 */

export interface EmojiPair {
  id: string;
  /**
   * The card this pair is evidence about, when the word is in the learner's
   * deck. Null for a word drawn from the dictionary to fill the board, and
   * nothing is graded for those: there is no card, so a row about one would be
   * a row about something that does not exist.
   */
  cardId: string | null;
  emoji: string;
  lemma: string;
  /** The case form the tile shows. */
  form: string;
  /** The question the case answers, which is how a class names it. */
  question: string | null;
  caseEt: string | null;
  /** The case itself, for the plain-English key under the board. */
  caseKey: string | null;
}

/**
 * The line over the board says what the Estonian side is. At A1 every tile is
 * the word itself, because a beginner is asked for no case (`page.tsx`), and
 * a lead promising an ending over a board that carries none is the app
 * describing a different round.
 */
export function boardLead(pairs: readonly EmojiPair[]): string {
  return pairs.some((p) => p.caseKey)
    ? "Match the picture to the Estonian, ending and all."
    : "Match the picture to the word.";
}
