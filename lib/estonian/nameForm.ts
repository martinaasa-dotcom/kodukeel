import type { Locale } from "@/lib/copy/locale";
import { caseByKey, caseNameWithNumber, casePlainName } from "./cases";
import { derivedVerbForms, pastPersons, pres1sgFrom } from "./conjugate";
import { buildCaseTable, stemsFrom } from "./derive";
import { formName, type FormName } from "./morph";
import { caseIndex, readCase, tidyForm } from "./whichCase";
import type { CaseKey } from "./types";

/**
 * WHICH FORM A SPELLING IS, NAMED THE WAY A CLASS NAMES IT, FOR A QUESTION
 * THAT ASKS FOR IT.
 *
 * A lesson's practice asked "the name, as an object" and wanted `nime`. A
 * native speaker reported it as unclear, and it was: the English says what the
 * word is doing and never which form that takes, so the learner typed `nimi`
 * and was told only "It's nime." This answers the missing half, off the
 * dictionary's own forms and the app's own names (`casePlainName`,
 * `formName`): `omastav (2nd form)`, `lihtminevik, ma (I form)`.
 *
 * ONE SPELLING CAN BE TWO FORMS, AND THEN BOTH ARE NAMED. `nime` is the
 * omastav and the osastav of `nimi` at once, so naming one would be a guess
 * the learner can catch the app making; naming both is true, and typing the
 * one spelling answers either. A case is read under `readCase`'s strict rule,
 * the same that decides whether a gap may be cut for a case, and a spelling
 * the dictionary cannot place at all gets no name rather than a wrong one.
 *
 * Pure: no React, no Prisma. Nothing here is Estonian beyond the names the
 * two tables already hold (ADR-005).
 */

/** An entry as the lesson reader holds it: its headword, its part of speech and every stored form. */
export interface EntryForms {
  readonly lemma: string;
  readonly pos: string;
  readonly forms: readonly { readonly value: string; readonly formType?: string | null; readonly morphCode?: string | null }[];
}

/** A form's name in each language, ready to print. */
export type FormNames = Readonly<Record<Locale, string>>;

const LOCALES: readonly Locale[] = ["en", "ru", "uk"];
const OR: Readonly<Record<Locale, string>> = { en: "or", ru: "или", uk: "або" };

/** One form a spelling could be: its name, and the case where it is one, which the English can point at. */
interface Candidate { readonly names: FormNames; readonly key: CaseKey | null }

const caseCandidate = (key: CaseKey, plural = false): Candidate | null => {
  const spec = caseByKey(key);
  if (!spec) return null;
  const name = (l: Locale) => (plural ? caseNameWithNumber(spec, "mitmus", l) : casePlainName(spec, l));
  return { key, names: Object.fromEntries(LOCALES.map((l) => [l, name(l)])) as FormNames };
};

const named = (name: FormName | null): Candidate | null => (name?.shown ? { key: null, names: name.shown } : null);

/**
 * WHERE ONE SPELLING IS SEVERAL CASES, THE QUESTION'S OWN ENGLISH SAYS WHICH.
 *
 * `kohvi` is the omastav, the osastav and the short sisseütlev of `kohv`, and
 * "omastav, osastav or sisseütlev" under "coffee, some coffee" is three names
 * where the learner needed one. The lesson already said which in English:
 * "some", "after a number" and "as an object" are the osastav, "of the" is
 * the omastav, "into" and "to the" are the sisseütlev. A cue may only choose
 * among the forms the dictionary says the spelling is, never add one: where
 * cues point at several ("of the forest, into the forest") those are named,
 * and where none points, every candidate is.
 */
const CUES: readonly (readonly [CaseKey, RegExp])[] = [
  ["PARTITIVE", /\bsome\b|after a (?:number|count|no)\b|as an object|after (?:need|want)\b|after \{(?:vaja|tahan|enne|pärast|ei|ei ole)\}|as what you\b|as how much|while you're/i],
  ["GENITIVE", /\bof\b|'s\b/i],
  ["ILLATIVE", /\binto\b|\bto the\b|where to\b/i],
];

function narrow(candidates: readonly Candidate[], english: string | undefined): Candidate[] {
  if (!english || candidates.length < 2) return [...candidates];
  const pointed = CUES.filter(([, cue]) => cue.test(english)).map(([key]) => key);
  const hits = candidates.filter((c) => c.key !== null && pointed.includes(c.key));
  return hits.length > 0 ? hits : [...candidates];
}

/** Several names said as one: "omastav (2nd form) or osastav (3rd form)". Three at most. */
function either(candidates: readonly Candidate[]): FormNames | null {
  const unique: FormNames[] = [];
  for (const c of candidates) if (!unique.some((u) => u.en === c.names.en)) unique.push(c.names);
  if (unique.length === 0 || unique.length > 3) return null;
  return Object.fromEntries(LOCALES.map((l) => {
    const xs = unique.map((u) => u[l]);
    return [l, xs.length === 1 ? xs[0]! : `${xs.slice(0, -1).join(", ")} ${OR[l]} ${xs[xs.length - 1]!}`];
  })) as FormNames;
}

/** Every form `spelling` could be of `entry`, off the dictionary's own forms. */
function candidatesFor(entry: EntryForms, spelling: string): Candidate[] {
  const want = tidyForm(spelling);
  if (!want) return [];
  const isVerb = entry.pos === "VERB";
  /* The headword spelled as itself is the word, unless a case shares the
     spelling (`raamatukogu`, its own omastav): a form taught is never the
     plain dictionary word, so that one is left out below. */
  const isHeadword = want === tidyForm(entry.lemma);
  if (isHeadword && isVerb) return [];

  if (!isVerb) {
    const stems = stemsFrom(entry.forms);
    const verdict = readCase(caseIndex(stems), want);
    if (verdict.kind === "one") {
      if (isHeadword && verdict.key === "NOMINATIVE") return [];
      return [caseCandidate(verdict.key)].filter((c): c is Candidate => c !== null);
    }
    if (verdict.kind === "shared") {
      /* A case the spelling collides with only in the plural (`tööd`, the
         osastav and the plural nimetav) is named as the plural, or the screen
         would call a plural subject a singular one. */
      const rows = buildCaseTable(stems);
      const singularIs = (key: CaseKey) => {
        if (key === "NOMINATIVE") return tidyForm(stems.nomSg ?? "") === want;
        if (key === "GENITIVE") return tidyForm(stems.genSg ?? "") === want;
        if (key === "PARTITIVE") return tidyForm(stems.partSg ?? "") === want;
        const row = rows.find((r) => r.spec.key === key);
        return [row?.singular, row?.alsoRight].some((v) => tidyForm(v ?? "") === want);
      };
      return verdict.keys
        .filter((key) => !(key === "NOMINATIVE" && singularIs(key)))
        .map((key) => caseCandidate(key, !singularIs(key))).filter((c): c is Candidate => c !== null);
    }
    if (isHeadword) return [];
    /* A plural case spelled like no singular one (`raamatutes`), off the same table. */
    const plurals = buildCaseTable(stems).filter((r) => tidyForm(r.plural ?? "") === want);
    if (plurals.length > 0) return plurals.map((r) => caseCandidate(r.spec.key, true)).filter((c): c is Candidate => c !== null);
  }

  /* A stored row, or for a verb a person the rule builds off its stored first persons. */
  const out: Candidate[] = [];
  const push = (c: Candidate | null) => { if (c) out.push(c); };
  for (const row of entry.forms) if (tidyForm(row.value) === want) push(named(formName(row)));
  if (isVerb) {
    for (const d of derivedVerbForms({ lemma: entry.lemma, pres1sg: pres1sgFrom(entry.forms) })) {
      if (tidyForm(d.value) === want) push(named(formName({ morphCode: d.morphCode })));
    }
    const past1sg = entry.forms.find((f) => f.formType === "PAST_1SG" || f.formType === "EKILEX:IndIpfSg1" || f.morphCode === "IndIpfSg1")?.value;
    if (past1sg) for (const d of pastPersons(past1sg)) if (tidyForm(d.value) === want) push(named(formName({ morphCode: d.morphCode })));
  }
  return out;
}

/**
 * The name of `spelling` as a form of `entry`, or null where the dictionary
 * cannot say. The headword itself gets none: it is the word, not a form of it.
 * `english` is the question's own English, which picks among several cases.
 */
export function nameSpelling(entry: EntryForms, spelling: string, english?: string): FormNames | null {
  return either(narrow(candidatesFor(entry, spelling), english));
}

/** The name across every entry under one headword: one entry naming it, or every naming entry agreeing. */
export function nameAcross(entries: readonly EntryForms[], spelling: string, english?: string): FormNames | null {
  const names = entries.map((e) => nameSpelling(e, spelling, english)).filter((n): n is FormNames => n !== null);
  if (names.length === 0) return null;
  return names.every((n) => n.en === names[0]!.en) ? names[0]! : null;
}
