import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERY FEATURE `PAID_OFF` CAN NAME IS ONE SOMETHING ASKS ABOUT.
 *
 * A switch nothing reads is the worst kind: an operator sets it during an
 * incident, the dashboard shows it set, and the spending carries on. So each
 * of the six names in `lib/usage/switches.ts` has to be asked, as
 * `isOff("<name>")`, in the code that would otherwise reach a model, read with
 * comments stripped so a note mentioning the call does not count.
 *
 * And the switch may never reach the ledger (docs/38-third-batch.md, D11):
 * metering stays on for whatever is still on, so nothing under `lib/usage/`
 * other than the switch itself may ask it.
 */
export default function everyPaidSwitchIsAsked({ check, code, ALL }: InvariantKit) {
  check("every feature PAID_OFF can switch off is asked somewhere, and the ledger never asks", () => {
    const table = code("lib/usage/switches.ts");
    const list = (/PAID_FEATURES = \[([^\]]*)\]/.exec(table)?.[1] ?? "") + (/FREE_FEATURES = \[([^\]]*)\]/.exec(table)?.[1] ?? "");
    const features = [...list.matchAll(/"([a-z]+)"/g)].map((m) => m[1]!);
    assert.equal(features.length, 6, `read ${features.length} features off lib/usage/switches.ts, so this stopped reading them`);

    const askers = ALL.filter((f) => /\.(ts|tsx)$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f) && f !== "lib/usage/switches.ts");
    for (const feature of features) {
      const asked = askers.filter((f) => code(f).includes(`isOff("${feature}")`));
      assert.ok(asked.length > 0, `PAID_OFF can name ${feature} and nothing asks isOff("${feature}"), so setting it switches nothing off`);
    }
    const ledger = askers.filter((f) => f.startsWith("lib/usage/") && /\bisOff\(/.test(code(f)));
    assert.deepEqual(ledger, [], `the ledger asks the switch, which would let it switch metering off: ${ledger.join(", ")}`);
  });
}
