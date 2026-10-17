/**
 * DOES THE GATE'S `parallel` CHECK REFUSE CORRECT ESTONIAN?
 *
 * `npm run measure:parallel`. The check withholds a composed line offering a
 * choice in two different cases (`unparallel` in `lib/scenes/gate.ts`), which
 * the native reader read off `Kas te maksate kaardiga või sularahas?`. A check
 * drawn on grammar is worth having only where it does not fire on the language
 * as people write it, so this runs it over every sentence a lexicographer
 * recorded in the shipped dictionary, every banked scene line and every pick,
 * with every spelling in the dictionary indexed to its cases, and prints each
 * sentence it would refuse. Read the list: an attested sentence on it is the
 * check being wrong.
 *
 * No database, no network, no key.
 */
import { shippedDictionary } from "./lib/dictionary";
import { buildLexicon, type DictEntry } from "../lib/scenes/lexicon";
import { unparallel } from "../lib/scenes/gate";
import { BANK } from "../lib/scenes/bank";
import { PICKS } from "../lib/scenes/picks/index";
import type { CaseKey } from "../lib/estonian/types";
import { CHOICE_WORD } from "../lib/scenes/choice";

/* The shipped dictionary in the shape the scene modules read, built here rather
   than borrowed from the drafter, which opens the model chain. */
const POOL: DictEntry[] = shippedDictionary().map((e) => ({
  lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages,
}));
const lexicon = buildLexicon(POOL);
const caseOf = new Map<string, Set<CaseKey>>();
for (const [key, forms] of lexicon.byCase) {
  const grammCase = key.slice(key.indexOf("|") + 1) as CaseKey;
  for (const form of forms) {
    const seen = caseOf.get(form) ?? new Set<CaseKey>();
    seen.add(grammCase);
    caseOf.set(form, seen);
  }
}

const sources: { from: string; text: string }[] = [
  ...POOL.flatMap((entry) => (entry.usages ?? []).map((text) => ({ from: `usage of ${entry.lemma}`, text }))),
  ...BANK.map((row) => ({ from: `bank ${row.scene}/${row.beat}`, text: row.text })),
  ...Object.entries(PICKS).flatMap(([scene, beats]) =>
    Object.entries(beats).flatMap(([beat, lines]) => lines.map((line) => ({ from: `pick ${scene}/${beat}`, text: line.et })))),
];
const withChoice = sources.filter(({ text }) => new RegExp(`(^|[^\\p{L}])${CHOICE_WORD}([^\\p{L}]|$)`, "iu").test(text));
const refused = withChoice.filter(({ text }) => unparallel(text, { caseOf }) !== null);

console.log(`${sources.length} sentences read, ${withChoice.length} hold the choice word, ${refused.length} would be refused.`);
for (const { from, text } of refused) console.log(`  ${from}: ${text}`);
const sample = "Selge, see teeb 4 eurot. Kas te maksate kaardiga või sularahas?";
console.log(`\nThe reader's line: ${unparallel(sample, { caseOf }) ? "refused" : "PASSED (the check cannot see it)"}`);
