import assert from "node:assert/strict";

import { ACTIVITIES } from "@/lib/course/types";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A ROUND THE MODULE DEALS LEADS WITH THE WORDS IT TAUGHT LAST, OR SAYS WHY NOT.
 *
 * Inside the module a round is about tonight. Five rounds learned that one at
 * a time (`recentLemmas`, `byRecency`), and three more were found walking the
 * later levels: the writing round on the A2 inessive evening asked six
 * genitives about people, the government round on a C1 evening dealt A1 and A2
 * verbs because the ones just taught were past an easiest-first cut of two
 * hundred, and the conjugation table pinned to an evening for its new verbs
 * was a shuffle of every verb since A1 cut alphabetically. So every page the
 * module can deal is read here and asks the recency helpers, or carries a
 * reason that is about the round rather than about the work.
 */
const ORDERED_OTHERWISE: Readonly<Record<string, string>> = {
  "/review/flashcards": "asks the words this learner has not mastered yet, which is the order the round exists for",
  "/review/exceptions": "asks the taught words that break a pattern, and a round of exceptions is chosen by the exception",
  "/review/target": "asks four forms of one word at a time, drawn by the case the evening read",
  "/review/describe": "asks a picture whose three words have all been taught, chosen by the case it can carry",
  "/review/dictation": "plays a whole sentence of taught words, and what is due decides which",
  "/review/sentences": "builds a whole sentence of taught words, and what is due decides which",
  "/sonad": "is rebuilt from the date and the level to be marked, so it may not be narrowed (lib/course/build.ts)",
};

export default function aModuleRoundLeadsWithTonight({ check, code }: InvariantKit) {
  check("every round the module can deal leads with the words it taught last, or says why not", () => {
    const loose: string[] = [];
    let read = 0;
    for (const { href } of Object.values(ACTIVITIES)) {
      if (href in ORDERED_OTHERWISE) continue;
      const page = code(`app/(app)${href}/page.tsx`);
      read++;
      if (!/byRecency\(|recentLemmas\(/.test(page)) loose.push(href);
    }
    assert.ok(read >= 8, `read ${read} module rounds, expected at least the eight that lead with recency`);
    assert.deepEqual(loose, [], "a round the module deals is not led by the words the module taught last");
    // And a reason is a decision about a round that exists and is dealt.
    const dealt = new Set<string>(Object.values(ACTIVITIES).map((a) => a.href));
    const stale = Object.keys(ORDERED_OTHERWISE).filter((href) => !dealt.has(href));
    assert.deepEqual(stale, [], "an exemption names a round the module no longer deals");
  });
}
