import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A JOKE IS TOLD ON TODAY AND NOWHERE ELSE, AND GOOD NEWS IS ONLY EVER GOOD.
 *
 * `lib/collections/jokes.ts` is ADR-005 amendment 5: Estonian typed in a
 * session and read by a person in the pull request, like the scene bank and a
 * beginner's sentences. What keeps the amendment narrow is where it may go,
 * so the readers are a closed list, and nothing that marks, measures, builds a
 * card, plays a scene or lends a sentence may import the table at all.
 *
 * And the good news card has one rule the operator set, that it is only good
 * news, so the bad-news list may never be skipped: the judge's reading drops a
 * refused item whatever the model said, the page's reading refuses one before
 * the model is asked, and the keyless path goes through the stricter rule.
 */
const READERS = [
  // The day's joke and its spares, drawn with the dictionary under them.
  "lib/progress/jokeOfDay.ts",
] as const;

const NEVER = ["lib/exam/", "lib/assessment/", "lib/scenes/", "lib/srs/", "lib/games/", "lib/questions/", "lib/dict/"];

export default function jokesStayOnTheirCard({ check, ALL, code }: InvariantKit) {
  check("a joke reaches only the card on Today", () => {
    const importers = ALL.filter((f) =>
      !f.startsWith("lib/collections/jokes") && !f.endsWith(".test.ts") && !f.startsWith("scripts/")
      && /from\s+["']@\/lib\/collections\/jokes["']/.test(code(f)));
    assert.deepEqual(
      [...importers].sort(), [...READERS].sort(),
      "a new reader of lib/collections/jokes.ts; a joke is typed Estonian and goes on its card and nowhere else",
    );
    for (const file of ALL) {
      if (!NEVER.some((dir) => file.startsWith(dir))) continue;
      assert.doesNotMatch(code(file), /lib\/collections\/jokes/, `${file} may not read a joke`);
    }
  });

  check("good news goes through the bad-news list on every path", () => {
    const pure = code("lib/news/goodNews.ts");
    const reader = pure.slice(pure.indexOf("export function readJudgement"));
    assert.match(reader, /badStem\(item\) !== null\) continue/, "the judge's picks no longer go through the bad-news list");
    const keyless = pure.slice(pure.indexOf("export function plainlyGood"));
    assert.match(keyless.slice(0, 200), /badStem\(item\) !== null\) return false/, "the keyless rule no longer refuses bad news first");
    const today = code("lib/dict/goodNews.ts");
    assert.match(today, /badStem\(item\) !== null\) continue/, "the page shows the model items the bad-news list refused");
    assert.match(today, /: clean\.filter\(plainlyGood\)/, "a keyless deployment no longer goes through the stricter rule");
  });

  check("the good news judge is metered like every other call", () => {
    const judge = code("lib/tutor/goodNews.ts");
    assert.match(judge, /authoriseCall\(ownerId, "GRADER"\)/, "the judge asks a model without authorising the call");
    assert.match(judge, /allowFallback: decision\.fallbackAllowed/, "the judge assumes the last resort rather than asking the ledger");
    assert.match(judge, /after\(\(\) => recordUsage\(/, "the judge's spend is not recorded");
    assert.match(judge, /releaseReservation\(booking\)/, "a judge nobody answered keeps its reservation");
    assert.match(judge, /VOICE_RULES\.map/, "the judge's English is asked for without the voice rules");
    assert.match(judge, /findTells\(/, "the judge's English reaches a learner without the tell check");
  });
}
