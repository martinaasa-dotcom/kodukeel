import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * NOTHING A PERSON READS IS CALLED "TONIGHT". IT IS TODAY.
 *
 * A learner opens the app at nine in the morning and read "from tonight's
 * conversation" over a lesson they were halfway through. The course is a
 * module a day, done whenever the learner has a quarter of an hour, so no
 * sentence may assume which part of the day it is: "Today's module", "Today's
 * words", "today's chat". The same goes for "last night" about a past session.
 *
 * Identifiers (`tonightSteps`, the `tonight` email kind, `tonightsCase`) are
 * code and stay. So does a sentence that translates an Estonian time of day
 * (`õhtul`) and the almanac's notes about a calendar occasion, which are a fact
 * about an event rather than a way of naming the learner's session. Both are
 * listed with the reason.
 *
 * Read off the code rather than the file, so a comment explaining the rule is
 * not a fault, and only literals with a space in them count: a bare "tonight"
 * is a key.
 */
const EXEMPT: Record<string, string> = {
  "lib/dict/authoredRows.ts": "translates Estonian sentences that say õhtul",
  "lib/copy/almanac.ts": "notes about calendar occasions, which really are at night",
  "lib/copy/i18n/areas/course.ts": "the translations of the almanac notes",
};

const LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
const TELLS = /\btonight\b|\blast night\b|\bthis evening\b/i;

export default function nothingIsCalledTonight({ check, ALL, code }: InvariantKit) {
  check("no sentence on a screen says tonight: the module is today's, at any hour", () => {
    const scanned = ALL.filter((f) =>
      /^(app|components|lib)\//.test(f) && /\.(ts|tsx)$/.test(f)
      && !/\.(test|itest)\.tsx?$/.test(f));
    assert.ok(scanned.length > 200, `only ${scanned.length} files scanned, so the haystack stopped matching`);
    const offenders: string[] = [];
    for (const f of scanned) {
      if (EXEMPT[f]) continue;
      for (const m of code(f).matchAll(LITERAL)) {
        const text = m[1] ?? m[2] ?? m[3] ?? "";
        if (/\s/.test(text) && /\btonight\b|\blast night\b/i.test(text)) offenders.push(`${f}: ${text.slice(0, 60)}`);
      }
    }
    assert.deepEqual(offenders, [], `say "today" (or "yesterday"), never the time of day: ${offenders.join("; ")}`);
    for (const f of Object.keys(EXEMPT)) {
      assert.ok(TELLS.test(code(f)), `${f} no longer says it, so drop it from EXEMPT`);
    }
  });
}
