import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN OPTION BUTTON DRAWS ITS OWN BORDER.
 *
 * Reported off the lesson quiz: four multiple-choice answers rendered as bare
 * text. `.choice-btn` set a border *colour* and nothing else, and the width
 * came from a Tailwind `border` class each caller had to remember; the quiz
 * did not, and Tailwind's preflight leaves a button with no border at all.
 * The class now carries width and style itself, so a caller cannot forget it.
 */
export default function anOptionButtonDrawsItsOwnBorder({ check, code }: InvariantKit) {
  check("`.choice-btn` carries its own border width and style", () => {
    const css = code("app/globals.css");
    const rule = css.match(/\n\s*\.choice-btn \{([^}]*)\}/);
    assert.ok(rule, "the base `.choice-btn` rule is gone");
    assert.match(rule[1] ?? "", /border-width:\s*1px/, "`.choice-btn` stopped setting a border width");
    assert.match(rule[1] ?? "", /border-style:\s*solid/, "`.choice-btn` stopped setting a border style");
  });

  check("the lesson quiz's options still ask for a border and a radius", () => {
    const quiz = code("app/(app)/course/lessons/[id]/Quiz.tsx");
    assert.match(quiz, /choice-btn rounded-\[var\(--r-lg\)\] border /, "the quiz options lost their border class");
  });
}
