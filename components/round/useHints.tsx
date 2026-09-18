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
 * keeps finding: the next word opens with the last word's hints counted against
 * it, so a learner is graded Again on a card they answered cleanly and nothing
 * on the screen says why.
 *
 * So the reset is a fact about the key rather than about any round's control
 * flow. Adjusting state during render rather than in an effect, which is
 * React's own documented shape for this: an effect would let one render go past
 * with the old count still standing, and that render is the one where the
 * learner presses Check.
 */
export function useHints({ key, ladder, lapses = 0, missedBefore = 0 }: {
  /**
   * What the learner is being asked about, as one string.
   *
   * The **word** rather than the card wherever a round can tell them apart: a
   * deck holds several cards of one word, and being stuck on `toas` is being
   * stuck on `tuba`. Where a round genuinely has nothing but a question, the
   * question is the key, which is the honest reading of a round that cannot
   * say two of its asks are about one thing.
   */
  key: string | null | undefined;
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
   * thrown away between two questions about the same word. The lesson keeps
   * its own list of answers because it sends them in one call at the end, so
   * the count is already there to hand over. Added to what the hook has seen
   * rather than replacing it, because both are the same fact.
   */
  missedBefore?: number;
}) {
  const [misses, setMisses] = useState<Record<string, number>>({});
  const [taken, setTaken] = useState(0);
  const [asked, setAsked] = useState(key);

  if (key !== asked) {
    setAsked(key);
    setTaken(0);
  }

  const missed = (key ? misses[key] ?? 0 : 0) + missedBefore;

  return {
    /** How many rungs have been taken on the question in front of the learner. */
    taken,
    /** Whether they have struggled enough with this one to be offered a hint. */
    open: key !== null && key !== undefined && ladder.length > 0 && hintsOpen(missed, lapses),
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
      if (!key) return;
      setMisses((m) => ({ ...m, [key]: (m[key] ?? 0) + 1 }));
    }, [key]),
    /** How often this sitting has already asked and been told no. */
    missed,
  };
}
