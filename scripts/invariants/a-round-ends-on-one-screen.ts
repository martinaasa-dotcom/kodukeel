import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A ROUND ENDS ON ONE SCREEN, AND IT SAYS WHAT TO LOOK AT AGAIN.
 *
 * Rounds ended two ways: a night panel with the mascot, tiles and the way on
 * centered, primary last; or a bare heading, a box of plain figures and two
 * buttons on the left with "Back to Today" loud and "Another round" quiet. A
 * learner moving from Match to Verb government met two apps saying the same
 * thing. `components/round/RoundDone.tsx` is the one drawing now, and it lists
 * what came out wrong under "Worth another look", which is the half a learner
 * notices: the round knew every miss and its last screen kept that to itself.
 *
 * Three arms. A session that offers another round does it through `RoundDone`
 * or is exempt here with a reason; an exempt file still offers one, so the list
 * is no parking space; and every round that switched hands `RoundDone` the
 * misses it kept, since a finish screen with nothing in `missed` is the old
 * screen in new clothes.
 */
const EXEMPT: Record<string, string> = {
  "app/(app)/review/letters/LettersSession.tsx": "the letters tumble over its panel, which is the round's own picture of a finished board",
  "app/(app)/review/sayings/SayingsSession.tsx": "it ends on the five sayings turned over, which is the list of what to look at again",
  "app/(app)/review/wordplay/WordplaySession.tsx": "it ends on the five words taken apart, which is the list of what to look at again",
  "app/(app)/review/twins/TwinsSession.tsx": "it ends on the way to every pair, which is where a mixed-up pair is looked at again",
  "app/(app)/review/workbook/WorkbookSession.tsx": "a page ends by handing it back corrected and offering another page on a theme",
  "app/(app)/review/speaking/SpeakingSession.tsx": "a speech round, polished on its own pass",
  "app/(app)/review/describe/DescribeSession.tsx": "a speech round, polished on its own pass",
  "app/(app)/review/numbers/NumbersSession.tsx": "a speech round, polished on its own pass",
};

const SWITCHED = [
  "app/(app)/review/flashcards/FlashSession.tsx",
  "app/(app)/review/match/MatchSession.tsx",
  "app/(app)/review/listening/ListeningSession.tsx",
  "app/(app)/review/dictation/DictationSession.tsx",
  "app/(app)/review/sentences/SentenceSession.tsx",
  "app/(app)/review/government/GovernmentSession.tsx",
  "app/(app)/review/pairs/PairsSession.tsx",
  "app/(app)/review/exceptions/ExceptionsSession.tsx",
  "app/(app)/review/conjugation/ConjugationSession.tsx",
  "app/(app)/review/map/MapSession.tsx",
];

export default function aRoundEndsOnOneScreen({ check, code, APP }: InvariantKit) {
  check("a round offers another round through RoundDone, or says why not", () => {
    const sessions = APP.filter((f) => /Session\.tsx$/.test(f));
    assert.ok(sessions.length >= 20, `only found ${sessions.length} sessions, so this sweep stopped looking`);
    const offenders = sessions.filter((f) => /<AnotherRound\b/.test(code(f)) && !EXEMPT[f]);
    assert.deepEqual(offenders, [], "these draw their own finish screen: use RoundDone, or add the file to EXEMPT with a reason");
    for (const [file, why] of Object.entries(EXEMPT)) {
      assert.match(code(file), /<AnotherRound\b/, `${file} is exempt (${why}) and no longer draws its own finish; take it off the list`);
    }
  });

  check("every round that ends on RoundDone tells it what came out wrong", () => {
    for (const file of SWITCHED) {
      const src = code(file);
      assert.match(src, /<RoundDone\b/, `${file} no longer ends on RoundDone`);
      assert.match(src, /\bmissed=\{/, `${file} ends on RoundDone without handing it the misses`);
    }
  });

  check("the shared finish screen keeps one loud action, last", () => {
    const src = code("components/round/RoundDone.tsx");
    const back = src.indexOf('href="/"');
    const again = src.indexOf("<AnotherRound");
    assert.ok(back > 0 && again > back, "RoundDone draws the way back after the primary; the primary is the last in its row");
    assert.match(src, /<AnotherRound variant="primary"/, "RoundDone's another round is no longer the primary");
    assert.doesNotMatch(src, /tone=\{/, "RoundDone colors a figure by its value; a reading is not a verdict");
  });
}
