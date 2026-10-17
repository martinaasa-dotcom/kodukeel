import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A ROLE-PLAY INSIDE A LESSON SAYS ONLY WHAT THE LESSONS HAVE TAUGHT BY THEN.
 *
 * The lessons are built on one rule, that nothing is shown before it is
 * taught (docs/43-lessons.md), and a lesson's own conversation is the one
 * place a model could break it on the learner's screen. So the gate is handed
 * the lesson's ledger (`lessonGate`), by the app and by the harness alike,
 * because a harness gating a different way measures a conversation the app
 * does not have; and the scenes stay off the situations listing, behind the
 * same preview as the lessons until A1 is whole.
 */
export default function aLessonSceneSaysOnlyWhatWasTaught({ check, code }: InvariantKit) {
  check("the app's scene context and the harness's both hand a lesson scene the taught-word gate", () => {
    assert.match(code("lib/progress/scene.ts"), /\.\.\.lessonGate\(scene, lexicon\)/, "the app's gate no longer reads the lesson's ledger");
    assert.match(code("scripts/lib/sceneDraft.ts"), /\.\.\.lessonGate\(scene, lexicon\)/, "the harness's gate no longer reads the lesson's ledger");
  });

  check("the gate refuses an untaught word as a check of its own", () => {
    const gate = code("lib/scenes/gate.ts");
    assert.match(gate, /"taught",\s*\]/, "`taught` left the CHECKS list");
    assert.match(gate, /if \(untaught\.length > 0\) failed\.push\("taught"\)/, "a line with an untaught word is no longer withheld");
  });

  check("lesson scenes are resolvable by id and in no listing", () => {
    const catalogue = code("lib/scenes/catalogue.ts");
    assert.match(catalogue, /SCENES\.find\(\(s\) => s\.id === id\) \?\? LESSON_SCENES\.find\(/, "sceneById no longer falls back to the lessons' scenes");
    assert.doesNotMatch(catalogue, /export const SCENES[^;]*LESSON_SCENES/s, "the lessons' scenes joined the situations listing");
  });

  check("the reply leaves a word out that a lesson has not taught", () => {
    assert.match(code("lib/scenes/choice.ts"), /lexicon\.forms\.has\(CHOICE_WORD\)/, "the two-way choice no longer checks its joining word is taught");
    assert.match(code("lib/progress/sceneTurn.ts"), /but: context\.lexicon\.forms\.has\("aga"\)/, "\"Selge, aga\" no longer checks `aga` is taught");
  });
}
