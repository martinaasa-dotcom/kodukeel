import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  WHAT WAS SAID ALOUD, AND WHEN THE MICROPHONE IS OPEN (docs/41-fifth-batch.md
  D4, D13, D14), HELD WHERE A LATER EDIT COULD QUIETLY UNDO IT.

  `Review.spoken` is the schema's "the microphone filled the answer, and what
  was marked is what it heard". The review card, the Learn ladder, the flash
  round and the Speaking round each read it through `saidAsHeard`, so an answer
  heard and then typed over is written as typed; the number round and the
  conjugation chant drew that line already. Three of the four used to write
  `spoken` for any answer the microphone had touched, which is how a full
  retype would have been counted in "said aloud this week".

  A repaired word is a separate question (D13) and is asked of the box whether
  or not it was edited, so the repair check keeps reading `.spoken`.

  D14 was held by the button being disabled while the app speaks, which stops
  a turn opening over a line and does nothing for a line starting under an
  open turn. `useSpeech` closes the turn then, on every screen, and "Hear
  yourself" plays through `playRecording`, which is what counts it as the app
  speaking at all.
*/
export default function spokenMeansSaidAsHeard({ check, code }: InvariantKit) {
  check("an answer said and then typed over is written as typed (D4)", () => {
    const boxes: Record<string, RegExp> = {
      "app/(app)/review/ReviewSession.tsx": /spokenAnswer\.current = said !== undefined \|\| spokenBox\.current\.saidAsHeard\(answer\);/,
      "app/(app)/learn/new/LearnSession.tsx": /spokenAnswer\.current = said !== undefined \|\| spokenBox\.current\.saidAsHeard\(answer\);/,
      "app/(app)/review/flashcards/FlashSession.tsx": /const saidAloud = said !== undefined \|\| voiceBox\.current\.saidAsHeard\(answer\);/,
      "app/(app)/review/speaking/SpeakingSession.tsx": /const aloud = box\.saidAsHeard\(typed\);[\s\S]*?writeGrade\(rating, aloud\)/,
    };
    for (const [file, shape] of Object.entries(boxes)) {
      assert.match(code(file), shape, `${file} writes spoken without asking whether the answer is still what was heard`);
    }
    const box = code("components/speech/SpokenBox.tsx");
    assert.match(box, /saidAsHeard = useCallback\(\s*\(text: string\) => spoken && filled\.current !== null && sameText\(text, filled\.current\)/,
      "saidAsHeard no longer compares the answer with what the microphone put in the box");
    assert.match(code("app/(app)/review/conjugation/ConjugationSession.tsx"), /const saidAloud = spoken \|\| \(!!chanted && question\.blanks\.every\(\(_, i\) => same\(i\)\)\);/,
      "a chant edited after it was heard is written as spoken");
  });

  check("a number word grades only where it was itself heard as spelled (D13)", () => {
    for (const file of ["app/(app)/review/numbers/NumbersSession.tsx", "lib/games/numbers.ts"]) {
      assert.doesNotMatch(code(file), /\.some\(\(w\) => w\.startsWith\(lemma\)\)/,
        `${file} matches a number word as a prefix of another heard word, so \`kaks\` grades on \`kakskümmend\``);
    }
    assert.match(code("app/(app)/review/numbers/NumbersSession.tsx"), /const words = wordsGraded\(answer, mark\.right, hearing\?\.words \?\? null\);/,
      "the numbers round decides which words grade outside lib/games/numbers.ts, where it is tested");
    assert.match(code("lib/games/numbers.ts"), /lemma === EURO_LEMMA && \[\.\.\.asSpelled\]\.some\(\(w\) => w\.startsWith\(EURO_LEMMA\)\)/,
      "`eurot` no longer grades `euro`, or another lemma joined it as a prefix");
  });

  check("the microphone closes the moment the app starts speaking, on every screen (D14)", () => {
    assert.match(code("components/speech/useSpeech.tsx"), /if \(appSpeaking && listening\) cancel\(\);/,
      "a line that starts while a turn is open is heard by it");
    const recorder = code("components/Recorder.tsx");
    assert.match(recorder, /playRecording\(/, "Hear yourself no longer plays through the path that counts as the app speaking");
    assert.doesNotMatch(recorder, /new Audio\(/, "Hear yourself plays its own audio element, which the microphone cannot see");
  });

  check("hands-free never moves on after it was paused or stopped", () => {
    assert.match(code("app/(app)/review/speaking/SpeakingSession.tsx"), /setTimeout\(\(\) => \{ if \(handsFreeRef\.current\) moveOn\.current\(\); \}, HANDS_FREE_PAUSE_MS\)/,
      "a step heard just before a pause or a stop still moves the round on");
  });
}
