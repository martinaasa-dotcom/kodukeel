import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function subprocessorsMatchRecipients({ check, code, read }: InvariantKit) {
  check("the subprocessor register names the AI providers the recipients list names, no more", () => {
    /*
      `docs/26-subprocessors.md` is what a reviewer reads to learn who receives
      a learner's text, and `lib/legal/recipients.ts` is what `/privacy` is
      generated from. They are two answers to one question, and the register kept
      OpenRouter as a recipient after the provider chain stopped naming it, so a
      buyer's engineer reading the register was told about a transfer the app
      could no longer make. The provider table is held to `PROVIDER_HOME` in
      both directions, since one the register misses is the worse of the two.
    */
    const home = code("lib/legal/recipients.ts").match(/const PROVIDER_HOME[^=]*=\s*\{([\s\S]*?)\};/);
    assert.ok(home, "PROVIDER_HOME has moved or been renamed in lib/legal/recipients.ts");
    const providers = [...home[1]!.matchAll(/^\s*(?:"([^"]+)"|(\w+)):/gm)].map((m) => (m[1] ?? m[2])!).sort();
    const doc = read("docs/26-subprocessors.md");
    const section = doc.split(/^### The AI provider chain$/m)[1]?.split(/^### /m)[0] ?? "";
    const rows = [...section.matchAll(/^\| ([^|]+?) \| [^|]+ \| (?:Inside|Outside) \|$/gm)].map((m) => m[1]!.trim()).sort();
    assert.ok(providers.length >= 3 && rows.length >= 3, `read ${providers.length} providers and ${rows.length} register rows, so one side has stopped being read`);
    assert.deepEqual(rows, providers, `the register lists ${rows.join(", ")} and the app sends to ${providers.join(", ")}`);
  });
}
