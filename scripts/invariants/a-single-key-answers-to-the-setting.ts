import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SINGLE CHARACTER KEY ACTS ONLY WHERE THE LEARNER LETS IT (WCAG 2.2, 2.1.4).
 *
 * Every round answers bare keys, and the accessibility statement admitted that
 * none of them could be turned off. They can now, through one setting the
 * shell publishes (`components/SingleKeys.tsx`, `lib/ux/shortcuts.ts`), and the
 * fault this guards against is the next round written without asking it: a
 * handler that compares a key with one character and never calls
 * `mayActOnKey` acts on that key whatever the learner chose, and looks exactly
 * like a handler that does ask.
 *
 * The haystack is the filesystem, so a round added later is found by being
 * written. What makes a handler a single-key one is the shape of its test: a
 * comparison of `.key` with a one-character literal other than a space, a
 * digit read off `Number(e.key)`, a test of `.key.length === 1`, or a letter
 * folded off `.key`. A comparison on the same line as a held Ctrl or Cmd is a
 * modifier shortcut and not one of these.
 */
const EXEMPT: Record<string, string> = {
  "components/round/LookBack.tsx": "swallows every character so the round behind the panel does nothing; it never acts on one",
};

const SINGLE_KEY =
  /\.key(?:\.toLowerCase\(\))? === "[^ "]"|Number\((?:e|event)\.key\)|\.key\.length === 1|\.key\.toLocaleLowerCase\(/;

export default function aSingleKeyAnswersToTheSetting({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("every handler that acts on a single character key asks whether single keys are on", () => {
    const found: string[] = [];
    const silent: string[] = [];
    for (const file of [...APP, ...COMPONENTS].filter((f) => f.endsWith(".tsx"))) {
      const lines = code(file).split("\n").filter((l) => SINGLE_KEY.test(l) && !/metaKey|ctrlKey/.test(l));
      if (lines.length === 0) continue;
      found.push(file);
      if (file in EXEMPT) continue;
      if (!/mayActOnKey\(/.test(code(file))) silent.push(file);
    }
    assert.ok(found.length >= 20, `only ${found.length} files with single-key handlers found, so this stopped finding them`);
    assert.deepEqual(silent, [], `these act on a character key without asking mayActOnKey: ${silent.join(", ")}`);
    for (const file of Object.keys(EXEMPT)) {
      assert.ok(found.includes(file), `${file} is exempt and no longer handles a character key; take it off the list`);
    }
  });

  check("the setting is published once by the shell and read by the shortcut sheet", () => {
    const layout = code("app/(app)/layout.tsx");
    assert.match(layout, /<SingleKeysProvider on=\{singleKeysFrom\(settings\[SETTING_KEYS\.singleKeys\]\) === "on"\}>/, "the shell stopped publishing the setting");
    const sheet = code("components/Shortcuts.tsx");
    assert.match(sheet, /mayActOnKey\(e, singleKeys\)/, "the shortcut sheet's own ? stopped asking the setting");
    assert.match(sheet, /<SingleKeysPanel /, "the shortcut sheet stopped offering the setting");
    assert.match(code("app/(app)/settings/page.tsx"), /<SingleKeysPanel /, "Settings stopped offering the setting");
  });
}
