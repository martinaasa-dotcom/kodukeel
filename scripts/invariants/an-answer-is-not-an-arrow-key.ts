import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN ARROW KEY MOVES THE FOCUS ON A QUESTION, NEVER THE ANSWER.
 *
 * A radio group selects as the arrows move, which is right for a setting and
 * wrong for a question that is marked the moment an option is pressed: a
 * learner reading the options with the keyboard answered the first one they
 * stepped onto. `ChoiceGroup`'s `answer` makes the arrows move focus alone, and
 * a group whose options are marked right or wrong (`optionState`) is a
 * question, so it carries it. Read off the group's own opening tag, which may
 * run over several lines.
 */
export default function anAnswerIsNotAnArrowKey({ check, code, APP, COMPONENTS }: InvariantKit) {
  check("a ChoiceGroup whose options are marked is told it holds an answer", () => {
    let marked = 0;
    const missing: string[] = [];
    for (const file of [...APP, ...COMPONENTS]) {
      if (!file.endsWith(".tsx")) continue;
      const src = code(file);
      if (!src.includes("<ChoiceGroup")) continue;
      const opens = [...src.matchAll(/<ChoiceGroup\b/g)].map((m) => m.index!);
      opens.forEach((at, n) => {
        const end = src.indexOf("</ChoiceGroup>", at);
        if (end < 0) return;
        const body = src.slice(at, end);
        if (!/optionState\(/.test(body)) return;
        marked += 1;
        // The opening tag ends at the first `>` outside braces.
        let depth = 0;
        let close = at;
        for (let i = at; i < end; i++) {
          const c = src[i];
          if (c === "{") depth++;
          else if (c === "}") depth--;
          else if (c === ">" && depth === 0 && src[i - 1] !== "=") { close = i; break; }
        }
        // The prop, not the word: a label reading "Pick the answer" says nothing about the arrows.
        const tag = src.slice(at, close).replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
        if (!/\sanswer(?=[\s>=/]|$)(?!\s*=\s*\{\s*false)/.test(tag)) missing.push(`${file} (group ${n + 1})`);
      });
    }
    assert.ok(marked >= 4, `found only ${marked} marked option groups; the matcher has stopped matching`);
    assert.deepEqual(missing, [], `a marked question lets the arrow keys answer it: ${missing.join(", ")}`);
  });
}
