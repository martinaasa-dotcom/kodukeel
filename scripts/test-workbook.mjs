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
 *   a reload dealt a different page and lost every box filled in;
 *   a word box's English marked the word it wanted, which answered the half
 *   of the line the box asks;
 *   a pick-the-form page left the option checked wrong pickable again.
 *
 * Which kinds of exercise a sitting is turns on the level, so the level is
 * written for each half (B1: a written page, then the word box; A1: pick the
 * form first) and the rows that were there before are put back at the end.
 *
 * It grades, so it remembers the review ids that were there before it started
 * and deletes only what it wrote, which is `test-flash.mjs`'s discipline.
 */

const B = baseUrl();
const OWNER = "local-single-user";
const prisma = newPrismaClient(requireLocalDatabase("write and delete the reviews this page grades"));
const { check, absent, done } = suite("The workbook", { floor: 44 });

const LEVEL_KEYS = ["cefrPlacement", "cefrPlacementAt"];
const levelBefore = await prisma.setting.findMany({ where: { ownerId: OWNER, key: { in: LEVEL_KEYS } } });
async function holdLevel(level) {
  for (const [key, value] of [["cefrPlacement", level], ["cefrPlacementAt", new Date().toISOString()]]) {
    await prisma.setting.upsert({ where: { ownerId_key: { ownerId: OWNER, key } }, update: { value }, create: { ownerId: OWNER, key, value } });
  }
}
async function putLevelBack() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER, key: { in: LEVEL_KEYS } } });
  if (levelBefore.length) await prisma.setting.createMany({ data: levelBefore });
}
await holdLevel("B1");

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
  absent(38, "a deck whose words can fill a page, which the demo fixture holds");
  await browser.close();
  await putLevelBack();
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

/*
  Copying the bracket word out is wrong, and never forgiven as a slip: a
  word one letter from its answer was once marked right with a slip, which
  is the fault #829 fixed in markLine. The one copy that settles is a line
  whose answer is the bracket word exactly, which is right, so what is
  asserted is the double tap itself: the second tap marks nothing missed,
  nothing is a slip, and whatever the first pass did not settle is still
  open.
*/
const afterDouble = await lines.evaluateAll((els) => els.map((e) => e.getAttribute("data-outcome")));
const openAfter = afterDouble.filter((o) => o === "open").length;
check(
  "a second tap on Check checks the page once and leaves the misses open",
  afterDouble.length === n && openAfter > 0 && afterDouble.every((o) => o === "open" || o === "right"),
  JSON.stringify(afterDouble),
);
check("the second check waits until an answer has changed", await page.locator("[data-workbook-check]").isDisabled());
check(
  "copying the bracket word out is named for what it is",
  /as it stands in brackets/i.test(await page.locator('[data-workbook-line][data-outcome="open"]').first().innerText()),
);
check("each reopened line shows how its answer ends or starts", await page.locator(".wb-hint").count() === openAfter, `${await page.locator(".wb-hint").count()} of ${openAfter}`);

await gaps.first().focus();
const selected = await gaps.first().evaluate((el) => el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0);
check("focusing a reopened box selects the old answer, so typing replaces it", selected);
await page.keyboard.type("x");
check("and typing replaces it", (await gaps.first().inputValue()) === "x");
check("one change is enough to check again", !(await page.locator("[data-workbook-check]").isDisabled()));

await page.locator("[data-workbook-show]").click();
await page.waitForTimeout(600);
const settled = await lines.evaluateAll((els) => els.map((e) => e.getAttribute("data-outcome")));
check(
  "showing the answers settles every open line as missed",
  settled.length === n && settled.every((o, i) => (afterDouble[i] === "open" ? o === "missed" : o === afterDouble[i])),
  JSON.stringify(settled),
);
check("every settled line prints its answer", await page.locator("[data-answer]").count() === n);
const speakers = await page.getByRole("button", { name: /hear the sentence/i }).count();
if (speakers > 0) check("a settled line can be heard", speakers >= 1, `${speakers}`);
else absent(1, "the speech service, which this machine cannot reach");

// On through the pages to the corrected one. At B1 the second exercise is the word box.
let boxSeen = false;
for (let k = 0; k < 4; k++) {
  const next = page.locator("[data-workbook-next]");
  if (await next.count() === 0) break;
  const label = await next.innerText();
  await next.click();
  await page.waitForTimeout(500);
  if (/corrected/i.test(label)) break;
  const box = page.locator("[data-workbook-box] li");
  const isBox = !boxSeen && await box.count() > 0;
  if (isBox) {
    boxSeen = true;
    const words = await box.allInnerTexts();
    const boxLines = await page.locator("li[data-workbook-line]").count();
    check("the word box holds a word for every line and the example's", words.length === boxLines + 1, `${words.length} words, ${boxLines} lines`);
    check("the example's word is crossed out in the box", await page.locator("[data-workbook-box] s").count() === 1);
    const cueTexts = await page.locator("li[data-workbook-line] .wb-cue").allInnerTexts();
    check("a box line's bracket never names its word", cueTexts.every((c) => !words.some((w) => c.includes(w))), cueTexts.join(" "));
    check("a box line's English marks no word, which would say which word goes there",
      await page.locator("li[data-workbook-line] strong, li[data-workbook-line] b").count() === 0);
  }
  const more = page.locator("input[data-workbook-gap]");
  const m = await more.count();
  for (let i = 0; i < m; i++) await more.nth(i).fill("x");
  await page.locator("[data-workbook-check]").click();
  await page.waitForTimeout(400);
  if (isBox) {
    check("a box line open for a second go names its word and not its ending",
      await page.locator("[data-workbook-word-hint]").count() === m && !/It ends in|It starts with/.test(await page.locator("main").innerText()),
      `${await page.locator("[data-workbook-word-hint]").count()} of ${m}`);
  }
  const show = page.locator("[data-workbook-show]");
  if (await show.count()) await show.click();
  await page.waitForTimeout(400);
}
if (!boxSeen) absent(5, "a second exercise that is a word box: the deck filled one exercise only");
await page.waitForTimeout(800);
const finish = await page.locator("main").innerText();
check("the page ends on itself, corrected", /corrected/i.test(finish), finish.slice(0, 80));
check("the finish screen offers another page", await page.locator('a[href*="round="]').count() > 0);
check(
  "a finished page is taken off the device, so it cannot come back on a reload",
  (await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.includes("workbook")).length)) === 0,
);

/*
  The lines got wrong, set again. Every line on this run was missed, so the
  redo holds every one of them, and it writes nothing: each card is graded once
  a sitting and the first go is the one that counted.
*/
const reviewsBeforeRedo = await prisma.review.count({ where: { ownerId: OWNER } });
const redo = page.locator("[data-workbook-redo-start]");
check("a corrected page with lines wrong offers to redo them", await redo.count() === 1);
if (await redo.count()) {
  await redo.click();
  await page.locator("[data-workbook-exercise]").first().waitFor({ timeout: 10_000 }).catch(() => {});
  check("the redo says it is not graded", await page.locator("[data-workbook-practice]").count() === 1);
  const redoGaps = page.locator("[data-workbook-gap]");
  const r = await redoGaps.count();
  for (let i = 0; i < r; i++) await redoGaps.nth(i).fill("x");
  await page.locator("[data-workbook-check]").click();
  await page.waitForTimeout(400);
  await page.locator("[data-workbook-show]").click();
  await page.waitForTimeout(400);
  await page.locator("[data-workbook-next]").click();
  await page.waitForTimeout(800);
  check("the redo writes nothing to the review log", (await prisma.review.count({ where: { ownerId: OWNER } })) === reviewsBeforeRedo);
  await page.locator("[data-workbook-back]").click();
  await page.waitForTimeout(500);
  check("and leads back to the corrected page", /corrected/i.test(await page.locator("main").innerText()) && await page.locator("[data-workbook-redo-start]").count() === 1);
  /*
    On a phone the offer and its button stack: side by side, a button that
    may not wrap squeezed the sentence beside it to a few letters a line.
  */
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(200);
  const offer = await page.locator("[data-workbook-redo] p").boundingBox();
  check("on a phone the redo offer reads as a sentence, not a column of letters", (offer?.width ?? 0) >= 240, `${Math.round(offer?.width ?? 0)}px wide`);
  await page.setViewportSize({ width: 1280, height: 900 });
} else {
  absent(4, "a redo button, whose absence is the failure above");
}

const written = (await prisma.review.findMany({
  where: { ownerId: OWNER, reviewedAt: { gte: before } },
  select: { id: true, cardId: true, slot: true, rating: true },
})).filter((row) => !alreadyThere.has(row.id));
check("the page wrote its grades to the review log", written.length > 0, `${written.length} rows`);
// A line the first pass settled as right is graded on its own terms; every other line was missed twice.
const settledFirst = n - openAfter;
check(
  "every line missed twice is graded Again",
  written.length > 0 && written.filter((r) => r.rating !== 1).length <= settledFirst,
  `${JSON.stringify(written.map((r) => r.rating))}, ${settledFirst} settled on the first pass`,
);
check("every grade says what was asked", written.length > 0 && written.every((r) => typeof r.slot === "string" && r.slot.length > 0));
const cards = written.map((r) => r.cardId);
check("no card is graded twice in one sitting", new Set(cards).size === cards.length, `${cards.length} grades, ${new Set(cards).size} cards`);
check("nothing threw", errors.length === 0, errors[0] ?? "");

await prisma.review.deleteMany({ where: { id: { in: written.map((r) => r.id) } } });

/*
  A BEGINNER'S SITTING OPENS ON PICKING THE FORM. Three forms of the word
  under every line, one of them right; a wrong pick opens the line again
  with that option crossed out and out of reach, and the page cannot be
  checked a second time until another one is picked.
*/
await holdLevel("A1");
const beforeA1 = new Set((await prisma.review.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((r) => r.id));
await page.goto(`${B}/review/workbook?theme=present`, { waitUntil: "domcontentloaded" });
await startRound(page);
await page.locator("[data-workbook-exercise]").first().waitFor({ timeout: 15_000 }).catch(() => {});
const optionRows = page.locator("[data-workbook-options]");
const rowCount = await optionRows.count();
if (rowCount > 0) {
  const sizes = await optionRows.evaluateAll((rows) => rows.map((r) => r.querySelectorAll('[role="radio"]').length));
  check("a beginner's page opens on picking the form, three forms to a line", sizes.length >= 3 && sizes.every((n) => n === 3), JSON.stringify(sizes));
  check("each row of forms is one radio group, named for its line",
    (await page.locator("[data-workbook-options] [role='radiogroup'][aria-label]").count()) === rowCount);
  check("nothing on a pick-the-form page is typed", await page.locator("input[data-workbook-gap]").count() === 0);
  const picked = [];
  for (let i = 0; i < rowCount; i++) {
    const first = optionRows.nth(i).locator('[role="radio"]').first();
    picked.push(await first.innerText());
    await first.click();
  }
  const gapsShow = await page.locator("[data-workbook-gap]").allInnerTexts();
  check("a picked form stands in its gap", picked.every((p, i) => gapsShow[i]?.trim() === p.trim()), `${picked.join(",")} / ${gapsShow.join(",")}`);
  await page.locator("[data-workbook-check]").click();
  await page.waitForTimeout(600);
  const open = page.locator("li[data-workbook-line][data-outcome='open']");
  const openCount = await open.count();
  if (openCount > 0) {
    const struck = await open.evaluateAll((lines) => lines.map((l) => {
      const off = [...l.querySelectorAll('[role="radio"]')].filter((r) => r.disabled);
      return off.length === 1 && off[0].getAttribute("aria-checked") !== "true" ? off[0].textContent.trim() : null;
    }));
    check("a wrong pick is crossed out, out of reach and no longer shown as chosen", struck.every((t) => t !== null), JSON.stringify(struck));
    check("the second check waits until another form is picked", await page.locator("[data-workbook-check]").isDisabled());
    await open.first().locator('[role="radio"]:not([disabled])').first().click();
    check("picking another form lets the page be checked again", !(await page.locator("[data-workbook-check]").isDisabled()));
    await page.locator("[data-workbook-show]").click();
    await page.waitForTimeout(500);
    check("showing the answers settles the page", await page.locator("li[data-workbook-line][data-outcome='open']").count() === 0);
  } else {
    absent(4, "a wrong first pick: every first option on this page happened to be right");
  }
} else {
  absent(8, "a pick-the-form page at A1: the deck could not fill one");
}
const a1Rows = (await prisma.review.findMany({ where: { ownerId: OWNER }, select: { id: true } })).filter((r) => !beforeA1.has(r.id));
await prisma.review.deleteMany({ where: { id: { in: a1Rows.map((r) => r.id) } } });
check("nothing threw at A1 either", errors.length === 0, errors[0] ?? "");

await putLevelBack();
await browser.close();
await prisma.$disconnect();
done();
