/**
 * Rewrite the day-id snapshot `lib/course/day-ids.json`.
 *
 * Run this only after deciding that a shift in what a day id names is
 * acceptable. `course.test.ts` compares the built programmes against the
 * snapshot and fails naming every day that moved, which is the point: a day
 * id is what a `CourseStep` row stores, so a syllabus edit that renumbers
 * them moves every learner mid-part to a different evening. See the note on
 * `DaySpec.id`.
 */
import { writeFileSync } from "node:fs";
import { PROGRAMMES } from "@/lib/course/index";

const out: Record<string, string> = {};
for (const p of PROGRAMMES) {
  for (const d of p.days) out[d.id] = `${d.unitId} ${d.part.n}/${d.part.of}`;
}
writeFileSync("lib/course/day-ids.json", `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out).length} day ids.`);
