import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

export default function copyButtonsWaitForTheClipboard({ check, ALL, code }: InvariantKit) {
  check("a copy button says Copied only once the clipboard took the text", () => {
    /*
      Three buttons called navigator.clipboard.writeText bare and said "Copied"
      in the same breath: on plain http the clipboard is undefined and the press
      threw, and where the browser refused the write the button said "Copied"
      anyway. writeClipboard in lib/ux/clipboard.ts is the one caller, and it
      answers only after the write resolved, so every button reads its answer
      through useCopy.
    */
    const writers = ALL.filter((f) => !f.endsWith(".test.ts") && /clipboard\??\.writeText\s*\(/.test(code(f)));
    assert.deepEqual(writers, ["lib/ux/clipboard.ts"], `these write to the clipboard themselves: ${writers.join(", ")}`);
    const users = ALL.filter((f) => /\buseCopy\(/.test(code(f)) && !f.endsWith("components/useCopy.ts"));
    assert.ok(users.length >= 3, `only ${users.length} copy buttons read useCopy, so this check stopped looking`);
  });
}
