import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * The loader's own check, and the first file it loads.
 *
 * A new check lives in this directory rather than at the foot of
 * `scripts/test-invariants.ts`, so two branches that each add one no longer
 * collide on the same lines. What is asserted is that the loader is still wired
 * and still reaches every file here: a check file the loader skipped would read
 * exactly like a file whose checks all passed.
 */
export default function loaderIsWired({ check, code }: InvariantKit) {
  check("every file in scripts/invariants/ is loaded by the suite", () => {
    const suite = code("scripts/test-invariants.ts");
    assert.match(suite, /for \(const file of invariantFiles\)/, "the loader in test-invariants.ts is gone");
    assert.match(suite, /readdirSync\(INVARIANT_DIR\)\.filter\(\(f\) => f\.endsWith\("\.ts"\)\)/,
      "the loader no longer reads every .ts file in scripts/invariants/");
    const files = readdirSync("scripts/invariants").filter((f) => f.endsWith(".ts"));
    assert.ok(files.length >= 1, "scripts/invariants/ holds no check files, so this stopped looking");
    const strays = readdirSync("scripts/invariants").filter((f) => !f.endsWith(".ts"));
    assert.deepEqual(strays, [], `these files in scripts/invariants/ are never loaded: ${strays.join(", ")}`);
  });
}
