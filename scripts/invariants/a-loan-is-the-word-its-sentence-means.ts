import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SENTENCE IS LENT FOR A SPELLING ONLY TO THE WORD THAT SENTENCE MEANS.
 *
 * `borrowSentences` lends a sentence recorded under one entry to another for a
 * spelling only that entry claims, and the dictionary is six thousand entries
 * where the language is a hundred and fifty thousand. So `aastasadade
 * jooksul` was drilled as the adessive of `jooks` where it is the postposition
 * "during", `puu otsas` and `kapi küljes` the same way, `Rong väljub Tapa
 * jaamast` as "kill!" and `Lükkasin teki kõrvale` as "arise!". The reading
 * that stops it is Vabamorf's, shipped in `prisma/data/homographs.json`.
 *
 * Three halves, because any one alone passes on the broken shape: the lending
 * loop asks `lendable`; the reading defaults to the shipped one, so a caller
 * that passes nothing gets it; and no caller outside a test passes a reading
 * of its own, which is the one way to empty it without anybody noticing. And
 * the lexicon pass keeps guessing off, or a reading would be about words
 * Vabamorf invented.
 */
export default function aLoanIsTheWordItsSentenceMeans({ check, code, read, sourceFiles }: InvariantKit) {
  check("a loan for a spelling the language gives to two words goes to the word its sentence means", () => {
    const borrow = code("lib/dict/borrow.ts");
    assert.match(borrow, /if \(!lendable\(homographs, example\.et, word, /,
      "borrowSentences no longer asks lendable before it lends a sentence");
    assert.match(borrow, /homographs: Homographs = HOMOGRAPHS/,
      "borrowSentences no longer defaults to the shipped homograph reading");

    const callers = ["app", "lib", "prisma", "scripts"].flatMap((dir) => sourceFiles(dir))
      .filter((f) => !/\.(test|itest)\.ts$/.test(f) && f !== "lib/dict/borrow.ts" && !f.startsWith("scripts/invariants/"))
      .filter((f) => /borrowSentences\(/.test(code(f)));
    assert.ok(callers.length >= 4, `found ${callers.length} callers of borrowSentences, expected the app's pool, the repair and two audits`);
    const own: string[] = [];
    for (const file of callers) {
      const text = code(file);
      for (let at = text.indexOf("borrowSentences("); at >= 0; at = text.indexOf("borrowSentences(", at + 1)) {
        // Walk the call's own parentheses and look for a second argument at depth one.
        let depth = 0;
        for (let i = at + "borrowSentences".length; i < text.length; i++) {
          const c = text[i];
          if (c === "(" || c === "[" || c === "{") depth++;
          else if (c === ")" || c === "]" || c === "}") { depth--; if (depth === 0) break; }
          else if (c === "," && depth === 1) {
            if (text.slice(i + 1).trimStart()[0] !== ")") { own.push(file); break; }
          }
        }
      }
    }
    assert.deepEqual(own, [], "a caller hands borrowSentences a homograph reading of its own");

    const python = read("scripts/lib/analyse-homographs.py");
    assert.match(python, /analyze\(chunk, guess=False, propername=False, disambiguate=False\)/,
      "the lexicon pass of the homograph reading no longer keeps guessing off");
  });
}
