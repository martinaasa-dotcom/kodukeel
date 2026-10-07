import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CONTROL IN A CARD'S CORNER DOES NOT READ THE ANSWER OUT.
 *
 * The star, the put-aside button and the hint button each put the word in
 * their accessible label, and on the four rounds whose question can be the
 * word itself, that label was the answer: "Favorite sina" and "Get a hint
 * for sina" over a card asking for "you (one person)", before anything was
 * typed. The flash round went further and printed "sina: right 29 times"
 * under its own question, to everybody. Each of these asks `wordName`, which
 * names the word once it is on the screen and says "this word" until then.
 *
 * Anchored on the props rather than the import: a round that imports the
 * helper and then hands one control `word.lemma` anyway is the fault.
 */
const ROUNDS = [
  "app/(app)/review/ReviewSession.tsx",
  "app/(app)/review/flashcards/FlashSession.tsx",
  "app/(app)/learn/new/LearnSession.tsx",
];

export default function aCornerControlDoesNotNameTheAnswer({ check, code }: InvariantKit) {
  check("a control in a card's corner does not read the answer out before it is given", () => {
    let seen = 0;
    for (const file of ROUNDS) {
      const src = code(file);
      assert.match(src, /\bwordName\(/, `${file} no longer asks wordName what to call the word`);
      for (const m of src.matchAll(/<(StarWord|TooComplicated|HintLadder)\b([\s\S]*?)\/>/g)) {
        seen++;
        const label = (m[2] ?? "").match(/\blabel=\{([^}]*)\}/)?.[1] ?? "";
        assert.ok(
          /^\s*wordName\(/.test(label) || !/\.(lemma|front)\b/.test(label),
          `${file} hands ${m[1]} the word itself (label={${label}}), so on a card asking for it the label is the answer`,
        );
      }
    }
    assert.ok(seen >= 8, `only ${seen} corner controls found across the four rounds; the sweep is reading the wrong files`);
  });
}
