import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CLOCK INSIDE A LESSON READS THE LEARNER'S PACE, LIKE A ROUND'S.
 *
 * The rule that a timed practice round is handed its length by a page reading
 * `roundPaceFrom` sweeps `*Session.tsx`, which is where every round's clock
 * lived. B1 put one inside a lesson step: "again, faster" answers the same
 * question in 90, 60 and 45 seconds, in `components/course/AgainFaster.tsx`,
 * which no `*Session.tsx` sweep can see. WCAG 2.2.1 asks the same of it. So a
 * file outside the rounds that steps a remaining time down to nought from a
 * timer takes a `multiplier`, and the lesson's view resolves it off the
 * learner's own setting.
 */
export default function aLessonClockReadsThePace({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("a countdown inside a lesson step takes the learner's pace, resolved off their setting", () => {
    const COUNTS_DOWN = /set(?:Interval|Timeout)\([\s\S]{0,200}?Math\.max\(0,\s*\w+\s*-/;
    const clocks = [...APP, ...COMPONENTS].filter(
      (file) => file.endsWith(".tsx") && !file.endsWith("Session.tsx") && COUNTS_DOWN.test(code(file)),
    );
    assert.ok(clocks.includes("components/course/AgainFaster.tsx"), "the lesson's own clock is no longer found; the matcher stopped matching");
    for (const file of clocks) {
      assert.match(code(file), /\bmultiplier\b/, `${file} counts down to a limit nothing can lengthen`);
    }
    assert.match(code("lib/progress/lessonView.ts"), /multiplierFor\(roundPaceFrom\(/, "the lesson view no longer resolves the pace");
    assert.match(code("app/(app)/course/lessons/[id]/page.tsx"), /timeMultiplier=\{view\.timeMultiplier\}/, "the lesson page no longer hands the pace on");
  });
}
