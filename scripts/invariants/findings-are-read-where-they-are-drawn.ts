import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * WHAT THE DICTIONARY FOUND IN A SENTENCE IS READ OUT, AND ONLY ONCE.
 *
 * `SentenceFindings` holds no live region of its own, since a region that
 * arrives holding its words is often not read. Every call says how it reaches
 * a screen reader, and this holds each call to what it says:
 *
 * - `region`: drawn inside an element carrying `role="status"` or `aria-live`
 *   that encloses it in the markup, found by walking the tags rather than by
 *   looking a few hundred characters back, which a sibling region satisfied.
 * - `summary`: the file moves the caret to a summary line (`tabIndex={-1}`
 *   and a `.focus()`), and that line is not a live region as well, which
 *   would read it twice.
 *
 * Tags are read whole, braces balanced, so a `=>` inside a prop does not end
 * one early, and every `<SentenceFindings` tag is counted, so a call that
 * stopped matching the pattern cannot pass by not being seen.
 */
interface Tag { readonly name: string; readonly text: string; readonly at: number; readonly closing: boolean; readonly selfClosing: boolean }

function tags(source: string): Tag[] {
  const out: Tag[] = [];
  const re = /<(\/?)([A-Za-z][\w.]*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 0;
    let quote: string | null = null;
    let i = m.index + m[0].length;
    for (; i < source.length; i++) {
      const c = source[i]!;
      if (quote) { if (c === quote) quote = null; continue; }
      if (depth === 0 && (c === '"' || c === "'")) { quote = c; continue; }
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0) break;
    }
    const text = source.slice(m.index, i + 1);
    out.push({ name: m[2]!, text, at: m.index, closing: m[1] === "/", selfClosing: text.endsWith("/>") });
    re.lastIndex = i + 1;
  }
  return out;
}

/** The opening tags still open at `index`. */
function ancestors(all: readonly Tag[], index: number): Tag[] {
  const stack: Tag[] = [];
  for (const tag of all) {
    if (tag.at >= index) break;
    if (tag.selfClosing) continue;
    if (tag.closing) {
      const open = stack.map((t) => t.name).lastIndexOf(tag.name);
      if (open >= 0) stack.length = open;
    } else stack.push(tag);
  }
  return stack;
}

const LIVE = /\brole="status"|\baria-live=/;

export default function findingsAreReadWhereTheyAreDrawn({ check, APP, COMPONENTS, code }: InvariantKit) {
  check("what the dictionary found is read where it is drawn, once", () => {
    const callers = [...APP, ...COMPONENTS].filter((f) => f !== "components/course/SentenceFindings.tsx" && /<SentenceFindings\b/.test(code(f)));
    assert.ok(callers.length >= 2, `only ${callers.length} files draw SentenceFindings, so the check stopped seeing them`);
    let calls = 0;
    let regions = 0;
    let summaries = 0;
    for (const file of callers) {
      const source = code(file);
      const all = tags(source);
      for (const tag of all.filter((t) => t.name === "SentenceFindings" && !t.closing)) {
        calls += 1;
        const how = tag.text.match(/\bannounced="(region|summary)"/)?.[1];
        assert.ok(how, `${file}: a SentenceFindings without announced="region" or "summary"`);
        if (how === "region") {
          regions += 1;
          assert.ok(ancestors(all, tag.at).some((a) => LIVE.test(a.text)), `${file}: SentenceFindings says a region reads it, and no element round it is a live region`);
        } else {
          summaries += 1;
          const focused = all.filter((t) => !t.closing && /\btabIndex=\{-1\}/.test(t.text) && /\bref=\{/.test(t.text));
          assert.ok(focused.length > 0 && /\.focus\(\)/.test(source), `${file}: SentenceFindings says a summary is read, and nothing takes the caret to one`);
          assert.ok(focused.every((t) => !LIVE.test(t.text)), `${file}: the summary the caret goes to is a live region too, so it is read twice`);
        }
      }
    }
    assert.ok(calls >= 2 && regions >= 1 && summaries >= 1, `${calls} calls, ${regions} through a region and ${summaries} through a summary: the check stopped seeing one kind`);
  });
}
