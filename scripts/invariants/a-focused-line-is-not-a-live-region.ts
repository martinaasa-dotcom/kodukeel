import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LINE THE CARET IS MOVED TO IS NOT ALSO A LIVE REGION.
 *
 * Moving focus to a line (`tabIndex={-1}`, then `.focus()`) is how a screen
 * reader is told what replaced the button just pressed, and it reads the line.
 * A live region reads its words when they change. The two together read the
 * same sentence twice, which is what the check's marking line, the lesson's
 * findings and the restore's "done" each did. One or the other: a line that
 * takes the caret carries no `role="status"`, `role="alert"` or `aria-live`.
 *
 * Read off each opening tag whole, braces balanced, so an `onClick` with a
 * `>` in it does not end the tag early and hide the attribute after it.
 */
function openingTags(source: string): string[] {
  const out: string[] = [];
  const re = /<[a-zA-Z][\w.]*\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 0;
    let quote: string | null = null;
    let i = m.index + m[0].length;
    for (; i < source.length; i++) {
      const c = source[i]!;
      if (quote) { if (c === quote) quote = null; continue; }
      if (depth === 0 && (c === '"' || c === "'")) { quote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push(source.slice(m.index, i + 1));
  }
  return out;
}

const FOCUSED = /\btabIndex=\{-1\}/;
const LIVE = /\brole="(?:status|alert)"|\baria-live=/;

export default function aFocusedLineIsNotALiveRegion({ check, ALL, code }: InvariantKit) {
  check("a line the caret moves to is not also a live region", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"));
    let focused = 0;
    const offenders: string[] = [];
    for (const f of files) {
      for (const tag of openingTags(code(f))) {
        if (!FOCUSED.test(tag)) continue;
        focused += 1;
        if (LIVE.test(tag)) offenders.push(`${f}: ${tag.slice(0, 120)}`);
      }
    }
    assert.ok(focused >= 30, `only ${focused} focusable lines found, so the tag reader stopped matching`);
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\ndrop the live region: the caret moving there is what reads it`);
  });
}
