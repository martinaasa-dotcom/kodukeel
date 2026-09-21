import { caseByKey } from "./cases";
import type { CaseKey } from "./types";

/**
 * Ekilex's morph codes, decoded.
 *
 * Ekilex labels every retrieved form with a code (`SgIn`, `IndPrSg1`) and an
 * Estonian name ("ainsuse seesütlev"). Both are correct and neither is much use
 * to an English speaker mid-exercise, so this is the one place that turns a code
 * into something a learner can read — and into the case key the rest of the app
 * already reasons about, which is what lets a cloze built from a real sentence
 * count toward the weak-case breakdown.
 *
 * Pure data. Codes we do not recognize fall through as `null` rather than being
 * guessed at.
 */

/** Noun and adjective codes → the case, ignoring number. */
const CASE_BY_MORPH: Record<string, CaseKey> = {
  SgN: "NOMINATIVE", PlN: "NOMINATIVE",
  SgG: "GENITIVE", PlG: "GENITIVE",
  SgP: "PARTITIVE", PlP: "PARTITIVE",
  SgIll: "ILLATIVE", PlIll: "ILLATIVE", SgAdt: "ILLATIVE",
  SgIn: "INESSIVE", PlIn: "INESSIVE",
  SgEl: "ELATIVE", PlEl: "ELATIVE",
  SgAll: "ALLATIVE", PlAll: "ALLATIVE",
  SgAd: "ADESSIVE", PlAd: "ADESSIVE",
  SgAbl: "ABLATIVE", PlAbl: "ABLATIVE",
  SgTr: "TRANSLATIVE", PlTr: "TRANSLATIVE",
  SgTer: "TERMINATIVE", PlTer: "TERMINATIVE",
  SgEs: "ESSIVE", PlEs: "ESSIVE",
  SgAb: "ABESSIVE", PlAb: "ABESSIVE",
  SgKom: "COMITATIVE", PlKom: "COMITATIVE",
};

export function caseFromMorphCode(code: string | null | undefined): CaseKey | null {
  if (!code) return null;
  return CASE_BY_MORPH[code] ?? null;
}

/**
 * The code off a form, whichever of the two shapes the row is in.
 *
 * A live Ekilex fetch puts it on `morphCode`; the seed writes the retrieved
 * table under `formType` as `EKILEX:SgN`, with no `morphCode` at all
 * (`prisma/seed.ts`). Every reader of a form list has had to know that, and
 * `stemsFrom` says in its own comment why: different callers hold different
 * mixtures of the two, and a reader that knows about one of them silently
 * answers for half the dictionary. This is that reading, in the module that
 * owns the codes.
 *
 * A `formType` that is not a retrieved code comes back as it is, so
 * `GEN_SG` stays `GEN_SG` for the table below rather than being decoded into
 * something it is not.
 */
export function morphCodeOf(form: {
  formType?: string | null;
  morphCode?: string | null;
}): string | null {
  if (form.morphCode) return form.morphCode;
  const type = form.formType;
  if (!type) return null;
  return type.startsWith("EKILEX:") ? type.slice("EKILEX:".length) : type;
}

/**
 * Ekilex's own code for a case, for a caller holding the case rather than the
 * code: the search's suffix branch works out that `toas` is the seesütlev of
 * `tuba` from the ending, and the panel under a sentence then needs the same
 * form named. Read backwards off the table above rather than typed a second
 * time, so the two halves cannot disagree about what `SgIn` is.
 */
const MORPH_BY_CASE: Record<string, { singular: string; plural: string }> = (() => {
  const out: Record<string, { singular: string; plural: string }> = {};
  for (const [code, key] of Object.entries(CASE_BY_MORPH)) {
    // `SgAdt` is the short illative, which is a form of its own rather than
    // the plain one: the first `Sg` code for a case is the plain one.
    const slot = out[key] ?? (out[key] = { singular: "", plural: "" });
    if (code.startsWith("Sg") && !slot.singular) slot.singular = code;
    if (code.startsWith("Pl") && !slot.plural) slot.plural = code;
  }
  return out;
})();

export function morphCodeFor(key: CaseKey, plural = false): string | null {
  const slot = MORPH_BY_CASE[key];
  if (!slot) return null;
  return (plural ? slot.plural : slot.singular) || null;
}

/**
 * The Ekilex code for a form, whichever way the row spells its slot.
 *
 * `morphCodeOf` answers "what code is on this row", and for a principal part
 * the honest answer is that there is none: the seed writes those under
 * `formType` as `GEN_PL`, `INF_DA`, `PRES_1SG`. Every reader that then asks a
 * table keyed on Ekilex's codes gets nothing, silently, and looks exactly like
 * a reader whose word has no such form. That is what made the placement
 * check's plain-English clause dead on every seeded verb: `lib/estonian/plainAsk.ts`
 * is keyed on `IndPrSg1` and was being asked about `PRES_1SG`.
 *
 * So this is the other question, "which slot is this", answered as the one
 * code that names it. A row already carrying a code is unchanged; a principal
 * part is translated through the table below; anything else falls through as
 * itself rather than being guessed at.
 *
 * The table is not a second naming of anything: `morph_test` drives every pair
 * through `formName` and fails where the two spellings of one slot do not name
 * the same form, so a wrong pair here cannot sit quietly.
 */
const CODE_BY_FORM_TYPE: Record<string, string> = {
  NOM_SG: "SgN", GEN_SG: "SgG", PART_SG: "SgP", ILL_SG_SHORT: "SgAdt",
  NOM_PL: "PlN", GEN_PL: "PlG", PART_PL: "PlP",
  INF_MA: "Sup", INF_DA: "Inf",
  PRES_1SG: "IndPrSg1", PAST_1SG: "IndIpfSg1", PART_TUD: "PtsPtIps",
};

/** Every principal part this translates, for the check that it names one slot. */
export const FORM_TYPE_CODES: readonly (readonly [string, string])[] =
  Object.entries(CODE_BY_FORM_TYPE);

export function slotCodeOf(form: {
  formType?: string | null;
  morphCode?: string | null;
}): string | null {
  const code = morphCodeOf(form);
  if (!code) return null;
  return CODE_BY_FORM_TYPE[code] ?? code;
}

export type MorphNumber = "SINGULAR" | "PLURAL" | null;

/**
 * Singular or plural, off either shape a form's code is written in.
 *
 * Ekilex's own codes carry it as a prefix (`SgIn`, `PlIn`) and the seed's
 * principal parts carry it as a suffix (`GEN_SG`, `PART_PL`), and this read
 * only knew the first. That is fine for the callers holding `f.morphCode`,
 * which is null on a principal part anyway, and it was a hole under
 * `readForm`, which asks through `morphCodeOf` and so does see `GEN_PL`: the
 * plural was reported as unknown, and unknown is what lets a singular frame
 * ("in the room") be printed over a plural. Nothing reachable produced one,
 * because `caseFromMorphCode` happens to name no case for those codes either,
 * which is two tables agreeing by accident rather than a rule. Both shapes are
 * read here instead, so the number is a fact about the code rather than about
 * which table looked at it first.
 */
export function numberFromMorphCode(code: string | null | undefined): MorphNumber {
  if (!code) return null;
  if (code.startsWith("Sg")) return "SINGULAR";
  if (code.startsWith("Pl")) return "PLURAL";
  if (code.endsWith("_SG")) return "SINGULAR";
  if (code.endsWith("_PL")) return "PLURAL";
  return null;
}

export interface VerbSlot {
  /** English label a learner can act on. */
  en: string;
  /** Which block of the conjugation table this belongs in. */
  group: "PRESENT" | "PAST" | "CONDITIONAL" | "IMPERATIVE" | "NON_FINITE" | "OTHER";
  /** Position within the block — 1sg, 2sg, 3sg, 1pl, 2pl, 3pl. */
  order: number;
}

/**
 * The verb forms worth putting in a table.
 *
 * The full set of Estonian forms as Ekilex returns it runs to sixty-odd forms
 * including the quotative and four participles, which is a wall, not a table.
 * These are the ones a learner conjugates out loud: the present and simple past
 * in all six persons, the conditional, the imperative, and the non-finite forms
 * that are principal parts. Everything else still appears in the full form
 * list on the entry — it is just not pretending to be a lesson.
 */
export const VERB_SLOTS: Record<string, VerbSlot> = {
  IndPrSg1: { en: "ma", group: "PRESENT", order: 1 },
  IndPrSg2: { en: "sa", group: "PRESENT", order: 2 },
  IndPrSg3: { en: "ta", group: "PRESENT", order: 3 },
  IndPrPl1: { en: "me", group: "PRESENT", order: 4 },
  IndPrPl2: { en: "te", group: "PRESENT", order: 5 },
  IndPrPl3: { en: "nad", group: "PRESENT", order: 6 },

  IndIpfSg1: { en: "ma", group: "PAST", order: 1 },
  IndIpfSg2: { en: "sa", group: "PAST", order: 2 },
  IndIpfSg3: { en: "ta", group: "PAST", order: 3 },
  IndIpfPl1: { en: "me", group: "PAST", order: 4 },
  IndIpfPl2: { en: "te", group: "PAST", order: 5 },
  IndIpfPl3: { en: "nad", group: "PAST", order: 6 },

  // Ekilex codes the conditional `Knd` (tingiv), not `Cond`. Estonian has no
  // separate 3sg here — "ta jooks" is the impersonal-looking `KndPrPs` form,
  // which is what belongs in the third-person row of a table people recite.
  KndPrSg1: { en: "ma", group: "CONDITIONAL", order: 1 },
  KndPrSg2: { en: "sa", group: "CONDITIONAL", order: 2 },
  KndPrPs: { en: "ta", group: "CONDITIONAL", order: 3 },
  KndPrPl1: { en: "me", group: "CONDITIONAL", order: 4 },
  KndPrPl2: { en: "te", group: "CONDITIONAL", order: 5 },
  KndPrPl3: { en: "nad", group: "CONDITIONAL", order: 6 },

  ImpPrSg2: { en: "sa!", group: "IMPERATIVE", order: 2 },
  ImpPrPl1: { en: "me!", group: "IMPERATIVE", order: 4 },
  ImpPrPl2: { en: "te!", group: "IMPERATIVE", order: 5 },

  Sup: { en: "ma-infinitive", group: "NON_FINITE", order: 1 },
  Inf: { en: "da-infinitive", group: "NON_FINITE", order: 2 },
  PtsPtPs: { en: "nud-participle", group: "NON_FINITE", order: 3 },
  PtsPtIps: { en: "tud-participle", group: "NON_FINITE", order: 4 },
  IndPrIps: { en: "impersonal present", group: "NON_FINITE", order: 5 },
};

export const VERB_GROUP_LABELS: Record<VerbSlot["group"], { en: string; et: string }> = {
  PRESENT: { en: "Present", et: "olevik" },
  PAST: { en: "Simple past", et: "lihtminevik" },
  CONDITIONAL: { en: "Conditional", et: "tingiv kõneviis" },
  IMPERATIVE: { en: "Imperative", et: "käskiv kõneviis" },
  NON_FINITE: { en: "Infinitives and participles", et: "tegevusnimed ja kesksõnad" },
  OTHER: { en: "Other forms", et: "muud vormid" },
};

export function verbSlot(code: string | null | undefined): VerbSlot | null {
  if (!code) return null;
  return VERB_SLOTS[code] ?? null;
}

/**
 * What to call one form of a word, in front of a learner.
 *
 * Three copies of a hand-typed English table used to answer this question, in
 * the dictionary's "you typed the X of Y" note, in the pasted-passage gap fill
 * and in the minimal pairs round. All three said "inessive" and "present 1sg",
 * which are names no Estonian course uses: a learner who searches `toas` and is
 * told it is the inessive has been handed a word their own teacher will not
 * say. One table now, derived from the case list and the verb slots rather than
 * retyped, and the Estonian name leads with the English one after it, because
 * that is the pair that is useful to somebody reading in both places.
 */
export interface FormName {
  readonly et: string;
  /**
   * The English half, which for a case is what its question asks.
   *
   * It was the Latin name, so a learner who searched `toas` was told it is
   * "seesütlev (inessive)": the Estonian name their teacher uses, and then one
   * English word that is a translation of a translation. `asksEn` is what
   * the case is actually asking, off the one table in `lib/estonian/cases.ts`,
   * so the note on a search result and the Answers column on the entry under
   * it say the same thing. A verb slot keeps its own English name, which is
   * already plain: "present", "simple past". It names the category and never
   * the person, because the person is an Estonian pronoun and it is standing
   * in the half that leads: see the note on the derived slots below.
   */
  readonly en: string;
}

/** What a case asks, for the two tables below, so neither retypes it. */
const asks = (key: string): string => caseByKey(key)?.asksEn ?? key.toLowerCase();

/** The slots the seed stores by `formType`, which carry no morph code. */
const STORED_NAMES: Record<string, FormName> = {
  NOM_SG: { et: "nimetav", en: asks("NOMINATIVE") },
  GEN_SG: { et: "omastav", en: asks("GENITIVE") },
  PART_SG: { et: "osastav", en: asks("PARTITIVE") },
  ILL_SG_SHORT: { et: "lühike sisseütlev", en: `${asks("ILLATIVE")}, the short one` },
  NOM_PL: { et: "mitmuse nimetav", en: `${asks("NOMINATIVE")}, plural` },
  PART_PL: { et: "mitmuse osastav", en: `${asks("PARTITIVE")}, plural` },
  GEN_PL: { et: "mitmuse omastav", en: `${asks("GENITIVE")}, plural` },
  INF_MA: { et: "ma-tegevusnimi", en: "ma-infinitive" },
  INF_DA: { et: "da-tegevusnimi", en: "da-infinitive" },
  /*
    Worded exactly as the derived verb-slot names below, so that one word
    resolving from a stored principal part and another from an Ekilex morph
    code do not read as two different grammatical categories.

    THE ENGLISH NAMES THE CATEGORY AND NOT THE PERSON, which the derived table
    was corrected to and this one was not, so the two read differently on the
    one screen that draws both: `armastab` came back "olevik ta (present)" off
    its code and `elan` "olevik ma (present ma)" off its principal part, with
    the pronoun said twice and the second one an Estonian word standing inside
    an English gloss that exists for somebody reading an English reference
    grammar. The comment above claimed the two were worded alike while they
    were not, which is the shape this file keeps finding in its own prose.
  */
  PRES_1SG: { et: "olevik ma", en: "present" },
  PAST_1SG: { et: "lihtminevik ma", en: "simple past" },
  PART_TUD: { et: "tud-kesksõna", en: "tud-participle" },
};

/** The non-finite verb codes, which have a name rather than a person. */
const NON_FINITE_NAMES: Record<string, FormName> = {
  Sup: { et: "ma-tegevusnimi", en: "ma-infinitive" },
  Inf: { et: "da-tegevusnimi", en: "da-infinitive" },
  PtsPtPs: { et: "nud-kesksõna", en: "nud-participle" },
  PtsPtIps: { et: "tud-kesksõna", en: "tud-participle" },
  IndPrIps: { et: "umbisikuline olevik", en: "impersonal present" },
};

/** Name for a noun or adjective form code, or null when it is not one. */
function caseName(code: string): FormName | null {
  if (code === "SgAdt") return { et: "lühike sisseütlev", en: `${asks("ILLATIVE")}, the short one` };
  const key = caseFromMorphCode(code);
  if (!key) return null;
  const spec = caseByKey(key);
  if (!spec) return null;
  const plural = numberFromMorphCode(code) === "PLURAL";
  return {
    et: plural ? `mitmuse ${spec.et}` : spec.et,
    en: plural ? `${spec.asksEn}, plural` : spec.asksEn,
  };
}

/**
 * The name of a form, from whichever of the three things we know about it.
 *
 * Never falls through to an internal `formType`: that leaked as "EKILEX:SgIn"
 * once. Ekilex's own `morphName` is Estonian already, so it stands alone.
 */
export function formName(form: {
  formType?: string | null;
  morphCode?: string | null;
  morphName?: string | null;
}): FormName | null {
  /*
    `morphCodeOf` rather than `form.morphCode`, and that is the whole of what
    was wrong with this for as long as it has existed. The seed writes the
    retrieved table under `formType` as `EKILEX:SgN` and no `morphCode`, so on
    a seeded deployment — which is every deployment, for the 1,765 forms the
    harvest stores because no rule reaches them — this fell past the code
    branch, past the stored table, past `morphName`, and out of `formLabel`'s
    last line as the bare code. A learner tapped `Ta` in a sentence and was
    told it was the `SgN` of `tema`. The names were all here; nothing was
    reading them.
  */
  const code = morphCodeOf(form);
  if (code) {
    const nonFinite = NON_FINITE_NAMES[code];
    if (nonFinite) return nonFinite;
    const cased = caseName(code);
    if (cased) return cased;
    const slot = VERB_SLOTS[code];
    if (slot && slot.group !== "NON_FINITE") {
      const group = VERB_GROUP_LABELS[slot.group];
      /*
        The English half names the category and not the person, because the
        person is the same token in both halves. `formLabel` prints the pair
        where they differ, so this used to read "olevik ta (present ta)", and
        the second `ta` is an Estonian pronoun standing in an English gloss
        that exists for somebody reading an English reference grammar. The
        pronoun is already in front of them, in the half that leads.
      */
      return { et: `${group.et} ${slot.en}`, en: group.en.toLowerCase() };
    }
  }
  if (form.formType && STORED_NAMES[form.formType]) return STORED_NAMES[form.formType]!;
  if (form.morphName) return { et: form.morphName, en: form.morphName };
  return null;
}

/**
 * The one string to print: the name a class uses, with the English one after it
 * where the two differ. Falls back to the raw slot only when nothing else is
 * known, and never to an internal code.
 */
export function formLabel(form: {
  formType?: string | null;
  morphCode?: string | null;
  morphName?: string | null;
}): string {
  const name = formName(form);
  if (!name) return (form.formType ?? form.morphCode ?? "").replace(/^EKILEX:/, "");
  return name.et === name.en ? name.et : `${name.et} (${name.en})`;
}
