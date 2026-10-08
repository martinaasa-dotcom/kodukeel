import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A WORD THE ROUND PLAYS AND NEVER WRITES IS NOT READ OUT BY ITS OWN BUTTON.
 *
 * `Speak` labels itself `Hear "<text>" in Estonian` where a caller says
 * nothing, which is right on a card that already shows the word and is the
 * answer itself on a round whose question is the word heard: the listening
 * round's big play button told a screen reader "Hear tere in Estonian" over
 * four meanings to pick from. A sighted learner was asked to listen and a
 * blind one was handed the word. The star on that round already stood down
 * for this reason; the speaker had not.
 *
 * So a speaker that plays before the answer, which is what `autoplay` means on
 * these rounds, carries a label of its own, written out rather than built
 * from the text it plays.
 */
const HIDDEN_WORD_ROUNDS = [
  "app/(app)/review/listening/ListeningSession.tsx",
  "app/(app)/review/dictation/DictationSession.tsx",
  "app/(app)/review/letters/LettersSession.tsx",
];

export default function aHeardWordIsNotReadOut({ check, code }: InvariantKit) {
  check("a speaker that plays a word before it is answered does not read the word out", () => {
    let seen = 0;
    for (const file of HIDDEN_WORD_ROUNDS) {
      const src = code(file);
      for (const m of src.matchAll(/<Speak(?:Pair)?\b([\s\S]*?)\/>/g)) {
        const props = m[1] ?? "";
        if (!/\bautoplay\b/.test(props)) continue;
        seen++;
        assert.match(
          // Written out, or written out and read in the learner's language.
          props, /\blabel=(?:"[^"]+"|\{t\("[^"]+"\)\})/,
          `${file} autoplays a speaker with no written label, so its default names the word before it is answered`,
        );
      }
    }
    assert.ok(seen >= 3, `only ${seen} autoplaying speakers found across the hidden-word rounds; the sweep is reading the wrong files`);
  });
}
