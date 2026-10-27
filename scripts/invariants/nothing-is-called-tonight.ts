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
 * code and stay. So does content that teaches: what a lesson says, a role card,
 * a saying's situation, a translation of `õhtul`, and the almanac's notes about
 * a calendar occasion. The rule is for instructions and interface, the places
 * that talk about the learner's own session. Each exemption has its reason.
 *
 * Read off the code rather than the file, so a comment explaining the rule is
 * not a fault, and only literals with a space in them count: a bare "tonight"
 * is a key.
 */
const EXEMPT: Record<string, string> = {
  "lib/dict/authoredRows.ts": "translates Estonian sentences that say õhtul",
  "lib/copy/almanac.ts": "notes about calendar occasions, which really are at night",
  "lib/copy/i18n/areas/course.ts": "the translations of the almanac notes",
  "lib/estonian/sayings.ts": "teaching content: a situation written as a story, where tonight is the point",
  "lib/copy/i18n/areas/sayings.ts": "the translations of those situations",
  "lib/scenes/specs/": "role cards are fiction the learner plays, so they may say tonight",
  "lib/copy/i18n/areas/situations.ts": "the translations of the role cards",
  "lib/course/lessons/": "what a lesson teaches may use the time of day, as a course book does",
  "lib/copy/i18n/areas/lessonText*": "the translations of the lessons, one area a level or part",
};
const covers = (k: string, f: string) => (k.endsWith("/") ? f.startsWith(k) : k.endsWith("*") ? f.startsWith(k.slice(0, -1)) : f === k);
const exempt = (f: string) => Object.keys(EXEMPT).some((k) => covers(k, f));

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
      if (exempt(f)) continue;
      for (const m of code(f).matchAll(LITERAL)) {
        const text = m[1] ?? m[2] ?? m[3] ?? "";
        if (/\s/.test(text) && /\btonight\b|\blast night\b/i.test(text)) offenders.push(`${f}: ${text.slice(0, 60)}`);
      }
    }
    assert.deepEqual(offenders, [], `say "today" (or "yesterday"), never the time of day: ${offenders.join("; ")}`);
    for (const k of Object.keys(EXEMPT)) {
      const hit = scanned.some((f) => covers(k, f) && TELLS.test(code(f)));
      assert.ok(hit, `${k} no longer says it, so drop it from EXEMPT`);
    }
  });
}
