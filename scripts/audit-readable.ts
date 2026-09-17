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
 * TWO WALKS, BECAUSE THERE ARE TWO TEACHING ORDERS AND THE STRICTER ONE IS THE
 * ONE THE RULE PROTECTS. The unit lesson walks `SYLLABUS`, so everything an
 * earlier unit taught counts; the planned module walks its own evenings, so
 * only what the programme has handed over by that night counts, which is finer
 * and therefore tighter. The ranked list is built off the module's order for
 * that reason: it is the work list for the thing the operator asked to be held
 * to the rule, and a list built off the looser walk would under-report exactly
 * the sentences a beginner's evening cannot use.
 *
 * Reports and never writes. No database, no key: it reads the two files the
 * seed loads, through the one adapter every other audit here reads them
 * through.
 */
import { SYLLABUS } from "../lib/collections/syllabus/index";
import { PROGRAMMES, taughtThrough } from "../lib/course";
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

/**
 * Whether this word can be gapped at all, and whether any sentence it can be
 * gapped from is made only of spellings `taught` already holds. Counts the
 * near misses toward `blockers` on the way past, since that is the list.
 */
function readWord(
  lemma: string,
  taught: ReadonlySet<string>,
  blockers: Map<string, number>,
): { any: boolean; ok: boolean } {
  const row = (byLemma.get(lemma) ?? [])[0];
  if (!row) return { any: false, ok: false };

  const parts = Object.fromEntries(
    row.forms.filter((f) => isPrincipalFormType(f.formType)).map((f) => [f.formType, f.value]),
  );
  const hideable = [...gapFormsFromParts({ lemma: row.lemma, pos: row.pos, parts }).keys()];
  const opener = nominalOpener(row.pos, [row.lemma, ...row.forms.map((f) => f.value)]);

  let any = false;
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
    if (unknown.length === 0) return { any: true, ok: true };
    // Only the nearest miss counts toward the ranking, or a sentence with
    // nine unfamiliar words would outvote nine sentences one word short.
    if (unknown.length <= 2) {
      for (const word of unknown) {
        blockers.set(word.toLowerCase(), (blockers.get(word.toLowerCase()) ?? 0) + 1);
      }
    }
  }
  return { any, ok: false };
}

/*
  THE UNIT LESSON'S WALK. Everything an earlier unit taught counts, and so does
  the rest of the current unit, so this is the most permissive reading of the
  three and its total is an upper bound. The lesson itself cuts at the sitting.
*/
const taught = new Set<string>();
const unitBlockers = new Map<string, number>();
let words = 0;
let gappable = 0;
let readable = 0;
const thin: string[] = [];

for (const unit of SYLLABUS) {
  for (const lemma of unit.lemmas) for (const spelling of spellingsOf(lemma)) taught.add(spelling);
  if (unit.level !== "A1") continue;

  const missing: string[] = [];
  for (const lemma of unit.lemmas) {
    if (!byLemma.has(lemma)) continue;
    words++;
    const { any, ok } = readWord(lemma, taught, unitBlockers);
    if (any) gappable++;
    if (ok) readable++;
    else if (any) missing.push(lemma);
  }
  if (missing.length > 0) {
    thin.push(`  ${unit.id.padEnd(16)} ${String(missing.length).padStart(3)} of ${String(unit.lemmas.length).padStart(3)}  ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? " ..." : ""}`);
  }
}

/*
  THE PLANNED MODULE'S WALK, which is the one the rule is drawn for: an evening
  may show only what the ladder has handed over through the evening they are on,
  so a word taught later in the same unit does not count. `taughtThrough` is the
  module's own reading of that and is what `app/(app)/course/learn/page.tsx`
  hands the ladder, so this asks the question the app asks. It walks the whole
  ladder and not one part: drawn against a part this read answered 3 where the
  truth is 49, and reported the supply as the reason for a fault in the walk.
*/
const dayBlockers = new Map<string, number>();
let dayWords = 0;
let dayGappable = 0;
let dayReadable = 0;

for (const programme of PROGRAMMES) {
  if (programme.level !== "A1") continue;
  for (const day of programme.days) {
    const given = new Set<string>();
    for (const lemma of taughtThrough(programme, day.index)) {
      for (const spelling of spellingsOf(lemma)) given.add(spelling);
    }
    for (const lemma of day.words) {
      if (!byLemma.has(lemma)) continue;
      dayWords++;
      const { any, ok } = readWord(lemma, given, dayBlockers);
      if (any) dayGappable++;
      if (ok) dayReadable++;
    }
  }
}

console.log("THE UNIT LESSON, walking the syllabus.");
console.log("  A1 words the dictionary can gap at all:", gappable, "of", words);
console.log("  With a sentence made only of words taught by then:", readable);
console.log("\nTHE PLANNED MODULE, walking its own evenings. This is the rule's own reading.");
console.log("  A1 words the dictionary can gap at all:", dayGappable, "of", dayWords);
console.log("  With a sentence made only of words given by then:", dayReadable);

console.log("\nWords with nothing readable, by unit:");
console.log(thin.join("\n"));

const ranked = [...dayBlockers].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log("\nWhat keeps an evening's sentence out of reach, commonest first.");
console.log("A word high on this list is either taught too late or the reason a sentence has to be written.\n");
for (const [word, count] of ranked) console.log(`  ${String(count).padStart(4)}  ${word}`);
