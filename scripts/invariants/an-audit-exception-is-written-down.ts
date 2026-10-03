import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * AN ADVISORY THE DEPENDENCY AUDIT LETS THROUGH IS WRITTEN DOWN, AND THE
 * WRITING EXPIRES.
 *
 * `npm audit --audit-level=high` cannot except one advisory, so a fault with no
 * patched release turns the whole-tree gate red on every branch until upstream
 * publishes one. `scripts/check-audit.mjs` is that gate with each exception
 * beside its reason. Three things hold it to being the same gate rather than a
 * softer one, and each is a line somebody tidying the workflow could take out:
 * the deployed tree is still gated by plain `npm audit` with no exceptions, an
 * exception that names an advisory no longer in the tree fails, and an
 * exception whose package has published a fix fails. And every exception
 * carries a reason long enough to be one.
 */
export default function anAuditExceptionIsWrittenDown({ check, code, read }: InvariantKit) {
  check("the deployed tree is gated with no exceptions and the whole tree through the written list", () => {
    const ci = read(".github/workflows/ci.yml");
    assert.match(ci, /^\s*- run: npm audit --omit=dev --audit-level=high\s*$/m,
      "the production gate is gone or no longer at high, so an excepted advisory could reach what ships");
    assert.match(ci, /^\s*- run: npm run check:audit\s*$/m,
      "the whole-tree gate no longer runs through the written exceptions");
    assert.doesNotMatch(ci, /check:audit[^\n]*\|\|/, "the whole-tree gate is allowed to fail");
    assert.match(read("package.json"), /"check:audit": "node scripts\/check-audit\.mjs"/,
      "the script the workflow runs is not the file that holds the exceptions");
  });

  check("an exception fails again when its advisory leaves the tree or a fix is published", () => {
    const script = code("scripts/check-audit.mjs");
    assert.match(script, /\["high", "critical"\]\.includes\(via\.severity\)/,
      "the gate no longer reads both high and critical advisories");
    assert.match(script, /if \(!EXCEPTED\.has\(id\)\) blocking\.push/,
      "an advisory nobody wrote down no longer blocks");
    assert.match(script, /if \(!via\) \{\s*blocking\.push\(`\$\{id\} is excepted/,
      "an exception for an advisory no longer in the tree stopped failing, so it can stand as a permission for the next one");
    assert.match(script, /if \(patched !== "" && patched !== "\[\]"\) \{\s*blocking\.push/,
      "an exception whose package has published a fix stopped failing");
    assert.match(script, /if \(wanted === null\) \{\s*blocking\.push/,
      "a vulnerable range the check cannot read passes instead of being decided by hand");
    assert.match(script, /blocking\.push\(`\$\{id\}: could not ask the registry/,
      "a registry that will not answer passes instead of failing");
  });

  check("every written exception carries a reason", () => {
    const script = read("scripts/check-audit.mjs");
    const list = /const EXCEPTED = new Map\(\[([\s\S]*?)\n\]\);/.exec(script);
    assert.ok(list, "the list of exceptions was not found; the pattern stopped matching");
    const entries = [...list[1]!.matchAll(/\[\s*"(GHSA-[\w-]+)",\s*((?:"[^"]*"\s*\+?\s*)+),?\s*\]/g)];
    assert.ok(entries.length > 0, "no exception was read out of the list; the pattern stopped matching");
    for (const [, id, body] of entries) {
      const why = [...body!.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("");
      assert.ok(why.length >= 120, `${id} is excepted with ${why.length} characters of reason, which is a label rather than an argument`);
      assert.match(why, /production tree/, `${id} does not say whether it reaches what ships`);
    }
  });
}
