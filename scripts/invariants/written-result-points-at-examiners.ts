import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A written text on the exam result comes with a way to judge it.

  The two written tasks are marked on length and on the words they named,
  because those are all a machine can settle without judging Estonian, and the
  page says the score is a ceiling. What it hands the candidate next is what
  keeps that from being a dead end: questions to read their own text back
  against, and the Board's own scripts with the examiners' comments. Anchored
  on the elements rather than the imports, because a component imported and
  rendered by nothing is a feature nobody has.
*/
export default function writtenResultPointsAtExaminers({ check, code }: InvariantKit) {
  check("a written text on the exam result carries a self-check and the Board's marked samples", () => {
    const page = code("app/(app)/exam/result/[id]/page.tsx");
    assert.match(page, /<SelfCheck\b[^>]*items=\{SELF_CHECK\[/, "the result no longer draws the self-check under a written text");
    assert.match(page, /writtenSampleFor\(/, "the result no longer looks up the Board's written samples for the level");
    assert.match(page, /href=\{sample\.href\}/, "the result no longer links the Board's written samples");
  });
}
