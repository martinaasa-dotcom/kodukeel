import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A ROUND THAT ASKS CARDS OUT OF THE DECK ASKS NO BARE FORM.
 *
 * Reported off the daily quest: `ravim` alone under `Say "onto the medicine"`,
 * then again under "out of the medicine", a case card an old deck still held
 * from before case cards became sentences. Review has read every such row
 * through `sentenceFronts` (lib/progress/formCards.ts), which asks it as the
 * sentence the builder makes today or leaves it out; the quest read the deck
 * the same way and never asked. So the rule is drawn on the reader of a stored
 * front: a module under `lib/progress/` that hands deck fronts to a round
 * (`readableFront`) also reads them through `sentenceFronts` or `askableRows`.
 */
export default function aRoundNeverAsksABareForm(kit: InvariantKit) {
  const { check, code, LIB } = kit;
  check("every round reading stored card fronts reads them through `sentenceFronts`", () => {
    const readers = LIB.filter((f) => f.startsWith("lib/progress/") && !/\.test\.ts$|\.itest\.ts$/.test(f))
      .filter((f) => /\breadableFront\(/.test(code(f)));
    assert.ok(readers.length >= 2, `found ${readers.length} round(s) reading stored fronts; the sweep has stopped matching`);
    const bare = readers.filter((f) => !/\b(?:sentenceFronts|askableRows)\(/.test(code(f)));
    assert.deepEqual(bare, [], `these hand stored fronts to a round without asking whether a bare form card has a sentence: ${bare.join(", ")}`);
  });
}
