/**
 * WHAT THE SENTENCE CHECK SAYS ABOUT ESTONIAN NOBODY HERE WROTE WRONG.
 *
 * `lib/course/lessons/sentenceCheck.ts` reads a learner's typed sentence and
 * names what is wrong in it, and the one fault it may never have is calling
 * correct Estonian wrong. So this runs it over sentences known to be right:
 * every line of every lesson, which the native speaker read, and every usage a
 * lexicographer recorded in the shipped dictionary. Every finding printed is a false
 * alarm to read, and the count is the number to keep at nought.
 *
 *   npm run measure:sentence-check                         # the count, and every finding
 *   npm run measure:sentence-check -- --lessons            # the lessons alone
 *   npm run measure:sentence-check -- --lessons --missed   # and the broken sentences it let through
 *
 * The shipped dictionary, both halves the seed loads, stands in for the
 * database. No key, no database.
 */
import { shippedDictionary } from "./lib/dictionary";
import { LESSONS } from "../lib/course/lessons";
import { ESTONIAN_WORD } from "../lib/estonian/cloze";
import { fold } from "../lib/estonian/fold";
import { formsOf } from "../lib/scenes/lexicon";
import { ALWAYS_READ, checkSentence, type CheckEntry } from "../lib/course/lessons/sentenceCheck";

const SHIPPED = shippedDictionary();
const ENTRIES: CheckEntry[] = SHIPPED.map((w) => ({
  lemma: w.lemma, pos: w.pos, cefr: w.cefr, parts: w.parts, extraForms: w.extraForms, usages: [],
  government: w.government, semanticTypes: w.semanticTypes,
}));
const FORMS = ENTRIES.map((e) => ({ entry: e, forms: formsOf(e) }));
const byFolded = new Map<string, CheckEntry[]>();
for (const { entry, forms } of FORMS) for (const f of forms) byFolded.set(fold(f), [...(byFolded.get(fold(f)) ?? []), entry]);
const SPELLINGS = new Set(FORMS.flatMap((f) => f.forms));
const fixed = ENTRIES.filter((e) => ALWAYS_READ.includes(e.lemma));

function entriesFor(text: string): CheckEntry[] {
  const out = new Set<CheckEntry>(fixed);
  for (const w of text.match(ESTONIAN_WORD) ?? []) for (const e of byFolded.get(fold(w.toLowerCase())) ?? []) out.add(e);
  return [...out];
}

const lessonsOnly = process.argv.includes("--lessons");
const sentences = new Set<string>();
for (const lesson of LESSONS) {
  for (const line of lesson.conversation) if (line.et) sentences.add(line.et);
  for (const p of [...lesson.answers, ...(lesson.roleplay?.turns ?? [])]) {
    sentences.add(p.model.et);
    if (p.ask) sentences.add(p.ask.et);
  }
}
if (!lessonsOnly) for (const w of SHIPPED) for (const u of w.usages) sentences.add(u);

const kinds = new Map<string, number>();
let flagged = 0;
for (const text of sentences) {
  // Spelling is measured against a dictionary this script holds a fifth of, so only grammar counts here.
  const findings = checkSentence(text, entriesFor(text), (w) => SPELLINGS.has(w) || true).findings;
  if (findings.length === 0) continue;
  flagged += 1;
  for (const f of findings) kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1);
  console.log(`${text}\n   ${findings.map((f) => JSON.stringify(f)).join("\n   ")}`);
}
console.log(`\n${flagged} of ${sentences.size} correct sentences flagged`, Object.fromEntries(kinds));

/*
  AND HOW MUCH IT CATCHES. The lessons' own sentences broken two ways a
  beginner breaks them: a verb moved into another person, and a noun in the
  partitive or the genitive put back in its plain form. Each broken sentence
  holds exactly one mistake, so "caught" means the check said anything at all.
*/
const lexByLemma = new Map(ENTRIES.map((e) => [e.lemma, e]));
const PERSONS = ["IndPrSg1", "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3"];
let personTried = 0, personCaught = 0, objectTried = 0, objectCaught = 0;
const lessonLines = new Set<string>();
for (const lesson of LESSONS) {
  for (const p of [...lesson.answers, ...(lesson.roleplay?.turns ?? [])]) lessonLines.add(p.model.et);
  for (const line of lesson.conversation) if (line.et) lessonLines.add(line.et);
}
for (const text of lessonLines) {
  const tokens = text.match(ESTONIAN_WORD) ?? [];
  for (const token of tokens) {
    const low = token.toLowerCase();
    for (const e of byFolded.get(fold(low)) ?? []) {
      if (e.pos === "NOUN" && e.parts.NOM_SG && (e.parts.PART_SG === low || e.parts.GEN_SG === low) && e.parts.NOM_SG !== low) {
        const broken = text.replace(token, e.parts.NOM_SG);
        objectTried += 1;
        if (checkSentence(broken, entriesFor(broken), () => true).findings.length > 0) objectCaught += 1;
        else if (process.argv.includes("--missed")) console.log(`missed: ${broken}`);
      }
      if (e.pos === "VERB" && e.extraForms) {
        const table = new Map<string, string>([["IndPrSg1", e.parts.PRES_1SG ?? ""], ...e.extraForms.map((f) => [f.code, f.value] as [string, string])]);
        const here = PERSONS.find((c) => table.get(c) === low);
        const other = PERSONS.map((c) => table.get(c)).find((v) => v && v !== low);
        if (here && other && /\b(ma|sa|me|te|mina|sina|meie|teie)\b/i.test(text)) {
          const broken = text.replace(token, other);
          personTried += 1;
          if (checkSentence(broken, entriesFor(broken), () => true).findings.length > 0) personCaught += 1;
        }
      }
    }
  }
}
console.log(`object put in its plain form: ${objectCaught} of ${objectTried} caught`);
console.log(`verb in another person, with a pronoun in the sentence: ${personCaught} of ${personTried} caught`);
void lexByLemma;
