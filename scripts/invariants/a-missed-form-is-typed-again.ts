import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A MISSED FORM IS TYPED AGAIN, ON THE SAME CARD, BEFORE THE CARD LETS GO.
 *
 * Reading the right answer printed above a miss is not producing it. The review
 * card and the learn ladder asked for the retype from the start; the flash
 * round, the exceptions round, the map, the daily quest and the unit lesson
 * marked a typed form, showed the answer and let the learner press Next onto a
 * different word. They draw `RetypeBox` now, and the button under the card says
 * "Check it again" until the copy is right.
 *
 * Two arms, because either alone passes on the broken shape: each round has to
 * hold the retype state and draw the box, and the key that advances the round
 * has to stand down while the retype is owed, or one Enter in the retype box
 * would also move the round on.
 */
export default function aMissedFormIsTypedAgain({ check, code }: InvariantKit) {
  const rounds = [
    "app/(app)/review/flashcards/FlashSession.tsx",
    "app/(app)/review/exceptions/ExceptionsSession.tsx",
    "app/(app)/review/map/MapSession.tsx",
    "app/(app)/quest/QuestSession.tsx",
    "app/(app)/learn/[unitId]/lesson/LessonSession.tsx",
  ];

  check("every round that marks a typed form asks for a miss to be typed again", () => {
    for (const file of rounds) {
      const src = code(file);
      assert.match(src, /\buseRetype\(/, `${file} no longer holds the retype state`);
      assert.match(src, /<RetypeBox\b/, `${file} no longer draws the retype box`);
      assert.match(src, /\bneedsRetype\b/, `${file} no longer gates moving on on the retype`);
      assert.match(src, /Check it again/, `${file} no longer says what the button does while a retype is owed`);
    }
  });

  check("the key that moves a round on stands down while a retype is owed", () => {
    for (const file of rounds) {
      const src = code(file);
      // The advance handler must read needsRetype, or the Enter that checks the
      // retype also moves the round on.
      assert.match(
        src,
        /!needsRetype\s*&&\s*isAdvanceKey|if \(!check \|\| needsRetype\)|if \(!answered \|\| needsRetype\)|if \(checked\) \{ if \(!needsRetype\)/,
        `${file} advances on a key without asking whether a retype is owed`,
      );
    }
  });

  check("the retype is rehearsal: it reaches no grade", () => {
    const src = code("components/round/Retype.tsx");
    assert.doesNotMatch(src, /gradeCard|enqueueGrade|recordSeen|writeGrade/, "the retype writes to the review log");
  });
}
