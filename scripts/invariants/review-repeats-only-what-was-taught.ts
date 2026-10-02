import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * REVIEW REPEATS WHAT THE MODULE HAS TAUGHT, AND NEVER TEACHES.
 *
 * Reported off the second evening of A1: the daily review asked `tool` in the
 * alaleütlev, under the Latin name "allative", on a card an old deck had
 * carried in. Two faults, both held here. The daily path let a due card through
 * whatever had taught it, so the form gate reached new cards alone; and a
 * stored front printed its Latin case name straight off the row. Each arm was
 * written against the shape that broke it.
 */
export default function reviewRepeatsOnlyWhatWasTaught(kit: InvariantKit) {
  const { check, code } = kit;
  aNewLevelStartsOver(kit);
  check("the daily review asks every card, due or new, through `reviewable`", () => {
    const page = code("app/(app)/review/page.tsx");
    assert.match(page, /const within = \(card: CardRow\) => reviewable\(taught, card, spellings\)/,
      "the due list on /review is no longer held to what the module has taught");
    assert.match(page, /const introducible = \(card: CardRow\) => reviewable\(taught, card, spellings\)/,
      "the new cards on /review are no longer held to what the module has taught");
    assert.match(page, /taughtWhere\(taughtFirst\)/,
      "the due read on the daily path is no longer narrowed in the query, so old cards can fill it and empty the round");
    assert.doesNotMatch(page, /\bcardWithin\(/,
      "/review asks `cardWithin` directly, which skips the word gate `reviewable` adds");
  });

  check("Today counts as due only what Review will ask", () => {
    const summary = code("lib/progress/summary.ts");
    assert.match(summary, /dueCount\+\+/, "the due count moved; re-read this check");
    assert.match(summary, /reviewable\(taught,/, "Today's due count no longer asks `reviewable`, so it can promise an empty round");
  });

  check("a case card it cannot place is refused, not waved through", () => {
    const scope = code("lib/course/scope.ts");
    assert.match(scope, /caseFromFront\(card\.front\)/, "a case card with no targetCase is read as no case at all again");
    assert.match(scope, /if \(!caseKey \|\| !caseWithin\(scope, caseKey\)\) return false;/,
      "a case card nothing can place passes the module's gate again");
  });

  check("a stored front reaches no screen with a Latin case name on it", () => {
    for (const file of [
      "app/(app)/review/cards.ts", "app/(app)/review/sprint/page.tsx", "app/(app)/review/clinic/page.tsx",
      "app/(app)/progress/page.tsx", "app/(app)/words/page.tsx", "lib/progress/quest.ts",
    ]) {
      const src = code(file);
      assert.doesNotMatch(src, /\bfront: c\.front\b/, `${file} hands a stored front to a screen without readableFront`);
      assert.match(src, /readableFront\(c\.front\)/, `${file} stopped reading its fronts through readableFront`);
    }
  });
}

/**
 * AND A NEW LEVEL STARTS THE MODULE OVER.
 *
 * Reported right after the above: having changed level, the learner still had
 * eighteen cards due and the module resumed an old evening. A level change
 * moves the course to the new level's opening part and clears that part's own
 * ticks (`restartPart`), so it opens on its first evening and Review (held to
 * the module) shrinks to what that start taught. Clearing rather than reading
 * past them by date, because a tick kept and ignored still holds its unique
 * key: pressing the same step again on the restarted part wrote nothing.
 */
function aNewLevelStartsOver({ check, code }: InvariantKit) {
  check("changing level restarts the module on the new level's first evening", () => {
    const actions = code("app/actions.ts");
    const start = actions.indexOf("export async function setCourseLevel");
    assert.ok(start >= 0, "setCourseLevel is gone");
    const body = actions.slice(start, actions.indexOf("export async function", start + 10));
    assert.match(body, /const before = await courseLevelFor\(ownerId\);[\s\S]*recordCourseLevel/,
      "setCourseLevel no longer reads the level it is changing from");
    assert.match(body, /before !== parsed\.data/, "a level change no longer restarts the course");
    assert.match(body, /restartPart\(ownerId, opening\.id\)/, "a level change no longer restarts the part it opens");
    const reset = code("lib/progress/courseReset.ts");
    const fn = reset.slice(reset.indexOf("export async function restartPart"));
    assert.match(fn.slice(0, 400), /courseStep\.deleteMany\(\{ where: \{ ownerId, programmeId \} \}\)/,
      "restartPart clears more than one learner's ticks on one part");
  });
}
