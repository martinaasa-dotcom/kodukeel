/**
 * WHAT B1 AND B2 ASSUME, MEASURED AGAINST THE LESSONS A LEARNER HAS
 * (docs/43-lessons.md §11.1). `npx tsx scripts/measure-b-levels.ts`.
 *
 * Reads the ledger at the end of a lesson (by default A2's last), and prints:
 * how much it holds, which of the four hundred commonest words it has not
 * taught yet, and how many of each B level's unit words it already covers. A
 * part author reads the untaught common words as the glue their conversations
 * may teach, and `--spellings` prints every spelling the ledger holds, for
 * somebody writing a line who wants to know what they may already say.
 *
 *   --through <lesson id>   the lesson whose ledger to read (default a2-55-end)
 *   --spellings             print every taught spelling, one per line
 */
import { LESSONS, ledgerLemmas, ledgerThrough } from "../lib/course/lessons";
import { PREVIEW_LESSONS } from "../lib/course/lessons/preview";
import { COMMON_WORDS } from "../lib/collections/frequency";
import { SYLLABUS } from "../lib/collections/syllabus";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const through = arg("through") ?? "a2-55-end";
const all = [...LESSONS, ...PREVIEW_LESSONS];
const ledger = ledgerThrough(all, through);
if (!ledger) throw new Error(`no lesson ${through}`);

if (process.argv.includes("--spellings")) {
  for (const s of [...ledger.spellings].sort((a, b) => a.localeCompare(b, "et"))) console.log(s);
  for (const p of ledger.phrases) console.log(`[phrase] ${p.join(" ")}`);
  process.exit(0);
}

const lemmas = new Set(ledgerLemmas(ledger).map((l) => l.toLocaleLowerCase("et")));
const taught = (lemma: string) => lemmas.has(lemma.toLocaleLowerCase("et")) || ledger.spellings.has(lemma.toLocaleLowerCase("et"));
console.log(`Through ${through}: ${ledger.items.length} items, ${lemmas.size} headwords, ${ledger.spellings.size} spellings, ${ledger.phrases.length} phrases.`);
console.log(`Patterns: ${[...ledger.patterns].join(", ")}`);

const common = COMMON_WORDS.slice(0, 400);
const missing = common.filter((w) => !taught(w.lemma));
console.log(`\n${missing.length} of the 400 commonest words are untaught:`);
console.log(missing.map((w) => w.lemma).join(", "));

for (const level of ["B1", "B2"] as const) {
  const words = SYLLABUS.filter((u) => u.level === level).flatMap((u) => [...u.lemmas]);
  const have = words.filter((w) => taught(w));
  console.log(`\n${level}: ${words.length} unit words, ${have.length} taught.`);
}
