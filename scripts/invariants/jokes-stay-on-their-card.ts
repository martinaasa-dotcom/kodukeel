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
 * And the good news card has two rules the operator set: it is only good
 * news, so the bad-news list may never be skipped and a headline has to carry
 * a good-news word as well; and no model decides it, so nothing on its path
 * may reach a provider or the ledger.
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

  check("good news goes through both word lists on every path", () => {
    const pure = code("lib/news/goodNews.ts");
    const rule = pure.slice(pure.indexOf("export function plainlyGood"));
    assert.match(rule.slice(0, 200), /badStem\(item\) !== null\) return false/, "the good-news rule no longer refuses bad news first");
    const today = code("lib/dict/goodNews.ts");
    assert.match(today, /badStem\(item\) !== null \|\| !plainlyGood\(item\)\) continue/, "the card offers a headline that cleared only one of the two lists");
    assert.match(today, /!recentEnough\(item, now\)/, "a card headed today is offered last week's news");
  });

  check("no model decides what counts as good news", () => {
    const judges = ALL.filter((f) => f.startsWith("lib/tutor/") && /@\/lib\/news\//.test(code(f)));
    assert.deepEqual(judges, [], "a model is asked about the news again");
    for (const file of ["lib/news/goodNews.ts", "lib/dict/goodNews.ts", "components/GoodNewsSlot.tsx", "components/GoodNews.tsx"]) {
      assert.doesNotMatch(code(file), /@\/lib\/(tutor|usage)\//, `${file} reaches a model or the ledger`);
    }
  });

  /*
    Two pleasures on the page a learner opens every morning, and neither may be
    the reason it does not open. The joke's dictionary lookup falls back to
    plain words, and the news remembers a failure as a miss rather than
    throwing it at the page or asking the model again on every load.
  */
  check("the joke and the news never take Today down with them", () => {
    const joke = code("lib/progress/jokeOfDay.ts");
    assert.match(joke, /catch \{\s*annotated = plainTexts\(texts\);\s*keep = false;/, "a dictionary that will not answer throws the joke at Today");
    const news = code("lib/dict/goodNews.ts");
    assert.match(news, /pickToday\(now\)\.catch\(/, "a good news failure is thrown rather than remembered as a miss");
    assert.match(news, /goodNewsToday\(\)\.catch\(\(\) => null\)/, "Today waits on good news that can throw");
    // Today may not wait on ERR for a pleasure: the card streams.
    const page = code("app/(app)/page.tsx");
    assert.doesNotMatch(page, /goodNews(Within|Today)\(/, "Today awaits the good news rather than streaming it");
    assert.match(page, /<Suspense fallback=\{null\}><GoodNewsSlot \/>/, "the good news is no longer streamed behind a Suspense");
    assert.match(page, /data-column-item/, "the column item hook moved");
    assert.match(page, /empty:hidden[^>]*data-column-item/, "an hour with no good news leaves an empty slot drawn");
  });
}
