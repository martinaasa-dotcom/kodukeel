import { launchChromium } from "./lib/browser.mjs";
import { baseUrl } from "./lib/checks.mjs";

/**
 * HOW TALL THE LAST TWO STEPS OF FIRST RUN ARE ON A PHONE.
 *
 *   node scripts/measure-wizard.mjs
 *
 * Walks `/start` at 390 by 844 in English and in Russian and prints, for step
 * 3 ("Why Estonian?") and step 4 ("Today"), the height of the document and of
 * each top-level block in the step, so a change to either step is measured
 * rather than eyeballed (docs/37-second-batch.md, SB-8). Russian runs longer
 * than English on every card, which is why it is measured too.
 *
 * It needs the state a stranger arrives in, an empty deck and no first run
 * finished, the precondition `scripts/test-assess.mjs` states, and it says so
 * and stops rather than measuring Today. It never presses the last button, so
 * it leaves the database as it found it. A measurement, not a test: it prints
 * figures and fails only where it could not reach a step.
 */
const B = baseUrl();
const WIDTH = 390;
const HEIGHT = 844;
/** The target on each step, docs/37-second-batch.md, D9. */
const TARGET = 1700;

const browser = await launchChromium();
let reached = true;

async function blocks(page) {
  return page.evaluate(() => {
    const section = document.querySelector("section h1")?.closest("section");
    const card = section?.parentElement;
    const rect = (el) => Math.round(el.getBoundingClientRect().height);
    const label = (el) =>
      (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 48);
    const inside = section ? [...section.children].map((el) => ({ what: label(el), height: rect(el) })) : [];
    const after = card && section
      ? [...card.children].slice([...card.children].indexOf(section) + 1).map((el) => ({ what: `(after) ${label(el)}`, height: rect(el) }))
      : [];
    return {
      document: document.documentElement.scrollHeight,
      section: section ? rect(section) : 0,
      blocks: [...inside, ...after],
      // Where the way on sits on the screen before anybody scrolls, which is
      // the third cut's whole point: on the window, not under it.
      continueOnScreen: (() => {
        window.scrollTo(0, 0);
        const next = [...document.querySelectorAll("button")].find((b) => b.querySelector("svg.lucide-arrow-right"));
        if (!next) return null;
        const r = next.getBoundingClientRect();
        return r.bottom <= window.innerHeight && r.top >= 0;
      })(),
      continueTop: (() => {
        const next = [...document.querySelectorAll("button")].find((b) => b.querySelector("svg.lucide-arrow-right"));
        return next ? Math.round(next.getBoundingClientRect().top + window.scrollY) : null;
      })(),
    };
  });
}

function print(locale, step, m) {
  const verdict = m.document <= TARGET ? "under" : "over";
  console.log(`\n${locale}, step ${step}: document ${m.document}px (${verdict} the ${TARGET}px target), step section ${m.section}px, Continue at ${m.continueTop ?? "?"}px, on screen before scrolling: ${m.continueOnScreen ? "yes" : "no"}`);
  for (const b of m.blocks) console.log(`  ${String(b.height).padStart(5)}px  ${b.what}`);
}

const next = (page) => page.locator("button:has(svg.lucide-arrow-right):not([disabled])").last().click();

for (const locale of ["en", "ru"]) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${B}/start${locale === "en" ? "" : `?lang=${locale}`}`, { waitUntil: "networkidle" });
  if (!page.url().includes("/start")) {
    console.log(`${locale}: /start redirected to ${page.url()}, so this learner has finished first run or holds a card. Measure against an empty deck.`);
    reached = false;
    await ctx.close();
    break;
  }
  // Step 1: a name.
  await page.locator("input[type=text], input:not([type])").first().fill("Test");
  await next(page);
  // Step 2: an estimated level, the third chip, which is what test-assess picks.
  await page.locator("[role=radio]").nth(2).click();
  await next(page);
  await page.waitForTimeout(300);
  // Step 3: two reasons, as somebody with a job and a residence permit would pick.
  const reasons = page.locator("[aria-pressed]");
  await reasons.nth(0).click();
  await reasons.nth(1).click();
  await page.waitForTimeout(300);
  print(locale, 3, await blocks(page));
  await next(page);
  await page.waitForTimeout(800);
  print(locale, 4, await blocks(page));
  await ctx.close();
}

await browser.close();
if (!reached) process.exit(1);
