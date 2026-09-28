import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A WORD IS NEVER DRAWN A FEW LETTERS A LINE, AND A BUTTON LEAST OF ALL.
 *
 * `overflow-wrap: anywhere` on the body is what keeps a long word inside its
 * box, and it does that by letting any word break once the box is narrow
 * enough. A button squeezed by its neighbor in a flex row is sized to its
 * min-content, which under that rule is one letter, so the Learn page drew
 * "Learn 5 phrases" as "Lea / rn / 5 / phr / ase / s" from 1024 up. Nothing was
 * cut and nothing bled. It had been reported before, on Settings and on
 * Progress, and fixed one screen at a time each time.
 *
 * So there are two halves and these hold both. The rule: a `Button` label is
 * one line (`whitespace-nowrap` on the component's base, and the `btn` hook
 * the sweep reads), and no call site or stylesheet may take that back or
 * reach for `break-all`, which breaks every word by design. The measurement:
 * `scripts/test-containment.mjs` asks the browser, word by word as a Range,
 * whether any ordinary word on any page is drawn across two lines, and puts a
 * phrase in the deck first so the button that started this is on the page it
 * measures. A check nobody can see the button in is the check that missed it.
 */
export default function wordsAreNeverBroken({ check, code, read, APP, COMPONENTS }: InvariantKit) {
  check("a Button's label is one line, and the sweep can find it", () => {
    const button = code("components/Button.tsx");
    const base = button.match(/const base\s*=\s*([\s\S]*?);/)?.[1] ?? "";
    assert.match(base, /\bbtn\b/, "components/Button.tsx lost the `btn` hook the containment sweep reads");
    assert.match(base, /\bwhitespace-nowrap\b/, "components/Button.tsx lets a label wrap, so a squeezed row breaks it into letters");
  });

  check("nothing takes a button's one line back or breaks every word", () => {
    const offenders: string[] = [];
    for (const file of [...APP, ...COMPONENTS]) {
      if (!/\.(tsx|ts)$/.test(file)) continue;
      const src = code(file);
      if (/\bbreak-all\b|word-break\s*:\s*break-all/.test(src)) offenders.push(`${file}: break-all`);
      for (const m of src.matchAll(/<(?:Button|ButtonLink)\b[^>]*className=["'{`][^>]*>/g)) {
        if (/\bwhitespace-(?:normal|pre-wrap|pre-line|break-spaces)\b/.test(m[0])) {
          offenders.push(`${file}: a Button whose label is allowed to wrap`);
        }
      }
    }
    assert.match(read("app/globals.css"), /overflow-wrap:\s*anywhere/, "the body's containment default moved; re-read this rule");
    assert.doesNotMatch(read("app/globals.css"), /word-break\s*:\s*break-all/, "app/globals.css breaks every word");
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });

  check("the containment sweep measures whole words, with a phrase on the Learn page", () => {
    const sweep = code("scripts/test-containment.mjs");
    assert.match(sweep, /function wholeWords\(\)/, "the sweep stopped measuring words as Ranges");
    assert.match(sweep, /page\.evaluate\(wholeWords\)/, "the sweep defines the word check and never runs it");
    assert.match(sweep, /getClientRects\(\)/, "the word check stopped asking the browser how many lines a word is on");
    assert.match(sweep, /querySelectorAll\("\.btn"\)/, "the sweep stopped asking whether a label is wider than its button");
    assert.match(sweep, /kind=phrase/, "the sweep no longer puts a phrase on the Learn page, so its button goes unmeasured again");
  });
}
