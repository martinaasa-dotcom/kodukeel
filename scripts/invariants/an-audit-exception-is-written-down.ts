import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN ADVISORY THE DEPENDENCY AUDIT LETS THROUGH IS WRITTEN DOWN, AND THE
 * WRITING EXPIRES.
 *
 * `npm audit --audit-level=high` cannot waive one advisory, so a fault with no
 * patched release turns the whole-tree gate red on every branch until upstream
 * publishes one. `scripts/check-audit.mjs` is that gate with each waiver beside
 * its reason. What holds it to being the same gate rather than a softer one is
 * a handful of lines somebody tidying the workflow or the script could take
 * out: the deployed tree is still gated by plain `npm audit` with no waivers,
 * a waiver that matches nothing fails, a waiver whose package has published a
 * newer release fails, and every waiver carries a reason long enough to be one.
 */
export default function anAuditExceptionIsWrittenDown({ check, code, read }: InvariantKit) {
  check("the deployed tree is gated with no waivers and the whole tree through the written list", () => {
    const ci = read(".github/workflows/ci.yml");
    assert.match(ci, /^\s*- run: npm audit --omit=dev --audit-level=high\s*$/m,
      "the production gate is gone or no longer at high, so a waived advisory could reach what ships");
    assert.match(ci, /^\s*- run: (?:node scripts\/check-audit\.mjs|npm run check:audit)\s*$/m,
      "the whole-tree gate no longer runs through the written waivers");
    assert.doesNotMatch(ci, /^\s*- run: npm audit --audit-level=high\s*$/m,
      "the plain whole-tree audit is back, which no waiver can reach, so it fails on what is written down");
    assert.doesNotMatch(ci, /check-audit\.mjs[^\n]*\|\||check:audit[^\n]*\|\|/, "the whole-tree gate is allowed to fail");
    assert.match(read("package.json"), /"check:audit": "node scripts\/check-audit\.mjs"/,
      "the command a contributor runs is not the file that holds the waivers");
  });

  check("a waiver fails again when its advisory leaves the tree or its package publishes a release", () => {
    const script = code("scripts/check-audit.mjs");
    assert.match(script, /const BLOCKING = new Set\(\["high", "critical"\]\)/,
      "the gate no longer reads both high and critical advisories");
    assert.match(script, /if \(ids\.length === 0 \|\| unwaived\.length > 0\) \{\s*failures\.push/,
      "an advisory nobody wrote down, or a vulnerable package naming none, no longer blocks");
    assert.match(script, /if \(!used\.has\(id\)\) \{\s*failures\.push/,
      "a waiver for an advisory no longer in the tree stopped failing, so it can stand as a permission for the next one");
    assert.match(script, /if \(latest !== waiver\.latest\) \{\s*failures\.push/,
      "a waiver whose package has published a newer release stopped failing");
    assert.match(script, /if \(failures\.length > 0\) \{[\s\S]*?process\.exit\(1\)/,
      "a failure is printed and the run still passes");
  });

  check("every written waiver carries a reason", () => {
    const script = read("scripts/check-audit.mjs");
    const list = /const WAIVED = \{([\s\S]*?)\n\};/.exec(script);
    assert.ok(list, "the list of waivers was not found; the pattern stopped matching");
    const entries = [...list[1]!.matchAll(
      /"(GHSA-[\w-]+)": \{\s*package: "[^"]+",\s*latest: "[^"]+",\s*why:\s*((?:"[^"]*"\s*\+?\s*)+),?\s*\}/g,
    )];
    assert.ok(entries.length > 0, "no waiver was read out of the list; the pattern stopped matching");
    for (const [, id, body] of entries) {
      const why = [...body!.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("");
      assert.ok(why.length >= 120, `${id} is waived with ${why.length} characters of reason, which is a label rather than an argument`);
      assert.match(why, /ships in no build|not in the production tree/, `${id} does not say whether it reaches what ships`);
    }
  });
}
