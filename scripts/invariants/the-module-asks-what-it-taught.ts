import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * TODAY'S MODULE IS THE LEVEL THE LEARNER SAID, AND ITS CLOSING ROUND IS
 * TONIGHT'S WORDS.
 *
 * Reported off one screen: a learner who had set A1 was asked for the simple
 * past of `juhtuma`, an A2 verb, in a closing review eighteen cards long. Three
 * faults, each a door, and each asked here of the code rather than of prose.
 */
export default function theModuleAsksWhatItTaught({ check, code }: InvariantKit) {
  check("picking a level in Settings moves the course when it opens on another level", () => {
    // The picker's body is `changeCourseLevel`, which both doors call (N-8).
    const level = code("lib/progress/courseLevel.ts");
    const start = level.indexOf("export async function changeCourseLevel");
    assert.ok(start >= 0, "changeCourseLevel is gone");
    const end = level.indexOf("export async function", start + 10);
    const body = level.slice(start, end < 0 ? undefined : end);
    assert.match(body, /openingPartFor\(ownerId\)/, "setCourseLevel no longer works out where the new level opens");
    assert.match(body, /SETTING_KEYS\.programme,\s*opening\.id/, "setCourseLevel no longer moves the course");
  });

  check("the module's closing round reads only tonight's words, and stops at MODULE_SESSION", () => {
    const round = code("lib/progress/dailyQueue.ts");
    assert.match(round, /if \(scope\) \{/, "the review queue no longer has a closing round of its own");
    const closing = round.slice(round.indexOf("if (scope) {"), round.indexOf("const dueWindow"));
    assert.match(closing, /tonightWhere\(ownerId, now, scope\.day\.words,/, "the closing round reads more than tonight's words");
    assert.doesNotMatch(closing, /dueWhere\(|unseenWhere\(|unseenPool\(/, "the closing round reads the wider queue again");
    assert.match(closing, /\.slice\(0, MODULE_SESSION\)/, "the module's closing round is no longer capped");
    assert.doesNotMatch(code("lib/srs/reviewQueue.ts"), /due: \{ gt: now \}/, "the closing round asks only tonight's cards that are not yet due, so one missed tonight is never asked");
    // The count the step keeps has to be drawn over the same read.
    assert.match(code("lib/progress/closing.ts"), /tonightWhere\(ownerId, now, scope\.day\.words,/, "the closing count reads a different queue than the round shows");
  });

  check("a verb form learned verb by verb is asked inside the module only once an evening showed it", () => {
    const scope = code("lib/course/scope.ts");
    assert.match(scope, /LEARNED_PER_VERB[^=]*=\s*\["IndIpf", "ImpPrPl"\]/, "the list of per-verb forms changed");
    assert.match(
      scope,
      /LEARNED_PER_VERB\.some\(\(code\) => slot\.startsWith\(code\)\) && !\(lemma && scope\.formsShown\.includes\(lemma\)\)\)\s*\{\s*return false;/,
      "slotWithin stopped holding a verb's past to the evening that showed it",
    );
    assert.match(scope, /slotWithin\(scope, card\.slot \?\? conjugationSlotFromFront\(card\.front\), card\.lexeme\?\.lemma\)/,
      "cardWithin stopped telling slotWithin which verb a card is about");
    assert.match(code("app/(app)/review/flashcards/page.tsx"), /slotWithin\(scope, s\.slot, source\.lemma\)/,
      "the flash round stopped telling slotWithin which verb it asks");
    assert.match(code("lib/progress/closing.ts"), /lexeme: \{ select: \{ lemma: true/,
      "the closing count no longer reads which verb a card is about, so it counts the past as unaskable");
    // And the forms step exists to be the showing: a page that reads the day's verbs.
    const page = code("app/(app)/course/forms/page.tsx");
    assert.match(page, /formsTonight\(scope\)/, "the forms step stopped showing the evening's own verbs");
    assert.match(page, /<VerbTable\b/, "the forms step shows no table");
  });
}
