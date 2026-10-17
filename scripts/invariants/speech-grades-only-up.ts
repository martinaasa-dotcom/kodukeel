import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  SAYING IT ALOUD, ON THE DAILY PATH AND IN THE SPEAKING ROUND (docs/41-fifth-batch.md
  VB-5, VB-6, VB-14), AND THE WAYS IT COULD QUIETLY STOP BEING WHAT D4 AND D13 SAY.

  A spoken answer grades through `gradeCard` like a typed one and carries
  `spoken` into the one table nothing repairs; it may only ever grade up, a word
  the dictionary repaired writes nothing, the Speaking round writes nothing for
  a miss and nothing at all hands-free, and a read-back of what the learner
  said is kept nowhere. Each of those is a property a later edit could remove
  without the screen looking any different.
*/
export default function speechGradesOnlyUp({ check, code }: InvariantKit) {
  check("every answer box that can be said aloud carries spoken, and writes nothing for a repaired word (D4, D13)", () => {
    const screens = [
      "app/(app)/review/ReviewSession.tsx",
      "app/(app)/learn/new/LearnSession.tsx",
      "app/(app)/review/flashcards/FlashSession.tsx",
    ];
    for (const file of screens) {
      const src = code(file);
      assert.match(src, /useSpokenBox\(/, `${file} no longer offers the microphone in its answer box`);
      assert.match(src, /<AnswerMic\b/, `${file} builds the spoken box and draws no microphone (D6 lives in AnswerMic)`);
      assert.match(src, /carriesRepair\(/, `${file} no longer asks whether a repaired word is still in the box (D13)`);
      assert.match(src, /gradeCard\([^)]*\b(?:spoken|saidAloud)\b[^)]*\)/, `${file} grades without saying whether the answer was spoken`);
      assert.match(src, /spoken: true/, `${file} drops spoken on the way into the outbox`);
    }
  });

  check("the Speaking round writes nothing for a miss and nothing hands-free", () => {
    const src = code("app/(app)/review/speaking/SpeakingSession.tsx");
    const grades = [...src.matchAll(/writeGrade\(([^,)]*)/g)].map((m) => m[1]!.trim());
    assert.ok(grades.length >= 2, "found no grade written in the Speaking round, so this check stopped looking");
    for (const rating of grades) {
      assert.ok(rating === "3" || rating === "rating", `the Speaking round writes a grade of ${rating}, which is not Good or the marker's own`);
    }
    assert.match(code("lib/games/speaking.ts"), /if \(check\.suggestedRating === 1\) return null;/, "a missed recall in the Speaking round writes a row again");
    assert.match(code("lib/games/speaking.ts"), /return step === "meaning" && !handsFree;/, "a step other than the recall, or hands-free, may grade");
  });

  check("a read-back of what was heard is kept nowhere", () => {
    const route = code("app/api/tts/route.ts");
    assert.match(route, /if \(hash === null\) return audio;\s*if \(prepared\.keep\) await writeAudio\(/, "a read-back reaches the shared store");
    assert.match(code("public/sw.js"), /searchParams\.get\("transient"\) !== "1"/, "the service worker keeps a read-back of what the learner said");
    assert.match(code("lib/audio/clip.ts"), /fetch\("\/api\/tts\?transient=1"/, "the read-back is asked for as an ordinary clip, which every cache keeps");
  });
}
