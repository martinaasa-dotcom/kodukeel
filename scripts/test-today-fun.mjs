import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { eventually, launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { requireAppShell } from "./lib/prefs.mjs";

/**
 * THE JOKE AND THE GOOD NEWS ON TODAY, DRIVEN.
 *
 * Both cards are almost all behaviour a source check cannot see: a punchline
 * held behind a tap that then takes the caret, the English behind a press, a
 * second joke that resets all of that, the news streamed in after the page and
 * cycled in place, and a card a learner hid in Settings staying off Today.
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run dev
 *   node scripts/test-today-fun.mjs
 *
 * PUT FIRST FOR THE LENGTH OF THE SUITE. Today draws eight cards and on the CI
 * fixture the eight above the news always have something to say, so the
 * suite stores the order a learner would choose in Settings to put both cards
 * first, and puts back what was there. The news reads ERR's feeds, which a
 * runner may not reach, so its checks are waived by number, with the reason,
 * on a run where the card did not arrive.
 */
const B = baseUrl();
const OWNER = "local-single-user";
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const prisma = newPrismaClient(requireLocalDatabase("set the order of Today's cards"));
// Read off a real run; a waived news block lowers it by exactly its count.
const { check, absent, done } = suite("The joke and the good news", { floor: 25 });

const ORDER = { ownerId: OWNER, key: "todayOrder" };
const orderBefore = await prisma.setting.findUnique({ where: { ownerId_key: ORDER } });
const setOrder = (value) =>
  prisma.setting.upsert({ where: { ownerId_key: ORDER }, create: { ...ORDER, value }, update: { value } });

const browser = await launchChromium();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

async function axeOn(selector) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async (sel) => {
    const node = document.querySelector(sel);
    if (!node) return ["nothing to check"];
    // A card still fading in is measured at part of its opacity, and axe reads
    // that as low contrast: CI once failed this on a first run and passed the
    // second run made for the message. Measure the card as it settles.
    // Only the ones that end, and never for long, since a loop never finishes.
    const ending = document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity);
    await Promise.race([
      Promise.all(ending.map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    const result = await window.axe.run(node);
    return result.violations.map((v) => `${v.id} (${v.nodes.length})`);
  }, selector);
}

try {
  await setOrder("joke news");
  await page.goto(`${B}/`);
  await requireAppShell(page);

  // ── The joke ─────────────────────────────────────────────────────────────
  const joke = page.locator("[data-joke]");
  check("Today draws the joke of the day", await eventually(async () => (await joke.count()) === 1));
  const card = joke.locator("xpath=ancestor::*[.//button][1]");
  const another = card.getByRole("button", { name: /^Another one$/ });

  // A one-line joke has no setup to hold back, so walk to one that has.
  for (let i = 0; i < 6 && (await page.locator("[data-punchline]").count()) === 0; i++) {
    if ((await another.count()) === 0) break;
    await another.click();
  }
  const held = page.locator("[data-punchline]");
  check("the punchline waits behind a tap", (await held.count()) === 1);
  check("the held bubble says what pressing it does", /Tap for the punchline/.test(await held.innerText()));
  const before = await joke.locator("li").count();
  // Waited for rather than read once: the walk above may have just drawn
  // another joke, and the speaker is remounted with it. The detail names every
  // button the card held, so a miss says what was there instead.
  const speaker = card.getByRole("button", { name: "Hear the joke", exact: true });
  check("the speaker reads only what is on the card",
    await eventually(async () => (await speaker.count()) === 1),
    `buttons on the card: ${(await card.getByRole("button").evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label") || e.textContent?.trim()))).join(" | ")}`);
  check("the joke's words open their dictionary entries",
    (await joke.locator('a[href^="/dictionary"]').count()) > 0);
  const heldAxe = await axeOn("[data-joke]");
  check("the joke card passes axe with the punchline held", heldAxe.length === 0, heldAxe.join(", "));

  await held.click();
  check("the punchline replaces the dots", await eventually(async () => (await held.count()) === 0));
  check("the punchline takes the caret, so a screen reader reads it",
    await eventually(() => page.evaluate(() => !!document.activeElement?.closest("[data-joke]")
      && document.activeElement?.tagName === "LI")));
  check("the joke is whole once told", (await joke.locator("li").count()) === before);

  const english = card.getByRole("button", { name: "Show English" });
  check("the English is behind a press", (await english.count()) === 1);
  const estonianOnly = await joke.innerText();
  await english.click();
  check("pressing it shows the English and says how to hide it",
    await eventually(async () => (await card.getByRole("button", { name: "Hide English" }).count()) === 1));
  check("the English adds lines rather than replacing the Estonian",
    (await joke.innerText()).length > estonianOnly.length);
  const shownAxe = await axeOn("[data-joke]");
  check("the joke card passes axe with the English and the punchline shown", shownAxe.length === 0, shownAxe.join(", "));

  const told = await joke.innerText();
  await another.click();
  check("another one is a different joke", await eventually(async () => (await joke.innerText()) !== told));
  check("and starts with the English hidden again",
    (await card.getByRole("button", { name: "Show English" }).count()) === 1);

  // ── The good news ───────────────────────────────────────────────────────
  const news = page.locator("[data-good-news]");
  const arrived = await eventually(async () => (await news.count()) === 1, { timeoutMs: 20_000 });
  if (!arrived) {
    absent(6, "no good news arrived, which is a runner that cannot reach ERR's feeds or an hour with nothing good");
  } else {
    check("the headline is marked as Estonian", (await news.locator('blockquote[lang="et"]').count()) === 1);
    const newsCard = news.locator("xpath=ancestor::*[.//a[@target='_blank']][1]");
    const link = newsCard.locator("a[target=_blank]");
    check("the article link opens in a new tab and says so",
      (await link.count()) === 1 && /opens in a new tab/.test(await link.innerText()));
    check("the link carries no referrer", /noreferrer/.test((await link.getAttribute("rel")) ?? ""));
    check("the news sits in a polite live region", (await news.locator("xpath=..").getAttribute("aria-live")) === "polite");
    const more = newsCard.getByRole("button", { name: /^Another one$/ });
    if ((await more.count()) === 1) {
      const first = await news.innerText();
      await more.click();
      check("another headline replaces the first in place", await eventually(async () => (await news.innerText()) !== first));
    } else {
      absent(1, "only one good headline this hour, so there is nothing to cycle");
    }
    check("the news card passes axe", (await axeOn("[data-good-news]")).length === 0);
  }

  // ── Hidden in Settings ──────────────────────────────────────────────────
  await setOrder("-joke news");
  await page.goto(`${B}/`);
  await page.locator("main h1").waitFor();
  await page.waitForTimeout(1000);
  check("a joke hidden in Settings is not drawn on Today", (await joke.count()) === 0);

  await setOrder("joke news");
  await page.goto(`${B}/settings#today`);
  const row = page.locator("#today li", { hasText: "Joke of the day" });
  await row.getByRole("button", { name: "Hide Joke of the day from Today" }).click();
  check("hiding from Settings says so", await eventually(async () =>
    (await page.getByText("Joke of the day is hidden from Today.").count()) > 0));
  // The panel says so at once and saves behind it, so the row is waited for.
  let stored = "";
  const saved = await eventually(async () => {
    stored = (await prisma.setting.findUnique({ where: { ownerId_key: ORDER } }))?.value ?? "";
    return /(^|\s)-joke(\s|$)/.test(stored);
  });
  check("and stores the card as hidden, in its place", saved && stored.split(" ")[0] === "-joke", stored);

  check("nothing on either screen threw", errors.length === 0, errors.join(" | "));
} finally {
  if (orderBefore) await prisma.setting.update({ where: { ownerId_key: ORDER }, data: { value: orderBefore.value } });
  else await prisma.setting.deleteMany({ where: ORDER });
  await browser.close();
  await prisma.$disconnect();
}

done();
