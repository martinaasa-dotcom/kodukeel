import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN ESTIMATE ON A SCREEN IS ONE FIGURE, NEVER A RANGE.
 *
 * The plan is built from published hours, which come as ranges, and the
 * screens used to print both ends: "13 to 22 months", "880 to 1170 hours".
 * A reader took that as the app not knowing, and the width says nothing a
 * learner can plan with. The model keeps the range; every screen quotes the
 * middle (`about` in `lib/assessment/plan.ts`), said as "about", and the
 * verdict is drawn at that same middle so the headline and the figure agree.
 *
 * Each arm is written against the shape that brought the range back: a helper
 * printing `${low} to ${high}`, or a screen reaching for both ends of the
 * projection's weeks.
 */
export default function anEstimateIsOneFigure({ check, code }: InvariantKit) {
  const SCREENS = [
    "components/assessment/PlanPanel.tsx",
    "app/(chromeless)/welcome/LandingMotion.tsx",
    "lib/assessment/plan.ts",
  ];

  check("no plan screen prints the two ends of an estimate", () => {
    let read = 0;
    for (const file of SCREENS) {
      const source = code(file);
      read += 1;
      assert.doesNotMatch(
        source, /\$\{[^}]*\b(low|lo)\b[^}]*\}\s+to\s+\$\{[^}]*\b(high|hi)\b/,
        `${file} prints an estimate as "X to Y" again; quote the middle, as about()`,
      );
      assert.doesNotMatch(source, /formatDurationRange\(/, `${file} prints a duration as a range again`);
    }
    assert.equal(read, SCREENS.length);
  });

  check("the distance sentence and the landing calculator quote the projection's one figure", () => {
    const plan = code("lib/assessment/plan.ts");
    const line = plan.slice(plan.indexOf("export function distanceLine"), plan.indexOf("function hoursAWeek"));
    assert.match(line, /plan\.weeksAbout/, "distanceLine stopped quoting weeksAbout");
    assert.match(code("app/(chromeless)/welcome/LandingMotion.tsx"), /plan\.weeksAbout/, "the landing calculator stopped quoting weeksAbout");
  });
}
