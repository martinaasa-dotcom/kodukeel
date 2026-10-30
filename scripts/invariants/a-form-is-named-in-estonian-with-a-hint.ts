import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A FORM IS NAMED IN ESTONIAN, WITH A HINT: "osastav (3rd form)",
 * "seesütlev (-s, in)", "olevik (I form)", "tingiv kõneviis (-ks, would)".
 *
 * The operator's call, on a native speaker's advice, which supersedes the plain
 * names ("3rd form", "in form (-s)", "-ma form") the app used before: a class,
 * a course book and the state examination name a form by its Estonian name, so
 * that leads everywhere, and a hint in the reader's language says what it is.
 * `lib/estonian/cases.ts` holds the cases and `lib/estonian/verbNames.ts` the
 * verb forms, and every screen reads the names from those two.
 *
 * Four arms. `CaseLabel` draws the Estonian half as Estonian and the hint
 * beside it; both tables carry every name in all three languages; no screen
 * string names a form the old plain way, where a number or an ending stands
 * without the Estonian name in front of it; and a lesson writes a name in
 * square brackets, which `Braced` draws as Estonian.
 */
// "ma-form" and "the command form" are the same plain names one spelling over:
// the dictionary's findings on a typed sentence said them for a while.
const OLD_PLAIN = /(?<!\()\b(?:1st|2nd|3rd) form\b|\b(?:in|to|from|with|until|as|without|becoming) form \(-|\b(?:[Tt]he|its|an?) (?:in|to|from|with|until|as|without|becoming) form\b|(?<![(\w])-(?:ma|da|tud|nud) form\b|short to form|past I form|(?<!\()\bI form\b|\b(?:ma|da|tud|nud)-form\b|\b(?:the|a|polite) command form\b/;

export default function aFormIsNamedInEstonianWithAHint({ check, ALL, code }: InvariantKit) {
  check("CaseLabel draws the Estonian name as Estonian and its hint beside it", () => {
    const label = code("components/CaseLabel.tsx");
    assert.match(label, /plainNameForEt\(label\.et, locale\)/, "CaseLabel no longer reads the name off the case it was handed");
    assert.match(label, /<span lang="et"><Words text=\{name\} \/><\/span>/, "CaseLabel no longer marks the Estonian half as Estonian");
    assert.match(label, /hint && <>\{" "\}<Words text=\{hint\} \/><\/>/, "CaseLabel no longer draws the hint");
  });

  check("every case and every verb form has its hint in English, Russian and Ukrainian", () => {
    const cases = code("lib/estonian/cases.ts");
    for (const locale of ["en", "ru", "uk"]) {
      assert.match(cases, new RegExp(`\\n  ${locale}: \\{\\n    NOMINATIVE: "`), `the case hints have no ${locale} column`);
    }
    assert.match(cases, /return `\$\{named\?\.et \?\? spec\.key\.toLowerCase\(\)\} \(\$\{caseHint\(spec, locale\)\}\)`;/, "casePlainName no longer leads with the Estonian name");
    const verbs = code("lib/estonian/verbNames.ts");
    const rows = verbs.match(/^ {2}[A-Z_]+: \{ et: "[^"]+", hint: \{ en: "[^"]+", ru: "[^"]+", uk: "[^"]+" \} \},$/gm) ?? [];
    assert.equal(rows.length, 14, `${rows.length} verb forms carry a hint in all three languages, where 14 are named`);
  });

  check("no screen string names a form the old plain way", () => {
    // The two tables hold the hints themselves ("1st form"), and are where a
    // name is put together, so they are the one place a bare hint belongs.
    const TABLES = new Set(["lib/estonian/cases.ts", "lib/estonian/verbNames.ts"]);
    const files = ALL.filter((f) => /^(app|components|lib)\//.test(f) && /\.tsx?$/.test(f) && !/\.(test|itest)\.tsx?$/.test(f) && !TABLES.has(f));
    assert.ok(files.length > 300, `only ${files.length} files scanned, so the haystack stopped matching`);
    const offenders: string[] = [];
    for (const f of files) {
      for (const literal of code(f).match(/"(?:[^"\\\n]|\\.){4,}"|`[^`]{4,}`/g) ?? []) {
        if (OLD_PLAIN.test(literal)) offenders.push(`${f}: ${literal.slice(0, 90)}`);
      }
    }
    assert.deepEqual(offenders, [], `${offenders.join("\n")}\nname the form with casePlainName or verbFormName, the Estonian name with its hint`);
  });

  check("a lesson writes a grammar name in brackets, and Braced draws it as Estonian", () => {
    const braced = code("components/Braced.tsx");
    assert.match(braced, /<span key=\{i\} lang="et" data-term/, "Braced no longer draws a bracketed name as Estonian");
    const lessons = ALL.filter((f) => /^lib\/course\/lessons\/a1-[\w-]+\.ts$/.test(f));
    const bracketed = lessons.reduce((n, f) => n + (code(f).match(/\[(?:nimetav|omastav|osastav|seesütlev|kaasaütlev|olevik|ma-tegevusnimi|da-tegevusnimi)\] \(/g) ?? []).length, 0);
    assert.ok(bracketed > 40, `only ${bracketed} bracketed names across the lessons, so the lessons stopped naming forms this way`);
  });
}
