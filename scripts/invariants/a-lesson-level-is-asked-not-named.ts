import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * WHETHER A LEVEL IS LESSONS IS ASKED, NEVER SPELLED OUT.
 *
 * A1, A2 and B1 are lessons now and B2 is next. A condition written as
 * `level === "A1" || level === "A2"` was right the day it was typed and wrong
 * the day B1 moved, silently: a test of the course read A2's last part off a
 * list that by then ended in B1. A lesson level is asked through
 * `isLessonLevel` (or `isLessonLevelName` where the lessons cannot be
 * imported), so the next level of lessons is in every such question by
 * arriving. The one list is `lib/course/lessonLevels.ts`, held to the lessons
 * by its own test; other files that name the bands together for another
 * reason are exempt by name, checked both ways.
 */
const EXEMPT: Readonly<Record<string, string>> = {
  "lib/collections/pictures.ts": "how many pictures a beginner's scene shows, which is about reading ease and not about lessons",
  "app/(app)/review/workbook/page.tsx": "the sentences written for a beginner are for A1 and A2 (ADR-005 amendment 4), a rule about who they were written for, not about lessons",
};
const NAMED = /\blevel\s*===\s*"(?:A1|A2|B1)"\s*\|\|[^;\n]*?\blevel\s*===\s*"(?:A1|A2|B1)"/;

export default function aLessonLevelIsAskedNotNamed({ check, ALL, code }: InvariantKit) {
  check("a lesson level is asked through isLessonLevel, never spelled out", () => {
    const files = ALL.filter((f) => /^(app|components|lib)\//.test(f) && /\.tsx?$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f));
    const asks = files.filter((f) => /\bisLessonLevel(?:Name)?\(/.test(code(f))).length;
    assert.ok(asks >= 5, `only ${asks} files ask isLessonLevel, so the haystack stopped matching`);
    const named = files.filter((f) => NAMED.test(code(f)));
    for (const f of Object.keys(EXEMPT)) assert.ok(named.includes(f), `${f} is exempt and no longer names the bands together; take it off the list`);
    const offenders = named.filter((f) => !(f in EXEMPT));
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\nask isLessonLevel(level) rather than naming the lesson levels`);
  });
}
