import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function questionStateKeyed({ check, code }: InvariantKit) {
  check("a level-check question starts fresh by its key, not by an effect one render late", () => {
    /*
      Each question in components/assessment/Question.tsx holds its own pick,
      typing and mark. Two questions of one kind in a row are one component
      unless the runner keys them, and an effect resetting that state on
      item.id runs after the render that draws the new question under the old
      question's pick. So the runner keys every question on its id, and no
      question resets its own state in an effect.
    */
    const runner = code("components/assessment/AssessmentRunner.tsx");
    const drawn = [...runner.matchAll(/<(\w+Question)\b([^>]*)>/g)];
    assert.ok(drawn.length >= 4, `found ${drawn.length} questions drawn by the runner, so this check stopped looking`);
    const unkeyed = drawn.filter(([, , attrs]) => !/\bkey=\{item\.id\}/.test(attrs ?? "")).map(([, name]) => name);
    assert.deepEqual(unkeyed, [], `these questions are not keyed on their id: ${unkeyed.join(", ")}`);
    const question = code("components/assessment/Question.tsx");
    const resets = [...question.matchAll(/useEffect\(\s*\(\)\s*=>\s*\{[^}]*\bset\w+\([^}]*\},\s*\[[^\]]*item\.id/g)];
    assert.equal(resets.length, 0, "a question resets its state in an effect on item.id; key it in the runner instead");
  });
}
