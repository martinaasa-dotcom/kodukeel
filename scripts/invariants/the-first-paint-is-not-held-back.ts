import assert from "node:assert/strict";

import { SYNCED_LOOPS } from "../../lib/ux/loopSync";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * WHAT THE FIRST SCREEN WAITS FOR, AND WHAT IT NO LONGER WAITS FOR.
 *
 * PageSpeed on 14 October 2026 put the landing page at 64 on a phone, with a
 * largest contentful paint of seven seconds over a first paint of one. Each
 * cause was something added for a good reason that also ran before the
 * headline could be counted, so each is held here rather than remembered:
 *
 * - Next's polyfill module, for browsers older than any Next 16 supports, is
 *   aliased to nothing (`lib/framework/noPolyfills.ts`).
 * - The brand's idle loops animate SVG groups, which no browser composites,
 *   so each frame of each loop was a layout on the main thread. They wait for
 *   `data-awake` on <html> (lib/ux/loopSync.ts).
 * - A fitted word measured each of its other forms in a hidden span, which was
 *   one forced layout per form inside the hydration task. It measures on a
 *   canvas.
 * - The error and not-found screens are downloaded with every page, and each
 *   brought its own copy of the report button and its category table. They
 *   load it when drawn.
 * - `inlineCss` doubled the stylesheet into every document and was reverted;
 *   it may not come back without a measurement that says otherwise.
 *
 * The loading state the landing page no longer sits behind is held where the
 * rule about loading states is, in `scripts/test-invariants.ts`.
 */
export default function theFirstPaintIsNotHeldBack({ check, code, read }: InvariantKit) {
  check("Next's polyfill module is aliased to nothing, by both spellings", () => {
    const config = code("next.config.ts");
    for (const key of ['"next/dist/build/polyfills/polyfill-module"', '"../build/polyfills/polyfill-module"']) {
      assert.ok(
        config.includes(`${key}: "./lib/framework/noPolyfills.ts"`),
        `next.config.ts no longer aliases ${key} away, so every page ships polyfills no supported browser needs`,
      );
    }
    assert.doesNotMatch(code("lib/framework/noPolyfills.ts"), /\bexport\s+(?!\{\s*\})/, "noPolyfills.ts has grown code of its own");
    assert.doesNotMatch(config, /\binlineCss\s*:\s*true/, "inlineCss is back, which put the stylesheet into every document twice");
  });

  check("every idle loop waits for the page to settle", () => {
    const css = read("app/globals.css");
    let seen = 0;
    for (const name of SYNCED_LOOPS) {
      for (const m of css.matchAll(new RegExp(`^([^\\n{}]*)\\{[^}]*animation:\\s*${name}\\s`, "gm"))) {
        seen++;
        assert.match(m[1]!, /^:root\[data-awake\] /, `the idle loop ${name} starts before the page has settled: ${m[1]!.trim()}`);
      }
    }
    assert.ok(seen >= SYNCED_LOOPS.length, `found ${seen} idle loop rules for ${SYNCED_LOOPS.length} loops, so this check stopped reading them`);
    const script = code("lib/ux/loopSync.ts");
    assert.match(script, /setAttribute\('\$\{AWAKE_ATTR\}'/, "the inline script no longer sets the attribute the loops wait for");
    assert.match(script, /addEventListener\('load'/, "nothing wakes the loops for somebody who only reads");
  });

  check("a fitted word measures its other forms without laying the page out", () => {
    const fit = code("components/FitText.tsx");
    assert.doesNotMatch(fit, /getBoundingClientRect|appendChild/, "FitText measures in the page again, one forced layout per form");
    assert.match(fit, /measureText\(/, "FitText no longer measures on a canvas");
  });

  check("the error and not-found screens fetch the report button only when drawn", () => {
    for (const file of ["components/ScreenFailed.tsx", "components/NoPage.tsx"]) {
      const src = code(file);
      assert.match(src, /from "@\/components\/SuggestFixLater"/, `${file} imports the report button eagerly, so every page downloads it`);
    }
    assert.match(code("components/SuggestFixLater.tsx"), /dynamic\(\(\) => import\("\.\/SuggestFix"\)/, "SuggestFixLater no longer loads the button lazily");
  });
}
