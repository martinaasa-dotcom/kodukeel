import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * `Review.spoken` IS "SAID ALOUD AND MARKED ON WHAT WAS HEARD" (docs/41-fifth-batch.md
 * D4, VB-14), ON EVERY PATH THAT WRITES IT.
 *
 * Progress prints "said aloud this week" off it and `npm run report:speech`
 * compares recall after a spoken answer against a typed one, so an answer the
 * learner changed after the microphone filled the box, or cleared and typed
 * over, may not be written as spoken. The numbers round and the chant held
 * that rule from the start; the answer boxes on the daily path, the Speaking
 * round and a conversation's grades wrote any box the microphone had ever
 * filled as spoken, edited or not, and a conversation wrote every grade on a
 * beat as spoken where any turn on it had been said. Each was one line, so
 * each is held here, on the code rather than on today's markup.
 */
const ANSWER_BOXES = [
  "app/(app)/review/ReviewSession.tsx",
  "app/(app)/learn/new/LearnSession.tsx",
  "app/(app)/review/flashcards/FlashSession.tsx",
  "app/(app)/review/speaking/SpeakingSession.tsx",
];

export default function spokenMeansSentAsHeard({ check, code, ALL }: InvariantKit) {
  check("an answer box writes spoken only where what is marked is what was heard", () => {
    const boxes = ALL.filter((file) => /\buseSpokenBox\(/.test(code(file)) && file !== "components/speech/SpokenBox.tsx");
    assert.deepEqual([...boxes].sort(), [...ANSWER_BOXES].sort(),
      "a screen gained or lost the spoken answer box; decide how it writes spoken and list it here");
    for (const file of ANSWER_BOXES) {
      const src = code(file);
      assert.match(src, /\.saidAsIs\(/, `${file} no longer asks whether the answer was sent as heard`);
      // The flag the grade carries; `heardInBox`, which decides D13's repair rule, may still read the fill.
      assert.doesNotMatch(src, /(?:spokenAnswer\.current|saidAloud)\s*=\s*said !== undefined \|\| [\w.]+\.spoken\s*;/,
        `${file} writes any box the microphone ever filled as spoken, edited or not`);
      assert.doesNotMatch(src, /writeGrade\([^)]*\bbox\.spoken\b/, `${file} grades with the box's fill flag rather than saidAsIs`);
    }
    const box = code("components/speech/SpokenBox.tsx");
    assert.match(box, /keptAsHeard\(filled, text\)/, "saidAsIs no longer compares the answer with what the microphone put in the box");
  });

  check("a conversation's grade is spoken where the turn that met it was said and sent as heard", () => {
    const grades = code("lib/scenes/grades.ts");
    assert.match(grades, /turn\.met\[index\] && turn\.repaired !== undefined && turn\.edited !== true/,
      "a scene grade is written as spoken off a turn other than the one that met it, or off an edited one");
    assert.doesNotMatch(grades, /const spoken = turns\.some\(/, "every grade on a beat is spoken again where any turn on it was said");
    assert.match(code("lib/progress/scene.ts"), /wordsChanged > 0 \|\| wordCount\(speakingSaid\) !== wordsHeard/,
      "a spoken turn changed before sending is no longer marked edited");
  });
}
