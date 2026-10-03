/**
 * WHAT A RIGHT ANSWER LOOKS LIKE, AND A WRONG ONE, EVERYWHERE.
 *
 * Twenty screens mark an answer, and each one used to paint its own verdict
 * out of the tokens by hand: a tint here, a fill there, an ink on some, the
 * hue itself on others. The palette had already decided what the colors mean
 * (docs/14-design-system.md §1: mint is recalled, butter is nearly, peach is
 * missed), so nothing was wrong on purpose. What went wrong was the copying.
 * Four rounds wrote a verdict in the fill at 2.2:1, one round never marked the
 * option the learner actually pressed, another marked a near miss the same
 * peach as a blank, and the picture board said nothing in color at all.
 *
 * So there is one vocabulary and this is it. A verdict is one of three words,
 * and each names a class in `app/globals.css` that paints the tint and writes
 * in the ink, in both themes. An option, once the answer is known, is one of
 * three others: the right one, the one the learner pressed when it was not,
 * and the rest. Every screen that marks an answer reads these; none paints a
 * verdict tint by hand, and `scripts/test-invariants.ts` fails on one that
 * does.
 *
 * Pure: no React, no tokens, no color. The color lives in the stylesheet,
 * where the theme can flip it.
 */

export type Verdict = "right" | "nearly" | "wrong";

/*
 * There is no pause constant here, and that is the decision. A marked answer
 * used to move on after a fixed delay, 420 ms, then 1,100, then 8,300, each
 * raised because a learner reported the card going before they had read it.
 * The fourth report was a learner in the daily module unable to press
 * Continue or use Enter while the timer ran. A verdict waits for the learner
 * now, however long they take (`scripts/invariants/the-learner-moves-on.ts`).
 */

/** The class a panel, a chip or a self-grade button wears for a verdict. */
export const VERDICT_CLASS: Record<Verdict, string> = {
  right: "verdict-right",
  nearly: "verdict-nearly",
  wrong: "verdict-wrong",
};

/**
 * The ink alone, for a verdict that is a run of text with nothing behind it:
 * the headline over a dictation, a form marked inside a table cell, a figure
 * on a summary card. The ink and never the fill, which lands near 2.5:1 as
 * text (docs/14-design-system.md, "Every hue has an ink").
 */
export const VERDICT_INK: Record<Verdict, string> = {
  right: "var(--good-ink)",
  nearly: "var(--hard-ink)",
  wrong: "var(--again-ink)",
};

export type OptionState = "right" | "wrong" | "other";

/**
 * An option after the answer is known. `right` is the answer, whether or not
 * the learner picked it; `wrong` is what they pressed instead; `other` is an
 * option nobody chose and nobody wanted.
 */
export const OPTION_CLASS: Record<OptionState, string> = {
  right: "option-right",
  wrong: "option-wrong",
  other: "option-other",
};

/**
 * Which state an option is in once the answer is known. Passing `picked` as
 * null means nothing was pressed (a round timed out), so the answer lights up
 * and everything else steps back.
 */
export function optionState(isAnswer: boolean, isPicked: boolean): OptionState {
  if (isAnswer) return "right";
  if (isPicked) return "wrong";
  return "other";
}

/**
 * The scheduler's four ratings read as three verdicts: Again is a miss, Hard
 * is nearly, Good and Easy are both a recall. Which rating a round sends is
 * that round's decision (ADR-016); how the rating looks is not.
 */
export function verdictOfRating(rating: number): Verdict {
  if (rating <= 1) return "wrong";
  if (rating === 2) return "nearly";
  return "right";
}

/**
 * `checkAnswer`'s four readings as three verdicts. A dropped diacritic and a
 * one-letter slip are both the word, nearly, which is what `countsAsRecalled`
 * already says about them one module over.
 */
export function verdictOfCheck(check: "correct" | "diacritics" | "typo" | "wrong"): Verdict {
  if (check === "correct") return "right";
  if (check === "wrong") return "wrong";
  return "nearly";
}

/**
 * The level check's part credit as a verdict. Full marks is a recall, nothing
 * is a miss, and everything between is the middle the paper has on purpose: a
 * dictation one word out and the right word in the wrong case are both a
 * learner who nearly had it.
 *
 * The third mapping in this file rather than a comparison written out on each
 * of the two screens that needs it, for the reason the other two are here: how
 * a mark *looks* is one decision, wherever the number it is made from came
 * from.
 */
/**
 * A dictation's five readings as three verdicts.
 *
 * NOT `verdictOfCheck`, WHICH ANSWERS ABOUT A DIFFERENT UNION. `checkAnswer`
 * has four readings and a dictation has five: `spacing` is a sentence written
 * as one word or split in the wrong place, and `close` is a word or two out of
 * a whole sentence, and neither exists on a single-form answer. Both are the
 * middle, for the reason the other two middles are: the learner had it, nearly.
 *
 * It is here rather than written out on each of the two screens that draws it,
 * which is what they were doing, a three-way ternary apiece over a union
 * neither of them owns: the placement check's dictation question and the
 * dictation round. A fifth reading added to `DictationResult` is then one
 * decision about how it looks rather than two screens to remember.
 */
export function verdictOfDictation(
  verdict: "correct" | "diacritics" | "spacing" | "close" | "wrong",
): Verdict {
  if (verdict === "correct") return "right";
  if (verdict === "wrong") return "wrong";
  return "nearly";
}

export function verdictOfCredit(credit: number): Verdict {
  if (credit >= 1) return "right";
  if (credit > 0) return "nearly";
  return "wrong";
}

/**
 * A verdict's bold opening and the rest of its line, without saying it twice.
 *
 * The marker's note often opens on the verdict already ("Not quite, it's
 * aadressini"), and a round that printed its own head in front of it read
 * "Not quite. Not quite, it's aadressini." Where the note opens that way the
 * bold part is the note's own opening; elsewhere it is the head and a stop.
 */
export function verdictLine(head: string, note: string | null | undefined): { strong: string; rest: string } {
  if (note && note.toLowerCase().startsWith(head.toLowerCase())) {
    return { strong: note.slice(0, head.length), rest: note.slice(head.length) };
  }
  return { strong: `${head}.`, rest: note ? ` ${note}` : "" };
}

