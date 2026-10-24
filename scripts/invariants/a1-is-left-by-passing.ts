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
    /*
      The level picker's body is `changeCourseLevel` (lib/progress/courseLevel.ts),
      which the web's `setCourseLevel` calls and `PATCH /api/v1/me` reaches
      through `changeAccountSettings` (N-8), so the rule is read there and both
      doors are held to reaching it.
    */
    const level = code("lib/progress/courseLevel.ts");
    const body = (file: string, name: string) => {
      const src = code(file);
      const start = src.indexOf(`export async function ${name}(`);
      assert.ok(start >= 0, `${name} is gone from ${file}`);
      const end = src.indexOf("\nexport ", start + 10);
      return src.slice(start, end < 0 ? undefined : end);
    };
    assert.match(body("app/actions.ts", "setCourseLevel"), /changeCourseLevel\(/, "setCourseLevel changes a level without changeCourseLevel, the body that asks the checks first");
    assert.match(body("lib/settings/account.ts", "changeAccountSettings"), /changeCourseLevel\(/, "a level patched from a phone is written without changeCourseLevel");
    assert.match(body("app/api/v1/me/route.ts", "PATCH"), /changeAccountSettings\(/, "PATCH /api/v1/me writes settings without the body the web's actions call");
    for (const [src, name] of [[actions, "setProgramme"], [level, "changeCourseLevel"], [actions, "acceptCourseMove"]] as const) {
      const start = src.indexOf(`export async function ${name}(`);
      assert.ok(start >= 0, `${name} is gone`);
      const end = src.indexOf("\nexport ", start + 10);
      const body = src.slice(start, end < 0 ? undefined : end);
      const asked = body.indexOf("moveBlockedFor(");
      assert.ok(asked >= 0, `${name} moves a learner without asking whether a check stands in the way`);
      const writes = body.search(/writeSetting\(ownerId, SETTING_KEYS\.programme|recordCourseLevel\(ownerId, parsed/);
      assert.ok(writes < 0 || asked < writes, `${name} writes the move before it asks whether a check stands in the way`);
    }
    assert.match(code("lib/progress/adapt.ts"), /moveBlockedFor\(/, "the module offers a skip ahead the action would refuse");
  });

  check("a check is marked on the server from the paper it builds, and only a pass there records one", () => {
    /*
      The body is `submitCheckFor` in lib/progress/lessons.ts, which the web's
      `submitCheck` and `POST /api/v1/checks/{id}` both call (ADR-029), so the
      rule is read there and both doors are held to calling it.
    */
    const lessons = code("lib/progress/lessons.ts");
    const start = lessons.indexOf("export async function submitCheckFor(");
    assert.ok(start >= 0, "submitCheckFor is gone");
    const end = lessons.indexOf("\nexport ", start + 10);
    const body = lessons.slice(start, end < 0 ? undefined : end);
    assert.match(body, /checkPaper\(check, attempt\)/, "submitCheckFor no longer rebuilds the paper it marks");
    assert.match(body, /markCheck\(paper, /, "submitCheckFor no longer marks the paper itself");
    assert.match(body, /if \(result\.passed\) await recordCheckPassed\(/, "a check is recorded passed on something other than the server's own mark");
    for (const door of ["app/actions.ts", "app/api/v1/checks/[id]/route.ts"]) {
      assert.match(code(door), /submitCheckFor\(/, `${door} marks a check some other way than submitCheckFor`);
    }
    const writers = ["lib/progress/lessons.ts", "lib/progress/checks.ts"];
    for (const file of writers) assert.ok(code(file).includes("recordCheckPassed"), `${file} should name recordCheckPassed`);
    const elsewhere = ["app/actions.ts", "app/api/v1/checks/[id]/route.ts"].filter((file) => /recordCheckPassed\(/.test(code(file)));
    assert.deepEqual(elsewhere, [], "a door records a pass itself rather than through submitCheckFor");
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
