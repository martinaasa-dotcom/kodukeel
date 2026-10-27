/**
 * HOW FAR THE SENTENCE CHECK CAN BE TRUSTED, BOTH WAYS ROUND.
 *
 * `lib/course/lessons/sentenceCheck.ts` reads a learner's typed sentence and
 * names what is wrong in it. Two numbers say whether that is worth showing
 * anybody, and this prints both.
 *
 * The first is the one it may never get wrong: how many sentences known to be
 * right it calls wrong. Every line of every lesson and every sentence written
 * for a beginner, which the native speaker read, every scene line in the bank,
 * and every usage a lexicographer recorded. Every finding printed is a false
 * alarm to read, and the count is the number to keep at nought.
 *
 * The second is what it catches. The learner-sized sentences (the lessons,
 * the beginners' sentences and the bank) are broken one way at a time, the
 * ways a learner breaks them, and each broken sentence is checked: caught
 * means a finding on the broken word, fixed means the form it offers is the
 * word that was there before, "no form" means it named the fault and offered
 * nothing, "wrong form" means it offered a form that was not the word there
 * before, which is the number that matters after the false alarms, and stray
 * counts a finding anywhere else, a false alarm on a sentence that has
 * exactly one mistake in it.
 *
 *   npm run measure:sentence-check              # both numbers, every false alarm
 *   npm run measure:sentence-check -- --missed  # and every broken sentence it let through
 *   npm run measure:sentence-check -- --say "Ma meeldib kohv."  # one sentence, read as the server reads it
 *
 * The check reads exactly what the server hands it: the shipped dictionary,
 * which is what the seed loads, for the rows, and the forms list on disk for
 * which spellings are words and which headwords own them. No key, no database.
 */
import { shippedDictionary } from "./lib/dictionary";
import { LESSONS } from "../lib/course/lessons";
import { authoredRows } from "../lib/dict/authored";
import { BANK } from "../lib/scenes/bank";
import { ESTONIAN_WORD, primaryAnswer } from "../lib/estonian/cloze";
import { fold } from "../lib/estonian/fold";
import { isNumber } from "../lib/estonian/semantics";
import { DA_ONLY_EXEMPT, DA_ONLY_VERBS } from "../lib/scenes/lexicon";
import { couldBeCompound, headwordsOfExactForm, isExactForm, lemmasOfForm, spellingsNear } from "../lib/dict/forms";
import {
  ALSO_DA_ONLY, ALWAYS_READ, GENITIVE_POSTPOSITIONS, MA_ONLY_BUT_THIRD, MA_ONLY_VERBS, caseTable, checkSentence, verbTable,
  type CheckEntry, type Finding,
} from "../lib/course/lessons/sentenceCheck";

async function main(): Promise<void> {
const showMissed = process.argv.includes("--missed");

/*
  WORDS THE CORPUS ITSELF SPELLS WRONG. A usage is a lexicographer's, and a
  handful carry a typo or a dialect spelling: the check is right to name
  them, so they are listed here with what is wrong, and counted apart from
  the false alarms rather than inside them. Only a slip a native speaker
  would call one goes here.
*/
const SOURCE_SLIPS: Readonly<Record<string, string>> = {
  tüdrekud: "a dialect spelling of tüdrukud, in a quoted line of dialect",
  hädabisse: "hädaabisse with a letter gone, in a usage Ekilex files under hädaabi beside the right spelling",
  võistusest: "võistlusest with a letter gone, in a usage of kabe",
  proksi: "no form of any word, in a usage about an emerald's color; which word was meant is not clear",
};

const ENTRIES: CheckEntry[] = shippedDictionary().map((w) => ({
  lemma: w.lemma, pos: w.pos, cefr: w.cefr, parts: w.parts, extraForms: w.extraForms, usages: [],
  government: w.government, semanticTypes: w.semanticTypes,
}));
const USAGES = shippedDictionary().flatMap((w) => w.usages);
const byLemma = new Map<string, CheckEntry[]>();
for (const e of ENTRIES) byLemma.set(e.lemma, [...(byLemma.get(e.lemma) ?? []), e]);
const fixed = ENTRIES.filter((e) => ALWAYS_READ.includes(e.lemma));

/** The band the dictionary gives a headword, as the server reads it: the best of its rows, null where none has one. */
function band(lemma: string): string | null {
  const rows = [...(byLemma.get(lemma) ?? []), ...(byLemma.get(lemma.charAt(0).toLocaleUpperCase("et") + lemma.slice(1)) ?? [])];
  const best = rows.map((e) => e.cefr).filter((c): c is string => !!c).sort((a, b) => rankOf(a) - rankOf(b))[0];
  return best ?? null;
}
function rankOf(b: string | null | undefined): number {
  return b ? ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(b) : 9;
}

// WHAT THE FORMS LIST SAYS ABOUT EVERY SPELLING, asked once and in shard order.
const exactSet = new Set<string>();
const owners = new Map<string, string[]>();
const headwords = new Map<string, string[]>();
const compounds = new Set<string>();
const around = new Map<string, { spelling: string; distance: number; lemmas: string[] }[]>();
async function know(words: Iterable<string>): Promise<void> {
  const fresh = [...new Set([...words].map((w) => w.toLowerCase()))].filter((w) => !headwords.has(w));
  fresh.sort((a, b) => fold(a).localeCompare(fold(b)));
  for (const word of fresh) {
    if (await isExactForm(word)) exactSet.add(word);
    const own = await headwordsOfExactForm(word);
    if (own.length > 0) owners.set(word, own);
    const spellings = exactSet.has(word) || exactSet.has(word.slice(0, -2)) ? [] : await spellingsNear(word);
    if (spellings.length > 0) around.set(word, spellings);
    // Ordered by band before the cut, the way the server orders them.
    const near = [...new Set(spellings.flatMap((n) => n.lemmas))].sort((a, b) => rankOf(band(a)) - rankOf(band(b))).slice(0, 12);
    headwords.set(word, [...(await lemmasOfForm(word)).slice(0, 6), ...own.slice(0, 10), ...near]);
    if (near.length > 0 && (await couldBeCompound(word)) !== false) compounds.add(word);
  }
}
const spellings = (text: string) => (text.match(ESTONIAN_WORD) ?? []).flatMap((w) => {
  const low = w.toLowerCase();
  return /[gk]i$/.test(low) && low.length > 4 ? [low, low.slice(0, -2)] : [low];
});

/** The rows the server would read for this sentence: each word and its headwords, as written and with a capital. */
function entriesFor(text: string): CheckEntry[] {
  const out = new Set<CheckEntry>(fixed);
  for (const word of spellings(text)) {
    for (const lemma of [word, ...(headwords.get(word) ?? [])]) {
      for (const l of [lemma, lemma.charAt(0).toLocaleUpperCase("et") + lemma.slice(1)]) {
        for (const e of byLemma.get(l) ?? []) out.add(e);
      }
    }
  }
  return [...out];
}
const check = (text: string): readonly Finding[] =>
  checkSentence(text, entriesFor(text), (w) => exactSet.has(w), "", { claims: (w) => owners.get(w), compound: (w) => compounds.has(w), near: (w) => around.get(w), band }).findings;

// `--say "Ma meeldib kohv."`: what the check makes of sentences typed here, read the way the server reads them.
const say = process.argv.indexOf("--say");
if (say >= 0) {
  const typed = process.argv.slice(say + 1);
  await know(typed.flatMap(spellings));
  for (const text of typed) console.log(`${text}\n   ${check(text).map((f) => JSON.stringify(f)).join("\n   ") || "(nothing)"}`);
  return;
}

// THE SENTENCES KNOWN TO BE RIGHT.
const learner = new Set<string>();
for (const lesson of LESSONS) {
  for (const line of lesson.conversation) if (line.et) learner.add(line.et);
  for (const p of [...lesson.answers, ...(lesson.roleplay?.turns ?? [])]) {
    learner.add(p.model.et);
    if (p.ask) learner.add(p.ask.et);
  }
}
for (const [, et] of authoredRows()) learner.add(et);
for (const line of BANK) learner.add(line.text);
const correct = new Set<string>([...learner, ...USAGES]);

await know([...correct].flatMap(spellings));

const kinds = new Map<string, number>();
let flagged = 0;
let slipped = 0;
for (const text of correct) {
  const findings = check(text);
  if (findings.length === 0) continue;
  // A spelling the source itself got wrong is a right answer from the check, and is counted apart.
  if (findings.every((f) => f.kind === "spelling" && SOURCE_SLIPS[f.word.toLowerCase()])) {
    slipped += 1;
    console.log(`(source slip) ${text}\n   ${findings.map((f) => `${f.word}: ${SOURCE_SLIPS[f.word.toLowerCase()]}`).join("\n   ")}`);
    continue;
  }
  flagged += 1;
  for (const f of findings) kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1);
  console.log(`${text}\n   ${findings.map((f) => JSON.stringify(f)).join("\n   ")}`);
}
console.log(`\nFalse alarms: ${flagged} of ${correct.size} correct sentences flagged`, Object.fromEntries(kinds), `(misspelled in the source itself: ${slipped})`);

/*
  THE SAME SENTENCES, BROKEN ONE WAY AT A TIME. Every reading below is taken
  only where the forms list says the word belongs to that one headword, so
  the sentence really holds the form the break replaces.
*/
interface VerbForm { lemma: string; code: string }
interface NounForm { lemma: string; pos: string; key: string; plural: boolean }
const verbForms = new Map<string, VerbForm[]>();
const tableOf = new Map<string, Map<string, string>>();
const nounForms = new Map<string, NounForm[]>();
const nomOf = new Map<string, { sg: string | null; pl: string | null }>();
for (const e of ENTRIES) {
  if (/\s/.test(e.lemma)) continue;
  if (e.pos === "VERB") {
    if (tableOf.has(e.lemma)) continue;
    const table = verbTable(e);
    tableOf.set(e.lemma, table);
    for (const [code, form] of table) verbForms.set(form, [...(verbForms.get(form) ?? []), { lemma: e.lemma, code }]);
    continue;
  }
  if (nomOf.has(e.lemma)) continue;
  const rows = caseTable(e);
  const first = (v: string | null | undefined) => (v ? primaryAnswer(v).toLowerCase() : null);
  const nom = rows.find((r) => r.spec.key === "NOMINATIVE");
  nomOf.set(e.lemma, { sg: first(nom?.singular), pl: first(nom?.plural) });
  for (const r of rows) {
    for (const v of r.accepted) nounForms.set(v.toLowerCase(), [...(nounForms.get(v.toLowerCase()) ?? []), { lemma: e.lemma, pos: e.pos, key: r.spec.key, plural: false }]);
    const pl = first(r.plural);
    if (pl) nounForms.set(pl, [...(nounForms.get(pl) ?? []), { lemma: e.lemma, pos: e.pos, key: r.spec.key, plural: true }]);
  }
}
const counting = new Set(ENTRIES.filter((e) => e.pos === "NOUN" && isNumber(e.semanticTypes) && e.lemma !== "üks").map((e) => e.lemma));
const calendar = new Set<string>();
for (const e of ENTRIES) {
  const codes = (e.semanticTypes ?? "").split(/\s+/);
  if (codes.includes("aeg_nädalapäev") || (codes.includes("aeg_kuu") && e.lemma.length > 3)) calendar.add(e.lemma);
}
const SUBJECT = /\b(ma|mina|sa|sina|me|meie|te|teie)\b/i;
/*
  Each pronoun's allative and adessive to the nominative a learner writes in
  their place, short to short and long to long (`mulle` to `ma`, `minule` to
  `mina`), and its genitive likewise (`minu` to `mina`), read off the rows.
*/
const EXPERIENCER_NOMINATIVE = new Map<string, string>();
const ALLATIVE_FORMS = new Set<string>();
const POSSESSIVE_NOMINATIVE = new Map<string, string>();
for (const lemma of ["mina", "sina", "meie", "teie"]) {
  const entry = byLemma.get(lemma)?.[0];
  if (!entry) continue;
  const of = (codes: string[]) => [...new Set((entry.extraForms ?? []).filter((f) => codes.includes(f.code)).map((f) => f.value.toLowerCase()))]
    .sort((a, b) => a.length - b.length);
  const noms = [...new Set([lemma, ...of(["SgN", "PlN"])])].sort((a, b) => a.length - b.length);
  const pair = (forms: string[], into: Map<string, string>) => {
    if (forms.length === 0 || noms.length === 0) return;
    into.set(forms[0]!, noms[0]!);
    into.set(forms[forms.length - 1]!, noms[noms.length - 1]!);
  };
  const alls = of(["SgAll", "PlAll"]);
  for (const f of alls) ALLATIVE_FORMS.add(f);
  pair(alls, EXPERIENCER_NOMINATIVE);
  pair(of(["SgAd", "PlAd"]), EXPERIENCER_NOMINATIVE);
  // `meie` and `teie` are their own genitive, so only the singulars can be put wrong.
  if (lemma === "mina" || lemma === "sina") pair(of(["SgG"]), POSSESSIVE_NOMINATIVE);
}
for (const [form, nom] of EXPERIENCER_NOMINATIVE) if (ALLATIVE_FORMS.has(nom)) EXPERIENCER_NOMINATIVE.delete(form);
const OWNERS: Record<string, string> = { mul: "olen", sul: "oled", meil: "oleme", teil: "olete" };

/** The one headword the forms list says owns this spelling, or null. */
const formsByLemma = new Map<string, string[]>();
for (const [form, readings] of nounForms) for (const r of readings) formsByLemma.set(r.lemma, [...(formsByLemma.get(r.lemma) ?? []), form]);
const ownedBy = (word: string): string | null => {
  const own = owners.get(word);
  if (!own || own.length === 0) return null;
  if (own.length === 1) return own[0]!;
  /*
    The list files some of a word's own forms as headwords of their own
    (`suur` is claimed by `suurelt` and `suurt`): one headword whose forms
    hold every other claim is still that one word.
  */
  const formsOf = (lemma: string) => new Set([lemma, ...(formsByLemma.get(lemma) ?? []), ...(tableOf.get(lemma)?.values() ?? [])]);
  const heads = own.filter((l) => byLemma.has(l));
  if (heads.length !== 1) return null;
  const mine = formsOf(heads[0]!);
  return own.every((l) => l === heads[0] || mine.has(l.toLowerCase())) ? heads[0]! : null;
};
/** The one reading a spelling has as a nominal, where the forms list and the rows agree on it. */
const nounOf = (word: string): NounForm | null => {
  const lemma = ownedBy(word);
  const found = (nounForms.get(word) ?? []).filter((r) => r.lemma === lemma);
  const one = found[0];
  if (!one || verbForms.has(word)) return null;
  return found.every((r) => r.key === one.key && r.plural === one.plural) ? one : null;
};
const verbReadings = (word: string): VerbForm[] => {
  const lemma = ownedBy(word);
  return lemma ? (verbForms.get(word) ?? []).filter((r) => r.lemma === lemma) : [];
};

interface Break { kind: string; broken: string; word: string; original: string }
const breaks: Break[] = [];
for (const text of learner) {
  const matches = [...text.matchAll(new RegExp(ESTONIAN_WORD.source, "gu"))];
  const low = matches.map((m) => m[0].toLowerCase());
  const swap = (i: number, to: string): string => {
    const m = matches[i]!;
    const keepCase = /^\p{Lu}/u.test(m[0]) ? to.charAt(0).toLocaleUpperCase("et") + to.slice(1) : to;
    return text.slice(0, m.index) + keepCase + text.slice(m.index! + m[0].length);
  };
  const add = (kind: string, i: number, to: string | null | undefined) => {
    if (!to || to === low[i]) return;
    const broken = swap(i, to);
    breaks.push({ kind, broken, word: to, original: low[i]! });
  };
  for (let i = 0; i < low.length; i += 1) {
    const word = low[i]!;
    const prev = low[i - 1];
    const next = low[i + 1];
    const verbs = verbReadings(word);
    const v = verbs[0];
    // A verb moved into another person, with a pronoun in the sentence to say whose it is.
    if (v && SUBJECT.test(text) && /^(IndPr|IndIpf)(Sg|Pl)\d$/.test(v.code) && prev !== "ei") {
      const family = v.code.startsWith("IndPr") ? "IndPr" : "IndIpf";
      const table = tableOf.get(v.lemma)!;
      const mine = new Set(verbs.map((r) => r.code));
      const to = ["Sg1", "Sg3", "Pl1", "Sg2", "Pl3"].map((p) => table.get(`${family}${p}`)).find((f) => f && ![...mine].some((c) => table.get(c) === f) && !(verbForms.get(f) ?? []).some((r) => mine.has(r.code)));
      add("person", i, to);
      // The dictionary form where the person belongs, straight after a pronoun.
      if (family === "IndPr" && prev !== undefined && SUBJECT.test(prev)) add("dictionaryForm", i, table.get("Sup"));
    }
    // After `ei`, a person ending.
    if (prev === "ei" && v && (v.code === "IndPrPs_" || v.code === "PtsPtPs")) {
      add("negative", i, tableOf.get(v.lemma)!.get(v.code === "IndPrPs_" ? "IndPrSg1" : "IndIpfSg1"));
    }
    // The ma-infinitive after a verb that takes the da-infinitive, and the other way round.
    if (v?.code === "Inf" && prev !== undefined) {
      const finite = verbReadings(prev)[0];
      if (finite && (DA_ONLY_VERBS as readonly string[]).includes(finite.lemma) && !(DA_ONLY_EXEMPT[finite.lemma] ?? []).includes(v.lemma)) {
        add("infinitive", i, tableOf.get(v.lemma)!.get("Sup"));
      }
    }
    if (v?.code === "Sup" && prev !== undefined) {
      const finite = verbReadings(prev)[0];
      if (finite && (finite.lemma === "pidama" || finite.lemma === "hakkama") && /^(IndPr|IndIpf|KndPr)/.test(finite.code)) {
        add("infinitive", i, tableOf.get(v.lemma)!.get("Inf"));
      }
    }
    const noun = nounOf(word);
    // An adjective left in its plain form before a noun with an ending.
    if (noun?.pos === "ADJECTIVE" && noun.key !== "NOMINATIVE" && noun.key !== "GENITIVE" && next !== undefined) {
      const head = nounOf(next);
      if (head?.pos === "NOUN" && head.key === noun.key && head.plural === noun.plural) {
        add("agreement", i, noun.plural ? nomOf.get(noun.lemma)?.pl : nomOf.get(noun.lemma)?.sg);
      }
    }
    // A counted noun in its plain form, singular and plural.
    if (noun?.pos === "NOUN" && noun.key === "PARTITIVE" && !noun.plural && prev !== undefined && counting.has(ownedBy(prev) ?? "")) {
      add("count", i, nomOf.get(noun.lemma)?.sg);
      add("count", i, nomOf.get(noun.lemma)?.pl);
    }
    // A noun in its plain form before a postposition.
    if (noun?.pos === "NOUN" && noun.key === "GENITIVE" && !noun.plural && next !== undefined && GENITIVE_POSTPOSITIONS.has(next)) {
      add("postposition", i, nomOf.get(noun.lemma)?.sg);
    }
    // An object in its plain form, after a verb saying "I", "you" or "we" in its own clause, which is where it is surely one.
    const clauseStart = Math.max(0, ...low.slice(0, i).map((_, j) => (/[,;:.!?]/.test(text.slice(matches[j]!.index! + matches[j]![0].length, matches[j + 1]?.index ?? text.length)) ? j + 1 : 0)));
    const personal = low.slice(clauseStart, i).some((w) => {
      const r = verbReadings(w);
      return r.length > 0 && r.every((x) => x.lemma !== "olema" && /^(IndPr|IndIpf)(Sg1|Sg2|Pl1|Pl2)$/.test(x.code));
    });
    if (personal && noun?.pos === "NOUN" && !noun.plural && (noun.key === "PARTITIVE" || noun.key === "GENITIVE")
      && !(prev !== undefined && counting.has(ownedBy(prev) ?? "")) && !(next !== undefined && GENITIVE_POSTPOSITIONS.has(next))) {
      breaks.push(...(() => {
        const to = nomOf.get(noun.lemma)?.sg;
        return to && to !== word ? [{ kind: "object", broken: swap(i, to), word: to, original: word }] : [];
      })());
    }
    // Two nouns joined by `ja`, the second left in its plain form.
    if (noun?.pos === "NOUN" && !noun.plural && noun.key !== "NOMINATIVE" && prev === "ja" && i >= 2 && i === low.length - 1) {
      const other = nounOf(low[i - 2]!);
      if (other?.pos === "NOUN" && other.key === noun.key && !other.plural) add("pair", i, nomOf.get(noun.lemma)?.sg);
    }
    // The person a feeling happens to, written as the one who does it: `mulle meeldib` as `ma meeldib`.
    if (next !== undefined && EXPERIENCER_NOMINATIVE.has(word)) {
      const verb = verbReadings(next)[0];
      const after = low[i + 2];
      if (verb && (verb.lemma === "meeldima" || verb.lemma === "valutama" || (verb.lemma === "olema" && next === "on" && after === "vaja"))
        && /Sg3$/.test(verb.code) && (verb.lemma === "meeldima") === ALLATIVE_FORMS.has(word)) {
        add("experiencer", i, EXPERIENCER_NOMINATIVE.get(word));
      }
    }
    // A pronoun saying whose, written as the subject: `minu kass on` as `mina kass on`.
    if (next !== undefined && POSSESSIVE_NOMINATIVE.has(word) && nounOf(next)?.pos === "NOUN" && nounOf(next)?.key === "NOMINATIVE") {
      const verbAt = low.findIndex((w, j) => j > i + 1 && verbReadings(w).some((r) => /Sg3$|Pl3$/.test(r.code)));
      if (verbAt === i + 2) add("possessive", i, POSSESSIVE_NOMINATIVE.get(word));
    }
    // `koos` and what it governs.
    if (prev === "koos" && noun?.pos === "NOUN" && noun.key === "COMITATIVE" && !noun.plural) add("governed", i, nomOf.get(noun.lemma)?.sg);
    // `palju` and `vähe` before a plural, put back in the plain form.
    if ((prev === "palju" || prev === "vähe") && noun?.pos === "NOUN" && noun.key === "PARTITIVE" && noun.plural) add("count", i, nomOf.get(noun.lemma)?.pl);
    // An adjective in the plural before a plural noun, put in the singular.
    if (noun?.pos === "ADJECTIVE" && noun.key === "NOMINATIVE" && noun.plural && next !== undefined) {
      const head = nounOf(next);
      if (head?.pos === "NOUN" && head.key === "NOMINATIVE" && head.plural) add("agreement", i, nomOf.get(noun.lemma)?.sg);
    }
    // The da-infinitive after the wider list of verbs that take it, and after `vaja`.
    if (v?.code === "Inf" && prev !== undefined) {
      const finite = verbReadings(prev)[0];
      if ((finite && (ALSO_DA_ONLY as readonly string[]).includes(finite.lemma) && /^(IndPr|IndIpf|KndPr)/.test(finite.code)) || (prev === "vaja" && v.lemma !== "minema")) {
        add("infinitive", i, tableOf.get(v.lemma)!.get("Sup"));
      }
    }
    // The ma-infinitive after the wider list of verbs that take it.
    if (v?.code === "Sup" && prev !== undefined) {
      const finite = verbReadings(prev)[0];
      const ma = finite && (MA_ONLY_VERBS as readonly string[]).includes(finite.lemma) && finite.lemma !== "pidama" && finite.lemma !== "hakkama"
        && /^(IndPr|IndIpf|KndPr)/.test(finite.code) && !(MA_ONLY_BUT_THIRD.has(finite.lemma) && /Sg3$/.test(finite.code));
      if (ma) add("infinitive", i, tableOf.get(v.lemma)!.get("Inf"));
    }
    // A command after `ära` or `ärge`, put in a person.
    if ((prev === "ära" || prev === "ärge") && i === 1 && v) {
      const code = prev === "ära" ? "ImpPrSg2" : "ImpPrPl2";
      if (verbs.some((r) => r.code === code)) add("command", i, tableOf.get(v.lemma)!.get(prev === "ära" ? "IndPrSg2" : "IndPrPl2"));
    }
    // A day or a month with a capital.
    if (i > 0 && calendar.has(ownedBy(word) ?? "") && word === matches[i]![0]) add("lowercase", i, word.charAt(0).toLocaleUpperCase("et") + word.slice(1));
    // `mul on` as though the owner were the subject.
    if (word === "on" && prev !== undefined && OWNERS[prev]) add("have", i, OWNERS[prev]);
  }
  // A dropped diacritic and a dropped letter, once a sentence.
  const marked = low.findIndex((w) => /[õäöü]/.test(w) && w.length >= 4);
  if (marked >= 0) add("spelling:marks", marked, low[marked]!.replace(/[õäöü]/, (c) => fold(c)));
  const long = low.findIndex((w) => w.length >= 7 && !/[õäöü]/.test(w));
  if (long >= 0) add("spelling:letter", long, low[long]!.slice(0, 3) + low[long]!.slice(4));
}
// A replacement that happens to be a real spelling is not a mistake at all.
await know(breaks.map((b) => b.word));
const real = (b: Break) => b.kind.startsWith("spelling") && exactSet.has(b.word.toLowerCase());

interface Tally { tried: number; caught: number; fixed: number; unnamed: number; wrong: number; stray: number }
const tallies = new Map<string, Tally>();
const missed: string[] = [];
for (const b of breaks) {
  if (real(b)) continue;
  const kind = b.kind.startsWith("spelling") ? b.kind : b.kind;
  const t = tallies.get(kind) ?? { tried: 0, caught: 0, fixed: 0, unnamed: 0, wrong: 0, stray: 0 };
  tallies.set(kind, t);
  t.tried += 1;
  const findings = check(b.broken);
  const on = findings.filter((f) => f.word.toLowerCase() === b.word.toLowerCase());
  const offers = (f: Finding): string[] => {
    if (f.kind === "spelling") return f.suggestion ? [f.suggestion] : [];
    if (f.kind === "object") return [f.partitive, f.genitive].filter((x): x is string => !!x);
    return "right" in f ? [f.right] : [];
  };
  if (on.length > 0) {
    t.caught += 1;
    if (on.some((f) => offers(f).some((o) => o.toLowerCase() === b.original))) t.fixed += 1;
    else if (on.every((f) => offers(f).length === 0)) t.unnamed += 1;
    else {
      t.wrong += 1;
      if (showMissed) missed.push(`wrong fix (${kind}): ${b.broken}  [was ${b.original}] ${JSON.stringify(on)}`);
    }
  } else if (showMissed) missed.push(`missed (${kind}): ${b.broken}  [was ${b.original}]`);
  if (findings.length > on.length) {
    t.stray += 1;
    console.log(`stray (${kind}): ${b.broken}\n   ${findings.filter((f) => !on.includes(f)).map((f) => JSON.stringify(f)).join("\n   ")}`);
  }
}
if (showMissed) console.log(missed.join("\n"));

console.log(`\nBroken sentences, ${learner.size} learner-sized sentences broken one way at a time:`);
console.log("kind              tried  caught       fixed        no form  wrong form  stray");
for (const [kind, t] of [...tallies].sort()) {
  const pct = (n: number) => `${n}`.padStart(5) + ` ${String(Math.round((100 * n) / Math.max(1, t.tried))).padStart(3)}%`;
  console.log(`${kind.padEnd(16)} ${String(t.tried).padStart(6)} ${pct(t.caught)} ${pct(t.fixed)} ${String(t.unnamed).padStart(8)} ${String(t.wrong).padStart(10)} ${String(t.stray).padStart(6)}`);
}
console.log(`\nFalse alarms on correct Estonian: ${flagged} of ${correct.size}. Misspelled in the source itself: ${slipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
