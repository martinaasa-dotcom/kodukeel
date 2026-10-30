import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";
import { enclosingElement } from "../lib/jsxTags";

/**
 * A VERDICT WORD IS WRITTEN IN `VERDICT_INK`, NEVER IN A RAW INK.
 *
 * The write step's frame said "Right" in a hand-typed `--good-ink` at the
 * caption size, beside a "Nearly" in plain gray: one verdict in a hue the
 * vocabulary did not choose, the other in none. `VERDICT_INK` in
 * `lib/ux/verdict.ts` is the one table of which ink says which verdict, so a
 * line that prints "Right", "Nearly" or "Not quite" may not name a verdict
 * hue's ink itself.
 */
const WORD = /\bt\("(?:Right|Nearly|Not quite)"\)/g;
const RAW = /var\(--(?:good|hard|again|sky|blush|butter)-ink\)/;

/**
 * The element a word is drawn in, from its opening tag to the word: the one
 * that actually encloses it, walking back over an icon drawn before the word
 * (`<span style=…><Check … aria-hidden />{t("Right")}</span>`), which is the
 * shape this was written for and the nearest tag alone never saw.
 */
const enclosing = enclosingElement;

export default function aVerdictWordTakesVerdictInk({ check, ALL, code }: InvariantKit) {
  check("a verdict word is written in VERDICT_INK, never in a raw ink", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    let words = 0;
    const offenders: string[] = [];
    for (const f of files) {
      const source = code(f);
      for (const m of source.matchAll(WORD)) {
        words += 1;
        const element = enclosing(source, m.index!);
        if (RAW.test(element)) offenders.push(`${f}: ${element.replace(/\s+/g, " ").trim().slice(0, 140)}`);
      }
    }
    assert.ok(words >= 3, `only ${words} verdict words found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\nwrite the verdict in VERDICT_INK[verdict]`);
  });
}
