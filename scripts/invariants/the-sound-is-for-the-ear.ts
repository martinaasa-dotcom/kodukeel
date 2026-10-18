import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LIT WORD IS UNDERSTOOD, AND THE SOUND IS HANDED TO THE EAR
 * (docs/41-fifth-batch.md section 8c).
 *
 * A learner said `aitäh` as "eye-toy" on purpose and was told "Every word was
 * heard", which read as "you said it right". `npm run measure:confidence`
 * found nothing the recognizer returns that tells a word said well from one
 * said badly, its confidence included, and one honest middle state: a word
 * that lit only through the folds an English ear makes was written down as
 * another spelling, and the line throws that away. So three things hold on
 * every screen that lights a line as it is said:
 *
 *   - it says what each word was heard as where that was not the spelling,
 *     through `clarityOf` and `HeardAs`, rather than lighting it like the rest;
 *   - it offers the learner's own turn back beside the native recording,
 *     through `CompareVoices`, which is the one judge of a sound there is;
 *   - the sentence under the line says "understood", never "heard", since a
 *     word heard as spelled can still have been said with an accent.
 *
 * And the comparison is a playback and nothing more: it reaches no Server
 * Action and no grade, so a press can never write a row.
 */
const LIGHTING = [
  "components/speech/ReadAloud.tsx",
  "components/speech/YourTurn.tsx",
  "app/(app)/review/speaking/SpeakingSession.tsx",
];

export default function theSoundIsForTheEar({ check, code }: InvariantKit) {
  check("every screen that lights a line as it is said says what a word was heard as and offers both voices", () => {
    for (const file of LIGHTING) {
      const src = code(file);
      assert.match(src, /\bclarityOf\(/, `${file} lights a line without asking how each word came across`);
      assert.match(src, /<HeardAs\b/, `${file} never says what a word was heard as`);
      assert.match(src, /<CompareVoices\b/, `${file} never offers the learner's own turn beside the native line`);
      assert.match(src, /keepAudio:\s*true/, `${file} draws the comparison without keeping the turn's audio, so it never appears`);
      assert.doesNotMatch(src, /t\("Every word was heard\."\)|words were heard\."\)/, `${file} says a lit line was "heard", which a learner reads as said right`);
    }
  });

  check("the comparison plays and writes nothing", () => {
    const src = code("components/speech/CompareVoices.tsx");
    assert.doesNotMatch(src, /@\/app\/actions|gradeCard|useGrade|fetch\(/, "CompareVoices reaches past playback");
    assert.match(src, /playRecording\(/, "CompareVoices no longer plays the turn through the path that keeps the microphone closed");
    assert.match(src, /playClip\(/, "CompareVoices no longer plays the native line through the clip path");
  });

  check("both voices are drawn on one clock, from the very audio that plays", () => {
    const src = code("components/speech/CompareVoices.tsx");
    // One scale for the pair, or a slower turn could not be read off the length of its row.
    assert.match(src, /barsPerSecond\(\[/, "CompareVoices draws the two voices without a shared time scale");
    assert.equal((src.match(/waveBars\(/g) ?? []).length >= 2, true, "CompareVoices does not draw both voices");
    // The turn plays as it is drawn: the speech, without the room the microphone kept after it.
    assert.match(src, /speechOnly\(/, "CompareVoices plays the turn with its trailing silence");
    assert.match(src, /playRecording\(\{ samples: turn\b/, "CompareVoices plays something other than the turn it draws");
    // A drawing of loudness: no verdict hue may color a bar.
    const css = code("app/globals.css");
    const block = css.slice(css.indexOf(".compare-voices {"), css.indexOf(".compare-hint"));
    assert.ok(block.length > 0, "the comparison's styles are not where this check reads them");
    assert.doesNotMatch(block, /--(sky|blush|butter|good|again|hard)(-ink|-soft)?\b/, "a bar in the comparison wears a verdict hue");
  });
}
