import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A WORD SET LARGE IS DRAWN THROUGH `FitText`, SO IT SHRINKS RATHER THAN BREAKS.
 *
 * The body inherits `overflow-wrap: anywhere`, which is right for a paragraph
 * and wrong at display size: the landing page's hero card drew `raamatusse`
 * as `raamatuss / e`, on the first thing a stranger sees. Every element that
 * carries a `lang` (it holds a word of Estonian, or a card side that can be
 * one) and a display size (`text-3xl` and up) is a word whose length the page
 * does not know when it is designed, so it goes through
 * `components/FitText.tsx`, which keeps the word whole and makes the type
 * smaller instead.
 *
 * Read off the opening tags, with `=>` allowed inside one so an `onChange` is
 * not taken for the tag's end. `scripts/test-containment.mjs` is the browser
 * half: it refuses a display-size word broken across lines on every route,
 * and hands every `FitText` a long compound to hold on one line.
 */
const TAG = /<([A-Za-z][\w.]*)\b((?:[^<>]|=>)*?)\/?>/g;
const DISPLAY = /\btext-(?:3|4|5|6|7|8|9)xl\b/;

export default function displayWordsFit({ check, ALL, code }: InvariantKit) {
  check("a word set at display size goes through FitText, which shrinks it rather than breaking it", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    assert.ok(files.length > 100, `only ${files.length} files scanned, so the haystack stopped matching`);
    let seen = 0;
    const offenders: string[] = [];
    for (const f of files) {
      for (const m of code(f).matchAll(TAG)) {
        const [, tag, attrs] = m;
        if (!/\blang=/.test(attrs!)) continue;
        if (tag === "FitText") { seen++; continue; }
        if (!DISPLAY.test(attrs!)) continue;
        offenders.push(`${f}: <${tag}> sets a display size on a word`);
      }
    }
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\ndraw it with FitText and set its size as --fit-max`);
    assert.ok(seen >= 15, `only ${seen} FitText words found, so the pattern stopped matching`);
  });

  check("FitText keeps a word whole and measures it, and the stylesheet agrees", () => {
    const fit = code("components/FitText.tsx");
    assert.match(fit, /data-fit/, "FitText lost the hook the containment suite finds it by");
    assert.match(fit, /ResizeObserver/, "FitText no longer refits when its box changes");
    const css = code("app/globals.css");
    assert.match(css, /\.fit-text\s*\{[^}]*overflow-wrap:\s*normal/, ".fit-text no longer keeps a word whole");
  });
}
