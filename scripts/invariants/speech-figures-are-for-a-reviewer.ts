import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE SPEECH FIGURES ARE ONE READING, BEHIND THE REVIEWER'S DOOR (docs/44-sixth-batch.md C-3).
 *
 * The command and the admin page read the whole deployment through one body,
 * `lib/progress/speechReport.ts`, so the operator's terminal and the page
 * cannot disagree. The page is a reviewer's: it asks `isAdmin` before it reads
 * anything and `requireAdminId` before the report, so a learner who is not a
 * reviewer is shown the refusal and never a figure. And it names nobody: the
 * report never narrows to one learner and the page caches nothing.
 */
export default function speechFiguresAreForAReviewer({ check, code }: InvariantKit) {
  check("report:speech and /admin/speech read one body", () => {
    assert.match(code("scripts/report-speech.ts"), /from "\.\.\/lib\/progress\/speechReport"/, "the command reads the speech figures through a copy of its own");
    assert.match(code("app/(app)/admin/speech/page.tsx"), /from "@\/lib\/progress\/speechReport"/, "the page reads the speech figures through a copy of its own");
    assert.doesNotMatch(code("scripts/report-speech.ts"), /prisma\.\w+\.findMany/, "the command grew a query of its own beside the shared body");
  });

  check("the speech figures page asks who is looking before it reads anything", () => {
    const page = code("app/(app)/admin/speech/page.tsx");
    const asked = page.indexOf("if (!(await isAdmin()))");
    const required = page.indexOf("await requireAdminId()");
    const read = page.indexOf("await speechReport(");
    assert.ok(asked > 0 && required > asked && read > required, "the page reads the deployment's speech figures before asking whether a reviewer is looking");
    assert.doesNotMatch(page, /unstable_cache|"use cache"|revalidate\s*=/, "the page caches figures read across the deployment");
  });

  check("the speech report names nobody: no query narrows to one learner", () => {
    const report = code("lib/progress/speechReport.ts");
    assert.match(report, /prisma\.review\.findMany/, "the report stopped reading the review log, so this check watches nothing");
    assert.doesNotMatch(report, /where:\s*\{\s*ownerId:\s*[^\s{]/, "the speech report narrowed a query to one learner");
  });
}
