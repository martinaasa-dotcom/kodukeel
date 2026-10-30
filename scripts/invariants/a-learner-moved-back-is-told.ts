import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LEARNER MOVED BACK BY THE SWITCH TO LESSONS IS TOLD SO WHERE THEY LAND.
 *
 * Somebody part way through the old B1 is put on B1's first lesson
 * (`movedBackFrom`), and the sentence saying why was on the list of lessons
 * alone. Today's module opens `/course`, which is where such a learner lands,
 * and it said nothing about why the evening was lesson 1. Both pages read the
 * move and draw the note on the element the browser suites can find.
 */
const PAGES = ["app/(app)/course/page.tsx", "app/(app)/course/lessons/page.tsx"];

export default function aLearnerMovedBackIsTold({ check, code }: InvariantKit) {
  check("the module and the list of lessons both say why a learner was moved back", () => {
    for (const page of PAGES) {
      const source = code(page);
      assert.match(source, /\bmovedBackFrom\(ownerId\)/, `${page} does not ask whether the learner was moved back`);
      assert.match(source, /data-moved-back=\{moved\.from\.id\}/, `${page} does not draw the moved-back note`);
    }
  });
}
