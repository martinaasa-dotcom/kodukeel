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
  "[unitId]": "nominalisatsioon", "[situationId]": "tervitused", "[level]": "A1", "[id]": "partitive",
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

/** Every page as the URL that reaches it, dynamic segments filled, sorted. */
export function appRoutes() {
  return [...new Set(walk(new URL("../../app", import.meta.url).pathname))]
    .map((r) => r.replace(/\[[^\]]+\]/g, (m) => FILL[m] ?? "x"))
    .sort();
}
