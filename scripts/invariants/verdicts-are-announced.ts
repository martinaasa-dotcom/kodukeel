import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A marked answer is said out loud, and the option somebody pressed is still
 * there to hold the focus.
 *
 * Two faults, found on the busiest screens in the app. A live region that is
 * mounted in the same render as its sentence, or remounted by a `key` that
 * changes on the reveal, is a new region: a screen reader either says nothing
 * or reads the whole card again, so a learner hears "Next question" and never
 * whether they were right. And an option that turned from a `<button>` into a
 * `<div>` once it was marked took the focus with it, which on a miss put the
 * caret on the page body.
 */

/** Every JSX opening tag in a file: its name, its attributes and where it starts. */
function openingTags(src: string) {
  const re = /<([A-Za-z][A-Za-z0-9.]*)\b((?:[^>{]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*)>/g;
  return [...src.matchAll(re)].map((m) => ({ tag: m[1]!, attrs: m[2]!, at: m.index! }));
}

const lineOf = (src: string, at: number) => src.slice(0, at).split("\n").length;

export default function verdictsAreAnnounced({ check, APP, COMPONENTS, code }: InvariantKit) {
  const haystack = [...APP, ...COMPONENTS].filter(
    (f) => f.endsWith(".tsx") && (f.startsWith("app/(app)/review/") || f.startsWith("components/assessment/")),
  );

  check("a live region on a marking screen is mounted before its sentence and never keyed", () => {
    let regions = 0;
    const offenders: string[] = [];
    for (const f of haystack) {
      const src = code(f);
      for (const { attrs, at } of openingTags(src)) {
        if (!/aria-live=|role=["']status["']/.test(attrs)) continue;
        regions++;
        // What stands in front of the tag, JSX comments emptied out.
        const before = src.slice(0, at).replace(/\{\s*\}/g, "").trimEnd();
        const conditional = /(&&|\?|:)\s*\(?$/.test(before);
        const keyed = /\bkey=/.test(attrs);
        if (!conditional && !keyed) continue;
        offenders.push(`${f}:${lineOf(src, at)} ${keyed ? "is keyed" : "is mounted with its sentence"}`);
      }
    }
    assert.ok(regions >= 20, `found only ${regions} live regions on marking screens, so this check stopped looking`);
    assert.deepEqual(offenders, [], `a live region here would not be read out:\n  ${offenders.join("\n  ")}`);
  });

  check("an option painted with a verdict is a button, so it keeps the focus it had", () => {
    let options = 0;
    const offenders: string[] = [];
    for (const f of [...APP, ...COMPONENTS].filter((x) => x.endsWith(".tsx"))) {
      const src = code(f);
      if (!/optionState\(/.test(src)) continue;
      const vars = [...src.matchAll(/const (\w+)\s*=[^;]*?optionState\(/g)].map((m) => m[1]!);
      for (const { tag, attrs, at } of openingTags(src)) {
        const cls = /className=\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/.exec(attrs)?.[1] ?? "";
        const painted = /optionState\(/.test(cls) || vars.some((v) => new RegExp(`\\b${v}\\b`).test(cls));
        if (!painted) continue;
        options++;
        if (tag !== "button") offenders.push(`${f}:${lineOf(src, at)} <${tag}>`);
      }
    }
    assert.ok(options >= 9, `found only ${options} marked options, so this check stopped looking`);
    assert.deepEqual(offenders, [], `a marked option here is not a button, so the focus falls to the page:\n  ${offenders.join("\n  ")}`);
  });
}
