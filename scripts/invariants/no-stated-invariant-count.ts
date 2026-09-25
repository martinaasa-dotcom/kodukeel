import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

export default function noStatedInvariantCount({ check, read }: InvariantKit) {
  check("no document states how many invariants there are, outside the dated log", () => {
    /*
      The security review and the control map both said "279 invariants" when
      this file held over four hundred. A count of rules goes stale with the next
      rule added, which is every pull request, and a reviewer who checks one
      figure and finds it wrong reads the rest of the document with that in mind.
      So a document names the suite rather than its size. `docs/13-mvp-status.md`
      is exempt because it is a log, and each pass there records the count it
      reached on its own day.
    */
    const docs = [
      ...readdirSync("docs").filter((f) => f.endsWith(".md") && f !== "13-mvp-status.md").map((f) => `docs/${f}`),
      "README.md", "SECURITY.md", "CLAUDE.md",
    ].filter((f) => existsSync(f));
    assert.ok(docs.length >= 20, `read only ${docs.length} documents, so the sweep has stopped reading what it should`);
    const stated = docs.flatMap((f) => [...read(f).matchAll(/\b\d[\d,]* (?:invariants|asserted rules)\b/g)].map((m) => `${f}: "${m[0]}"`));
    assert.ok(stated.length === 0, `states a count that moves with every rule added: ${stated.join(", ")}`);
  });
}
