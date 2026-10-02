import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SECOND RIGHT WORD IS RIGHT, AND IT IS NEVER WRITTEN DOWN AS THE FIRST.
 *
 * A production card asking for `alustama` used to answer `hakkama` with "Not
 * quite", a retype and Again, which told a learner who had said "to begin" in
 * the word most people reach for that they did not know how to say it.
 * `lib/questions/neighbours.ts` finds the words sharing the prompt's sense,
 * the review card accepts one and shows how the two differ. Three things keep
 * that honest and each is asked here, against the shape that would break it.
 */
export default function aSecondRightWordIsRight({ check, code }: InvariantKit) {
  check("a neighbour is asked about only where the marker said no", () => {
    const session = code("app/(app)/review/ReviewSession.tsx");
    assert.match(
      session, /marked\.verdict === "wrong" && card\.contrast\s*\?\s*typedNeighbour\(/,
      "the review card asks about a second right word before the marker has had its say, "
      + "so a dropped diacritic on the card's own word could be read as another word",
    );
  });

  check("a neighbour is graded as a pass that comes back sooner, never as recalling the card's word", () => {
    const session = code("app/(app)/review/ReviewSession.tsx");
    assert.match(session, /suggestedRating: NEIGHBOUR_RATING, neighbour/, "a second right word is graded by a number of its own");
    assert.match(
      code("lib/questions/neighbours.ts"), /export const NEIGHBOUR_RATING = 2 as const/,
      "a second right word is graded as though the learner had recalled the card's own word",
    );
  });

  check("the lesson is the dictionary's, and holds no Estonian of its own", () => {
    assert.doesNotMatch(code("lib/questions/neighbours.ts"), /[õäöüšž]/i, "the neighbour rule has started writing Estonian");
    assert.doesNotMatch(code("components/round/SameMeaning.tsx"), /[õäöüšž]/i, "the contrast panel has started writing Estonian");
    assert.doesNotMatch(
      code("lib/questions/neighbours.ts"), /@\/lib\/db|@prisma\/client|\bprisma\./,
      "the neighbour rule has become a database read rather than a rule over glosses",
    );
    // Its sentences are drawn through the one drawing that carries the English.
    assert.match(code("components/round/SameMeaning.tsx"), /<EstonianSentence\b/, "the contrast panel draws a sentence without its English");
  });
}
