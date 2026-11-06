import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * GRAMMAR COPY NAMES THE PART OF SPEECH, NEVER "THE THING".
 *
 * A learner read "After ei, the thing is always in the osastav" and could not
 * tell which word the thing was: the verb, the subject, the word after the
 * verb? The operator's rule, site wide: a grammar explanation says "the noun"
 * or "the pronoun", and where the line already shows the word, names it in
 * braces, "the noun ({võtit} here)". Never "the word" either, which is as vague.
 * `lib/estonian/grammar.ts` holds no Estonian, so there it is "the noun" alone.
 *
 * What is read is every string inside a lesson's grammar fields (`point`,
 * `notes`, `watchOut`, `why`, and the `how` block that holds them) and every
 * string in `grammar.ts`, off `code()` so a comment about the rule is not a
 * fault. Ordinary English that happens to say "the thing" and is not about a
 * word's role is exempt below, each with its reason, and every exemption has
 * to still match, or it is a parking space.
 */
const EXEMPT: Record<string, string> = {
  "Write the thing and what is said about it":
    "a note-taking instruction: the thing is whatever the talk is about, not a word in a sentence",
  "Say what the thing is or does":
    "advice for a missing word: describe the object in the world, which is the strategy being taught",
};

const LITERAL = /"((?:[^"\\\n]|\\.)*)"/g;
const TELL = /\bthe things?\b/i;
const FIELD = /\b(point|notes|watchOut|why|how)\s*:\s*/g;

/** The text of one value after a grammar field: a string, an array of strings, or a `{...}` block. */
function valueAt(src: string, from: number): string {
  const open = src[from];
  if (open === '"') {
    const m = /^"((?:[^"\\\n]|\\.)*)"/.exec(src.slice(from));
    return m ? m[0] : "";
  }
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) return "";
  let depth = 0;
  let inString = false;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (inString) {
      if (c === "\\") i += 1;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  return "";
}

export default function grammarSaysTheNoun({ check, ALL, code }: InvariantKit) {
  check('grammar copy names the part of speech ("the noun ({x} here)"), never "the thing"', () => {
    const lessons = ALL.filter((f) => /^lib\/course\/lessons\/[^/]+\.ts$/.test(f) && !/\.(test|itest)\.ts$/.test(f));
    assert.ok(lessons.length > 40, `only ${lessons.length} lesson files found, so the haystack stopped matching`);

    const strings: { file: string; text: string }[] = [];
    for (const f of lessons) {
      const src = code(f);
      for (const m of src.matchAll(FIELD)) {
        const value = valueAt(src, m.index + m[0].length);
        for (const s of value.matchAll(LITERAL)) strings.push({ file: f, text: s[1] ?? "" });
      }
    }
    const grammar = "lib/estonian/grammar.ts";
    let grammarStrings = 0;
    for (const s of code(grammar).matchAll(LITERAL)) {
      strings.push({ file: grammar, text: s[1] ?? "" });
      grammarStrings += 1;
    }
    assert.ok(strings.length - grammarStrings > 3000, `only ${strings.length - grammarStrings} lesson grammar strings read, so the field matcher stopped matching`);
    assert.ok(grammarStrings > 300, `only ${grammarStrings} strings read from grammar.ts`);

    const used = new Set<string>();
    const offenders: string[] = [];
    for (const { file, text } of strings) {
      if (!TELL.test(text)) continue;
      const exemption = Object.keys(EXEMPT).find((k) => text.includes(k));
      if (exemption) {
        used.add(exemption);
        continue;
      }
      offenders.push(`${file}: ${text.slice(0, 80)}`);
    }
    assert.deepEqual([...new Set(offenders)], [], `say "the noun" or "the pronoun", naming it ({x} here) where the line shows it: ${[...new Set(offenders)].join("; ")}`);
    for (const k of Object.keys(EXEMPT)) {
      assert.ok(used.has(k), `"${k}" no longer appears in a grammar field, so drop it from EXEMPT`);
    }
  });
}
