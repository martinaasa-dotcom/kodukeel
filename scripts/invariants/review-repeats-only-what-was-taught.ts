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
    const queue = code("lib/progress/dailyQueue.ts");
    assert.match(queue, /const allowed = \(card: CardRow\) => reviewable\(taught, card, spellings\)/,
      "the review queue no longer holds its cards to what the module has taught");
    assert.match(queue, /askableRows\(rows\.filter\(allowed\)\)/,
      "the due list on /review is no longer held to what the module has taught");
    assert.match(queue, /kept\.push\(\.\.\.rows\.filter\(allowed\)\)/,
      "the new cards on /review are no longer held to what the module has taught");
    assert.match(queue, /taughtWhere\(taught\)/,
      "the due read on the daily path is no longer narrowed in the query, so old cards can fill it and empty the round");
    assert.doesNotMatch(queue + code("app/(app)/review/page.tsx"), /\bcardWithin\(/,
      "/review asks `cardWithin` directly, which skips the word gate `reviewable` adds");
  });

  /*
    TODAY'S NUMBER IS THE LENGTH OF REVIEW'S OWN LIST. Reported live: Today
    said "20 due", the session asked one card and said all caught up, and Today
    then said 19. The count was a tally over the whole deck reasoning about the
    queue, and it disagreed with it in four places. So no screen may reason
    about the queue any more: each counts `reviewQueue`, the one function the
    review page builds its session from, and the snapshot carries no due tally
    for a screen to reach for by mistake.
  */
  check("Today counts as due exactly the cards Review will ask", () => {
    /*
      The review page's daily branch and `GET /api/v1/review` are both
      `dailyReview` (ADR-029), so the session is built there, out of
      `reviewQueue`, and the page and the route only hand it on.
    */
    const page = code("app/(app)/review/page.tsx");
    assert.match(page, /dailyReview\(ownerId, scope, now\)/, "the review page no longer builds its session from `dailyReview`");
    const dailySource = code("lib/progress/dailyQueue.ts");
    const daily = dailySource.slice(dailySource.indexOf("export async function dailyReview("));
    assert.match(daily, /reviewQueue\(ownerId, scope, now\)/, "the daily review no longer builds its session from `reviewQueue`");
    assert.match(daily, /withChoices\(queue\.cards,/, "the daily review shows something other than the queue it counted");
    assert.match(code("app/api/v1/review/route.ts"), /dailyReview\(who\.ownerId, null, now\)/,
      "the v1 review route builds its sitting some other way than the web's daily path");
    const today = code("app/(app)/page.tsx");
    assert.match(today, /reviewQueue\(ownerId, null, now\)/, "Today no longer counts Review's own queue");
    assert.match(today, /const toReview = review\.cards\.length;/, "Today's review count is not the length of Review's queue");
    const practice = code("app/(app)/practice/page.tsx");
    assert.match(practice, /const ready = review\.cards\.length;/, "Practice's review count is not the length of Review's queue");
    for (const [file, src] of [["app/(app)/page.tsx", today], ["app/(app)/practice/page.tsx", practice]] as const) {
      assert.doesNotMatch(src, /snapshot\.(dueCount|newForPractice)/, `${file} counts Review off a whole-deck tally again`);
    }
    const summary = code("lib/progress/summary.ts");
    assert.doesNotMatch(summary, /\b(dueCount|newForPractice)\b/,
      "deckSnapshot carries a due tally again, which is a second reading of Review's queue");
    const queue = code("lib/progress/dailyQueue.ts");
    assert.match(queue, /askableRows\(/, "the queue counts cards `withChoices` will then drop");
  });

  check("a case card it cannot place is refused, not waved through", () => {
    const scope = code("lib/course/scope.ts");
    assert.match(scope, /caseFromFront\(card\.front\)/, "a case card with no targetCase is read as no case at all again");
    assert.match(scope, /if \(!caseKey \|\| !caseWithin\(scope, caseKey\)\) return false;/,
      "a case card nothing can place passes the module's gate again");
  });

  check("a stored front reaches no screen with a Latin case name on it", () => {
    for (const file of [
      "lib/progress/reviewCards.ts", "app/(app)/review/clinic/page.tsx",
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
    // The picker's body is `changeCourseLevel`, which both doors call (N-8).
    const level = code("lib/progress/courseLevel.ts");
    const start = level.indexOf("export async function changeCourseLevel");
    assert.ok(start >= 0, "changeCourseLevel is gone");
    const end = level.indexOf("export async function", start + 10);
    const body = level.slice(start, end < 0 ? undefined : end);
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
