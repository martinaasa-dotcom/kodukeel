/**
 * PRESSING THROUGH THE SCREEN THAT SAYS WHAT THE ROUND IS.
 *
 * Every round in this app opens on a briefing: what will be on the screen,
 * what the learner does about it, and one button (`lib/copy/briefings.ts`).
 * The round itself is not mounted behind it, which is the whole point of
 * drawing it at the page, and it is also why a suite that navigates into a
 * round and starts measuring is measuring the briefing rather than the round.
 *
 * That is the failure this repository keeps naming: a check that quietly
 * stops looking at the thing it was written for, while still passing. So
 * there is one definition of "start the round", every suite calls it after it
 * navigates, and it says whether it found one, so a caller can tell a round
 * that opened cold from one it pressed through.
 *
 * AND IT TAKES THE KEY WHEN THE BUTTON WILL NOT TAKE A CLICK. Playwright
 * refuses to click an element whose box is still moving, and the briefing
 * arrives on the app's own entrance animation, so on a page that is busy
 * doing something else the click times out against a button that is visible,
 * enabled and perfectly pressable. The screen answers the key that moves
 * every other card forward, which no animation can get in front of, so that
 * is the fallback.
 *
 * THE RESIDUAL IS STATED RATHER THAN HIDDEN: the key would also start a round
 * whose button something was covering, exactly as a forced click would, so
 * neither this nor `force: true` can tell "the box is still settling" from
 * "a scrim is over it". What does tell them apart is `test-containment.mjs`,
 * which measures whether anything is drawn on top of anything else on every
 * route at three widths in both themes, and it is asked of the briefing
 * screen because this driver presses through only after it has been seen.
 */

/**
 * Presses through a briefing if one is on the screen. Returns true if it
 * pressed, false if the screen was already the round.
 */
export async function startRound(page, { timeout = 4000, waitMs = 1400 } = {}) {
  const start = page.locator("[data-briefing-start]");
  try {
    /*
      A short wait rather than one look. Several suites navigate on
      `domcontentloaded`, where the page's own markup has not necessarily
      arrived yet, and a driver that looked once would walk past the briefing
      and then time out on a round it never started. It is bounded, so a round
      that is exempt from the rule costs this much and no more.
    */
    await page.locator("main").waitFor({ state: "attached", timeout }).catch(() => {});
    const until = Date.now() + waitMs;
    while (!(await start.count())) {
      if (Date.now() > until) return false;
      await page.waitForTimeout(120);
    }
    await start.first().click({ timeout: 1500 }).catch(async () => {
      await page.keyboard.press("Enter");
    });
    /* The round mounts in the next commit, so wait for the briefing to go. */
    await page.locator("[data-briefing]").waitFor({ state: "detached", timeout }).catch(() => {});
    await page.waitForTimeout(150);
    return true;
  } catch {
    return false;
  }
}
