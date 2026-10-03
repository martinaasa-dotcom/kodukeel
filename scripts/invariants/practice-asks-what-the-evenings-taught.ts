import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A ROUND SOMEBODY WALKS TO ASKS ONLY WHAT THE EVENINGS HAVE TAUGHT SO FAR.
 *
 * A step of the module tells its round what has been taught through its own
 * address. A round opened from Practice, the daily review queue and Today's
 * count of it were told nothing, so a learner who met tonight's words and
 * went to Practice was handed a "Case Sprint" in the case tonight's page was
 * still to teach, on a word still on the ladder. The operator's call, written
 * down so it is not re-litigated: the module and the rest of the app are one
 * course, and nothing is asked before it is taught.
 *
 * Four arms, because each alone passes on a broken shape. Every practice page
 * that reads a module scope reads it through `practiceScope`, which falls back
 * to the learner's standing where the address says nothing; the daily review
 * and Today's summary read `learnerScopeSoFar`, which credits tonight only for
 * what tonight has done; the ladder keeps `learnerModuleScope`, because Learn
 * is where tonight's words are taught and a so-far scope would stop it
 * teaching them; and `scopeSoFar` reads the reading and the forms steps, or it
 * is the whole evening again under another name.
 */
export default function practiceAsksWhatTheEveningsTaught({ check, code, sourceFiles }: InvariantKit) {
  check("a practice round walked to from a menu asks only what the evenings have taught so far", () => {
    const pages = sourceFiles("app/(app)/review").filter((f) => /\/page\.tsx$/.test(f));
    let scoped = 0;
    for (const page of pages) {
      const src = code(page);
      if (page === "app/(app)/review/page.tsx") continue;
      assert.doesNotMatch(src, /moduleScopeFrom\(/,
        `${page} reads the module only off its address, so a round walked to from Practice is held to nothing`);
      if (/practiceScope\(ownerId, /.test(src)) scoped += 1;
    }
    assert.ok(scoped >= 14, `only ${scoped} practice pages read practiceScope; the sweep stopped finding the rounds`);

    const moduleScope = code("lib/progress/moduleScope.ts");
    assert.match(moduleScope, /moduleScopeFrom\(searchParams\) \?\? learnerScopeSoFar\(ownerId\)/,
      "practiceScope no longer falls back to what the evenings have taught so far");

    for (const file of ["app/(app)/review/page.tsx", "lib/progress/summary.ts"]) {
      const src = code(file);
      assert.match(src, /learnerScopeSoFar\(ownerId\)/, `${file} no longer holds the daily review to what tonight has done`);
      assert.doesNotMatch(src, /learnerModuleScope\(/,
        `${file} credits the whole evening reached, so it asks tonight's case before its page is read`);
    }
    for (const file of ["app/(app)/learn/new/page.tsx", "app/(app)/learn/page.tsx"]) {
      assert.match(code(file), /learnerModuleScope\(ownerId\)/,
        `${file} stopped reading the whole evening, so the ladder cannot teach tonight's words`);
    }

    const scope = code("lib/course/scope.ts");
    const body = scope.slice(scope.indexOf("export function scopeSoFar("));
    assert.match(body.slice(0, 2000), /done\.has\(READ_STEP\)/, "scopeSoFar no longer waits for tonight's page to be read");
    assert.match(body.slice(0, 2000), /done\.has\(FORMS_STEP\)/, "scopeSoFar no longer waits for tonight's forms to be shown");
  });
}
