import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERY WRITE OF THE PART A LEARNER IS ON STAMPS WHEN IT WAS CHOSEN.
 *
 * `courseReading` sends a learner whose old ticks predate the lessons back to
 * the level's first part, unless `programmeChosenAt` says they chose the part
 * they are on since (`lib/progress/course.ts`). First run wrote the part and
 * no stamp, so somebody placed on B1.2 by the wizard could be read as old
 * data and moved. Each `writeSetting(…, SETTING_KEYS.programme, …)` outside a
 * test has the stamp written beside it, inside the same few lines.
 */
export default function aPartChosenIsStamped({ check, ALL, code }: InvariantKit) {
  check("every write of the learner's part stamps when it was chosen", () => {
    const files = ALL.filter((f) => /^(app|lib)\//.test(f) && /\.tsx?$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f));
    let writes = 0;
    const bare: string[] = [];
    for (const f of files) {
      const source = code(f);
      for (const m of source.matchAll(/writeSetting\([^,]+,\s*SETTING_KEYS\.programme\s*,/g)) {
        writes += 1;
        const near = source.slice(Math.max(0, m.index! - 300), m.index! + 300);
        if (!/SETTING_KEYS\.programmeChosenAt/.test(near)) bare.push(`${f}: ${source.slice(m.index!, m.index! + 80)}`);
      }
    }
    assert.ok(writes >= 4, `only ${writes} writes of the learner's part found, so the pattern stopped matching`);
    assert.deepEqual(bare, [], `${bare.join("\n")}\nwrite SETTING_KEYS.programmeChosenAt beside it`);
  });
}
