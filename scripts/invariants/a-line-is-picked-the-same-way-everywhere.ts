import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LINE IS PICKED THE SAME WAY BY THE ROUTE AND BY EVERY HARNESS THAT
 * MEASURES IT, BECAUSE THERE IS ONE ASSEMBLY, AND THE SWEEP PLAYS WHAT THE
 * PLANNER CAN DRAW.
 *
 * The per-turn reply assembly lived in the route and was copied into
 * `scripts/lib/keylessPlay.ts`, `scripts/play-scene.ts` and
 * `scripts/fuzz-scenes.ts`, and the copies drifted from the route a dozen
 * ways: the sweep shrugged at a scene that was over and built a line on a
 * turn the route answers by saying the last line again, the fuzzer never
 * passed how often the line had been heard. Each drift was a harness reporting
 * a conversation the app does not have. This check used to hold the copies to
 * two arguments each, which is a list of rules somebody remembered; the copies
 * are gone instead, and `lib/progress/sceneTurn.ts` is the one assembly.
 *
 * So the pieces a reply is assembled from are called from that module and
 * from no other source file, the route and every harness that plays a
 * conversation reach a reply through `planTurn` and `speakTurn`, and inside
 * the module the two rules the keyless sweep drove are still held: the bank
 * is read with the scene, or a mishearing says a line about a beat nobody has
 * reached, and `replyFor` is told how often the line was heard, or a question
 * carried on behind a curveball is asked a fourth time verbatim.
 */
export default function aLineIsPickedTheSameWayEverywhere({ check, code, sourceFiles }: InvariantKit) {
  const ASSEMBLY = "lib/progress/sceneTurn.ts";
  const PIECES = ["replyFor", "sayableAfterHurdles", "asideFor", "shrug", "wantsFreshLine", "composeNote"];

  check("a reply is assembled in one module, and nothing else calls the pieces it is assembled from", () => {
    const files = ["app", "lib", "scripts", "components"]
      .flatMap((dir) => sourceFiles(dir))
      .filter((file) => !/\.(?:i?test)\.tsx?$/.test(file));
    assert.ok(files.length > 400, `the sweep read ${files.length} files; it stopped finding the source tree`);
    const callsIn = (source: string, name: string) =>
      new RegExp(`(?<![\\w.])(?<!function )${name}\\(`).test(source);
    for (const name of PIECES) {
      assert.ok(callsIn(code(ASSEMBLY), name), `${ASSEMBLY} no longer calls ${name}, so this check reads nothing for it`);
      const elsewhere = files.filter((file) => file !== ASSEMBLY && callsIn(code(file), name));
      assert.deepEqual(elsewhere, [],
        `${name} is called outside ${ASSEMBLY}, which is a second copy of the reply assembly drifting from the first`);
    }
  });

  check("the route and every harness that plays a conversation reach a reply through planTurn and speakTurn", () => {
    for (const file of [
      "app/api/scene/route.ts", "scripts/lib/keylessPlay.ts", "scripts/play-scene.ts", "scripts/fuzz-scenes.ts",
    ]) {
      const source = code(file);
      assert.match(source, /\bplanTurn\(\{/, `${file} plans a turn's reply some other way than planTurn`);
      assert.match(source, /\bspeakTurn\(plan\b/, `${file} speaks a turn's reply some other way than speakTurn`);
    }
  });

  check("the assembly hands sayableAfterHurdles the scene, and replyFor how often the line was heard", () => {
    const source = code(ASSEMBLY);
    const calls = [...source.matchAll(/sayableAfterHurdles\(([^;]*?)\)\s*:/g)];
    assert.ok(calls.length > 0, `${ASSEMBLY}: no call to sayableAfterHurdles found; the pattern stopped matching`);
    for (const [, args] of calls) {
      assert.equal(args!.split(",").length, 5, `${ASSEMBLY}: sayableAfterHurdles is called without the scene, so a mishearing can be about a beat nobody reached`);
    }
    assert.match(source, /answeredTimes: timesAnswered\(state\.turns, heard\)/,
      `${ASSEMBLY}: replyFor is not told how often the learner heard the line, so a question carried on behind a curveball is asked a fourth time verbatim`);
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
