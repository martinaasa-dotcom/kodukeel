"use client";

import { Lightbulb } from "lucide-react";
import { Et } from "@/components/Et";
import { HINT_COST_NOTE, type Hint } from "@/lib/questions/hints";

/**
 * THE HINT, DRAWN ONCE FOR EVERY ROUND IN THE APP.
 *
 * One drawing, for the reason `StarWord` and `TooComplicated` are one each: a
 * copy per session is a copy per session of what a hint costs, what it says it
 * costs, and whether the revealed letters are marked as Estonian. Twenty-odd
 * rounds ask questions here and the first of them to disagree about any of
 * those would be a screen quietly grading differently from the one beside it.
 *
 * `lib/questions/hints.ts` decides what the rungs are and what each one costs.
 * This decides how they look, and holds no Estonian of its own: every character
 * it prints came in on the ladder, which built it out of the answer the round
 * was already holding.
 *
 * ONLY THE LATEST RUNG IS ON THE SCREEN. The ladder is cumulative, so every
 * rung shows everything the rung before it showed and a little more, and
 * drawing the lot would stack four spellings of one word up the card with the
 * three useless ones at the top. What is kept is how many presses are left, so
 * somebody deciding whether to press again knows whether the next one is the
 * answer.
 *
 * IT SAYS WHAT IT COSTS, ONCE, AND AFTER THE FIRST PRESS. Before the press it
 * would be a warning off the one thing this exists to offer; never, and the
 * learner watches a grade change without being told why. So the line arrives
 * with the first hint, which is the moment it becomes true.
 *
 * THE REVEAL IS A LIVE REGION, because it appears in place with no navigation
 * and no verdict behind it: a screen reader is otherwise told nothing at all
 * happened when the learner pressed the only button on the card they could
 * still press.
 */
export function HintLadder({
  ladder, taken, onTake, open, label = "word", graded = true,
}: {
  /** Every rung, mildest first. `hintLadder` or `narrowLadder` built it. */
  ladder: readonly Hint[];
  /** How many have been taken. The round owns this, because the round grades. */
  taken: number;
  onTake: () => void;
  /**
   * Whether the learner has struggled enough with this word to be offered one.
   *
   * `hintsOpen` is the rule and the round asks it, because only the round knows
   * how many times it has put this word up. Drawn as nothing rather than as a
   * disabled button: a control somebody cannot press yet, with no way of
   * finding out when they could, is furniture.
   */
  open: boolean;
  /** The word, so the button says which one it is about to help with. */
  label?: string;
  /**
   * Whether a grade is going to be written for this question at all.
   *
   * False on the handful of asks that have no card behind them: a word the
   * exceptions round found in the dictionary rather than in the deck, a gap cut
   * from a passage the learner pasted in. There is no schedule to move, so
   * `HINT_COST_NOTE` would be the app claiming a consequence it is not going to
   * have, which is a small lie told at exactly the moment it is asking to be
   * trusted. The ladder is offered all the same: somebody stuck on a word they
   * do not hold a card for is as stuck as anybody.
   */
  graded?: boolean;
}) {
  if (!open || ladder.length === 0) return null;

  const shown = taken > 0 ? ladder[Math.min(taken, ladder.length) - 1] : null;
  const left = ladder.length - taken;
  const next = ladder[taken];

  return (
    <div className="flex flex-col items-center gap-2">
      {shown && (
        <div
          role="status"
          /*
            A hook for `scripts/test-hints.mjs` rather than a shape for it to
            walk. That suite asks whether each press uncovers strictly more of
            the same spelling than the last, and the first version found the
            covered form by hunting for a `lang="et"` span inside a live region,
            which is a fact about today's markup: one element between them and
            it reads nothing and waives the check with a reason that is not the
            reason. This is the `data-rung` lesson one component over.
          */
          data-hint-shown={shown.shown}
          data-hint-kind={shown.kind}
          className="flex flex-col items-center gap-1 rounded-lg px-3 py-2"
          style={{ background: "var(--raised)" }}
        >
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>{shown.label}</span>
          {shown.shown && (
            /*
              `tracking` rather than a monospace face, which was the first
              draft. A covered form is read letter by letter against the box
              the learner is typing into, and in the body face at ordinary
              spacing `to_s` reads as one word with a mark in it. Letter
              spacing pulls it apart without putting a second typeface on a
              card that already has two languages on it.
            */
            <Et className="text-lg font-semibold tracking-[0.2em]">{shown.shown}</Et>
          )}
        </div>
      )}
      {next && (
        <button
          type="button"
          onClick={onTake}
          data-hint
          /*
            The accessible name is this rather than the words on the button, so
            a suite looking for it by role and name finds "Get a hint for aeg".
            `data-hint` is what `scripts/test-hints.mjs` anchors on: the first
            version of that suite matched the visible text through the role,
            found nothing on a round where the hint was on screen every time,
            and waived eight checks saying the deck never repeated a word.
          */
          aria-label={taken === 0 ? `Get a hint for ${label}` : `${next.label} for ${label}`}
          className="tap-tint flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
          style={{ color: "var(--ink-3)" }}
        >
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
          {taken === 0 ? "Stuck? Take a hint" : next.label}
          {/*
            Not faded to say it is secondary: `opacity` on a box that holds
            words is the rule this app has about locked units, and the count is
            the half of this button somebody deciding whether to press again is
            actually reading.
          */}
          <span aria-hidden>{left > 1 ? `· ${left} left` : "· last one"}</span>
        </button>
      )}
      {taken > 0 && graded && (
        <p className="text-2xs" style={{ color: "var(--ink-3)" }}>{HINT_COST_NOTE}</p>
      )}
    </div>
  );
}
