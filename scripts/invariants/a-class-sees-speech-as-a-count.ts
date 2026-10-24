import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CLASS SEES SPEECH AS A COUNT, NEVER AS WHAT WAS SAID (docs/41-fifth-batch.md
 * VB-14, ADR-019).
 *
 * The roster gained "said aloud this week", and the rule that keeps a teacher's
 * board an effort board rather than a window into somebody's practice is that
 * it reads a number off `Review.spoken` and nothing else about speech: no
 * conversation transcript, no heard words, no turn. Asserted on the query
 * module and on the row the board draws, since either is where a careless
 * widening would land.
 */
export default function aClassSeesSpeechAsACount({ check, code }: InvariantKit) {
  check("the class roster reads speech as a count off the review log and nothing else", () => {
    const roster = code("lib/classroom/roster.ts");
    assert.match(roster, /spokenThisWeek: stats\.spokenWeek/, "the roster no longer counts answers said aloud");
    assert.doesNotMatch(roster, /\bsceneRun\b|\btranscript\b|\bwordsHeard\b|\bheard\b\s*:/,
      "the class roster reaches a conversation transcript or what was heard; a class shows effort and never contents");
    const row = code("components/class/RosterList.tsx");
    assert.match(row, /entry\.spokenThisWeek > 0/, "the roster row no longer shows the count said aloud");
    assert.doesNotMatch(row, /\btranscript\b|\bheard\b/, "the roster row draws something of what was said");
  });

  check("a turn counts as heard by ear only where the server stores it so, and readiness counts it", () => {
    assert.match(code("lib/progress/scene.ts"), /o\.unseen === true \? \{ unseen: true as const \} : \{\}/,
      "a line only heard is read off the wire as anything but an exact true");
    assert.match(code("lib/progress/readiness.ts"), /heardTurns: heardTurnsByLevel\(spoken\)/,
      "the readiness rungs no longer receive the turns answered by ear");
    assert.match(code("lib/readiness/rungs.ts"), /const heard = heardAtOrAbove\(heardTurns, needRank\);\s*const byEar = heard >= HEARD_TURNS_FOR_EAR;/,
      "turns by ear no longer count at or above the situation's band");
  });
}
