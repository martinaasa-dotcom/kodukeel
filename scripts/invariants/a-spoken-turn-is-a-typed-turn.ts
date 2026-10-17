import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CONVERSATION SAID ALOUD IS READ AS A TYPED ONE, AND A REPAIRED WORD GRADES
 * NOTHING (docs/41-fifth-batch.md, VB-4, D13 and D26).
 *
 * What a source check can hold of it:
 *
 *   - every door a scene's turns come in by (the route, `sceneHelp` and
 *     `finishScene`) reads the `spoken` field through `spokenOf`, or a run
 *     re-marked at the end would grade a word the route had refused to;
 *   - `gradesFor` reads `repaired`, and nothing in the reply does (D26: the
 *     one new field is the grades' alone, and the reply's written order is
 *     untouched);
 *   - what the recognizer heard is never sent to the server, only which words
 *     the dictionary repaired (D21);
 *   - the conversation reaches the microphone through the one hook and the one
 *     button (D5), never through `getUserMedia`.
 */
export default function aSpokenTurnIsATypedTurn({ check, code }: InvariantKit) {
  check("every door a scene's turns come in by reads what was said aloud", () => {
    assert.match(code("app/api/scene/route.ts"), /spokenOf\(one\.spoken, said\)/, "the scene route drops the spoken field");
    const actions = code("app/actions.ts");
    assert.equal((actions.match(/spokenOf\(row\.spoken, said\)/g) ?? []).length, 2, "an action that replays a run drops the spoken field");
  });

  check("a repaired word is read by the grades and by nothing in the reply", () => {
    assert.match(code("lib/scenes/grades.ts"), /turn\.repaired/, "gradesFor no longer reads the repaired words");
    assert.match(code("lib/scenes/grades.ts"), /!repairedHere\(turn, index\)/, "a requirement met by a repaired word is answered again");
    for (const file of ["lib/scenes/reply.ts", "lib/scenes/aside.ts", "lib/scenes/turn.ts", "lib/progress/sceneTurn.ts"]) {
      assert.doesNotMatch(code(file), /\brepaired\b/, `${file} reads the repaired words, which only the grades may (D26)`);
    }
  });

  check("what the recognizer heard stays on the screen and is never sent", () => {
    const session = code("components/scene/SceneSession.tsx");
    assert.match(session, /spoken: \{ repairs\b/, "a spoken turn no longer carries its repairs");
    // Beside the repairs go two numbers for the edit rate (D3), counted on the device, and never the words.
    assert.match(session, /spoken: \{ repairs, \.\.\.editCounts\(/, "a spoken turn's edit counts are not the counter's");
    assert.doesNotMatch(session, /spoken: \{[^}]*\bheard\b/, "a spoken turn sends what the machine heard, which /privacy says stays on the device");
  });

  check("the conversation listens through the one hook and the one button", () => {
    const mic = code("components/scene/SceneSpeech.tsx");
    assert.match(mic, /useSpeech\(/, "the conversation's microphone is not the shared hook");
    assert.match(mic, /<MicButton\b/, "the conversation draws a microphone of its own");
    assert.doesNotMatch(mic, /getUserMedia/, "the conversation opens the microphone itself");
  });
}
