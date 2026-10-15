import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";
import { CLAIMS } from "../../lib/evidence/claims";

/**
 * EVERY CLAIM ON "HOW WE KNOW" NAMES A COMMAND THAT EXISTS AND A FILE THAT FAILS.
 *
 * The page is only worth publishing if a reviewer can run each command and
 * get the figure, and open the file that says what happens when the rule
 * breaks. So each claim's script has to be a script in package.json, its
 * asserting file has to exist, and a claim the evidence script is meant to
 * measure has to have a reader there, or `npm run evidence` would leave it
 * on "not measured yet" for ever with nothing failing.
 *
 * And the page has to print what the table holds: the date, the command and
 * the file, anchored on the calls rather than on the words, since a page that
 * imported the table and printed the claim alone would satisfy a check that
 * only looked for the import.
 */
export default function everyClaimNamesItsCommand({ check, code }: InvariantKit) {
  check("every claim on /how-we-know names an npm script, a file that asserts it, and is printed with its date", () => {
    const scripts = Object.keys((JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts);
    assert.ok(CLAIMS.length >= 12 && CLAIMS.length <= 20, `${CLAIMS.length} claims, where the brief asks for twelve to twenty`);
    const measure = code("scripts/measure-evidence.ts");
    for (const claim of CLAIMS) {
      assert.ok(scripts.includes(claim.script), `${claim.id} names npm run ${claim.script}, which package.json does not have`);
      assert.ok(existsSync(claim.assertedBy), `${claim.id} says it is asserted in ${claim.assertedBy}, which does not exist`);
      if (!claim.recorded) {
        assert.match(measure, new RegExp(`\\n  ${claim.id}: \\{`), `${claim.id} is not recorded by hand and npm run evidence has no reader for it`);
      }
    }
    const page = code("app/how-we-know/page.tsx");
    for (const call of ["measuredOn(row.on)", "commandFor(row)", "row.assertedBy", "row.figure"]) {
      assert.ok(page.includes(call), `/how-we-know no longer prints ${call}`);
    }
  });
}
