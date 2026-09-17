/**
 * WHICH A1 WORDS THE COURSE CANNOT YET SHOW IN A SENTENCE ITS OWN LEARNER CAN READ.
 *
 * A lesson at A1 builds a gap-fill only out of a sentence made of words the
 * course has already taught (rule 4 in `lib/collections/lesson.ts`), and most
 * of the time it cannot: an Ekilex usage is written to illustrate a headword
 * rather than to be a beginner's first reading, so the words standing around
 * the one being taught come from wherever the lexicographer was.
 *
 * That is a fact about the *supply* rather than about the rule, and the way to
 * fix it is to write the sentences, which is what
 * `docs/20-contributed-sentences.md` is the channel for. This says where to
 * start, and it prints two things because only one of them is useful:
 *
 *   THE TOTAL says how thin A1 is. It is the headline and it is the number
 *   nobody can act on.
 *
 *   THE RANKED LIST OF BLOCKERS is the instrument. A word that keeps a hundred
 *   sentences out of reach is either a word to teach earlier or the reason a
 *   sentence has to be written, and reading the list is how you tell which.
 *   It is the same shape `npm run eval:scene` prints for the scene gate, and
 *   for the same reason: a rate tells you there is a problem and a ranked list
 *   tells you what it is.
 *
 * Reports and never writes. No database, no key: it reads the two files the
 * seed loads, through the one adapter every other audit here reads them
 * through.
 */
import { SYLLABUS } from "../lib/collections/syllabus/index";
import { dictionaryRows } from "./lib/dictionary";
import { buildCloze, naturalSentence, nominalOpener, sentenceTiles } from "../lib/estonian/cloze";
import { usableExamples } from "../lib/dict/examples";
import { gapFormsFromParts } from "../lib/estonian/gapForms";
import { isPrincipalFormType } from "../lib/estonian/types";

const rows = dictionaryRows();
const byLemma = new Map<string, typeof rows>();
for (const row of rows) {
  const held = byLemma.get(row.lemma) ?? [];
  held.push(row);
  byLemma.set(row.lemma, held);
}

const spellingsOf = (lemma: string): string[] => {
  const out: string[] = [];
  const add = (text: string) => {
    for (const word of text.toLowerCase().split(/[^\p{L}\p{M}]+/u)) if (word) out.push(word);
  };
  add(lemma);
  for (const row of byLemma.get(lemma) ?? []) for (const form of row.forms) add(form.value);
  return out;
};

const taught = new Set<string>();
const blockers = new Map<string, number>();
let words = 0;
let gappable = 0;
let readable = 0;
const thin: string[] = [];

for (const unit of SYLLABUS) {
  for (const lemma of unit.lemmas) for (const spelling of spellingsOf(lemma)) taught.add(spelling);
  if (unit.level !== "A1") continue;

  const missing: string[] = [];
  for (const lemma of unit.lemmas) {
    const row = (byLemma.get(lemma) ?? [])[0];
    if (!row) continue;
    words++;

    const parts = Object.fromEntries(
      row.forms.filter((f) => isPrincipalFormType(f.formType)).map((f) => [f.formType, f.value]),
    );
    const hideable = [...gapFormsFromParts({ lemma: row.lemma, pos: row.pos, parts }).keys()];
    const opener = nominalOpener(row.pos, [row.lemma, ...row.forms.map((f) => f.value)]);

    let any = false;
    let ok = false;
    /*
      `source` is what the dictionary column carries and what `usableExamples`
      ranks on; the shipped-file adapter drops it, so it is put back as the one
      thing every row here is: a sentence Ekilex recorded.
    */
    const examples = row.examples.map((e) => ({ ...e, source: "EKILEX" as const }));
    for (const example of usableExamples(examples)) {
      if (!naturalSentence(example.et, opener)) continue;
      if (!buildCloze(example.et, hideable)) continue;
      any = true;
      const unknown = sentenceTiles(example.et).filter((w) => !taught.has(w.toLowerCase()));
      if (unknown.length === 0) { ok = true; break; }
      // Only the nearest miss counts toward the ranking, or a sentence with
      // nine unfamiliar words would outvote nine sentences one word short.
      if (unknown.length <= 2) {
        for (const word of unknown) {
          blockers.set(word.toLowerCase(), (blockers.get(word.toLowerCase()) ?? 0) + 1);
        }
      }
    }
    if (any) gappable++;
    if (ok) readable++;
    else if (any) missing.push(lemma);
  }
  if (missing.length > 0) {
    thin.push(`  ${unit.id.padEnd(16)} ${String(missing.length).padStart(3)} of ${String(unit.lemmas.length).padStart(3)}  ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? " ..." : ""}`);
  }
}

console.log("A1 words the dictionary can gap at all:", gappable, "of", words);
console.log("A1 words with a sentence made only of words taught by then:", readable);
console.log("\nWords with nothing readable, by unit:");
console.log(thin.join("\n"));

const ranked = [...blockers].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log("\nWhat keeps a sentence out of reach, commonest first.");
console.log("A word high on this list is either taught too late or the reason a sentence has to be written.\n");
for (const [word, count] of ranked) console.log(`  ${String(count).padStart(4)}  ${word}`);
