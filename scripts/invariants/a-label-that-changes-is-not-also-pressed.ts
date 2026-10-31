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

  /*
    THE LIST ABOVE IS TYPED, so a button not on it went past: the microphone
    swapped its label to "Stop listening" and said pressed as well, on the most
    pressed control of every Say it card. This one reads the shape instead: an
    `aria-label` that is a choice between two lines, on a tag that also carries
    `aria-pressed`.
  */
  check("no button pairs aria-pressed with an aria-label that swaps", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    let swapping = 0;
    const offenders: string[] = [];
    for (const f of files) {
      for (const m of code(f).matchAll(/<(?:button|Button)\b[^>]*?>/gs)) {
        const tag = m[0];
        if (!/aria-label=\{[^}]*\?[^}]*:[^}]*\}/.test(tag)) continue;
        swapping += 1;
        if (/\baria-pressed=/.test(tag)) offenders.push(`${f}: ${tag.slice(0, 140).replace(/\s+/g, " ")}`);
      }
    }
    assert.ok(swapping >= 4, `only ${swapping} buttons with a swapping aria-label found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\ndrop aria-pressed: the label already says the state`);
  });
}
