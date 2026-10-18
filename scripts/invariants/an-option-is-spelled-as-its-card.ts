import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN OPTION IS SPELLED AS ITS CARD SPELLS IT.
 *
 * `acceptedAnswers` folds every spelling to lower case, because it is the list
 * a marker compares against. The daily quest handed its first entry to
 * `caseFormChoices` as the answer to print, so a card about `Eesti` offered
 * `Eestist`, `Eestit`, `Eestiks` and `eestis`: the one option written
 * differently was the right one, and a learner who noticed never had to read
 * the sentence. The review card had learned this and the quest had not.
 *
 * Every caller of the two choice builders passes the back's own spelling,
 * `primaryAnswer(card.back)`, and never a member of the folded list.
 */
export default function anOptionIsSpelledAsItsCard({ check, code, APP, LIB }: InvariantKit) {
  check("a choice builder is handed the card's own spelling, never the folded one", () => {
    const callers = [...APP, ...LIB].filter((f) => !/\.i?test\.tsx?$/.test(f) && /\b(?:caseFormChoices|verbFormChoices)\(\{/.test(code(f)));
    assert.ok(callers.length >= 2, `only ${callers.length} callers of the choice builders found, so this stopped looking`);
    for (const file of callers) {
      const src = code(file);
      assert.match(src, /const answer = primaryAnswer\(card\.back\)/, `${file} prints an option it did not take from the card's own spelling`);
      assert.doesNotMatch(src, /const answer = accepted\[0\]/, `${file} prints the folded spelling as an option`);
    }
  });
}
