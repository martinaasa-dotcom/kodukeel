import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE SHARED DICTIONARY IS READ AGAIN WHEN IT CHANGES, NOT ON A CLOCK.
 *
 * The facts cached in `lib/dict/` each expired after a minute and read the
 * whole of `Lexeme` and `Form` again, about 25 MB off the database per refill,
 * on every warm instance anybody was using. That is what took the Supabase
 * project past the free plan's 5 GB of egress in under three weeks. A
 * dictionary fact passes `DICTIONARY`, which keeps it until a row is added or
 * removed (asked once a minute through one tiny row: the entries counted
 * and Postgres's counters for the forms), and builds on the three shared
 * reads rather than a query of its own, so a refill is the dictionary once.
 *
 * Two arms. No cached fact in these files reads `Lexeme` or `Form` under a
 * clock, and the only whole-table reads of either are the shared ones.
 */
const FILES = ["lib/dict/facts.ts", "lib/dict/acceptFacts.ts", "lib/dict/neighbourFacts.ts"];

export default function theDictionaryIsReadWhenItChanges({ check, code }: InvariantKit) {
  check("a cached dictionary fact is kept until the dictionary changes, not for a minute", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const source = code(file);
      for (const match of source.matchAll(/remember\(\s*[`"]([^`"]+)[`"],\s*(\w+)/g)) {
        const [, key, policy] = match;
        // `hard-words` counts deferrals and `guessable` reads a file; neither is the dictionary.
        if (key === "hard-words" || key?.startsWith("guessable")) continue;
        if (policy !== "DICTIONARY") offenders.push(`${file}: ${key} (${policy})`);
      }
    }
    assert.deepEqual(offenders, [], `refilled on a clock rather than on a change: ${offenders.join(", ")}`);
  });

  check("the whole dictionary is read in one place, not once per fact", () => {
    const facts = code("lib/dict/facts.ts");
    assert.match(facts, /pg_stat_user_tables/, "the dictionary's signature is no longer read off Postgres's counters");
    assert.equal((facts.match(/prisma\.form\.findMany/g) ?? []).length, 1, "facts.ts reads the Form table more than once");
    for (const file of FILES.slice(1)) {
      assert.doesNotMatch(code(file), /prisma\./, `${file} queries the database itself rather than the shared reads`);
    }
  });
}
