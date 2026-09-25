import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

export default function governanceNamesReadVariables({ check, ALL, code, read }: InvariantKit) {
  check("a governance document names only variables the app reads", () => {
    /*
      The DPIA, the retention schedule, the subprocessor register, the threat
      model, the incident plan and the control map are what a reviewer reads,
      and each names environment variables: which key opens what, which service
      a key sends data to. `OPENROUTER_API_KEY` stayed in the incident plan's
      table of keys to rotate, the subprocessor register and the CI canary
      example for months after no chain read it, so a reviewer was told a
      company received learner prompts that had not received one since. A
      variable the code does not read is a claim about a deployment nobody has.
    */
    const docs = readdirSync("docs").filter((f) => /^2[3-9]-.*\.md$/.test(f)).map((f) => `docs/${f}`);
    assert.ok(docs.length >= 6, `found ${docs.length} governance documents, expected at least six`);
    const source = [
      ...[...ALL, "middleware.ts", "prisma.config.ts"].filter((f) => existsSync(f)).map((f) => code(f)),
    ].join("\n");
    const named = new Set<string>();
    for (const file of docs) {
      for (const m of read(file).matchAll(/\b([A-Z][A-Z0-9_]*_(?:API_KEY|TOKEN|SECRET|URL|KEY))\b/g)) named.add(m[1]!);
    }
    assert.ok(named.size >= 10, `only ${named.size} variables named across the governance documents`);
    const unread = [...named].filter((name) => !new RegExp(`\\b${name}\\b`).test(source));
    assert.deepEqual(unread, [], `the governance documents name ${unread.join(", ")}, which nothing in the app reads`);
  });
}
