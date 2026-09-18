"use client";

import { useCallback, useState } from "react";
import { hintCeiling, hintsOpen, type Hint } from "@/lib/questions/hints";

/**
 * THE HINT LADDER'S STATE, HELD IN ONE PLACE FOR EVERY ROUND IN THE APP.
 *
 * `lib/questions/hints.ts` decides what the rungs are and what each one costs,
 * and `components/round/HintLadder.tsx` draws them. Neither of those can hold
 * the two facts a round has to keep: how often this sitting has put a word up
 * and been told no, and how far down the ladder the learner has gone on the
 * question in front of them.
 *
 * Those two are a hook rather than twenty copies of a `useState`, and the
 * reason is the second of them. **A ladder has to be reset when the question
 * changes and not before**, and every round in this app changes question in its
 * own way: some advance an index, some splice the answered card out and leave
 * the index alone, some requeue a miss several places on, and one of them
 * rotates a queue. A copy per round is twenty chances to reset on the wrong
 * thing, and the fault it produces is silent in exactly the way this repository
 * keeps finding: the next question opens with the last one's hints counted
 * against it, so a learner is graded Again on something they answered cleanly
 * and nothing on the screen says why.
 *
 * SO THE TWO FACTS ARE KEYED ON TWO DIFFERENT THINGS, AND THAT IS THE WHOLE
 * SHAPE OF THIS. The first version keyed both on the word, which is right for
 * the misses and wrong for the ladder, and the fault was real rather than
 * theoretical: a deck holds several cards of one word, so a learner who missed
 * `tuba`'s recognition card and took two rungs met `tuba`'s case card later
 * with two rungs already spent. The panel opened with half the answer
 * uncovered, and the grade was capped at Hard, before they had pressed
 * anything at all. Being stuck on `toas` is being stuck on `tuba`, which is why
 * the misses follow the word; two letters of `toas` are not two letters of
 * `toale`, which is why the ladder follows the question.
 *
 * Both are required, for the reason `illSgShort` is required on `NounStems`: a
 * caller that has not thought about which is which does not compile, and the
 * thing it would otherwise get wrong is exactly the fault above.
 *
 * The reset is adjusted during render rather than in an effect, which is
 * React's own documented shape for it: an effect would let one render go past
 * with the old count still standing, and that render is the one where the
 * learner presses Check.
 */
export function useHints({ word, question, ladder, lapses = 0, missedBefore = 0 }: {
  /**
   * What the learner is stuck **on**, which is what the misses are counted
   * against.
   *
   * The word rather than the card wherever a round can tell them apart: a deck
   * holds several cards of one word, and somebody who could not produce `toas`
   * is somebody who is struggling with `tuba`. Where a round genuinely has
   * nothing but a question, the question is both, which is the honest reading
   * of a round that cannot say two of its asks are about one thing.
   */
  word: string | null | undefined;
  /**
   * What is being **asked**, which is what resets how far down the ladder they
   * have gone.
   *
   * Finer than the word wherever one word can be asked more than one way: the
   * card, the rung, the slot, the case. Rungs spent on one question are not
   * rungs spent on the next, whatever the two have in common.
   */
  question: string | null | undefined;
  /** The rungs, from `hintLadder` or `narrowLadder`. Empty where none apply. */
  ladder: readonly Hint[];
  /**
   * What the card already carried in, where the round knows.
   *
   * A word the clinic already calls one they keep failing is offered a hint on
   * its first ask rather than being made to miss it once more first. Rounds
   * that never see a card's scheduling pass nothing, which is the same as none.
   */
  lapses?: number;
  /**
   * Misses this sitting that the hook could not have counted itself.
   *
   * The unit lesson is the caller this exists for: it draws one step at a time
   * and remounts the component for each, so everything this hook holds is
   * thrown away between two questions about the same word. The lesson keeps its
   * own list of answers because it sends them in one call at the end, so the
   * count is already there to hand over. Added to what the hook has seen rather
   * than replacing it, because both are the same fact.
   */
  missedBefore?: number;
}) {
  const [misses, setMisses] = useState<Record<string, number>>({});
  const [taken, setTaken] = useState(0);
  const [asked, setAsked] = useState(question);

  if (question !== asked) {
    setAsked(question);
    setTaken(0);
  }

  const missed = (word ? misses[word] ?? 0 : 0) + missedBefore;

  return {
    /** How many rungs have been taken on the question in front of the learner. */
    taken,
    /** Whether they have struggled enough with this one to be offered a hint. */
    open: word !== null && word !== undefined && ladder.length > 0 && hintsOpen(missed, lapses),
    /** Hand `HintLadder` this. */
    take: useCallback(() => setTaken((n) => n + 1), []),
    /**
     * The highest rating the round may still send, which is 4 until a rung is
     * taken. Rounds apply it with `Math.min` against what the answer earned.
     */
    ceiling: hintCeiling(ladder, taken),
    /**
     * Told that this word was missed, which is what opens the ladder next time.
     *
     * Called by the round rather than worked out here, because what counts as a
     * miss is the round's own decision: a near miss on a typed form is not one,
     * and an abandoned board is not an answer at all.
     */
    noteMiss: useCallback(() => {
      if (!word) return;
      setMisses((m) => ({ ...m, [word]: (m[word] ?? 0) + 1 }));
    }, [word]),
    /** How often this sitting has already asked and been told no. */
    missed,
  };
}
