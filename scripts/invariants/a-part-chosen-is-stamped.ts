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
 * checks. So every move a learner or an admin makes goes through `choosePart`.
 *
 * Two other paths write the setting table straight with the part among the
 * rows, and each is named below with why, so a third cannot arrive unseen. A
 * restore replaces a learner's settings from a file inside its own
 * transaction, reading the backup's own stamp and furthest part, which no
 * single move describes; the admin reset deletes a part setting this build no
 * longer holds. The check reads every direct write to `setting` (through
 * `prisma` or a transaction), takes the function it sits in, and refuses one
 * whose body names `SETTING_KEYS.programme` unless it is on that list. The
 * list is checked both ways, so an entry that stops writing the part has to go.
 */
const HOME = "lib/progress/course.ts";

const RAW_PART_WRITERS: Readonly<Record<string, string>> = {
  "app/actions.ts#restoreBackup":
    "replaces the learner's settings from a backup in one transaction, the part with the backup's own stamp, a rehomed part with none, and the furthest part merged with the one held",
  "lib/progress/courseReset.ts#resetCourseProgress":
    "deletes a part setting naming a part this build no longer has; every part it writes goes through choosePart",
};

const RAW_WRITE = /\b(?:prisma|tx)\.setting\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g;

/** The top-level function an index sits in, with its name and body. */
function enclosing(source: string, at: number): { name: string; body: string } | null {
  const heads = [...source.slice(0, at).matchAll(/\n(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g)];
  const head = heads.at(-1);
  if (!head || head.index === undefined) return null;
  const end = source.indexOf("\n}\n", head.index);
  return { name: head[1]!, body: source.slice(head.index, end < 0 ? source.length : end) };
}

export default function aPartChosenIsStamped({ check, code, ALL }: InvariantKit) {
  check("the part a learner is on is written only by choosePart, with its stamp and the furthest part", () => {
    const files = ALL.filter((f) => /^(app|lib)\//.test(f) && /\.tsx?$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f));
    const offenders: string[] = [];
    const seen = new Set<string>();
    let calls = 0;
    let rawWrites = 0;
    for (const f of files) {
      const source = code(f);
      if (/(?:writeSettings?|updateSettings)\([^;]*?SETTING_KEYS\.programme\s*[,\]]/.test(source) && f !== HOME) {
        offenders.push(`${f}: writes the part itself rather than through choosePart`);
      }
      for (const write of source.matchAll(RAW_WRITE)) {
        rawWrites += 1;
        const fn = enclosing(source, write.index ?? 0);
        if (!fn || !/SETTING_KEYS\.programme\b/.test(fn.body)) continue;
        const key = `${f}#${fn.name}`;
        seen.add(key);
        if (!RAW_PART_WRITERS[key]) offenders.push(`${key}: writes the setting table straight with the part among the rows`);
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
    // The furthest part is read and written back, so it is read under the learner's lock.
    assert.match(body, /updateSettings\(ownerId, \[SETTING_KEYS\.highestPart\]/, "choosePart no longer reads the furthest part under the learner's lock");
    // Six doors move a learner today (first run, the module's next part, an offer, two level pickers, the admin reset); the floor is below that.
    assert.ok(calls >= 5, `only ${calls} calls to choosePart found, so the haystack stopped matching`);
    // Ten direct writes to the setting table today, two of them with the part; a matcher that stops matching reads as clean.
    assert.ok(rawWrites >= 8, `only ${rawWrites} direct setting writes found, so the haystack stopped matching`);
    for (const key of Object.keys(RAW_PART_WRITERS)) {
      if (!seen.has(key)) offenders.push(`${key}: on the list of direct part writers and no longer writes the part, so take it off`);
    }
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
}
