import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A CASE IS NAMED THE PLAIN WAY: "2nd form", "in-form (-s)".
 *
 * The operator's call, which supersedes leading with the Estonian name: the
 * three forms a noun is learned in are numbered, every other case is named by
 * what it does with its ending beside it, and a verb's forms are the -ma form,
 * the -da form and the I form. No Latin name and no Estonian grammar name on a
 * screen, except quietly on the grammar reference page under "In class".
 *
 * Three arms. `CaseLabel`, the one drawing of a case beside its question,
 * prints the plain name; the table names every case in every language and the
 * screen-wide translation table can say each of them; and no prose string in
 * `app/` or `components/` names a case by its Estonian name in English.
 */
const ESTONIAN_NAMES = /\b(the|its|an?) (nimetav|omastav|osastav|sisseütlev|seesütlev|seestütlev|alaleütlev|alalütlev|alaltütlev|saav|rajav|olev|ilmaütlev|kaasaütlev)\b/;

export default function aCaseIsNamedThePlainWay({ check, ALL, code }: InvariantKit) {
  check("CaseLabel prints a case's plain name rather than its grammar name", () => {
    const label = code("components/CaseLabel.tsx");
    assert.match(label, /plainNameForEt\(label\.et, locale\)/, "CaseLabel no longer reads the plain name off the case it was handed");
    assert.match(label, /<Words text=\{plain \?\? label\.et\} \/>/, "CaseLabel no longer draws the plain name in its pill");
  });

  check("every plain name can be said in the reader's language", () => {
    const table = code("lib/estonian/cases.ts");
    for (const locale of ["en", "ru", "uk"]) {
      assert.match(table, new RegExp(`\\n  ${locale}: \\{\\n    NOMINATIVE: "`), `the plain names have no ${locale} column`);
    }
    const reference = code("lib/copy/i18n/areas/reference.ts");
    for (const name of ["3rd form", "in-form (-s)", "with-form (-ga)", "short to-form", "I form", "-da form"]) {
      assert.ok(reference.includes(`["${name}", "`), `"${name}" has no translation, so a Russian or Ukrainian screen prints it in English`);
    }
  });

  check("no sentence on a screen names a case by its Estonian grammar name", () => {
    const files = ALL.filter((f) => /^(app|components)\//.test(f) && /\.tsx?$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f));
    assert.ok(files.length > 100, `only ${files.length} files scanned, so the haystack stopped matching`);
    const offenders: string[] = [];
    for (const f of files) {
      for (const literal of code(f).match(/"[^"\n]{12,}"|`[^`]{12,}`/g) ?? []) {
        if (ESTONIAN_NAMES.test(literal)) offenders.push(`${f}: ${literal.slice(0, 90)}`);
      }
    }
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\nname the case with casePlainName instead`);
  });
}
