#!/usr/bin/env node
import { launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { startRound } from "./lib/briefing.mjs";

/**
 * TÖÖVIHIK, SAT IN A BROWSER.
 *
 * The page's rules are unit tested in `lib/games/workbook.test.ts`, and what
 * no unit test can see is the half that happens in a browser: a page of
 * boxes filled in any order, checked at once, opened again on the lines that
 * missed, and handed back corrected. Each check below is a fault this page
 * had or could have, asked of the rendered screen:
 *
 *   a reflex double press of Enter checked the reopened page a second time
 *   with nothing changed and marked every line missed;
 *   copying the bracket word out unchanged got a bare "not quite";
 *   a verb in a sentence with no subject had no right answer once the English
 *   was hidden, until the bracket named the person;
 *   one card could be graded several times in one sitting;
 *   a reload dealt a different page and lost every box filled in.
 *
 * It grades, so it remembers the review ids that were there before it started
 * and deletes only what it wrote, which is `test-flash.mjs`'s discipline.
 */

const B = baseUrl();
const OWNER = "local-single-user";
const prisma = newPrismaClient(requireLocalDatabase("write and delete the reviews this page grades"));
const { check, absent, done } = suite("The workbook", { floor: 27 });

const before = new Date();
const alreadyThere = new Set(
  (await prisma.review.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((r) => r.id),
);

const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${B}/review/workbook?theme=present`, { waitUntil: "domcontentloaded" });
check("the page opens on its briefing", await page.locator("[data-briefing='workbook']").count() > 0);
await startRound(page);
await page.locator("[data-workbook-exercise]").first().waitFor({ timeout: 15_000 }).catch(() => {});

const sheet = page.locator("[data-workbook-exercise]");
if (await sheet.count() === 0) {
  absent(21, "a deck whose words can fill a page, which the demo fixture holds");
  await browser.close();
  await prisma.$disconnect();
  done();
}

check("one h1 and one main", await page.locator("h1").count() === 1 && await page.locator("main").count() === 1);

const lines = page.locator("li[data-workbook-line]");
const gaps = page.locator("[data-workbook-gap]");
const n = await gaps.count();
check("a page sets at least three lines to fill", n >= 3, `${n} gaps`);
check("the worked example is printed filled in", await page.locator(".wb-example .wb-example-answer").count() === 1);

const labels = await gaps.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
const cues = await lines.locator(".wb-cue").allInnerTexts();
check(
  "every box is named by the word in its bracket",
  labels.length === n && labels.every((label, i) => label.includes((cues[i] ?? "").replace(/[()]/g, ""))),
  labels[0] ?? "",
);

/*
  The person in the bracket. Whether a present-tense page holds a sentence
  that drops its pronoun is a fact about the deck, so this asks only that a
  cue naming a person is one of the six and is beside a verb, and waives the
  check where the page dealt none.
*/
const withPerson = cues.filter((c) => /,/.test(c));
if (withPerson.length > 0) {
  check(
    "a bracket that names the person names a personal pronoun first",
    withPerson.every((c) => /^\((mina|sina|meie|teie), \S+\)$/i.test(c)),
    withPerson[0],
  );
} else {
  absent(1, "a present-tense sentence on this page with its pronoun dropped");
}

const rule = page.locator("[data-workbook-rule] summary");
if (await rule.count() > 0) {
  await rule.click();
  check("the rule box opens into the point and the warning", await page.locator("[data-rule-note] [data-watch-out]").count() === 1);
} else {
  absent(1, "a page on a case or a tense, which carries a rule box");
}

/*
  A reload halfway down the page. The server deals at random, so before the
  page was kept on the device a reload dealt a different page and the boxes
  filled in were gone.
*/
await gaps.first().fill("qq");
await page.waitForTimeout(300);
await page.reload({ waitUntil: "domcontentloaded" });
await startRound(page);
await page.locator("[data-workbook-exercise]").first().waitFor({ timeout: 15_000 }).catch(() => {});
check("a reload comes back to the same page and says so", await page.locator("[data-workbook-resumed]").count() === 1);
check(
  "with the box filled in still filled in, and the same sentences",
  (await gaps.first().inputValue()) === "qq" && JSON.stringify(await lines.locator(".wb-cue").allInnerTexts()) === JSON.stringify(cues),
);

// Every box filled with the word exactly as its bracket has it.
for (let i = 0; i < n; i++) {
  const cue = (cues[i] ?? "").replace(/[()]/g, "").split(",").pop().trim();
  await gaps.nth(i).fill(cue);
}
/*
  A double click on the button, which is the reflex that hurt: the first
  click checks the page and reopens the misses with every box still holding
  its answer, so a second click a moment later checked them again unchanged
  and marked every line missed. A double press of Enter cannot do it, since
  the first moves the caret onto the first reopened box, so this asks the
  pointer, two taps a quarter of a second apart: a synthetic double click
  lands before React has drawn the reopened page, so it runs the first pass
  twice and could never show the fault.
*/
const checkButton = page.locator("[data-workbook-check]");
await checkButton.click();
await page.waitForTimeout(250);
await checkButton.click({ force: true, timeout: 2000 }).catch(() => {});
await page.waitForTimeout(600);

const afterDouble = await lines.evaluateAll((els) => els.map((e) => e.getAttribute("data-outcome")));
check(
  "a second tap on Check checks the page once and leaves the misses open",
  afterDouble.length === n && afterDouble.every((o) => o === "open"),
  JSON.stringify(afterDouble),
);
check("the second check waits until an answer has changed", await page.locator("[data-workbook-check]").isDisabled());
check(
  "copying the bracket word out is named for what it is",
  /as it stands in brackets/i.test(await lines.first().innerText()),
);
check("each reopened line shows how its answer ends or starts", await page.locator(".wb-hint").count() === n);

await gaps.first().focus();
const selected = await gaps.first().evaluate((el) => el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0);
check("focusing a reopened box selects the old answer, so typing replaces it", selected);
await page.keyboard.type("x");
check("and typing replaces it", (await gaps.first().inputValue()) === "x");
check("one change is enough to check again", !(await page.locator("[data-workbook-check]").isDisabled()));

await page.locator("[data-workbook-show]").click();
await page.waitForTimeout(600);
const settled = await lines.evaluateAll((els) => els.map((e) => e.getAttribute("data-outcome")));
check("showing the answers settles every line as missed", settled.length === n && settled.every((o) => o === "missed"), JSON.stringify(settled));
check("every settled line prints its answer", await page.locator("[data-answer]").count() === n);
const speakers = await page.getByRole("button", { name: /hear the sentence/i }).count();
if (speakers > 0) check("a settled line can be heard", speakers >= 1, `${speakers}`);
else absent(1, "the speech service, which this machine cannot reach");

// On through the pages to the corrected one.
for (let k = 0; k < 4; k++) {
  const next = page.locator("[data-workbook-next]");
  if (await next.count() === 0) break;
  const label = await next.innerText();
  await next.click();
  await page.waitForTimeout(500);
  if (/corrected/i.test(label)) break;
  const more = page.locator("[data-workbook-gap]");
  const m = await more.count();
  for (let i = 0; i < m; i++) await more.nth(i).fill("x");
  await page.locator("[data-workbook-check]").click();
  await page.waitForTimeout(400);
  const show = page.locator("[data-workbook-show]");
  if (await show.count()) await show.click();
  await page.waitForTimeout(400);
}
await page.waitForTimeout(800);
const finish = await page.locator("main").innerText();
check("the page ends on itself, corrected", /corrected/i.test(finish), finish.slice(0, 80));
check("the finish screen offers another page", await page.locator('a[href*="round="]').count() > 0);
check(
  "a finished page is taken off the device, so it cannot come back on a reload",
  (await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.includes("workbook")).length)) === 0,
);

const written = (await prisma.review.findMany({
  where: { ownerId: OWNER, reviewedAt: { gte: before } },
  select: { id: true, cardId: true, slot: true, rating: true },
})).filter((row) => !alreadyThere.has(row.id));
check("the page wrote its grades to the review log", written.length > 0, `${written.length} rows`);
check("every line missed twice is graded Again", written.length > 0 && written.every((r) => r.rating === 1), JSON.stringify(written.map((r) => r.rating)));
check("every grade says what was asked", written.length > 0 && written.every((r) => typeof r.slot === "string" && r.slot.length > 0));
const cards = written.map((r) => r.cardId);
check("no card is graded twice in one sitting", new Set(cards).size === cards.length, `${cards.length} grades, ${new Set(cards).size} cards`);
check("nothing threw", errors.length === 0, errors[0] ?? "");

await prisma.review.deleteMany({ where: { id: { in: written.map((r) => r.id) } } });
await browser.close();
await prisma.$disconnect();
done();
