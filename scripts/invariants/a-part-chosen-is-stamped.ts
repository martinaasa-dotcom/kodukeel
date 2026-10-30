import assert from "node:assert/strict";
import type { InvariantKit } from "../lib/invariantKit";

/**
 * A PART IS WRITTEN WITH ITS STAMP AND THE FURTHEST PART, IN ONE TRANSACTION.
 *
 * `programme` is where the learner is, `programmeChosenAt` says they chose it
 * (the lessons' switch reads a part with no stamp as one to send back,
 * `partAfterSwitch`), and `highestPart` is the furthest they have been, which
 * lets a learner who stepped down move back up (`moveBlockedFor`). Written as
 * upserts side by side, a dropped connection left a chosen part looking
 * unchosen, and a move that forgot the third trapped a B1 learner behind A2's
 * checks. So every move goes through `choosePart`, and nothing else writes the
 * part at all.
 */
const HOME = "lib/progress/course.ts";

export default function aPartChosenIsStamped({ check, code, ALL }: InvariantKit) {
  check("the part a learner is on is written only by choosePart, with its stamp and the furthest part", () => {
    const files = ALL.filter((f) => /^(app|lib)\//.test(f) && /\.tsx?$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f));
    const offenders: string[] = [];
    let calls = 0;
    for (const f of files) {
      const source = code(f);
      if (/writeSettings?\([^;]*?SETTING_KEYS\.programme\s*[,\]]/.test(source) && f !== HOME) {
        offenders.push(`${f}: writes the part itself rather than through choosePart`);
      }
      calls += [...source.matchAll(/\bchoosePart\(/g)].length;
    }
    const home = code(HOME);
    const at = home.indexOf("export async function choosePart(");
    assert.ok(at >= 0, `choosePart is not in ${HOME}`);
    const body = home.slice(at, home.indexOf("\n}\n", at));
    for (const key of ["programme", "programmeChosenAt", "highestPart"]) {
      assert.match(body, new RegExp(`\\[SETTING_KEYS\\.${key}\\s*,`), `choosePart no longer writes ${key}`);
    }
    assert.match(body, /writeSettings\(/, "choosePart no longer writes in one transaction");
    // Five doors move a learner today (first run, the module's next part, an offer, two level pickers); the floor is below that.
    assert.ok(calls >= 4, `only ${calls} calls to choosePart found, so the haystack stopped matching`);
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
}
