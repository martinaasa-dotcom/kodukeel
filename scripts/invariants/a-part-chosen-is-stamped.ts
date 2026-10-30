import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A PART IS WRITTEN WITH THE STAMP SAYING IT WAS CHOSEN, IN ONE TRANSACTION.
 *
 * `programme` is where the learner is and `programmeChosenAt` says they chose
 * it, and the lessons' switch reads a part with no stamp as one to send back to
 * the level's first lesson (`partAfterSwitch`). Written as two upserts side by
 * side, a dropped connection between them left a chosen part looking unchosen.
 * So nothing writes the part through `writeSetting` on its own: it goes through
 * `writeSettings`, which is one transaction, with the stamp beside it.
 */
export default function aPartChosenIsStamped({ check, code, ALL }: InvariantKit) {
  check("the part a learner is on is written with its chosen stamp, in one writeSettings call", () => {
    const files = ALL.filter((f) => /^(app|lib)\//.test(f) && /\.tsx?$/.test(f) && !/\.test\./.test(f));
    let writes = 0;
    const offenders: string[] = [];
    for (const f of files) {
      const source = code(f);
      if (/writeSetting\(\s*ownerId\s*,\s*SETTING_KEYS\.programme\s*,/.test(source)) {
        offenders.push(`${f}: writes the part with writeSetting, so its stamp is a separate write`);
      }
      for (const m of source.matchAll(/writeSettings\(\s*\w+\s*,\s*\[([\s\S]*?)\]\s*\)/g)) {
        const list = m[1]!;
        if (!/\[\s*SETTING_KEYS\.programme\s*,/.test(list)) continue;
        writes += 1;
        if (!/\[\s*SETTING_KEYS\.programmeChosenAt\s*,/.test(list)) {
          offenders.push(`${f}: writes the part without programmeChosenAt beside it`);
        }
      }
    }
    assert.ok(writes >= 5, `only ${writes} writes of the part found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
}
