import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A BUTTON WHOSE LABEL SAYS WHAT THE PRESS WILL DO CARRIES NO `aria-pressed`.
 *
 * "Show the English" turned into "Hide the English" on a press, and also
 * said `aria-pressed`, so a screen reader heard "Hide the English, pressed":
 * two answers to whether the English is on. There are two honest shapes, a
 * fixed label with `aria-pressed`, or a label that changes and nothing else,
 * and the lesson screens take the second (`EnglishToggle`). Read off each
 * button tag whole, from its opening to its closing tag, so a label several
 * lines down is still the same button's.
 */
const SWAPS = [
  ["Hide the English", "Show the English"],
  ["Stop", "Play the conversation"],
  ["Stop", "Hear the story"],
] as const;

export default function aLabelThatChangesIsNotAlsoPressed({ check, ALL, code }: InvariantKit) {
  check("a button whose label swaps on a press carries no aria-pressed", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    let seen = 0;
    const offenders: string[] = [];
    for (const f of files) {
      const source = code(f);
      for (const m of source.matchAll(/<(Button|button)\b[\s\S]*?<\/\1>/g)) {
        const tag = m[0];
        if (!SWAPS.some(([a, b]) => tag.includes(`t("${a}")`) && tag.includes(`t("${b}")`))) continue;
        seen += 1;
        if (/\baria-pressed=/.test(tag)) offenders.push(`${f}: ${tag.slice(0, 120).replace(/\s+/g, " ")}`);
      }
    }
    assert.ok(seen >= 3, `only ${seen} swapping buttons found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\ndrop aria-pressed: the label already says the state`);
  });
}
