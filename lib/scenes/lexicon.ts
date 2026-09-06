/**
 * The closed word list a scene may use, and every form of every word in it.
 *
 * Two jobs, and they are the same set read two ways. Retrieval asks "is this
 * recorded sentence readable by somebody who has done these units", which is a
 * membership test over every word in the sentence. Composition asks the model
 * to work inside the same set, and the gate then checks it did. A second copy
 * of this would be two answers to what a scene is allowed to say.
 *
 * The forms are built rather than looked up one by one. `matchEstonianForm` is
 * the runtime gate and it is the right function for one word against the whole
 * dictionary; here the question is thousands of words against a few hundred
 * known entries, and the same knowledge inverted (every form each entry has, in
 * a set) answers it in constant time per word. The knowledge is the same
 * because it comes from the same two places: `buildCaseTable` for a nominal, so
 * the eleven regular cases and both illatives are in, and `derivedVerbForms`
 * for a verb, which `npm run audit:verbs` checked against Ekilex over 797 verbs.
 *
 * `forms` is deliberately not folded. `matchEstonianForm` folds diacritics
 * because a learner types `koik` for `kõik`; an attested sentence is spelled
 * correctly, so folding *retrieval* would only let a wrong spelling read as
 * known. The learner's own turn is the other case, and `folded` is the same
 * set read for it: a person hearing `koik` understands `kõik`, and the marker
 * does too, noting the spelling (`lib/scenes/nearly.ts`).
 *
 * Pure: takes entries, returns sets. No React, no Next, no Prisma.
 */
import { buildCaseTable, stemsFrom } from "@/lib/estonian/derive";
import { derivedVerbForms, type DerivedVerbCode } from "@/lib/estonian/conjugate";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { fold } from "@/lib/estonian/fold";
import { CASES } from "@/lib/estonian/cases";
import type { CaseKey } from "@/lib/estonian/types";

/** One dictionary entry, as this module needs to see it. */
export interface DictEntry {
  readonly lemma: string;
  readonly pos: string;
  readonly cefr: string | null;
  /** Principal parts by formType, exactly as the seed stores them. */
  readonly parts: Readonly<Record<string, string>>;
  /**
   * Whole forms Ekilex recorded that no rule reaches, by its own morph code.
   *
   * The seed writes these beside the principal parts and this module has to
   * read both, because between them they are what the dictionary can say. It
   * read `parts` alone at first and the cost was exactly the words a scene is
   * made of: `on`, `oli`, `pole`, `ta`, `tal`, `mu`, `nad` and `me` were all
   * absent from every scene's word list, so the gate would have withheld any
   * composed line that used one, which is most lines anybody would write.
   */
  readonly extraForms?: readonly { code: string; value: string }[];
  /** Sentences a lexicographer recorded against this entry. */
  readonly usages: readonly string[];
}

/**
 * The six present-tense persons, in the codes `derivedVerbForms` uses.
 *
 * Present indicative only, and that is the whole of what agreement can be
 * checked on without a parser: the conditional is one form for two persons
 * (`tuleksid` is `sina` and `nemad`), the negative is one form for all six,
 * and the imperative has no subject pronoun in front of it at all. A code
 * outside this list is a form the check has nothing to say about.
 */
export const PERSON_CODES = [
  "IndPrSg1", "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3",
] as const;

export type PersonCode = (typeof PERSON_CODES)[number];

/** Lowercased words of a string, by the app's one tokenizer. */
export function words(text: string): string[] {
  return (text.match(ESTONIAN_WORD) ?? []).map((w) => w.toLowerCase());
}

/**
 * Every form of one entry, lowercased.
 *
 * A `PHRASE` has no forms because Ekilex has no headword for it, so what it
 * contributes is its own words: somebody who has met `Tere hommikust!` can read
 * both halves of it.
 */
export function formsOf(entry: DictEntry): string[] {
  const out = new Set<string>();
  for (const w of words(entry.lemma)) out.add(w);
  for (const value of Object.values(entry.parts)) {
    for (const w of words(value)) out.add(w);
  }
  const extra = entry.extraForms ?? [];
  for (const form of extra) for (const w of words(form.value)) out.add(w);

  if (entry.pos === "VERB") {
    for (const form of derivedVerbForms({ lemma: entry.lemma, pres1sg: entry.parts.PRES_1SG })) {
      for (const w of words(form.value)) out.add(w);
    }
  } else if (entry.parts.GEN_SG) {
    /*
      `stemsFrom` rather than `stemsFromParts`, because the retrieved forms are
      what tell `buildCaseTable` that a case has two of them. Through the parts
      alone a pronoun's table is `minule` and nothing else, and `mulle` is the
      half anybody says.
    */
    const rows = [
      ...Object.entries(entry.parts).map(([formType, value]) => ({ formType, value })),
      ...extra.map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
    ];
    for (const row of buildCaseTable(stemsFrom(rows))) {
      for (const value of [row.singular, row.plural, row.alsoRight, ...row.accepted]) {
        if (value) for (const w of words(value)) out.add(w);
      }
    }
  }

  return [...out];
}

export interface Lexicon {
  /** Every form of every word the scene may use. */
  readonly forms: ReadonlySet<string>;
  /** Lemma to its own forms, so a beat can ask whether its word is present. */
  readonly byLemma: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * `lemma|CASE` to every spelling that counts as that case of that word.
   *
   * A beat can require a word *in a case*, which is the one requirement that
   * cannot be answered by "is this word here at all": `Mul on kurguvalu` and
   * `Mul on kurguvalus` are the same word and only one of them is the answer.
   * `caseAnswer` is what decides that everywhere else in this app, and it
   * returns every accepted spelling rather than one, so `tuppa` and `toasse`
   * both count and a learner is not marked wrong for the other true answer.
   *
   * Built here rather than asked per turn, for the reason the forms are: this
   * is a few hundred entries answered once against a turn of half a dozen
   * words, and the alternative is resolving a lemma to its stems inside the
   * marker, which would put the dictionary back in a module that has none.
   */
  readonly byCase: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * `lemma|CASE` to the one spelling a screen prints for it.
   *
   * `byCase` is what a marker takes and is deliberately wider than what a
   * screen shows, for the reason `accepted` is wider than `alsoRight` on a
   * `DerivedForm`: it holds a suffix guess beside a retrieved form, and
   * printing the pair would assert the guess is a word. A line the other side
   * says off the card (`datumLine`) needs the printed form and only that,
   * `teisipäeval` for the day they are offering, so this is the table's own
   * singular, and a case the table has no form for is simply absent.
   */
  readonly caseForm: ReadonlyMap<string, string>;
  /**
   * Every form with its diacritics folded away, to the spelling the
   * dictionary holds.
   *
   * The marker's half of the answer the file header gives about folding.
   * Retrieval may not fold, because an attested sentence is spelled correctly
   * and folding would only let a wrong spelling read as known; a *learner's*
   * turn is typed on a keyboard that often has no õ, and a person hearing
   * `koik` says nothing about the vowel. So `readTurn` reads a folded match
   * as the word, understood, with the spelling noted (`Slip`). Where two
   * forms fold to one spelling the first entry keeps it, which costs a
   * recast and never a reading.
   */
  readonly folded: ReadonlyMap<string, string>;
  /**
   * A verb's ma-infinitive, by lemma, so the marker can tell `ma tulema`
   * from `ma tulen`: the first is the dictionary form where a person was
   * due, and a friend who hears it understands and says `tulen` back. The
   * da-infinitive is not here, because `ma tahan minna` is right.
   */
  readonly infinitives: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * A verb's derived forms, by lemma and morph code, off `derivedVerbForms`
   * and so off the stored first person and nothing else (ADR-005 amendment
   * 1). What the recast of `ma tulema` is read from, and what an aside's
   * `ei tea` is read from (`lib/scenes/aside.ts`). Absent for a verb the
   * rule does not reach, and then the slip is understood and not recast.
   */
  readonly persons: ReadonlyMap<string, ReadonlyMap<DerivedVerbCode, string>>;
}

/**
 * WHICH CASE A LEARNER REACHED FOR, WHERE EXACTLY ONE CASE SPELLS IT THAT WAY.
 *
 * `whichCase` over the whole dictionary and this over one scene's own table
 * are the same rule, and it is deliberately the strict one: `tuba` is its own
 * nimetav and its own osastav, so naming either would be a guess, while
 * `toale` is only ever the alaleütlev and naming it is the whole of what the
 * review can say about why the wrong ending came out. A spelling more than
 * one case claims is answered with null and the review says less.
 */
export function caseOfForm(lexicon: Lexicon, lemma: string, form: string): CaseKey | null {
  const said = form.toLowerCase();
  let found: CaseKey | null = null;
  for (const spec of CASES) {
    if (!lexicon.byCase.get(caseKeyFor(lemma, spec.key))?.has(said)) continue;
    if (found) return null;
    found = spec.key;
  }
  return found;
}

/**
 * The personal pronouns, each with the person a verb standing beside it has
 * to be in, so the gate can refuse `Kust sina nüüd tuleb?` (`disagrees`).
 *
 * Lemma requests against the course, like the reactions in the catalog, and
 * the only Estonian this file names. What the spellings are is never decided
 * here: `subjectsIn` reads each entry's own nominative row, which for `mina`
 * is `mina` and `ma` and for nothing else.
 */
export const SUBJECT_PRONOUN = {
  mina: "IndPrSg1", sina: "IndPrSg2", tema: "IndPrSg3",
  meie: "IndPrPl1", teie: "IndPrPl2", nemad: "IndPrPl3",
} as const satisfies Record<string, PersonCode>;

/**
 * The verbs that take the da-infinitive and never the ma-infinitive.
 *
 * `SAAN AITAMA` IS NOT A SENTENCE AND NOTHING COULD SEE IT. A learner read
 * `Tere! Mis needus täna aitama saan?` and asked, fairly, how that reaches a
 * screen: every word of it is vouched by the forms list, it names the beat's
 * own topic, it is inside the new-word budget and it is not the language. The
 * fault is one a model makes constantly in Estonian and a person never makes,
 * which is putting the dictionary form of a verb where the da-infinitive
 * belongs.
 *
 * Lemma requests against the course, like `SUBJECT_PRONOUN` above and the
 * reactions in the catalog, and this file still writes no form: which
 * spellings each of these has is read off the entry. Deliberately the short,
 * certain list rather than every verb that governs an infinitive. Estonian has
 * plenty that take the ma-infinitive (`lähen ostma`, `hakkan sööma`, `jäin
 * magama`) and a check built on a list of those would be a check built on the
 * half somebody forgot, refusing correct lines. These seven never take one, in
 * any register, so firing on them can only ever be right.
 */
export const DA_ONLY_VERBS = [
  "saama", "tahtma", "soovima", "võima", "oskama", "tohtima", "suutma", "proovima",
] as const;

/**
 * The one fixed expression that breaks the rule above, written down rather
 * than left to be rediscovered.
 *
 * `Ma saan hakkama` is "I will manage", it is what anybody says, and its second
 * word is the ma-infinitive of `hakkama` sitting straight after `saama`. It is
 * the one pair in the language that this check would otherwise refuse.
 */
export const DA_ONLY_EXEMPT: Readonly<Record<string, readonly string[]>> = {
  saama: ["hakkama"],
};

/**
 * A pronoun standing as a subject: the person it demands of a verb, and
 * whether that reading is the only one the spelling has.
 */
export interface Subject {
  readonly code: PersonCode;
  /**
   * True where the spelling is a nominative and nothing else, so a check may
   * act on it without looking at what stands beside it. False for `te`, `me`
   * and `ta`, which are each their pronoun's genitive as well.
   */
  readonly sure: boolean;
}

/**
 * Each pronoun's nominative spellings, to the person they demand of a verb.
 *
 * READ OFF THE PRONOUN'S OWN TABLE, which is the Institute's: `SgN` and `PlN`
 * are the nominative and `SgG` and `PlG` the genitive, so this file still
 * names no Estonian beyond the six lemmas it requests. It takes the entries
 * rather than the built `Lexicon` because a pronoun with no singular carries
 * no `parts` at all, and `buildLexicon` indexes a case table only where there
 * is a genitive stem to build one from: `meie`, `teie` and `nemad` were
 * therefore in no case row, and `subjectsIn` could not see them.
 *
 * THAT WAS THE WHOLE OF WHY THE CHECK MISSED THE COMMONEST FAULT IT EXISTS
 * FOR. Every one of these scenes is a clerk speaking to a customer, so nearly
 * every line the other side says is second person plural, and the app's own
 * model wrote `Kuhu te soovid sõita?` past a gate that had never heard of
 * `te`.
 *
 * AND AMBIGUITY IS REPORTED RATHER THAN DROPPED. The first version kept only
 * a spelling that is a nominative and nothing else, which is `caseOfForm`'s
 * strict rule, and that rule silently deleted `te`, `me` and `ta`, since each
 * is also its pronoun's genitive. `Teie nimi on Mari.` is an ordinary line
 * with no subject in it at all, and a check that read one there would refuse
 * it. So the spelling is carried with `sure: false` and the caller decides,
 * which is what `disagrees` does by looking at the word that follows.
 */
export function subjectsIn(entries: readonly DictEntry[]): ReadonlyMap<string, Subject> {
  const out = new Map<string, Subject>();
  const held = new Set(entries.map((entry) => entry.lemma));
  for (const [lemma, code] of Object.entries(SUBJECT_PRONOUN) as [string, PersonCode][]) {
    if (!held.has(lemma)) continue;
    const entry = entries.find((one) => one.lemma === lemma)!;
    const nominative = new Set<string>();
    const genitive = new Set<string>();
    if (entry.parts?.NOM_SG) nominative.add(entry.parts.NOM_SG.toLowerCase());
    if (entry.parts?.GEN_SG) genitive.add(entry.parts.GEN_SG.toLowerCase());
    for (const form of entry.extraForms ?? []) {
      if (form.code === "SgN" || form.code === "PlN") nominative.add(form.value.toLowerCase());
      if (form.code === "SgG" || form.code === "PlG") genitive.add(form.value.toLowerCase());
    }
    for (const form of nominative) out.set(form, { code, sure: !genitive.has(form) });
  }
  return out;
}

/** The key `byCase` is read with. One place, so a caller cannot spell it wrong. */
export function caseKeyFor(lemma: string, grammCase: string): string {
  return `${lemma.toLowerCase()}|${grammCase}`;
}

/** The closed list for one scene: the entries behind the lemmas it may use. */
export function buildLexicon(entries: readonly DictEntry[]): Lexicon {
  const forms = new Set<string>();
  const byLemma = new Map<string, Set<string>>();
  const byCase = new Map<string, Set<string>>();
  const caseForm = new Map<string, string>();
  const folded = new Map<string, string>();
  const infinitives = new Map<string, ReadonlySet<string>>();
  const persons = new Map<string, ReadonlyMap<DerivedVerbCode, string>>();
  for (const entry of entries) {
    const own = byLemma.get(entry.lemma) ?? new Set<string>();
    for (const form of formsOf(entry)) {
      forms.add(form);
      own.add(form);
      const flat = fold(form);
      if (!folded.has(flat)) folded.set(flat, form);
    }
    byLemma.set(entry.lemma, own);

    if (entry.pos === "VERB") {
      const inf = new Set<string>();
      if (entry.parts.INF_MA) for (const w of words(entry.parts.INF_MA)) inf.add(w);
      if (inf.size > 0) infinitives.set(entry.lemma, inf);
      const table = new Map<DerivedVerbCode, string>();
      for (const form of derivedVerbForms({ lemma: entry.lemma, pres1sg: entry.parts.PRES_1SG })) {
        table.set(form.morphCode, form.value);
      }
      /*
        AND AN ATTESTED FORM ANSWERS FIRST, which is the rule everywhere else
        in this app and was not the rule here. `derivedVerbForms` gives `olema`
        no present at all, because its third person is `on` and nothing about
        `olen` predicts that, so the commonest verb in the language had an
        empty table: no recast for `ma olema`, and nothing for the agreement
        check to compare a subject against on the one verb every other line
        holds. The harvest stored exactly those forms for exactly this reason,
        and they are read here beside the stored first person, which is a
        principal part rather than a derivation.
      */
      if (entry.parts.PRES_1SG) table.set("IndPrSg1", entry.parts.PRES_1SG.toLowerCase());
      for (const form of entry.extraForms ?? []) {
        if (PERSON_CODES.includes(form.code as PersonCode)) table.set(form.code as DerivedVerbCode, form.value.toLowerCase());
      }
      if (table.size > 0) persons.set(entry.lemma, table);
      continue;
    }
    if (!entry.parts.GEN_SG) continue;
    for (const row of caseTableOf(entry)) {
      const key = caseKeyFor(entry.lemma, row.spec.key);
      const seen = byCase.get(key) ?? new Set<string>();
      for (const value of row.accepted) {
        for (const word of words(value)) seen.add(word);
      }
      byCase.set(key, seen);
      if (row.singular && !caseForm.has(key)) caseForm.set(key, row.singular);
    }
  }
  return { forms, byLemma, byCase, caseForm, folded, infinitives, persons };
}

/** The eleven derivable cases of one nominal, attested forms leading. */
function caseTableOf(entry: DictEntry) {
  return buildCaseTable(stemsFrom([
    ...Object.entries(entry.parts).map(([formType, value]) => ({ formType, value })),
    ...(entry.extraForms ?? []).map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
  ]));
}

/**
 * A lexicon plus a set of bare words nothing in the dictionary can vouch for.
 *
 * THE SET IS MEASURED, NEVER TYPED, and that is the whole point of it. The
 * words that hold an Estonian sentence together are not in this app's
 * dictionary: Phase 0 found that `on`, `ja`, `ei`, `et` and their kind are in
 * neither the harvest, nor the built expansion, nor the hand seeds, so every
 * recorded sentence is unreadable to this module by one or two words a learner
 * has known since their first week. The seventeenth pass added six units for
 * the words between the words and caught question words, pronouns, time
 * adverbs, postpositions, months and countries. It did not catch the
 * conjunctions, the particles, or the present tense of `olema`.
 *
 * Writing that list here would be this file writing Estonian, which is the one
 * thing it may not do (ADR-005). So `measure-scenes.ts` derives it instead: the
 * commonest tokens in the attested corpus that no entry can account for, ranked
 * by frequency, which is both the honest floor for a coverage figure and the
 * list the missing syllabus unit should be built from. Nobody types a word, and
 * the number that comes out says exactly what that unit would buy.
 */
export function withExtras(lexicon: Lexicon, extras: Iterable<string>): Lexicon {
  const forms = new Set(lexicon.forms);
  const folded = new Map(lexicon.folded);
  for (const word of extras) {
    const lower = word.toLowerCase();
    forms.add(lower);
    if (!folded.has(fold(lower))) folded.set(fold(lower), lower);
  }
  return { ...lexicon, forms, folded };
}
