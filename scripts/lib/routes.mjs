import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/*
  EVERY ROUTE THE APP HAS, READ OFF THE FILESYSTEM.

  `test-first-day.mjs` walked every `page.tsx` under `app/` and asked whether
  each answered with one `main`, one `h1` and nothing thrown, and
  `test-browsers.mjs` asks the same question in WebKit and Firefox. One walk for
  both, because two copies of which routes exist and what fills a dynamic
  segment are two answers that drift apart a route at a time.

  A dynamic segment is filled with a value the app can answer for, so the walk
  meets the screen rather than the not-found. `[code]` and `[groupId]` have none
  that exists on a fresh install, and the screen that says so is the one a
  learner would reach by mistyping, which is worth rendering too.
*/
export const FILL = {
  "[situationId]": "tervitused", "[level]": "A1", "[id]": "partitive",
  "[caseKey]": "partitive", "[case]": "partitive",
  "[code]": "AAAAAA", "[groupId]": "none",
};

function walk(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "api") continue;
      out.push(...walk(full, prefix + (entry.startsWith("(") ? "" : `/${entry}`)));
    } else if (entry === "page.tsx") {
      out.push(prefix || "/");
    }
  }
  return out;
}

/*
  A UNIT'S PAGES RENDER NOTHING NOW. Every level is the lessons since C1 moved
  (docs/43-lessons.md §16), so `/learn/[unitId]`, its lesson and its worksheet
  each redirect to `/course/lessons`, and a walk that opened them would measure
  the list of lessons three more times. They are left out here, and
  `test-lessons.mjs` asserts the redirect (`UNIT_ROUTES`).
*/
export const UNIT_ROUTES = ["/learn/nominalisatsioon", "/learn/nominalisatsioon/lesson", "/learn/nominalisatsioon/worksheet"];

/** Every page as the URL that reaches it, dynamic segments filled, sorted, a unit's pages left out. */
export function appRoutes() {
  return [...new Set(walk(new URL("../../app", import.meta.url).pathname))]
    .filter((r) => !r.includes("[unitId]"))
    .map((r) => r.replace(/\[[^\]]+\]/g, (m) => FILL[m] ?? "x"))
    .sort();
}
