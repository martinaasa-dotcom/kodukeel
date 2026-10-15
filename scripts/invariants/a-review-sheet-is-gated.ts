import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A REVIEWER'S SHEET IS APPLIED ON THE READER'S WORD AND NO FURTHER.

  `npm run apply:scene-review` is the one route by which an Estonian line in
  the bank changes other than drafting, and it may change one only to what the
  reviewer typed and only through the gate a new line passes, or a sheet
  becomes a way round ADR-005. `npm run apply:translation-review` records what
  a fluent reader confirmed, and may never flip `REVIEWED` in
  `lib/copy/locale.ts`, which only a commit naming the reader sets (D2).
*/
export default function aReviewSheetIsGated({ check, code }: InvariantKit) {
  check("a corrected conversation line reaches the bank only through the gate a new line passes", () => {
    const apply = code("scripts/apply-scene-review.ts");
    assert.match(apply, /decideSceneSheet\([^)]*lineRefusals\)/, "apply-scene-review decides without the gate");
    assert.match(code("scripts/lib/lineCheck.ts"), /runGate\([^)]*gateFor\(/, "the line check no longer runs the app's own gate");
    assert.match(code("scripts/check-lines.ts"), /lineRefusals\(/, "check:lines and the importer have two answers to what may be said");
    const sheet = code("lib/review/sceneSheet.ts");
    assert.match(sheet, /kind: "refuse", row, reason: `the correction would be refused/, "a refused correction no longer stops the row");
    assert.match(sheet, /character for character/, "a line not held exactly is no longer refused");
  });

  check("applying a translation sheet never marks a language reviewed", () => {
    for (const file of ["scripts/apply-translation-review.ts", "lib/review/translationSheet.ts"]) {
      const body = code(file);
      assert.doesNotMatch(body, /(?<![`\w])REVIEWED(?![`\w])/, `${file} reaches for REVIEWED, which only a commit naming the reader sets`);
      assert.doesNotMatch(body, /copy\/locale\.ts/, `${file} writes lib/copy/locale.ts`);
    }
  });
}
