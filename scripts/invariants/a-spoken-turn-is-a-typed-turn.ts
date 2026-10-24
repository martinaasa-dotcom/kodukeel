import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CONVERSATION SAID ALOUD IS READ AS A TYPED ONE, AND A REPAIRED WORD GRADES
 * NOTHING (docs/41-fifth-batch.md, VB-4, D13 and D26).
 *
 * What a source check can hold of it:
 *
 *   - every door a scene's turns come in by (`sceneTurnFor`, `sceneHelpFor`
 *     and `finishSceneFor`, behind the web's and v1's doors) reads the
 *     `spoken` field through `spokenOf`, or a run
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
    assert.match(code("lib/progress/sceneRequest.ts"), /spokenOf\(one\.spoken, said\)/, "the scene route drops the spoken field");
    // `sceneHelp` and `finishScene`'s bodies, which their v1 doors call too (N-5).
    const runs = code("lib/progress/sceneRuns.ts");
    assert.equal((runs.match(/spokenOf\(row\.spoken, said\)/g) ?? []).length, 2, "a door that replays a run drops the spoken field");
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
    /*
      Beside the repairs go two numbers for the edit rate (D3), counted on the
      device, and never the words; and none on a line picked by saying it,
      whose words are the pick's rather than anything the learner changed.
    */
    assert.match(session, /spoken: picked \? \{ repairs \} : \{ repairs, \.\.\.editCounts\(/, "a spoken turn no longer carries its repairs, or a spoken pick counts the app's match as the learner's edits");
    assert.doesNotMatch(session, /spoken: [^\n]*\bheard\b/, "a spoken turn sends what the machine heard, which /privacy says stays on the device");
  });

  check("what was heard is shown and never said back in the app's own voice", () => {
    /*
      A spelling the machine heard is one the dictionary does not hold, and
      playing it through the app's native voice puts the mistake in a native
      speaker's mouth, which is why a chat never quotes the learner's Estonian
      back (`ChatPlan.remembered`).
    */
    assert.doesNotMatch(code("components/scene/SceneSession.tsx"), /<Speak text=\{repair\.from\}/, "the recast plays what the machine heard in a native voice");
    assert.doesNotMatch(code("components/scene/SceneDebrief.tsx"), /<Speak text=\{one\.heard\}/, "What we heard plays the machine's hearing in a native voice");
    assert.match(code("components/scene/SceneDebrief.tsx"), /<Speak text=\{one\.said\}/, "What we heard no longer plays what went, so the check above lost its subject");
  });

  check("the conversation listens through the one hook and the one button", () => {
    const mic = code("components/scene/SceneSpeech.tsx");
    assert.match(mic, /useSpeech\(/, "the conversation's microphone is not the shared hook");
    assert.match(mic, /<MicButton\b/, "the conversation draws a microphone of its own");
    assert.doesNotMatch(mic, /getUserMedia/, "the conversation opens the microphone itself");
  });
}
