import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

export default function oneCopyOfEachCheck({ check, code }: InvariantKit) {
  check("no invariant is registered twice under one label", () => {
    /*
      A merge that keeps both sides of a conflict in scripts/test-invariants.ts
      can keep one check twice, and the suite prints PASS twice and counts two.
      "a grade queued after a failed online write keeps the id it was sent with"
      ran twice on main, word for word, and nothing said so: a duplicate reads
      as a suite with one more rule than it has, and the day the two copies are
      edited apart there are two answers to one question. Read off the code, so
      a label quoted in a comment is not counted.
    */
    const files = ["scripts/test-invariants.ts"].concat(
      readdirSync("scripts/invariants").filter((f) => f.endsWith(".ts")).map((f) => `scripts/invariants/${f}`),
    );
    const seen = new Map<string, string>();
    const twice: string[] = [];
    for (const file of files) {
      for (const m of code(file).matchAll(/(?:^|[^\w.])check\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        const label = m[1]!;
        const first = seen.get(label);
        if (first) twice.push(`"${label}" (${first} and ${file})`);
        else seen.set(label, file);
      }
    }
    assert.ok(seen.size >= 400, `found only ${seen.size} check labels, so this stopped looking`);
    assert.deepEqual(twice, [], `registered more than once: ${twice.join("; ")}`);
  });
}
