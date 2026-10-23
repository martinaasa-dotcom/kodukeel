import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LEARNER WHO STARTED AT A1 MOVES UP BY PASSING.
 *
 * The operator's call (October): every part of the A1 lessons ends in a
 * check, the last of them the whole of A1, and A2 opens on a pass rather than
 * on a tick at the end of lesson 49. Somebody named in `ADMIN_EMAILS` moves
 * freely, for testing.
 *
 * Four arms, because a gate is only as good as its every door. Each door up
 * asks `moveBlockedFor`: the next part, the level picker and the module's own
 * skip ahead. The check is marked on the server from a paper it builds itself
 * and a pass is written only there. The admin bypass is never true on a local
 * install, where `isAdmin` is everybody. And the pure rule stays pure.
 */
export default function a1IsLeftByPassing({ check, code }: InvariantKit) {
  check("every door up from a part of the A1 lessons asks whether its checks are passed", () => {
    const actions = code("app/actions.ts");
    for (const name of ["setProgramme", "setCourseLevel", "acceptCourseMove"]) {
      const start = actions.indexOf(`export async function ${name}(`);
      assert.ok(start >= 0, `${name} is gone`);
      const body = actions.slice(start, actions.indexOf("\nexport ", start + 10));
      const asked = body.indexOf("moveBlockedFor(");
      assert.ok(asked >= 0, `${name} moves a learner without asking whether a check stands in the way`);
      const writes = body.search(/writeSetting\(ownerId, SETTING_KEYS\.programme|recordCourseLevel\(ownerId, parsed/);
      assert.ok(writes < 0 || asked < writes, `${name} writes the move before it asks whether a check stands in the way`);
    }
    assert.match(code("lib/progress/adapt.ts"), /moveBlockedFor\(/, "the module offers a skip ahead the action would refuse");
  });

  check("a check is marked on the server from the paper it builds, and only a pass there records one", () => {
    const actions = code("app/actions.ts");
    const start = actions.indexOf("export async function submitCheck(");
    assert.ok(start >= 0, "submitCheck is gone");
    const body = actions.slice(start, actions.indexOf("\nexport ", start + 10));
    assert.match(body, /checkPaper\(check, parsed\.data\.attempt\)/, "submitCheck no longer rebuilds the paper it marks");
    assert.match(body, /markCheck\(paper, /, "submitCheck no longer marks the paper itself");
    assert.match(body, /if \(result\.passed\) await recordCheckPassed\(/, "a check is recorded passed on something other than the server's own mark");
    const writers = ["app/actions.ts", "lib/progress/checks.ts"];
    for (const file of writers) assert.ok(code(file).includes("recordCheckPassed"), `${file} should name recordCheckPassed`);
  });

  check("moving freely is for a named admin on a hosted deployment, never for everybody on a local one", () => {
    const admin = code("lib/auth/admin.ts");
    const at = admin.indexOf("export const movesFreely");
    assert.ok(at >= 0, "movesFreely is gone");
    assert.match(admin.slice(at, at + 300), /if \(!supabaseConfigured\(\)\) return false;/, "a local install would move freely past every check, and so would the browser suites");
    assert.match(code("lib/progress/checks.ts"), /movesFreely\(\)/, "the gate no longer lets a named admin through");
  });

  check("the rule about checks stays pure", () => {
    const rule = code("lib/course/checks.ts");
    assert.doesNotMatch(rule, /from "@\/lib\/db"|from "react"|from "next\//, "lib/course/checks.ts reaches past pure code");
  });
}
