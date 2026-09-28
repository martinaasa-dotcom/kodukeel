/**
 * A MOCKUP IS THE APP ITSELF, IN BOTH THEMES.
 *
 * Hand-written HTML shown as "what it would look like" arrives in the author's
 * fonts and the author's hexes, not the app's: a mockup of the finished-evening
 * card was drawn in Bricolage Grotesque and Figtree, two faces this app has
 * never loaded, and was then asked to be trusted as the real thing. So a visual
 * proposal is made on a branch and photographed here, against the running app,
 * which cannot draw a face or a colour the stylesheet does not hold.
 *
 *   node scripts/shoot.mjs /course / --out shots --width 1280
 *
 * Every route is taken in the light theme and in the dark one, the way the
 * toggle stores the choice, so the dark palette is the one a learner who chose
 * it actually gets. It writes files and asserts nothing, so it is not a suite.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { launchChromium } from "./lib/browser.mjs";
import { baseUrl } from "./lib/checks.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
};
const out = flag("out", "shots");
const width = Number(flag("width", "1280"));
const height = Number(flag("height", "900"));
const routes = args.length > 0 ? args : ["/"];

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
      await page.screenshot({ path: join(out, name) });
      console.log(join(out, name));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
