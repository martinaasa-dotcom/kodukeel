import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A TYPED MISS MOST OF THE WAY THERE IS PAINTED NEARLY, ON EVERY SCREEN.
 *
 * A learner typed `muudama` for `muutuma`, six letters of seven in place, and
 * read it in blush, the colour a blank box gets. One screen over, `keeldama`
 * for `keelduma` was butter, because the typo rule happened to forgive it. The
 * operator's rule is the same everywhere: blush is for an answer nowhere near,
 * or nothing typed, and an answer most of the way there is the butter "nearly".
 * `nearMiss` in `lib/estonian/answer.ts` is where the line is drawn; the grade
 * is untouched, so this is about the colour alone.
 *
 * Two arms. A screen that marks a typed answer with one of the app's markers
 * and paints a verdict has to read the near-miss reading (`verdictOfCheck`,
 * `verdictOfMark`, a `close` flag or `nearMiss` itself), so the next round
 * written does not paint every miss blush by default. And `verdictOfCheck` is
 * handed the whole check, never `.verdict` alone, since the bare string has
 * thrown the close reading away before the function sees it.
 */
const MARKERS = /\b(?:checkAnswer|markForm|markFlash|markTyped|markLine|gradeWrite|isClozeCorrect)\(/;
const PAINTS = /\bVERDICT_(?:CLASS|INK)\b/;
const READS_CLOSE = /\bverdictOfCheck\(|\bverdictOfMark\(|\bnearMiss\(|\.close\b|\bclose\b/;

export default function aCloseMissIsNearly({ check, ALL, code }: InvariantKit) {
  check("every screen that marks a typed answer paints a close miss as nearly", () => {
    const screens = ALL.filter((f) => /^(app|components)\//.test(f) && f.endsWith(".tsx"))
      .filter((f) => { const s = code(f); return MARKERS.test(s) && PAINTS.test(s); });
    assert.ok(screens.length >= 10, `only ${screens.length} marking screens found, so the haystack stopped matching`);
    const blind = screens.filter((f) => !READS_CLOSE.test(code(f)));
    assert.deepEqual(blind, [], `${blind.join("\n")}\npaint a typed miss through verdictOfCheck(check) or verdictOfMark(mark), or read check.close`);
  });

  check("verdictOfCheck is handed the whole check, never .verdict alone", () => {
    const files = ALL.filter((f) => /^(app|components|lib)\//.test(f) && /\.tsx?$/.test(f) && !f.endsWith(".test.ts"));
    const offenders = files.filter((f) => /\bverdictOfCheck\([^()]*\.verdict\)/.test(code(f)));
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\npass the check itself, so its close reading reaches the colour`);
  });
}
