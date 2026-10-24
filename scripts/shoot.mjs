/**
 * A MOCKUP IS THE APP ITSELF, IN BOTH THEMES.
 *
 * Hand-written HTML shown as "what it would look like" arrives in the author's
 * fonts and the author's hexes, not the app's: a mockup of the finished-evening
 * card was drawn in Bricolage Grotesque and Figtree, two faces this app has
 * never loaded, and was then asked to be trusted as the real thing. So a visual
 * proposal is made on a branch and photographed here, against the running app,
 * which cannot draw a face or a color the stylesheet does not hold.
 *
 *   node scripts/shoot.mjs /course / --out shots --width 1280
 *   node scripts/shoot.mjs /practice --full
 *
 * Every route is taken in the light theme and in the dark one, the way the
 * toggle stores the choice, so the dark palette is the one a learner who chose
 * it actually gets. It writes files and asserts nothing, so it is not a suite.
 *
 * `--store` takes the store screenshots instead (R-2, docs/44-sixth-batch.md):
 *
 *   npm run store:shots                      every phone, every language
 *   npm run store:shots -- --preset android  one phone
 *   npm run store:shots -- --locale ru       one language
 *
 * The phones, their pixel sizes and the screens are in scripts/lib/storeSizes.mjs,
 * beside the icon sizes, each with the page it was read off. It runs against a
 * local build over the demo history (`npm run demo`), in the light theme, so a
 * screenshot shows the demo learner and never a real one, and it refuses a
 * database that is not local, since choosing a language writes the learner's
 * setting. The setting is put back whatever happens. The app's screens are in
 * English, Russian and Ukrainian; Estonian is for the public pages alone (D16),
 * and none of these six is one, so there is no Estonian set.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { launchChromium } from "./lib/browser.mjs";
import { startRound } from "./lib/briefing.mjs";
import { baseUrl } from "./lib/checks.mjs";
import { SHOT_LOCALES, SHOT_PRESETS, STORE_SCREENS } from "./lib/storeSizes.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
};
const store = args.includes("--store");
if (store) args.splice(args.indexOf("--store"), 1);
const onlyPreset = flag("preset", null);
const onlyLocale = flag("locale", null);
const out = flag("out", store ? "store/screenshots" : "shots");
const width = Number(flag("width", "1280"));
const height = Number(flag("height", "900"));
/* `--full` takes the whole page rather than the first screen of it. */
const full = args.includes("--full");
if (full) args.splice(args.indexOf("--full"), 1);
const routes = args.length > 0 ? args : ["/"];

if (!store) {
  mkdirSync(out, { recursive: true });
  const browser = await launchChromium();
  try {
    for (const route of routes) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width, height } });
        await context.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
        const page = await context.newPage();
        await page.goto(new URL(route, baseUrl()).toString(), { waitUntil: "load" });
        await page.locator("main h1").first().waitFor({ timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(800);
        const name = (route === "/" ? "today" : route.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-")) + `-${theme}.png`;
        await page.screenshot({ path: join(out, name), fullPage: full });
        console.log(join(out, name));
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

/**
 * What happens on a screen before it is photographed. A screen not named here
 * is photographed as it opens. Every control is found by a hook or a class
 * rather than its English name, since the same walk runs in three languages.
 */
const BEFORE = {
  /* A review card, not its briefing: the round is started the way every suite starts one. */
  "02-review": async (page) => { await startRound(page); },

  /* A conversation in progress: started, and two turns taken, so both sides are on screen. */
  "03-conversation": async (page) => {
    const start = page.locator("main button.btn-cta");
    for (let tries = 0; tries < 20; tries += 1) {
      if ((await page.locator('[role="log"] p').count()) > 0) break;
      if (await start.count()) await start.first().click().catch(() => {});
      await page.waitForTimeout(700);
    }
    /*
      Two turns taken, by picking a line where the round offers lines (the
      default) or typing one where it asks for typing, so both sides of the
      conversation are on the screen.
    */
    for (let turn = 0; turn < 2; turn += 1) {
      const lines = await page.locator('[role="log"] p').count();
      const pick = page.locator("[data-pick]").first();
      const box = page.locator('main textarea, main input[lang="et"]').first();
      if (await pick.count()) await pick.click().catch(() => {});
      else if (await box.count()) { await box.fill("Tere!"); await box.press("Enter"); }
      else break;
      for (let tries = 0; tries < 30; tries += 1) {
        if ((await page.locator('[role="log"] p').count()) > lines + 1) break;
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(600);
    }
  },

  /*
    A part check, answered and marked. The paper's own questions are read off
    the page's props, which is where the screen holds them too, so every answer
    is the one the paper wants and the result shown is a pass. Nothing is
    stored that a learner could not store by sitting it.
  */
  "06-check": async (page) => {
    await page.locator("[data-course-check]").waitFor({ timeout: 30_000 });
    const items = await page.evaluate(() => {
      const el = document.querySelector("[data-course-check]");
      const key = Object.keys(el).find((k) => k.startsWith("__reactFiber"));
      for (let fiber = el[key]; fiber; fiber = fiber.return) {
        const props = fiber.memoizedProps;
        if (props && Array.isArray(props.items)) {
          return props.items.map((i) => ({ kind: i.kind, answer: i.answer, options: i.options ?? null }));
        }
      }
      return null;
    });
    if (!items) return;
    for (let at = 0; at < items.length; at += 1) {
      const item = items[at];
      const quiz = page.locator(`[data-lesson-quiz="${at + 1}"]`);
      await quiz.waitFor({ timeout: 10_000 });
      if (item.kind === "type") {
        const input = quiz.locator("input").first();
        await input.fill(item.answer);
        await input.press("Enter");
      } else {
        await quiz.locator('[role="radio"]').nth(item.options.indexOf(item.answer)).click();
      }
      await page.waitForTimeout(250);
      await page.keyboard.press("Enter");
    }
    const result = page.locator("[data-check-result]");
    await result.waitFor({ timeout: 30_000 }).catch(() => {});
    await result.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(600);
  },
};

async function shootStore() {
  const { newPrismaClient } = await import("./lib/db.mjs");
  const { requireLocalDatabase } = await import("./lib/local-db.mjs");
  const prisma = newPrismaClient(requireLocalDatabase("choose the demo learner's language for the store screenshots"));
  const owner = (await prisma.card.findFirst({ select: { ownerId: true }, orderBy: { id: "asc" } }))?.ownerId;
  if (!owner) {
    console.error("No learner with a deck here: run `npm run demo` first, so the screenshots show the demo history.");
    process.exit(1);
  }
  const KEYS = ["uiLocale", "uiLocaleNoticed"];
  const before = await prisma.setting.findMany({ where: { ownerId: owner, key: { in: KEYS } } });
  const setLocale = async (value) => {
    for (const key of KEYS) {
      await prisma.setting.upsert({
        where: { ownerId_key: { ownerId: owner, key } },
        update: { value }, create: { ownerId: owner, key, value },
      });
    }
  };

  const presets = Object.entries(SHOT_PRESETS).filter(([id]) => !onlyPreset || id === onlyPreset);
  const locales = SHOT_LOCALES.filter((l) => !onlyLocale || l === onlyLocale);
  const browser = await launchChromium();
  try {
    for (const locale of locales) {
      await setLocale(locale);
      for (const [id, preset] of presets) {
        const dir = join(out, id, locale);
        mkdirSync(dir, { recursive: true });
        for (const screen of STORE_SCREENS) {
          const context = await browser.newContext({
            viewport: preset.viewport,
            deviceScaleFactor: preset.scale,
            isMobile: true,
            hasTouch: true,
            reducedMotion: "reduce",
            serviceWorkers: "block",
          });
          await context.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch {} });
          const page = await context.newPage();
          await page.goto(new URL(screen.route, baseUrl()).toString(), { waitUntil: "load", timeout: 60_000 });
          await page.locator("main h1").first().waitFor({ timeout: 30_000 }).catch(() => {});
          await page.waitForTimeout(800);
          await BEFORE[screen.name]?.(page).catch((e) => console.error(`  ${screen.name}: ${e.message}`));
          // JPEG, since neither store takes an alpha channel on a screenshot.
          const file = join(dir, `${screen.name}.jpg`);
          await page.screenshot({ path: file, type: "jpeg", quality: 88 });
          console.log(`${file}  ${preset.pixels.width}x${preset.pixels.height}`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    for (const key of KEYS) {
      const row = before.find((r) => r.key === key);
      if (row) await prisma.setting.update({ where: { ownerId_key: { ownerId: owner, key } }, data: { value: row.value } });
      else await prisma.setting.deleteMany({ where: { ownerId: owner, key } });
    }
    await prisma.$disconnect();
  }
}

// Last, so everything it reads above has been declared by the time it runs.
if (store) await shootStore();
