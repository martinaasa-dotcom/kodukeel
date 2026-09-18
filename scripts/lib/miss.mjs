import { retypeMiss } from "./review.mjs";

/**
 * ANSWERING A REVIEW CARD WRONGLY, WHICH IS THE OPPOSITE OF WHAT `review.mjs`
 * PROMISES AND SO LIVES NEXT DOOR RATHER THAN INSIDE IT.
 *
 * `revealAnswer` reveals and never grades, and its own file says why: the
 * containment suite runs third and everything after it reads the same deck, so
 * a shared driver that graded would quietly change what the rest of them
 * measure. `scripts/test-invariants.ts` holds it to that. This is the driver
 * for the suites that need the opposite, and keeping the two apart is what lets
 * both rules stay true.
 *
 * `scripts/test-hints.mjs` is the caller it was written for. It cannot ask its
 * question at all without a real miss, because a miss is the whole thing that
 * opens the hint, and driven with `revealAnswer` the round sat on one card for
 * sixteen answers: the guess was right, the undo inside that helper put the
 * card back, and nothing moved.
 *
 * ANY SUITE THAT USES THIS OWNS THE DECK IT LEAVES BEHIND. Grading writes to
 * `Review`, which is append-only, and raises `lapses`, which is what the leech
 * clinic and the sticking-points panel read. A caller snapshots the scheduling
 * and deletes the rows it wrote, which is `test-flash.mjs`'s arrangement.
 */

/**
 * Answers whatever card is on screen wrongly, so the word comes back.
 *
 * It knows all four shapes, for the reason `revealAnswer` does: a driver that
 * knows only the flip finds no button when the default changes, takes whatever
 * else the code around it does, and quietly stops testing.
 *
 * A first meeting is pressed through rather than answered, because it writes
 * nothing at all. A choice is answered with the first option, which is
 * sometimes right: the card then takes itself away and the round still moves,
 * so this reports the shape it answered rather than promising a miss each time.
 *
 * Returns the shape (`"meet"`, `"typed"`, `"choice"`, `"flip"`), or null when
 * there was nothing left to answer.
 */
export async function missCard(page, { settle = 1200 } = {}) {
  const app = page.locator("main");

  const meet = app.getByRole("button", { name: /Got it, ask me later/ });
  if (await meet.count()) {
    await meet.first().click();
    await page.waitForTimeout(900);
    return "meet";
  }

  const typed = app.locator("input#answer");
  if (await typed.count()) {
    await typed.fill("zzzqqq");
    await app.getByRole("button", { name: /^Check/ }).first().click();
    await page.waitForTimeout(900);
    // The card asks for the form once more before it will move on, and that
    // retype is what sends the grade the miss already earned.
    await retypeMiss(page);
    const next = app.getByRole("button", { name: /^Got it, next/ });
    if (await next.count()) { await next.first().click(); await page.waitForTimeout(settle); }
    return "typed";
  }

  const options = app.locator("button.choice-btn");
  if (await options.count()) {
    await options.first().click();
    await page.waitForTimeout(settle);
    // A wrong pick leaves this button and grades Again; a right one goes by
    // itself after the verdict pause.
    const next = app.getByRole("button", { name: /^Got it, next/ });
    if (await next.count()) await next.first().click();
    await page.waitForTimeout(settle);
    return "choice";
  }

  const show = app.getByRole("button", { name: /Show answer/ });
  if (await show.count()) {
    await show.first().click();
    await page.waitForTimeout(700);
    const notYet = app.getByRole("button", { name: /Not yet/ });
    if (await notYet.count()) { await notYet.first().click(); await page.waitForTimeout(settle); }
    return "flip";
  }

  return null;
}
