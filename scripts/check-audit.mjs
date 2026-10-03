#!/usr/bin/env node
/**
 * The dependency audit over the whole tree, with every exception written down
 * beside its reason.
 *
 * `npm audit --audit-level=high` cannot except one advisory, so an advisory
 * with no patched release anywhere fails every pull request until upstream
 * publishes one. That happened on 2026-10-03 with GHSA-vfj7-8cjw-p6xm in
 * `braces`, red on main and on every branch, about a package that reaches only
 * the lint tooling. The workflow's own rule is to fix the dependency or say in
 * writing why it is unreachable, never to lower the number, and this file is
 * the writing: an advisory listed here does not fail the run, and every other
 * high or critical one still does.
 *
 * EACH ENTRY IS CHECKED BOTH WAYS, SO IT CANNOT BECOME A PARKING SPACE. It
 * fails when the advisory is no longer in the tree, because an exception for
 * nothing is a standing permission for whatever arrives under that id next.
 * And it fails when the registry holds a release outside the advisory's
 * vulnerable range, because then the dependency can be fixed rather than
 * excused. That second half asks the registry, so a run that cannot reach it
 * fails rather than passing on no answer.
 *
 * WHAT THIS DOES NOT EXCUSE is the production tree. `npm audit --omit=dev
 * --audit-level=high` runs beside this in CI with no exceptions at all, so an
 * excepted advisory that ever reaches what ships fails there.
 */
import { execFileSync } from "node:child_process";

const EXCEPTED = new Map([
  [
    "GHSA-vfj7-8cjw-p6xm",
    "braces <=3.0.3, with no patched release published. Reached only through the lint plugin " +
      "(eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces), " +
      "which expands glob patterns written in this repository's own config. Nothing a learner " +
      "sends reaches it, and it is not in the production tree, which the gate beside this one asserts.",
  ],
]);

/** The versions outside a vulnerable range, as a range npm can ask for, or null where it cannot be read. */
function outside(range) {
  const atMost = /^<=\s*(\S+)$/.exec(range.trim());
  if (atMost) return `>${atMost[1]}`;
  const below = /^<\s*(\S+)$/.exec(range.trim());
  if (below) return `>=${below[1]}`;
  return null;
}

function npm(args) {
  try {
    return execFileSync("npm", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything, with the report on stdout.
    if (args[0] === "audit" && error.stdout) return error.stdout;
    throw error;
  }
}

const report = JSON.parse(npm(["audit", "--json"]));
const blocking = [];
const seen = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== "object") continue;
    const id = via.url?.split("/").pop();
    if (!id || !["high", "critical"].includes(via.severity)) continue;
    seen.set(id, via);
    if (!EXCEPTED.has(id)) blocking.push(`${via.severity}  ${via.name} ${via.range}  ${via.url}`);
  }
}

for (const [id, why] of EXCEPTED) {
  const via = seen.get(id);
  if (!via) {
    blocking.push(`${id} is excepted in scripts/check-audit.mjs and is no longer in the tree: take the entry out`);
    continue;
  }
  const wanted = outside(via.range);
  if (wanted === null) {
    blocking.push(`${id} has a vulnerable range this check cannot read (${via.range}): decide by hand whether a fix exists`);
    continue;
  }
  let patched;
  try {
    patched = npm(["view", `${via.name}@${wanted}`, "version", "--json"]).trim();
  } catch (error) {
    // The registry answers "nothing published in that range" as a 404 naming
    // the range, which is the answer this asks for. Anything else is no answer.
    let said = null;
    try {
      said = JSON.parse(error.stdout ?? "").error ?? null;
    } catch {
      said = null;
    }
    if (said?.code === "E404" && /^No match found for version/.test(said.summary ?? "")) {
      patched = "";
    } else {
      blocking.push(`${id}: could not ask the registry whether ${via.name}@${wanted} exists (${said?.summary ?? error.message.split("\n")[0]})`);
      continue;
    }
  }
  if (patched !== "" && patched !== "[]") {
    blocking.push(`${id}: ${via.name}@${wanted} is published (${patched}), so this can be fixed rather than excepted`);
    continue;
  }
  console.log(`excepted  ${id}: ${why}`);
}

if (blocking.length > 0) {
  console.error(blocking.join("\n"));
  process.exit(1);
}
console.log("No high or critical advisory outside the written exceptions.");
