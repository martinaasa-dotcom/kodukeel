import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * TEXT THAT DOES NOT FIT WRAPS; IT IS NEVER CUT OFF, AND NEVER SQUEEZED UNTIL
 * ITS WORDS BREAK.
 *
 * A learner's partner opened a dashboard on a narrower screen and read words
 * split letter by letter down a box a few characters wide, and task titles
 * ending in "...". Both are the same fault: a layout that decided its own
 * shape first and made the words fit it. A task nobody can read the end of is
 * a task nobody can act on, and a word broken mid-letter is not Estonian.
 *
 * Two rules, each asserted rather than hoped for:
 *
 *   - `truncate` is refused in anything a learner reads, except where the
 *     text is fixed chrome on one line by design and says the same thing in
 *     full elsewhere on the screen (`CUT_OFF_ALLOWED`, each with its reason).
 *   - a grid of boxes may not be told how many columns to have from the
 *     number of things in it (`repeat(${n}, ...)`): it wraps with `auto-fit`
 *     and a minimum a word can live in, except where the grid is itself the
 *     content, a crossword or a calendar heatmap, whose cells hold one letter
 *     or none.
 *
 * `scripts/test-containment.mjs` is the measurement behind both, and it
 * measures at 1024 as well as 360, 768 and 1280, since a laptop with the rail
 * showing is where a card built for a wide screen first gets squeezed.
 */
const CUT_OFF_ALLOWED: Readonly<Record<string, string>> = {
  // The scene's name and place in the sticky bar over a conversation: one line
  // by design, and the briefing the learner has just read says both in full.
  "components/scene/SceneStage.tsx": "the sticky bar's title and place",
  // A command's hint beside its name, shrinking before the name does; the
  // command itself is what is pressed and is never cut.
  "components/CommandPalette.tsx": "a command's hint",
};

const COUNTED_GRIDS: ReadonlySet<string> = new Set([
  // One letter per cell, and the grid's shape is the puzzle.
  "app/(app)/crossword/CrosswordSession.tsx",
  // One day per cell and no text inside it.
  "components/Heatmap.tsx",
]);

export default function textWrapsRatherThanVanishes({ check, APP, COMPONENTS, code }: InvariantKit) {
  check("no text a learner reads is cut off with an ellipsis", () => {
    const offenders = [...APP, ...COMPONENTS].filter((f) =>
      f.endsWith(".tsx") && !CUT_OFF_ALLOWED[f] && /className=["`{][^"`}]*\btruncate\b/.test(code(f)));
    assert.deepEqual(offenders, [], "text is cut off where it should wrap; drop `truncate` or argue for it in CUT_OFF_ALLOWED");
    for (const file of Object.keys(CUT_OFF_ALLOWED)) {
      assert.match(code(file), /\btruncate\b/, `${file} no longer truncates anything; take it off CUT_OFF_ALLOWED`);
    }
  });

  check("no grid takes its column count from how many things are in it", () => {
    const offenders = [...APP, ...COMPONENTS].filter((f) =>
      f.endsWith(".tsx") && !COUNTED_GRIDS.has(f) && /gridTemplateColumns:\s*`repeat\(\$\{/.test(code(f)));
    assert.deepEqual(offenders, [], "a grid counts its columns from its items; let it wrap with auto-fit and a minimum a word fits in");
    for (const file of COUNTED_GRIDS) {
      assert.match(code(file), /gridTemplateColumns:\s*`repeat\(\$\{/, `${file} no longer counts its columns; take it off COUNTED_GRIDS`);
    }
  });
}
