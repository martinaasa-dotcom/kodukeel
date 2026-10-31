import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LEARNER MOVED BACK BY THE SWITCH TO LESSONS IS TOLD SO WHERE THEY LAND.
 *
 * Somebody part way through the old B1 is put on B1's first lesson
 * (`movedBackFrom`), and the sentence saying why was on the list of lessons
 * alone. Today's module opens `/course`, which is where such a learner lands,
 * and it said nothing about why the evening was lesson 1. Both pages read the
 * move and draw the note as one plain card carrying `data-moved-back`. No
 * browser suite reads that hook yet, since none of their fixtures holds a
 * learner moved back; what says the move is read is `rehome.itest.ts` and
 * `restoreCourse.itest.ts`, and what says it is drawn is this check.
 */
const PAGES = ["app/(app)/course/page.tsx", "app/(app)/course/lessons/page.tsx"];

export default function aLearnerMovedBackIsTold({ check, code }: InvariantKit) {
  check("the module and the list of lessons both say why a learner was moved back", () => {
    for (const page of PAGES) {
      const source = code(page);
      assert.match(source, /\bmovedBackFrom\(ownerId\)/, `${page} does not ask whether the learner was moved back`);
      // One drawing on both pages: a plain card, since butter is the hue of "nearly" and nothing here is nearly anything.
      assert.match(source, /<Card data-moved-back=\{moved\.from\.id\}>/, `${page} does not draw the moved-back note as the plain card`);
      // The part by the name a learner sees on the list of lessons, never its id.
      assert.match(source, /part: t\(moved\.to\.title\)/, `${page} names the part the learner is moved to by id rather than by its title`);
    }
  });
}
