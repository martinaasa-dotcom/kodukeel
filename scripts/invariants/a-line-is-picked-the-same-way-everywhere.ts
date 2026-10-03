import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LINE IS PICKED THE SAME WAY BY THE ROUTE AND BY EVERY HARNESS THAT
 * MEASURES IT, AND THE SWEEP PLAYS WHAT THE PLANNER CAN DRAW.
 *
 * Two of the rules the last keyless sweep drove reach the screen through
 * arguments a caller may leave out, and a caller that leaves one out compiles,
 * runs, and quietly loses the rule:
 *
 * - `sayableAfterHurdles` takes the scene, and without it a mishearing says a
 *   line about a beat nobody has reached: the friend on the phone answered
 *   `poodi` with a question about milk.
 * - `replyFor` takes `answeredTimes`, and without it a question carried on
 *   behind a curveball is counted only on the beat's own turns, so the shop
 *   asked "do you want to try it on?" four times running.
 *
 * The route and both harnesses build these the same way, or a sweep reports
 * a conversation the app does not have. And the sweep stands a curveball only
 * where the planner can (`notBeforeIn`, `fitsIn`): before it did, it measured
 * a mishearing straight after the greeting, which no run can draw any more.
 */
export default function aLineIsPickedTheSameWayEverywhere({ check, code }: InvariantKit) {
  const callers = ["app/api/scene/route.ts", "scripts/lib/keylessPlay.ts", "scripts/play-scene.ts"];

  check("every caller hands sayableAfterHurdles the scene, and replyFor how often the line was heard", () => {
    for (const file of callers) {
      const source = code(file);
      const calls = [...source.matchAll(/sayableAfterHurdles\(([^;]*?)\)\s*:/g)];
      assert.ok(calls.length > 0, `${file}: no call to sayableAfterHurdles found; the pattern stopped matching`);
      for (const [, args] of calls) {
        assert.equal(args!.split(",").length, 5, `${file}: sayableAfterHurdles is called without the scene, so a mishearing can be about a beat nobody reached`);
      }
      assert.match(source, /answeredTimes: timesAnswered\(state\.turns, heard\)/,
        `${file}: replyFor is not told how often the learner heard the line, so a question carried on behind a curveball is asked a fourth time verbatim`);
    }
  });

  check("the sweep stands a curveball only where the planner can draw one", () => {
    const sweep = code("scripts/sweep-fallback.ts");
    assert.match(sweep, /const notBefore = notBeforeIn\(scene\);/, "the sweep no longer reads where a curveball may first stand");
    assert.match(sweep, /const fits = fitsIn\(scene\);/, "the sweep no longer reads which beats a curveball's lines are about");
    assert.match(sweep, /at = Math\.max\(1, notBefore\(id\)\);[^\n]*if \(fits\(id, at\)\) cases\.push/,
      "the sweep places curveballs where the planner never does, so it measures conversations nobody can have");
    const run = code("lib/scenes/run.ts");
    assert.match(run, /notBeforeIn\(scene\), fitsIn\(scene\),\s*\);/, "the planner no longer reads fitsIn, so the sweep and the app disagree about where a curveball stands");
  });
}
