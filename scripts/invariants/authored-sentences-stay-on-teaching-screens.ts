import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SENTENCE WRITTEN FOR A BEGINNER IS SHOWN WHERE A WORD IS INTRODUCED AND
 * NOWHERE ELSE.
 *
 * `lib/dict/authored.ts` is ADR-005 amendment 4, and what keeps the amendment
 * narrow is where its sentences may go. The mock exam, the level check, the
 * checkpoint, the scenes, the deck's own cards and the sentences one word lends
 * another each say on their own screen, or in their own header, that every
 * Estonian sentence in them was recorded by a lexicographer, and a written one
 * reaching any of them would make that false in the place a learner is being
 * measured. So the readers are a closed list, each a screen that introduces a
 * word, and nothing that marks, measures or builds a card may import the module
 * at all.
 */
const READERS = [
  // The Learn ladder's meeting and gap rungs.
  "lib/progress/learn.ts",
  // The first meeting on the review card.
  "app/(app)/review/cards.ts",
  // The unit lesson's meeting step.
  "app/(app)/learn/[unitId]/lesson/page.tsx",
] as const;

/** Directories whose every file is a measurement, a card builder or a scene. */
const NEVER = ["lib/exam/", "lib/assessment/", "lib/scenes/", "lib/srs/", "lib/games/", "lib/questions/"];

export default function authoredSentencesStayOnTeachingScreens({ check, ALL, code }: InvariantKit) {
  check("a written sentence reaches only the screens that introduce a word", () => {
    const importers = ALL.filter((f) =>
      !f.startsWith("lib/dict/authored") && !f.endsWith(".test.ts") && !f.startsWith("scripts/")
      && /from\s+["']@\/lib\/dict\/authored["']/.test(code(f)));
    assert.deepEqual(
      [...importers].sort(), [...READERS].sort(),
      "a new reader of lib/dict/authored.ts; decide whether it introduces a word before adding it to READERS",
    );
    for (const file of ALL) {
      if (!NEVER.some((dir) => file.startsWith(dir))) continue;
      assert.doesNotMatch(code(file), /lib\/dict\/authored/, `${file} marks, measures or builds a card and may not read a written sentence`);
    }
    assert.match(code("lib/dict/borrow.ts"), /source === "AUTHORED"/, "borrow.ts no longer refuses a written sentence");
  });

  check("an A1 word is shown only a written sentence, and the flag has to be decided", () => {
    const intro = code("components/WordIntro.tsx");
    assert.match(intro, /cefr !== "A1" \|\| sentence\.authored/, "WordIntro no longer holds A1 to written sentences");
    assert.match(intro, /authored: boolean \} \| null;/, "WordIntro's sentence no longer requires the authored flag");
  });
}
