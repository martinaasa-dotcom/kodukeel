/**
 * The Numbers round's second mode, one number in many jobs, played in a browser.
 *
 *   node scripts/test-number-endings.mjs      against BASE_URL
 *
 * What only a browser can say about `lib/games/numberEndings.ts`:
 *
 *   - the Numbers round offers the mode beside its own, and the mode opens on
 *     its briefing rather than its first question;
 *   - a same-number card keeps a sentence open after a wrong pick and fills it
 *     after the right one, with the choice drawn under the sentence it is for;
 *   - a year card will not be checked until every part is picked, and then
 *     shows the same year doing its other jobs;
 *   - the round ends on the shared finish screen, and the numbers it missed put
 *     their words in the deck, which is the operator's rule for a game.
 *
 * Every card the round adds is deleted again, by the time it was made after.
 */
import { launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { startRound } from "./lib/briefing.mjs";

const B = baseUrl();
const OWNER = "local-single-user";
const { check, done } = suite("Number endings", { floor: 11 });
const prisma = newPrismaClient(requireLocalDatabase("play a round and delete the cards its misses add"));
const started = new Date();

const browser = await launchChromium();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${B}/review/numbers`, { waitUntil: "domcontentloaded" });
  const toEndings = page.getByRole("navigation", { name: "Numbers modes" }).getByRole("link", { name: "Number endings" });
  await toEndings.waitFor({ timeout: 30_000 }).catch(() => undefined);
  check("the Numbers round offers the endings mode beside its own", (await toEndings.count()) === 1);
  await toEndings.click();
  await page.waitForURL(/mode=endings/, { timeout: 30_000 });
  await page.getByRole("heading", { name: "One number, many jobs" }).first().waitFor({ timeout: 30_000 }).catch(() => undefined);
  check("the mode opens on its briefing", (await page.getByRole("heading", { name: "One number, many jobs" }).count()) > 0);
  await startRound(page);

  /* Step one: two same-number cards. A wrong pick first, then the rest by trial. */
  let sawWrong = false;
  let sawFill = false;
  for (let card = 0; card < 2; card += 1) {
    for (let row = 0; row < 8; row += 1) {
      const forms = page.getByRole("group", { name: "The forms" });
      if ((await forms.count()) === 0) break;
      const tiles = forms.getByRole("button");
      const n = await tiles.count();
      const before = await page.locator("li[aria-current=step]").innerText();
      for (let i = 0; i < n; i += 1) {
        await tiles.nth(i).click();
        await page.waitForTimeout(120);
        const active = page.locator("li[aria-current=step]");
        const now = (await active.count()) ? await active.innerText() : "";
        if (now !== before) {
          sawFill = true;
          break;
        }
        if (/Not that one/.test(await page.locator("main").innerText())) sawWrong = true;
      }
    }
    await page.getByRole("button", { name: /^Continue/ }).click();
  }
  check("a wrong pick leaves the sentence open and says to try again", sawWrong);
  check("a right pick fills the sentence and moves to the next", sawFill);

  /* Step two: two years. The button waits for every part. */
  let tableSeen = false;
  let gated = true;
  for (let card = 0; card < 2; card += 1) {
    const groups = page.getByRole("radiogroup");
    await groups.first().waitFor({ timeout: 15_000 });
    const parts = await groups.count();
    const checkButton = page.getByRole("button", { name: "Check" });
    if (parts > 1 && !(await checkButton.isDisabled())) gated = false;
    // The first option of every part, which is right or wrong by the draw: the round is marked either way.
    for (let i = 0; i < parts; i += 1) await groups.nth(i).getByRole("radio").first().click();
    await checkButton.click();
    await page.getByText("The same year doing other jobs").waitFor({ timeout: 10_000 }).catch(() => undefined);
    if ((await page.getByText("The same year doing other jobs").count()) > 0) tableSeen = true;
    await page.getByRole("button", { name: /^Continue/ }).click();
  }
  check("a year cannot be checked until every part is picked", gated);
  check("a checked year shows the same year doing its other jobs", tableSeen);

  /* Step three: six heard numbers. Read the answer back off nothing: write a number with a dot, wrong or right. */
  let marked = 0;
  for (let card = 0; card < 6; card += 1) {
    const box = page.locator("#ending-answer");
    await box.waitFor({ timeout: 15_000 });
    await box.fill(card === 0 ? "999." : "1");
    await page.getByRole("button", { name: /^Check/ }).click();
    if (await page.locator("main .verdict-panel").first().waitFor({ timeout: 10_000 }).then(() => true, () => false)) marked += 1;
    await page.getByRole("button", { name: /^Continue/ }).click();
  }
  check("every heard number is marked", marked === 6, `${marked} of 6`);

  await page.locator("[data-round-done]").waitFor({ timeout: 15_000 }).catch(() => undefined);
  check("the round ends on the shared finish screen", (await page.locator("[data-round-done]").count()) === 1);
  /*
    The first heard card was answered "999.", which is a miss whatever was dealt
    (a count of 999 is written without the dot), so the round handed in at least
    one number and the line under the title says where its words went.
  */
  const line = page.locator("[data-round-done]");
  const said = await line.getByText(/in your deck now|come back in another round/).first()
    .waitFor({ timeout: 10_000 }).then(() => true, () => false);
  check("the finish screen says where the missed numbers went", said);
  // The deck write lands after the screen is drawn; give it the moment it takes before reading both sides.
  await page.waitForTimeout(2500);
  const added = await prisma.card.count({ where: { ownerId: OWNER, source: "COURSE", createdAt: { gte: started } } });
  const inDeck = await line.getByText(/in your deck now/).count();
  check("and says they are in the deck only where cards were added", (inDeck > 0) === (added > 0), `${added} cards added`);
  check("nothing threw", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  await prisma.card.deleteMany({ where: { ownerId: OWNER, source: "COURSE", createdAt: { gte: started } } });
  await prisma.$disconnect();
}
done();
