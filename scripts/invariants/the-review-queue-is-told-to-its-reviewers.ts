import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A REVIEWER IS TOLD WHAT IS WAITING, AND NOBODY ELSE IS.

  The rail, the phone sheet and Today say how many reports are open
  (lib/suggestions/waiting.ts). That figure is about every learner's reports,
  so it may reach a screen only through `reviewWaiting`, which asks `isAdmin`
  before it counts, and the shell and Today both have to ask it rather than
  counting for themselves.
*/
export default function reviewQueueIsToldToItsReviewers({ check, code }: InvariantKit) {
  check("the count of open reports is asked behind the reviewer gate, and the shell and Today draw it", () => {
    const gate = code("lib/suggestions/waiting.ts");
    const body = gate.slice(gate.indexOf("export const reviewWaiting"));
    assert.ok(body.length > 0, "reviewWaiting is gone from lib/suggestions/waiting.ts");
    const admin = body.indexOf("isAdmin()");
    const count = body.indexOf("countWaiting()");
    assert.ok(admin >= 0 && count > admin, "reviewWaiting counts before it asks whether this is a reviewer");

    for (const file of ["app/(app)/layout.tsx", "app/(app)/page.tsx"]) {
      assert.match(code(file), /\breviewWaiting\(\)/, `${file} no longer asks reviewWaiting`);
      assert.doesNotMatch(code(file), /\bcountWaiting\(/, `${file} counts open reports itself, past the gate`);
    }
    assert.match(code("components/Sidebar.tsx"), /<ReviewQueueLink\b/, "the rail no longer draws the review queue row");
  });
}
