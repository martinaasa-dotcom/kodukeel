import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { launchChromium } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";

/**
 * EVERY ROUTE, AS AN ESTONIAN READER A LONG WAY FROM THE SERVER.
 *
 * A client component renders on the server first and then again in the
 * browser, and the two have to agree. Anything that formats with the
 * runtime's own locale or zone during render cannot: the server is English and
 * UTC, and the reader is not. Today formatted a due date that way and a browser
 * set to Estonian wrote "24. sept" over the server's "Sep 24", so React 19
 * threw error #418 and rebuilt the page on the client, for exactly the readers
 * this app is for.
 *
 * Every other browser suite ran in the one setting where that cannot happen,
 * English and UTC, which is why none of them saw it. This one opens every route
 * with the demo fixture loaded, so the rows that print dates exist, from a
 * browser set to Estonian in `Pacific/Chatham`, twelve and three quarter hours
 * from UTC, where a date and an hour disagree with the server's most often.
 * A hydration failure surfaces as a page error in a production build, so a page
 * error is what fails a route.
 */

const B = baseUrl();
/* Floor: one per route, measured on the 74 routes the app has. It moves when a
   route is added, which is the point. */
const { check, done } = suite("Hydration as an Estonian reader", { floor: 74 });

/** Every `page.tsx` under `app/`, as the URL that reaches it. */
function routes(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "api") continue;
      out.push(...routes(full, prefix + (entry.startsWith("(") ? "" : `/${entry}`)));
    } else if (entry === "page.tsx") {
      out.push(prefix || "/");
    }
  }
  return out;
}

/* A value each dynamic segment can be answered for, as `test-first-day.mjs`
   fills them, so the walk meets the screen rather than the not-found. */
const FILL = {
  "[unitId]": "tervitused", "[situationId]": "tervitused", "[level]": "A1", "[id]": "partitive",
  "[caseKey]": "partitive", "[case]": "partitive",
  "[code]": "AAAAAA", "[groupId]": "none",
};

const all = [...new Set(routes(new URL("../app", import.meta.url).pathname))]
  .map((r) => r.replace(/\[[^\]]+\]/g, (m) => FILL[m] ?? "x"))
  .sort();

const browser = await launchChromium();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "et-EE",
  timezoneId: "Pacific/Chatham",
  // A route walk has no business installing the worker; see test-first-day.mjs.
  serviceWorkers: "block",
});
const page = await context.newPage();

/** Wait for `main` and for hydration to have had its turn, without demanding silence. */
async function settle(budgetMs) {
  await page.waitForSelector("main", { timeout: budgetMs }).catch(() => {});
  await page.waitForLoadState("load", { timeout: budgetMs }).catch(() => {});
  // Hydration runs after the scripts have loaded; this is the moment an error
  // from it has been thrown if it is going to be.
  await page.waitForTimeout(600);
}

for (const route of all) {
  const errors = [];
  const onError = (e) => errors.push(String(e).split("\n")[0].slice(0, 160));
  page.on("pageerror", onError);
  let status = 0;
  try {
    const res = await page.goto(`${B}${route}`, { waitUntil: "domcontentloaded", timeout: 40000 });
    status = res?.status() ?? 0;
    await settle(40000);
  } catch (error) {
    errors.push(`did not load: ${String(error).split("\n")[0].slice(0, 100)}`);
  }
  page.off("pageerror", onError);
  const hydration = errors.find((e) => /#41[89]|#42[35]|[Hh]ydrat/.test(e));
  check(
    `${route} renders as an Estonian reader without a page error`,
    errors.length === 0,
    hydration
      ? `${hydration}: something in a client component formats with the runtime's locale or zone during render; hand it to components/LocalDate.tsx`
      : errors[0] ?? (status >= 500 ? `HTTP ${status}` : ""),
  );
}

await browser.close();
done();
