import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE LEARNER MOVES ON, NOT A TIMER.
 *
 * A learner walking the daily module reported that at one point Enter did
 * nothing and Continue could not be pressed. The Learn ladder held a right
 * answer up for 8.3 seconds and then advanced by itself, with its button
 * disabled meanwhile and Enter swallowed by the answer box that still had
 * focus; Target moved to the next shot half a second after a hit. Both wait
 * for a press now, and these hold it: no round that a module step can open
 * advances to its next question on a timer, and the ladder's button is live
 * on every verdict.
 */
export default function theLearnerMovesOn({ check, code }: InvariantKit) {
  const rounds = [
    "app/(app)/learn/new/LearnSession.tsx",
    "app/(app)/review/target/TargetSession.tsx",
    "app/(app)/review/ReviewSession.tsx",
    "app/(app)/review/letters/LettersSession.tsx",
  ];

  check("no round moves to its next question on a timer", () => {
    for (const file of rounds) {
      const src = code(file);
      // A timer whose callback steps the round: advance, setIndex, next.
      const timed = /set(?:Timeout|Interval)\(\s*\(\)\s*=>\s*\{?[^}]*?\b(?:advance|setIndex|next|carryOn)\s*\(/.exec(src);
      assert.equal(timed, null, `${file} advances on a timer: ${timed?.[0]}`);
    }
    assert.doesNotMatch(code("lib/ux/verdict.ts"), /VERDICT_PAUSE_MS/, "a verdict pause constant came back");
  });

  check("the ladder's Continue is pressable on every verdict, and Enter in the box carries on", () => {
    const src = code("app/(app)/learn/new/LearnSession.tsx");
    assert.match(
      src,
      /onClick=\{needsRetype \? checkRetype : carryOn\}\s*disabled=\{busy\}/,
      "the ladder's Continue button is disabled on some verdict again",
    );
    assert.match(
      src,
      /onEnter=\{phase === "feedback" \? carryOn : answerGap\}/,
      "Enter in the answer box no longer carries on once the answer is marked",
    );
  });
}
