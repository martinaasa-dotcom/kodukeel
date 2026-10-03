#!/usr/bin/env node
/**
 * `npm audit --audit-level=high` over the whole tree, dev included, with the
 * one thing `npm audit` cannot do: an advisory nobody can fix yet, waived in
 * writing.
 *
 * The workflow's rule is "if either cannot pass, fix the dependency or say
 * here, in writing, why it is unreachable. Do not lower a number." Saying it in
 * a comment does not make a command pass, and a gate red on every pull request
 * for an advisory with no patched release is the gate people learn to click
 * past, which is the outcome that rule was written against. So the saying is
 * here, as data, and it is held to three things:
 *
 * - **It names one advisory**, by id, never a package or a severity, so the
 *   next advisory against the same package still fails.
 * - **It says why it cannot be reached**, in a sentence somebody can check.
 * - **It ends by itself.** A waiver records the latest release of the package
 *   at the time it was written; the day a newer release is published this
 *   fails and says to take the fix. And a waiver that matches nothing fails
 *   too, so one that has done its job cannot stay behind as a standing
 *   permission.
 *
 * Every other high or critical advisory fails exactly as the plain command did.
 */
import { execFileSync } from "node:child_process";

/** Advisories nobody can fix yet, each with why it cannot be reached. */
const WAIVED = {
  "GHSA-vfj7-8cjw-p6xm": {
    package: "braces",
    latest: "3.0.3",
    why:
      "Stack exhaustion on a deeply nested brace pattern, in every release of braces there is " +
      "(<=3.0.3, and 3.0.3 is the latest). It is in the tree once, under eslint-config-next -> " +
      "@next/eslint-plugin-next -> fast-glob -> micromatch, which globs the pages directories " +
      "this repository's own lint config names. Nothing a user sends reaches it, it runs only " +
      "while somebody lints, and it ships in no build.",
  },
};

const BLOCKING = new Set(["high", "critical"]);

function audit() {
  try {
    return JSON.parse(execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 << 20 }));
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything, with the report on stdout.
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

const report = audit();
const vulnerabilities = report.vulnerabilities ?? {};

/** Every advisory id a vulnerable package is there because of, through its chain. */
function advisoriesOf(name, seen = new Set()) {
  if (seen.has(name)) return new Set();
  seen.add(name);
  const out = new Set();
  for (const via of vulnerabilities[name]?.via ?? []) {
    if (typeof via === "string") for (const id of advisoriesOf(via, seen)) out.add(id);
    else out.add(String(via.url ?? via.source).split("/").pop());
  }
  return out;
}

const failures = [];
const used = new Set();

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!BLOCKING.has(vulnerability.severity)) continue;
  const ids = [...advisoriesOf(name)];
  const unwaived = ids.filter((id) => !(id in WAIVED));
  ids.filter((id) => id in WAIVED).forEach((id) => used.add(id));
  if (ids.length === 0 || unwaived.length > 0) {
    failures.push(`${name} (${vulnerability.severity}): ${unwaived.join(", ") || "no advisory named"}`);
  }
}

for (const [id, waiver] of Object.entries(WAIVED)) {
  if (!used.has(id)) {
    failures.push(`${id} is waived and no longer in the tree: take the waiver out of scripts/check-audit.mjs`);
    continue;
  }
  const latest = execFileSync("npm", ["view", waiver.package, "version"], { encoding: "utf8" }).trim();
  if (latest !== waiver.latest) {
    failures.push(
      `${waiver.package} ${latest} is out, after ${waiver.latest} when ${id} was waived: `
      + "if it fixes the advisory, take it and remove the waiver; if not, record the new release",
    );
  }
}

for (const [id, waiver] of Object.entries(WAIVED)) {
  if (used.has(id)) console.log(`waived ${id} (${waiver.package}): ${waiver.why}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} advisory problem(s) at high or above:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log("\nNo unwaived advisory at high or above.");
