import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A PLACE CASE IS ASKED WHERE A SENTENCE SAYS IT, AND A LOAN ONLY ON ITS OWN SPELLING.
 *
 * Two rules from one pass, and both are about what a recorded sentence settles.
 *
 * The writing round set a task for every local case the morphology permits, and
 * a B2 evening opened on "Use aadress in a sentence that says into the address",
 * which is the rule's form and not something anybody sends a letter to. In and
 * on and to are where a thing's meaning turns, so the round asks a local case
 * only where a sentence records the form. That page is a server component over
 * Prisma and no unit test reaches it, so this asks the code.
 *
 * And a sentence lent from another headword is gapped only on the spelling it
 * was lent for (`Example.via`, `lentFor`): `Peas valitses tühjus, nagu
 * käsipidur olnuks peal` is lent to `pea` for `Peas`, and the deck builder cut
 * `peal` out of it as the adessive of a head. Every reader that gaps a loan
 * asks `lentFor`, so a fourth cannot gap one without asking.
 */
const GAPS_A_LOAN = ["lib/srs/cards.ts", "lib/games/flash.ts"];

export default function aPlaceCaseIsAskedWhereItIsSaid({ check, code }: InvariantKit) {
  check("the writing round sets a local case only where a sentence records the form", () => {
    const page = code("app/(app)/review/write/page.tsx");
    assert.match(
      page,
      /isLocalCase\(task\.caseKey\)\s*&&\s*!said\(task\.targetForm\)/,
      "the writing round sets a local case nobody has recorded, which is how `into the address` led a round",
    );
    assert.match(page, /lentFor\(/, "the writing round counts a loan as recording a spelling it was not lent for");
  });

  check("a borrowed sentence is gapped only on the spelling it was lent for", () => {
    for (const file of GAPS_A_LOAN) {
      assert.match(code(file), /lentFor\(/, `${file} gaps a borrowed sentence without asking what it was lent for`);
    }
    const borrow = code("lib/dict/borrow.ts");
    assert.match(borrow, /via:\s*\[/, "borrowSentences no longer records which spelling a loan was made for");
  });
}
