import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * NATIVE GEMINI CALLS SAY HOW MUCH TO THINK AS A LEVEL, NEVER A BUDGET.
 *
 * `thinkingBudget` is deprecated and returns 400 on Google's coming models
 * (notice of 2026-10-07). `thinkingFor` in `lib/tutor/thinking.ts` knows the
 * least each model takes: `minimal` on the Lite, `low` on the flash.
 */
export default function geminiThinkingIsALevel({ check, code, sourceFiles }: InvariantKit) {
  check("no native Gemini call sets the deprecated thinkingBudget", () => {
    const files = [...sourceFiles("lib"), ...sourceFiles("scripts", /\.(ts|mjs)$/), ...sourceFiles("app")].filter(
      (f) => !/\.test\.ts$/.test(f) && !f.includes("scripts/invariants/"),
    );
    assert.ok(files.length > 50, "the sweep found almost nothing to read");
    const bad = files.filter((f) => /thinkingBudget/.test(code(f)));
    assert.deepEqual(bad, [], `thinkingBudget in ${bad.join(", ")}`);
  });
}
