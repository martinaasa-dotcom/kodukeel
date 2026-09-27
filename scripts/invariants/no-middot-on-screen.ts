import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE MIDDOT IS ON NO SCREEN.
 *
 * It was the separator this app reached for between any two facts, "Assumed ·
 * 5/688", "A1 · 5 of 1644 words known", "20 questions · 80% to pass", and it
 * was reported as the mark that makes a page read as machine-made. Two facts
 * side by side take a comma, or a line of their own, or a hairline drawn as an
 * element; a placeholder takes nothing.
 *
 * Two modules still *read* it, and are the only ones allowed to name it: cards
 * and dictionary entries stored before this carry it in `Card.hint` and in
 * Ekilex's `Lexeme.government`, so the functions turning those into a screen's
 * words split on it and print a comma. The stored rows are never rewritten.
 *
 * Read off the code rather than the file, so a comment quoting the old copy
 * is not a fault, and in all three spellings: the character, the HTML entity
 * and the escape, since the escape is how it survived the first sweep.
 */
const READERS = new Set([
  "lib/copy/caseHint.ts",
  "lib/estonian/government.ts",
]);

const DOT = /·|&middot;|&#183;|\\u00b7/i;

export default function noMiddotOnScreen({ check, ALL, code }: InvariantKit) {
  check("the middot is on no screen, and only the two readers of stored data name it", () => {
    const scanned = ALL.filter((f) =>
      /^(app|components|lib)\//.test(f) && /\.(ts|tsx)$/.test(f)
      && !/\.(test|itest)\.tsx?$/.test(f));
    assert.ok(scanned.length > 200, `only ${scanned.length} files scanned, so the haystack stopped matching`);
    const offenders = scanned.filter((f) => !READERS.has(f) && DOT.test(code(f)));
    assert.deepEqual(offenders, [], `a middot is back in ${offenders.join(", ")}; separate two facts with a comma`);
    for (const reader of READERS) {
      assert.ok(DOT.test(code(reader)), `${reader} no longer reads the middot, so drop it from READERS`);
    }
  });
}
