import {
  buildLexicon, caseKeyFor, caseOfForm, DA_ONLY_EXEMPT, DA_ONLY_VERBS, subjectsIn, words,
  type DictEntry,
} from "@/lib/scenes/lexicon";
import { buildCaseTable, stemsFrom, type DerivedForm } from "@/lib/estonian/derive";
import { derivedVerbForms } from "@/lib/estonian/conjugate";
import { ESTONIAN_WORD, primaryAnswer } from "@/lib/estonian/cloze";
import { editDistance } from "@/lib/estonian/answer";
import { governmentParts } from "@/lib/estonian/government";
import { fold } from "@/lib/estonian/fold";
import { isNumber, isThing, isTime } from "@/lib/estonian/semantics";
import { PARTICLES } from "@/lib/estonian/wordOrder";
import type { CaseKey } from "@/lib/estonian/types";

/**
 * IS MY SENTENCE RIGHT, ASKED OF THE DICTIONARY RATHER THAN OF A MODEL.
 *
 * A learner typed `Tere! Ma soovin raamatukogukaart osta.` into a role-play
 * card and asked how they would ever know whether that was right. The card
 * compared it with one way to say it, said "Yours can be different", and
 * stopped, so a sentence with a wrong ending and a sentence that was perfect
 * looked the same. The operator's call was that this needs no model: the
 * dictionary already holds every form these checks need, and every one of
 * them is a rule this app already runs against the other side's lines in a
 * conversation (`lib/scenes/gate.ts`). What is new is that each check names
 * the word and hands over the right form, where the gate only says yes or no.
 *
 * FIFTEEN THINGS, EACH DRAWN TO MISS RATHER THAN TO FIRE. A check that tells
 * somebody their correct Estonian is wrong is worse than no check, so each one
 * reads only what the dictionary settles on its own, and every word a rule
 * corrects is one the forms list says no other headword spells that way
 * (`CheckReads.claims`), so `kandis` "in the area" is never told it is the
 * verb in the wrong person:
 *
 * - SPELLING. A word no form in the language is spelled like, where the word
 *   meant can be named: a mark left off or put on the wrong letter, which
 *   keeps every mark the learner did type (`soön` is `söön`, not `soon`), or
 *   one letter out. Silent otherwise, since Estonian builds compounds and
 *   participles nobody has listed: a word that may be one of those
 *   (`lehmasitt`, `askeldamist`), a word after a name, and a long word two
 *   letters out are corrected only toward a word on the card.
 * - A DAY OR A MONTH WITH A CAPITAL, which Estonian writes small.
 * - PERSON, in the present, the past and the conditional. Exactly one
 *   pronoun in the clause and a verb in none of its persons: `ma soovib` is
 *   `ma soovin`, `ta lugesin` is `ta luges`. Read per clause, at the comma
 *   for the reason `disagrees` gives and at a joining word (`JOINERS`). And a
 *   thing as the subject with the verb saying I or you, where no pronoun is
 *   in the clause: `See olen hea mõte` is `on`, and so is `Siin olen menüü`,
 *   since a thing cannot be "I".
 * - THE NEGATIVE, in every tense. After `ei` the verb takes no person
 *   ending: `ei soovin` is `ei soovi`, `ei lugesin` is `ei lugenud`, `ei on`
 *   is `ei ole`.
 * - WHO HAS IT. After `mul`, `sul` and the rest, `olema` is the third person:
 *   `mul olen` is `mul on`.
 * - THE DICTIONARY FORM AS A VERB. A subject pronoun straight before a
 *   ma-infinitive, with no verb in a person anywhere in the clause: `ma tulema`
 *   is `ma tulen`.
 * - THE WRONG INFINITIVE, both ways round. A verb that only ever takes the
 *   da-infinitive, next to a ma-infinitive: `tahan ostma` is `tahan osta`, and
 *   `vaja` takes it too. And the verbs that take the ma-infinitive straight
 *   after them: `pean minna` is `pean minema`.
 * - WHO A FEELING HAPPENS TO, AND WHOSE A THING IS. `ma meeldib` is `mulle
 *   meeldib`, `ma valutab pea` is `mul valutab pea`, and `mina kass on` is
 *   `minu kass on`: each written as a subject with the verb in the third
 *   person, and each named as what it is rather than told to change the verb.
 * - AFTER `koos`, the comitative: `koos sõber` is `koos sõbraga`.
 * - AFTER `ära`, the command: `ära tuled` is `ära tule`.
 * - AGREEMENT. An adjective in its plain form before a noun with an ending:
 *   `elan suur majas` is `suures majas`, `ostan uus raamatut` is `uut`, and an
 *   adjective in the singular before a plural is the plural (`ilusad lilled`).
 * - COUNTED. After a number above one, or a word of quantity, a noun in its
 *   plain form takes the partitive singular: `kaks kook` is `kaks kooki`, and
 *   so are `kaks raamatud` and `kolm euro`; after `palju` and `vähe`, a plural
 *   takes the partitive plural.
 * - BEFORE A POSTPOSITION. A noun in its plain form straight before one that
 *   takes the genitive: `laud peal` is `laua peal`. Only where the clause has a
 *   verb and names no place in another word, since `Vaasis on vesi sees` is the
 *   water being inside and is right, unless the verb says I or you, which the
 *   plain noun cannot then be. A word of time before `pärast` is always the
 *   genitive (`tunni pärast`).
 * - JOINED BY `ja`. A lone plain noun after it takes the ending of the noun
 *   before: `elutoa ja köök` is `elutoa ja köögi`, and the second thing bought
 *   in `Ostsin kala ja kartul` is an object too.
 * - THE OBJECT IN THE PLAIN FORM. In a clause whose subject is I, you or we,
 *   with no form of `olema`, no command and no third-person verb in it, a noun
 *   after the verb whose spelling is its nominative and nothing else, of this
 *   word or any other, is in the wrong case: the thing you want or buy takes
 *   an ending. Offered as the partitive, and as the genitive too unless the
 *   clause rules a whole thing out: a negative, a verb whose object is only
 *   ever partial (`ootan`, `kuulan`), or a verb of wanting (`soovin kaarti`).
 *   Said to need an ending, and not which, where the verb records no object.
 *   A plural is never read (`Ma ostan kaardid` is right), nor a name, nor a
 *   word of time (`Ma ootasin tund aega` is right), nor a verb particle.
 *
 * MEASURED RATHER THAN REASONED ABOUT. `npm run measure:sentence-check` runs
 * this over every lesson line, every sentence written for a beginner, every
 * scene line and every usage in the shipped dictionary, which are known to be
 * right, and every guard here was a false alarm that run printed. The count it
 * prints is the number to keep at nought. It then breaks the learner-sized
 * sentences one way at a time and prints, per rule, how many it caught and
 * whether the form it offered was the word that was there.
 *
 * WHAT IT CANNOT SEE IS SAID ON THE SCREEN, NOT HIDDEN. Word order, meaning,
 * and every case a verb governs other than its object are outside it, so a
 * clean result says no mistakes were found in the spelling or the endings and
 * never that the sentence is correct.
 *
 * NOTHING HERE WRITES ESTONIAN (ADR-005). Every form a finding offers is read
 * off an entry the caller handed in: a stored part, a form Ekilex retrieved, or
 * a person or a case a rule builds off a stored stem, which is amendment 1's
 * latitude. The Estonian this file names is short lists of lemma requests,
 * the shape `DA_ONLY_VERBS` takes: the negators, the joining words, the words
 * of quantity and question, and the postpositions, each with its reason
 * beside it. Pure, so it is tested without a database.
 */

/** One dictionary entry as the check reads it. */
export interface CheckEntry extends DictEntry {
  readonly government: string | null;
  /** The Institute's semantic codes, as stored. */
  readonly semanticTypes: string | null;
}

export type Finding =
  /** Not a spelling of any word. `suggestion` is a word the dictionary holds, where one is close. */
  | { readonly kind: "spelling"; readonly word: string; readonly suggestion: string | null; readonly diacritics: boolean }
  /**
   * The verb is in another person than its subject, which is given in lower
   * case since it is quoted mid-sentence. `have` where the verb is `on` after
   * `ma`, `sa`, `me` or `te`, which is nearly always somebody saying what they
   * have, so the screen can say how that is said.
   */
  | { readonly kind: "person"; readonly word: string; readonly subject: string; readonly right: string; readonly have?: boolean }
  /** A verb in a person after `ei`, in any tense. */
  | { readonly kind: "negative"; readonly word: string; readonly right: string }
  /** The ma-infinitive standing where a verb in a person belongs. */
  | { readonly kind: "dictionaryForm"; readonly word: string; readonly subject: string; readonly right: string }
  /** The wrong infinitive after a verb that takes only the other one. */
  | { readonly kind: "infinitive"; readonly word: string; readonly after: string; readonly right: string; readonly form: "da" | "ma" }
  /** `mul olen`: what somebody has takes the verb in its third person, whoever has it. */
  | { readonly kind: "have"; readonly word: string; readonly owner: string; readonly right: string }
  /** An adjective in its plain form beside a noun with an ending: `suur majas` is `suures majas`. */
  | { readonly kind: "agreement"; readonly word: string; readonly noun: string; readonly right: string }
  /** A weekday or a month written with a capital mid-sentence. */
  | { readonly kind: "lowercase"; readonly word: string; readonly right: string }
  /**
   * The person a feeling happens to, written as though they did it: `ma
   * meeldib` is `mulle meeldib`, `ma valutab pea` is `mul valutab pea`, `ma on
   * vaja` is `mul on vaja`. `case` is the ending the pronoun takes.
   */
  | { readonly kind: "experiencer"; readonly word: string; readonly verb: string; readonly right: string; readonly case: "ALLATIVE" | "ADESSIVE" }
  /** A pronoun where its genitive says whose: `mina kass on` is `minu kass on`. */
  | { readonly kind: "possessive"; readonly word: string; readonly noun: string; readonly right: string }
  /** A noun joined by `ja` to one with an ending, left without it: `elutoa ja köök` is `elutoa ja köögi`. */
  | { readonly kind: "pair"; readonly word: string; readonly with: string; readonly right: string }
  /**
   * An object in its nominative. `partitive` is null where the verb records no
   * object, and then the finding says the word needs an ending and not which.
   */
  | { readonly kind: "object"; readonly word: string; readonly verb: string; readonly partitive: string | null; readonly genitive: string | null }
  /** A noun in its plain form after a number above one, or a word of quantity: `kaks kook` is `kaks kooki`. */
  | { readonly kind: "count"; readonly word: string; readonly after: string; readonly right: string }
  /** A word a preposition governs, left in its plain form: `koos sõber` is `koos sõbraga`. */
  | { readonly kind: "governed"; readonly word: string; readonly after: string; readonly right: string; readonly case: CaseKey }
  /** A verb after `ära` in a person rather than the command: `ära tuled` is `ära tule`. */
  | { readonly kind: "command"; readonly word: string; readonly after: string; readonly right: string }
  /** A noun in its plain form before a postposition: `laud peal` is `laua peal`. */
  | { readonly kind: "postposition"; readonly word: string; readonly before: string; readonly right: string };

/** What the forms list says about the sentence's spellings, beyond whether each is a word. */
export interface CheckReads {
  /**
   * Every headword the forms list says this exact spelling belongs to, or
   * undefined where it was not asked. It is what tells `kandis` the verb from
   * `kandis` "in the area", where the dictionary rows in hand hold only the verb.
   */
  readonly claims?: (word: string) => readonly string[] | undefined;
  /**
   * Whether a spelling the list does not hold may still be a word built from
   * ones it does, a compound (`lehmasitt`) or a hyphenated pair, or could not
   * be told. Such a word is offered a correction only toward the sample's own.
   */
  readonly compound?: (word: string) => boolean;
  /**
   * Every spelling the forms list holds one slip from this one, a mark
   * counting as no slip, with how far off each is; undefined where not asked.
   */
  readonly near?: (word: string) => readonly { readonly spelling: string; readonly distance: number }[] | undefined;
}

export interface SentenceCheck {
  readonly findings: readonly Finding[];
  /** How many words were read, so a screen never says "nothing wrong" about nothing. */
  readonly words: number;
}

/**
 * The verbs that take only the ma-infinitive after them, the other half of
 * `DA_ONLY_VERBS`: `pean minema`, `hakkan sööma`, `lähen ostma`, never `pean
 * minna`. `minema` is read in every form but `läheb`, which is also the verb of
 * `läheb vaja` and `läheb aega`. Lemma requests, like the list it mirrors.
 */
export const MA_ONLY_VERBS = ["pidama", "hakkama", "minema", "õppima", "asuma", "jääma", "tulema"] as const;

/**
 * Verbs whose third person singular is also a construction taking the
 * da-infinitive, so that person is left out of the rule above: `läheb vaja`,
 * `tuleb minna` ("one must go"), `jääb üle teha`.
 */
/**
 * Verbs whose object is always the partitive, because what they name has no
 * end to reach: waiting, loving, needing, looking for. Never with the
 * genitive, so `Ma ootan tagasiside`, whose plain form and genitive are one
 * spelling, is still `tagasisidet`. A particle can finish one (`ootasin ta
 * ära`), and a clause holding one is left alone.
 */
export const PARTIAL_ONLY: ReadonlySet<string> = new Set([
  "ootama", "armastama", "vihkama", "vajama", "eelistama", "igatsema", "austama", "imetlema", "otsima", "kuulama",
]);

/**
 * Verbs of wanting, whose own object is the partitive in written Estonian
 * (`soovin kaarti`, `tahan kohvi`). Only the offer of a genitive reads this,
 * never the finding: `tahan selle auto` is said, and the fix the learner is
 * handed is where the two differ.
 */
const WANTING: ReadonlySet<string> = new Set(["soovima", "tahtma"]);

export const MA_ONLY_BUT_THIRD: ReadonlySet<string> = new Set(["minema", "tulema", "jääma"]);

/**
 * Verbs that take the da-infinitive and never the ma-infinitive, beyond the
 * gate's own `DA_ONLY_VERBS`: `mulle meeldib lugeda`, `kardan minna`,
 * `otsustasin jääda`. Each is one where a ma-infinitive straight beside it is
 * a mistake in any register; `lubama` and `aitama` are left out, since a
 * ma-infinitive after them is heard.
 */
export const ALSO_DA_ONLY = [
  "meeldima", "armastama", "julgema", "jaksama", "kavatsema", "otsustama", "unustama", "kartma", "üritama",
  "plaanima", "viitsima", "püüdma", "katsuma",
] as const;

/** The verbs that link a subject to what it is, so an adjective after one is the predicate, not an attribute. */
const LINKING = ["olema", "jääma", "tunduma", "näima", "paistma", "saama", "muutuma"] as const;

/**
 * The lemmas the checks need whatever the sentence says: the subject
 * pronouns and the verbs the rules are about. Requests against the
 * dictionary, like `SUBJECT_PRONOUN` itself.
 */
export const ALWAYS_READ: readonly string[] = [
  "mina", "sina", "tema", "meie", "teie", "nemad", ...DA_ONLY_VERBS, ...ALSO_DA_ONLY, ...MA_ONLY_VERBS, ...LINKING,
  "valutama", "koos", ...PARTIAL_ONLY,
];

const PERSONS = ["Sg1", "Sg2", "Sg3", "Pl1", "Pl2", "Pl3"] as const;
type Person = (typeof PERSONS)[number];
/** Present, simple past and conditional: the three finite tenses a person ending is read in. */
const FAMILIES = ["IndPr", "IndIpf", "KndPr"] as const;
type Family = (typeof FAMILIES)[number];
/** What follows `ei` in each tense: `ei loe`, `ei lugenud`, `ei loeks`. */
const NEGATIVE_OF: Readonly<Record<Family, string>> = { IndPr: "IndPrPs_", IndIpf: "PtsPtPs", KndPr: "KndPrPs" };
const NOT_THIRD_PERSON: ReadonlySet<Person> = new Set<Person>(["Sg1", "Sg2", "Pl1", "Pl2"]);

/** One verb in one tense and person, as a spelling in front of the check is read. */
interface VerbReading { readonly lemma: string; readonly family: Family; readonly person: Person }

/** One nominal in one case and number. */
interface NounReading { readonly lemma: string; readonly pos: string; readonly case: CaseKey; readonly plural: boolean }

/**
 * Every form of one verb by its code, the stored forms over the derived ones.
 *
 * The present, the conditional, the negative and the imperative are the rule
 * over the stored first person (`derivedVerbForms`, ADR-005 amendment 1), and
 * whatever Ekilex stored answers first, which is how `olema` has `on` and
 * `ole`. The simple past is read off the stored first person too, every
 * person but the third: `lugesin` gives `lugesid`, `lugesime`, `lugesite`,
 * which is an ending on a stored stem and true of every verb in the language.
 * The third person is the one part of it no rule reaches (`tahtsin` is
 * `tahtis`), so it is only ever the stored `IndIpfSg3`.
 */
export function verbTable(entry: CheckEntry): Map<string, string> {
  const table = new Map<string, string>();
  for (const form of derivedVerbForms({ lemma: entry.lemma, pres1sg: entry.parts.PRES_1SG })) table.set(form.morphCode, form.value.toLowerCase());
  if (entry.parts.PRES_1SG) table.set("IndPrSg1", entry.parts.PRES_1SG.toLowerCase());
  const past = entry.parts.PAST_1SG?.toLowerCase();
  if (past) {
    table.set("IndIpfSg1", past);
    if (past.endsWith("in")) {
      const stem = past.slice(0, -2);
      table.set("IndIpfSg2", `${stem}id`);
      table.set("IndIpfPl1", `${stem}ime`);
      table.set("IndIpfPl2", `${stem}ite`);
      table.set("IndIpfPl3", `${stem}id`);
    }
  }
  const stored = new Set<string>();
  for (const form of entry.extraForms ?? []) {
    if (stored.has(form.code)) continue;
    stored.add(form.code);
    table.set(form.code, form.value.toLowerCase());
  }
  if (entry.parts.INF_MA) table.set("Sup", entry.parts.INF_MA.toLowerCase());
  if (entry.parts.INF_DA) table.set("Inf", entry.parts.INF_DA.toLowerCase());
  // The conditional's form with no person ending is its third person singular too (`ta tuleks`).
  const bare = table.get("KndPrPs");
  if (bare && !table.has("KndPrSg3")) table.set("KndPrSg3", bare);
  return table;
}

/** A nominal's case table, where it has a genitive stem to build one from. */
export function caseTable(entry: CheckEntry): readonly DerivedForm[] {
  if (!entry.parts.GEN_SG) return [];
  return buildCaseTable(stemsFrom([
    ...Object.entries(entry.parts).map(([formType, value]) => ({ formType, value })),
    ...(entry.extraForms ?? []).map((f) => ({ formType: `EKILEX:${f.code}`, value: f.value })),
  ]));
}

/** The cases an attribute takes the genitive in rather than the case itself: `suure majaga`, not `suurega majaga`. */
const GENITIVE_ATTRIBUTE: ReadonlySet<CaseKey> = new Set<CaseKey>(["TERMINATIVE", "ESSIVE", "ABESSIVE", "COMITATIVE"]);

/** The negators an object takes the partitive after. `ära` is the negative imperative. */
const NEGATORS: ReadonlySet<string> = new Set(["ei", "ära", "ärge"]);

/**
 * Two nouns whose plain form is an ordinary adverbial: `kell viis` is "at
 * five" and `veel kord` is "once more". Their semantic codes say a clock and
 * an order, so `isTime` cannot see either, and both turned up as false alarms
 * the first time the check was run over the lessons' own sentences
 * (`scripts/measure-sentence-check.ts`). Lemma requests, like `DA_ONLY_VERBS`.
 */
const ADVERBIAL_NOUNS: ReadonlySet<string> = new Set(["kell", "kord"]);

/**
 * Words a noun in its plain form follows as part of a phrase of time or of a
 * question rather than as an object: `mis kell`, `milline raamat`, `iga päev`,
 * `mõni aeg`, `terve õhtu`.
 */
const ASKING: ReadonlySet<string> = new Set(["mis", "milline", "missugune", "iga", "mõni", "terve", "kogu"]);

/** The words that open a question about where, who or what, which is said about a subject as a predicate is: `kus mu võti on`. */
const QUESTIONS: ReadonlySet<string> = new Set(["kus", "kes", "mis", "milline", "missugune", "kuidas"]);

/** A pronoun after one of these is compared, not a subject: `sama pikk kui mina`. */
const COMPARING: ReadonlySet<string> = new Set(["kui", "nagu"]);

/**
 * The words that start a new clause, where Estonian writes no comma before
 * them. `Ma joon kohvi ja poiss joob teed` is two clauses, and read as one its
 * `poiss` is a plain-form noun in a sentence whose subject is I. Cut there, the
 * check costs a mistake it could have caught (`leiba ja juust`) and never
 * reads a subject as an object. `kui` is not one of them, because `kui palju`
 * and `kui vana` are questions; it is read where it compares (`COMPARING`).
 */
const JOINERS: ReadonlySet<string> = new Set(["ja", "ning", "aga", "kuid", "et", "sest", "kuna", "või", "ega"]);

/** The joining words that can join two nouns as well as two clauses, `Mari ja mina`. */
const PAIRING: ReadonlySet<string> = new Set(["ja", "ning", "või", "ega"]);

/** The cases that say where something is, goes or comes from. */
const LOCAL: ReadonlySet<CaseKey> = new Set<CaseKey>(["ILLATIVE", "INESSIVE", "ELATIVE", "ALLATIVE", "ADESSIVE", "ABLATIVE"]);

/** Words of quantity that take the partitive after them, like a number above one: `palju vett`, `natuke juustu`. */
/**
 * Words straight after `te`, `ta` or `me` that the pronoun cannot be saying
 * whose, so the pronoun is the subject: `Millal te tagasi tulete`.
 */
const NEVER_OWNED: ReadonlySet<string> = new Set([
  "tagasi", "ka", "juba", "veel", "ikka", "kohe", "alati", "tihti", "siin", "seal", "praegu", "täna", "homme", "eile", "ju",
  "nüüd", "küll", "ainult", "isegi", "kunagi", "vist", "väga",
]);

/** The pronouns that point at a thing, and are its subject in the third person: `see`, `too`. */
const POINTING: ReadonlySet<string> = new Set(["see", "too"]);

const QUANTITY: ReadonlySet<string> = new Set(["palju", "vähe", "natuke", "veidi", "mitu", "paar"]);

/**
 * The postpositions that take the genitive and are never a verb's particle or
 * an adverb on their own, so a plain-form noun straight before one is wrong:
 * `laud peal` is `laua peal`. `ette`, `peale`, `alla`, `üle` and `taha` are
 * left out, since each is also a particle or another word (`taha` is a form of
 * `tahtma`), and a check that cannot tell is a check that says nothing.
 */
export const GENITIVE_POSTPOSITIONS: ReadonlySet<string> = new Set([
  "juures", "juurde", "juurest", "kõrval", "kõrvale", "kõrvalt", "kohta", "jaoks", "pärast",
  "peal", "pealt", "sees", "seest", "all", "alt", "taga", "tagant", "ees", "kaudu", "abil",
  "poole", "poolt", "järgi", "ümber", "vahel", "järel", "keskel", "lähedal", "lähedale",
]);

interface Token {
  /** As written. */
  readonly raw: string;
  /** Lowercased. */
  readonly low: string;
  /** Written with a capital somewhere other than the start of its sentence. */
  readonly name: boolean;
  /** The first word of its sentence. */
  readonly first: boolean;
  /** The only word of its sentence, `Aitah!`, which is a word rather than a name. */
  alone: boolean;
}

/** Endings Estonian builds words with at will, of which the forms list holds only some. */
const BUILT_AT_WILL = new RegExp(`(?:${[
  // The present participle in every case (`tundvad`, `asuvas`), and the passive one.
  "v", "va", "vad", "vaid", "vate", "vat", "vas", "vast", "vasse", "vale", "val", "valt", "vaks", "vana", "vaga", "vata", "vani",
  "tav\\p{L}{0,4}",
  // The past participles, and a comparative made of one (`vaadatumad`).
  "nud", "nute", "nuid", "tud", "dud", "tute", "tuid", "[td]um\\p{L}{0,4}",
  // The abessive infinitive and the noun of action in every case (`askeldamist`).
  "mata", "mine", "mi(?:se|s)\\p{L}{0,5}",
  // The doer (`lahkuja`), in every case.
  "ja", "jad", "jat", "jate", "jaid", "jas", "jast", "jasse", "jale", "jal", "jalt", "jaks", "jana", "jaga", "jata",
].join("|")})$`, "u");

/** A clause, and whether a joining word (`ja`, `või`) opened it. */
interface Clause {
  readonly tokens: Token[];
  /** The joining word that opened it, if one did. */
  readonly joined: string | null;
  /** Which sentence of the answer it is in. */
  readonly sentence: number;
}

/**
 * The sentence as clauses of tokens, cut at a stop and at a comma. A word in
 * quotation marks is a word mentioned rather than used (`ei ütle „pool”`), so
 * it is read as a name and nothing is said about it.
 */
function clauses(text: string): Clause[] {
  const out: Clause[] = [];
  const quoted = new Set<string>();
  for (const [, inside] of text.matchAll(/[„"“«]([^„"“”«»]+)[”"»“]/g)) {
    for (const word of inside!.match(ESTONIAN_WORD) ?? []) quoted.add(word.toLowerCase());
  }
  // An address is not Estonian: `seljakotirandur.com` is somebody's site and is spelled as they like.
  const prose = text.replace(/(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+|\S+\.(?:com|ee|org|net|eu)\b\S*/giu, " ");
  let sentenceAt = -1;
  for (const sentence of prose.split(/[.!?]+/)) {
    sentenceAt += 1;
    let first = true;
    const said: Token[] = [];
    for (const clause of sentence.split(/[,;:]+/)) {
      const tokens: Token[] = [];
      let joined: string | null = null;
      for (const raw of clause.match(ESTONIAN_WORD) ?? []) {
        if (JOINERS.has(raw.toLowerCase())) {
          if (tokens.length > 0) out.push({ tokens: [...tokens], joined, sentence: sentenceAt });
          tokens.length = 0;
          joined = raw.toLowerCase();
          first = false;
          continue;
        }
        const token: Token = { raw, low: raw.toLowerCase(), name: (!first && /^\p{Lu}/u.test(raw)) || quoted.has(raw.toLowerCase()), first, alone: false };
        tokens.push(token);
        said.push(token);
        first = false;
      }
      if (tokens.length > 0) out.push({ tokens, joined, sentence: sentenceAt });
    }
    if (said.length === 1) said[0]!.alone = true;
  }
  return out;
}

/**
 * The nearest form the dictionary holds, where exactly one is close enough to
 * be the word meant. A tie is broken by the sample sentence, since a learner
 * one letter off `raamatukogukaarti` is likelier to mean the form in front of
 * them than `raamatukogukaardi`; a tie it cannot break offers nothing.
 */
function nearest(word: string, pool: ReadonlySet<string>, preferred: ReadonlySet<string>): { form: string; diacritics: boolean } | null {
  /*
    A mark left off or put on the wrong letter. Where two words fold the same
    (`söön` and `soon`), the one keeping every mark the learner did write is
    the one meant, since a mark somebody typed was typed on purpose.
  */
  const folded = fold(word);
  const marks = [...pool].filter((form) => form !== word && !form.includes(" ") && fold(form) === folded && keepsMarks(form, word));
  const markedPick = marks.length > 1 ? marks.filter((form) => preferred.has(form)) : marks;
  if (markedPick.length === 1) return { form: markedPick[0]!, diacritics: true };
  if (marks.length > 1) return null;
  const allowance = word.length >= 9 ? 2 : word.length >= 5 ? 1 : 0;
  if (allowance === 0) return null;
  let closest: string[] = [];
  let bestDistance = allowance + 1;
  for (const form of pool) {
    if (form.includes(" ")) continue;
    const distance = editDistance(fold(word), fold(form), allowance);
    if (distance === 0 || distance > allowance) continue;
    if (distance < bestDistance) { closest = [form]; bestDistance = distance; }
    else if (distance === bestDistance && !closest.includes(form)) closest.push(form);
  }
  if (closest.length > 1) closest = closest.filter((form) => preferred.has(form));
  return closest.length === 1 ? { form: closest[0]!, diacritics: false } : null;
}

/** Whether a spelling keeps every mark the learner typed, letter for letter. */
function keepsMarks(form: string, typed: string): boolean {
  if (form.length !== typed.length) return false;
  return [...typed].every((c, i) => fold(c) === c || form[i] === c);
}

/** The first clause of a government that asks for an object, and whether it allows the genitive. */
function objectOf(government: string | null): { genitive: boolean } | null {
  for (const part of governmentParts(government?.toLowerCase())) {
    // `mida teha` and `mida tegema` ask for a verb, not an object.
    if (!/\b(keda|mida)\b/.test(part.replace(/\bmida (teha|tegema)\b/g, ""))) continue;
    return { genitive: /\b(kelle|mille)\b/.test(part) };
  }
  return null;
}

/**
 * Reads one typed sentence.
 *
 * `exact` says whether a spelling is a form of any Estonian word, which is the
 * forms list's question and is answered by the caller, since this module may
 * reach neither a database nor a file.
 */
export function checkSentence(
  text: string,
  entries: readonly CheckEntry[],
  exact: (word: string) => boolean,
  /** The sample sentence on the card, which breaks a tie between two spellings a slip could have meant. */
  sample = "",
  reads: CheckReads = {},
): SentenceCheck {
  const { claims, compound } = reads;
  const preferred = new Set((sample.match(ESTONIAN_WORD) ?? []).map((w) => w.toLowerCase()));
  const lexicon = buildLexicon(entries);
  // Every form of every word the card's own sentence uses.
  const sampleForms = new Set<string>();
  for (const [, forms] of lexicon.byLemma) if ([...forms].some((f) => preferred.has(f))) for (const f of forms) sampleForms.add(f);
  const subjects = subjectsIn(entries);
  const byLemma = new Map<string, CheckEntry[]>();
  for (const entry of entries) byLemma.set(entry.lemma, [...(byLemma.get(entry.lemma) ?? []), entry]);
  // A phrase's verb (`ära tulema`) shares its spellings with the plain verb and is never what a lone form means.
  const single = (lemma: string) => !/\s/.test(lemma);

  // EVERY VERB, BY ITS FORMS, AND EVERY SPELLING TO THE TENSE AND PERSON IT IS.
  const tables = new Map<string, Map<string, string>>();
  const readingsOf = new Map<string, VerbReading[]>();
  const verbOf = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.pos !== "VERB" || !single(entry.lemma) || tables.has(entry.lemma)) continue;
    const table = verbTable(entry);
    /*
      THE PAST THIRD PERSON, where the forms list vouches for it. No rule
      derives it (`lugesin` goes to `luges` and `võtsin` to `võttis`), but
      where the first person ends in `-sin` the spelling without its `-in` is
      the third person whenever it is a word of this verb's and of no other's,
      which the forms list says: `ma käis` is then `ma käisin`.
    */
    const past = entry.parts.PAST_1SG?.toLowerCase();
    if (past?.endsWith("sin") && !table.has("IndIpfSg3")) {
      const third = past.slice(0, -2);
      const owners = claims?.(third);
      if (owners && owners.length > 0 && owners.every((l) => l.toLowerCase() === entry.lemma.toLowerCase())) table.set("IndIpfSg3", third);
    }
    tables.set(entry.lemma, table);
    for (const family of FAMILIES) {
      for (const person of PERSONS) {
        const form = table.get(`${family}${person}`);
        if (form) readingsOf.set(form, [...(readingsOf.get(form) ?? []), { lemma: entry.lemma, family, person }]);
      }
    }
    for (const form of new Set([...table.values(), ...(lexicon.byLemma.get(entry.lemma) ?? [])])) {
      verbOf.set(form, [...new Set([...(verbOf.get(form) ?? []), entry.lemma])]);
    }
  }
  const formIn = (lemma: string, code: string) => tables.get(lemma)?.get(code);
  /*
    A headword the forms list names that is a form of one already in hand is
    the same word: the list files some stems as headwords of their own, so
    `raamat` is claimed by `raamatu` and `kaks` by `kahe`.
  */
  const alsoOf = (claim: string, lemmas: readonly string[]) => {
    const low = claim.toLowerCase();
    return lemmas.some((l) => l.toLowerCase() === low || lexicon.byLemma.get(l)?.has(low) || [...(tables.get(l)?.values() ?? [])].includes(low)
      || (tableOf.get(l) ?? []).some((row) => row.accepted.some((v) => v.toLowerCase() === low) || row.plural?.toLowerCase() === low));
  };
  /**
   * Whether the forms list says this spelling belongs to these headwords and
   * no others. A rule that names a word's form fires only where nothing else
   * in the language is spelled that way, so a homograph is never corrected.
   */
  const onlyOf = (word: string, lemmas: Iterable<string>) => {
    const owners = claims?.(word);
    if (owners === undefined) return true;
    const allowed = [...lemmas];
    return owners.every((l) => alsoOf(l, allowed) || fragment(l, word));
  };
  /*
    And a headword the dictionary has no row for that is only the front of
    the spelling (`u` for `uks`, `väi` for `väide`) is a stem the analyzer
    cut off rather than a word anybody writes.
  */
  const fragment = (claim: string, word: string) => {
    const low = claim.toLowerCase();
    return low.length < word.length && word.startsWith(low) && !byLemma.has(claim) && !byLemma.has(low);
  };
  const verbOnly = (word: string) => onlyOf(word, (readingsOf.get(word) ?? []).map((r) => r.lemma));

  // EVERY NOMINAL, BY CASE AND NUMBER.
  const nounReadings = new Map<string, NounReading[]>();
  const tableOf = new Map<string, readonly DerivedForm[]>();
  const nominal = new Set<string>();
  for (const entry of entries) {
    if (entry.pos === "VERB") continue;
    for (const form of lexicon.byLemma.get(entry.lemma) ?? []) nominal.add(form);
    if (tableOf.has(entry.lemma)) continue;
    const rows = caseTable(entry);
    tableOf.set(entry.lemma, rows);
    const add = (spelling: string, reading: NounReading) => {
      for (const word of words(spelling)) nounReadings.set(word, [...(nounReadings.get(word) ?? []), reading]);
    };
    for (const row of rows) {
      for (const value of row.accepted) add(value, { lemma: entry.lemma, pos: entry.pos, case: row.spec.key, plural: false });
      if (row.plural) add(row.plural, { lemma: entry.lemma, pos: entry.pos, case: row.spec.key, plural: true });
    }
  }
  /** The one case and number a spelling is, or null where it is more than one, or a verb as well. */
  const strictly = (word: string): NounReading | null => {
    if (verbOf.has(word)) return null;
    const found = nounReadings.get(word) ?? [];
    const first = found[0];
    if (!first) return null;
    return found.every((r) => r.case === first.case && r.plural === first.plural) ? first : null;
  };
  const formOfCase = (lemma: string, key: CaseKey, plural = false): string | null => {
    const row = (tableOf.get(lemma) ?? []).find((r) => r.spec.key === key);
    const value = plural ? row?.plural : row?.singular;
    return value ? primaryAnswer(value) : null;
  };

  /** Which personal pronoun a nominative spelling is: `ma` and `mina` are `mina`. */
  const pronounOf = (word: string): string | null => {
    for (const lemma of Object.keys(SUBJECT_LEMMAS)) {
      for (const entry of byLemma.get(lemma) ?? []) {
        const nominatives = [entry.lemma, entry.parts.NOM_SG ?? "", ...(entry.extraForms ?? []).filter((f) => f.code === "SgN" || f.code === "PlN").map((f) => f.value)];
        if (nominatives.some((n) => n.toLowerCase() === word)) return lemma;
      }
    }
    return null;
  };
  /**
   * A pronoun in a case, off its own row: the short spoken form for a short
   * word typed (`ma` gives `mulle`, `mu`) and the long one for a long (`mina`
   * gives `minule`, `minu`).
   */
  const pronounForm = (lemma: string, key: "ALLATIVE" | "ADESSIVE" | "GENITIVE", typed: string): string | null => {
    const codes = { ALLATIVE: ["SgAll", "PlAll"], ADESSIVE: ["SgAd", "PlAd"], GENITIVE: ["SgG", "PlG"] }[key];
    const values = new Set<string>();
    for (const entry of byLemma.get(lemma) ?? []) {
      for (const form of entry.extraForms ?? []) if (codes.includes(form.code)) values.add(form.value.toLowerCase());
      if (key === "GENITIVE" && entry.parts.GEN_SG) values.add(entry.parts.GEN_SG.toLowerCase());
    }
    const table = formOfCase(lemma, key);
    if (table) values.add(table.toLowerCase());
    const sorted = [...values].filter((v) => !/\s/.test(v)).sort((a, b) => a.length - b.length || a.localeCompare(b));
    if (sorted.length === 0) return null;
    return typed.length <= 2 ? sorted[0]! : sorted[sorted.length - 1]!;
  };
  /** A form with the capital the learner's own word had. */
  const likeTyped = (typed: string, form: string) => (/^\p{Lu}/u.test(typed) ? form.charAt(0).toLocaleUpperCase("et") + form.slice(1) : form);

  const isPerson = (word: string) => readingsOf.has(word) && !nominal.has(word);
  const maInf = new Map<string, string>();
  const daInf = new Map<string, string>();
  for (const [lemma, table] of tables) {
    const ma = table.get("Sup");
    const da = table.get("Inf");
    if (ma) maInf.set(ma, lemma);
    if (da) daInf.set(da, lemma);
  }
  // Every finite form of the verbs that take only one infinitive after them.
  const finiteOf = (lemmas: readonly string[], skip: ReadonlySet<string> = new Set()) => {
    const out = new Map<string, string>();
    for (const lemma of lemmas) {
      for (const [code, form] of tables.get(lemma) ?? []) {
        if (!/^(IndPr|IndIpf|KndPr)/.test(code) || code === "IndPrPs_" || skip.has(code)) continue;
        out.set(form, lemma);
      }
    }
    return out;
  };
  const daOnlyFinite = finiteOf([...DA_ONLY_VERBS, ...ALSO_DA_ONLY]);
  // The same verbs said with `ei` (`ei saa`, `ei tahtnud`), which are read as theirs only straight after it.
  const daOnlyNegative = new Map<string, string>();
  for (const lemma of [...DA_ONLY_VERBS, ...ALSO_DA_ONLY]) {
    for (const code of Object.values(NEGATIVE_OF)) {
      const form = tables.get(lemma)?.get(code);
      if (form) daOnlyNegative.set(form, lemma);
    }
  }
  const maOnlyFinite = new Map([
    ...finiteOf(MA_ONLY_VERBS.filter((l) => !MA_ONLY_BUT_THIRD.has(l))),
    ...finiteOf([...MA_ONLY_BUT_THIRD], new Set(["IndPrSg3", "IndIpfSg3", "KndPrSg3", "KndPrPs"])),
  ]);
  // And any spelling one of those third persons shares (`tuleks` is every person's conditional but the first).
  for (const lemma of MA_ONLY_BUT_THIRD) {
    for (const code of ["IndPrSg3", "IndIpfSg3", "KndPrSg3", "KndPrPs"]) {
      const form = tables.get(lemma)?.get(code);
      if (form) maOnlyFinite.delete(form);
    }
  }
  // A command takes its object in the plain form (`Pane aken kinni`), so a clause holding one is left alone.
  const imperative = new Set<string>();
  for (const table of tables.values()) {
    for (const code of ["ImpPrSg2", "ImpPrPl2"]) {
      const form = table.get(code);
      if (form) imperative.add(form);
    }
  }
  // Every form of a number word, which a noun beside it is counted by rather than governed by.
  const numberForms = new Set<string>();
  for (const entry of entries) {
    if (isNumber(entry.semanticTypes)) for (const form of lexicon.byLemma.get(entry.lemma) ?? []) numberForms.add(form);
  }
  const beForms = new Set([...(lexicon.byLemma.get("olema") ?? []), ...(tables.get("olema")?.values() ?? [])]);
  const linkingForms = new Set<string>();
  for (const lemma of LINKING) for (const form of tables.get(lemma)?.values() ?? []) linkingForms.add(form);
  // A number above one in its plain form, which counts the noun after it in the partitive.
  const counting = new Set<string>(QUANTITY);
  for (const entry of entries) {
    if (entry.pos !== "NOUN" || !isNumber(entry.semanticTypes) || entry.lemma === "üks") continue;
    counting.add((entry.parts.NOM_SG ?? entry.lemma).toLowerCase());
  }
  // The personal pronouns' adessive, which says who has something: `mul`, `sul`, `meil`.
  const owners = new Set<string>();
  for (const lemma of Object.keys(SUBJECT_LEMMAS)) {
    for (const row of tableOf.get(lemma) ?? []) {
      if (row.spec.key !== "ADESSIVE") continue;
      for (const value of [...row.accepted, ...(row.plural ? [row.plural] : [])]) for (const word of words(value)) owners.add(word);
    }
    for (const entry of byLemma.get(lemma) ?? []) {
      for (const form of entry.extraForms ?? []) if (form.code === "SgAd" || form.code === "PlAd") owners.add(form.value.toLowerCase());
    }
  }
  // The personal pronouns' allative, which says whom something pleases: `mulle`, `sulle`.
  const allatives = new Set<string>();
  for (const lemma of Object.keys(SUBJECT_LEMMAS)) {
    for (const row of tableOf.get(lemma) ?? []) {
      if (row.spec.key !== "ALLATIVE") continue;
      for (const value of [...row.accepted, ...(row.plural ? [row.plural] : [])]) for (const word of words(value)) allatives.add(word);
    }
    for (const entry of byLemma.get(lemma) ?? []) {
      for (const form of entry.extraForms ?? []) if (form.code === "SgAll" || form.code === "PlAll") allatives.add(form.value.toLowerCase());
    }
  }
  // The pronouns' genitives, which say whose a noun after them is: `minu`, `meie`, `mu`.
  const possessives = new Set<string>();
  for (const lemma of Object.keys(SUBJECT_LEMMAS)) {
    for (const entry of byLemma.get(lemma) ?? []) {
      if (entry.parts.GEN_SG) possessives.add(entry.parts.GEN_SG.toLowerCase());
      for (const form of entry.extraForms ?? []) if (form.code === "SgG" || form.code === "PlG") possessives.add(form.value.toLowerCase());
    }
  }
  // A weekday or a month, which Estonian writes in lower case.
  const calendar = new Set<string>();
  for (const entry of entries) {
    const codes = (entry.semanticTypes ?? "").split(/\s+/);
    if (!codes.includes("aeg_nädalapäev") && !codes.includes("aeg_kuu")) continue;
    // `mai` is a month and `Mai` a name, so a month as short as that is left alone.
    if (codes.includes("aeg_kuu") && entry.lemma.length <= 3) continue;
    for (const form of lexicon.byLemma.get(entry.lemma) ?? []) calendar.add(form);
  }
  const particles = new Set(PARTICLES);

  // Every spelling a correction may offer: what the rows hold, and the persons and cases built off them.
  const pool = new Set<string>([...lexicon.forms, ...verbOf.keys()]);
  for (const word of nounReadings.keys()) pool.add(word);

  // Which headwords a spelling is a form of, for reading a case off a word.
  const entriesHolding = new Map<string, Set<string>>();
  for (const [lemma, forms] of lexicon.byLemma) for (const form of forms) (entriesHolding.get(form) ?? entriesHolding.set(form, new Set()).get(form)!).add(lemma);
  const all = clauses(text);
  const clauseCount = all.length;

  const findings: Finding[] = [];
  let read = 0;
  /** The pronoun a clause's verbs agree with, carried into the next clause of the sentence where it says no other. */
  let carried: { person: Person; word: string; sentence: number } | null = null;
  const flagged = new Set<string>();

  all.forEach(({ tokens, joined, sentence }, index) => {
    const clauseFindingsFrom = findings.length;
    const lower = tokens.map((t) => t.low);
    read += tokens.length;

    // A WEEKDAY OR A MONTH WITH A CAPITAL, which is a fact about how Estonian is written.
    tokens.forEach((token) => {
      if (!token.name || token.first || !calendar.has(token.low) || !/^\p{Lu}/u.test(token.raw)) return;
      findings.push({ kind: "lowercase", word: token.raw, right: token.low });
    });

    // SPELLING. A clitic `-gi` or `-ki` on a word is the word (`olegi`, `katsetki`).
    // A person or a case the rule builds off a stored stem is a word too (`pidime` off `pidin`).
    const isWord = (word: string) => exact(word) || pool.has(word)
      || (/[gk]i$/.test(word) && word.length > 4 && (exact(word.slice(0, -2)) || lexicon.forms.has(word.slice(0, -2))));
    const unknown = new Set<number>();
    tokens.forEach((token, at) => {
      if (token.name || isWord(token.low)) return;
      unknown.add(at);
      const near = nearest(token.low, pool, preferred);
      /*
        A word the forms list does not hold is not therefore wrong: Estonian
        builds compounds and participles nobody has listed (`erihaigla`,
        `askeldamist`). So the check speaks only where it can name the word
        meant, one slip away, and is otherwise silent.
      */
      if (!near) return;
      // A word straight after a name is the rest of it (`Helianthus annuus`).
      if (at > 0 && tokens[at - 1]!.name) return;
      // Two slips away is a guess about a long word, and is made only toward a word on the card.
      if (!near.diacritics && editDistance(fold(token.low), fold(near.form), 2) > 1 && !sampleForms.has(near.form)) return;
      /*
        Nor where it ends the way a participle or a word made from a verb ends
        (`tundvad`, `askeldamist`, `lahkuja`): those are built at will and the
        list holds only some, so a word one letter from one that is listed is
        as likely the unlisted word as a slip. A dropped mark is still a slip.
      */
      if (!near.diacritics && BUILT_AT_WILL.test(token.low)) return;
      // A word that may be a compound nobody listed is corrected only toward a word on the card.
      if (!near.diacritics && compound?.(token.low) && !sampleForms.has(near.form)) return;
      // A capital at the start of a sentence may be a name (`Jaak`, `Merle`), unless the word stands alone or is the one on the card.
      if (token.first && /^\p{Lu}/u.test(token.raw) && !token.alone && !preferred.has(near.form)) return;
      /*
        And only where it is the one word that close. Where the forms list was
        asked, it knows every Estonian spelling one slip away, and a slip one
        letter from `tulemast` and `tulvast` both is not a slip anybody can
        name, nor is a word a dropped mark makes into another (`tostis` is
        `tõstis` before it is anything one letter off).
      */
      const around = reads.near?.(token.low);
      if (around) {
        const off = near.diacritics ? 0 : editDistance(fold(token.low), fold(near.form), 2);
        const rivals = around.filter((n) => n.spelling !== near.form
          && (n.distance < off || (n.distance === off && (off > 0 || keepsMarks(n.spelling, token.low)))));
        if (rivals.length > 0 && !sampleForms.has(near.form)) return;
      }
      if (flagged.has(token.low)) return;
      flagged.add(token.low);
      // The learner's own capital is kept, so `Aitah` is offered `Aitäh`.
      const suggestion = /^\p{Lu}/u.test(token.raw) ? near.form.charAt(0).toLocaleUpperCase("et") + near.form.slice(1) : near.form;
      findings.push({ kind: "spelling", word: token.raw, suggestion, diacritics: near.diacritics });
    });
    const known = (at: number) => !unknown.has(at) && !tokens[at]!.name;

    // AFTER `ei`, in any tense: `ei loe`, `ei lugenud`, `ei loeks`.
    const afterNegator = new Set<number>();
    lower.forEach((word, at) => {
      if (word !== "ei" || at + 1 >= lower.length) return;
      afterNegator.add(at + 1);
      const next = lower[at + 1]!;
      /*
        What follows `ei` is its verb, so a spelling that is a noun as well
        (`saan` is a sleigh, `joon` a line) is read as the verb here, unless the
        `ei` opens the sentence, where it may be "no" said without its comma.
      */
      if (!known(at + 1) || !readingsOf.has(next)) return;
      if (new Set(readingsOf.get(next)!.map((r) => r.lemma)).size > 1) return;
      if (!(isPerson(next) && verbOnly(next)) && tokens[at]!.first) return;
      const hit = readingsOf.get(next)![0]!;
      const right = formIn(hit.lemma, NEGATIVE_OF[hit.family]);
      if (right && right !== next) findings.push({ kind: "negative", word: tokens[at + 1]!.raw, right });
    });

    // WHAT SOMEBODY HAS: `mul on`, whoever has it.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      if (!owners.has(lower[at]!) || tokens[at]!.name) continue;
      // `olid` is "you were" and "they were", and `Tal olid kavatsused` is right: only a form no third person shares.
      // Straight after `mul` the word is `olema`'s, whatever rarer noun shares its spelling (`oled`).
      const said = (readingsOf.get(lower[at + 1]!) ?? []).filter((r) => r.lemma === "olema");
      const hit = said[0];
      if (!hit || !said.every((r) => NOT_THIRD_PERSON.has(r.person)) || !isPerson(lower[at + 1]!)) continue;
      /*
        `Hea, et sa mul oled`: a pronoun in the clause is who is, and `mul` is
        who is glad of it. Whether the verb agrees with it is the person rule's
        to say, so any pronoun at all stands this one down.
      */
      if (lower.some((w) => subjects.has(w))) continue;
      const right = formIn("olema", `${hit.family}Sg3`);
      if (right) findings.push({ kind: "have", word: tokens[at + 1]!.raw, owner: lower[at]!, right });
    }

    // PERSON, AND THE DICTIONARY FORM WHERE THE PERSON BELONGS.
    /*
      A pronoun that opens a clause after `ja` or `või`, where the clause
      before it has no verb, is half of a pair: `Mari ja mina tuleme` is two
      people coming, and `mina tuleme` read alone is a disagreement nobody
      wrote.
    */
    const previous = all[index - 1];
    const paired = joined !== null && PAIRING.has(joined) && previous !== undefined && previous.sentence === sentence
      && !previous.tokens.some((t) => readingsOf.has(t.low));
    const subjectAt = lower.flatMap((word, at) => {
      const subject = subjects.get(word);
      // After `kui` midway through a clause the pronoun is compared (`pikem kui mina`); opening one, `kui` is "when".
      if (!subject || tokens[at]!.name || (at > 1 && COMPARING.has(lower[at - 1]!))) return [];
      if (paired && at === 0) return [];
      if (owners.has(word)) return [];
      const next = lower[at + 1];
      if (subject.sure) return [at];
      if (next === undefined || GENITIVE_POSTPOSITIONS.has(next)) return [];
      /*
        `te`, `ta` and `me` also say whose (`te maja`), so they are read as who
        does it only where no noun follows them for them to own: a verb, a
        dictionary form standing where the verb belongs, or a word that has no
        case at all (`Kust te pärit olete`).
      */
      const holders = [...(entriesHolding.get(next) ?? [])];
      const caseless = known(at + 1) && holders.length > 0 && !nounReadings.has(next) && !verbOf.has(next) && !particles.has(next)
        && holders.every((lemma) => byLemma.get(lemma)?.every((e) => e.pos === "ADVERB")) && onlyOf(next, holders);
      // Nor a pronoun, an infinitive or a word that never has an owner (`te selle ostnud olete`, `te juua soovite`, `te tagasi tulete`).
      const unowned = holders.length > 0 && holders.every((lemma) => byLemma.get(lemma)?.every((e) => e.pos === "PRONOUN"));
      return isPerson(next) || maInf.has(next) || daInf.has(next) || caseless || unowned || NEVER_OWNED.has(next) ? [at] : [];
    });
    const personAt = lower.flatMap((word, at) => (known(at) && isPerson(word) && !afterNegator.has(at) && !subjects.has(word) ? [at] : []));
    /*
      One pronoun in the clause, or the check cannot tell the subject from the
      object (`kust te ta leidsite`), and a word nobody could read may be the
      verb the pronoun belongs to.
    */
    // A pronoun before a noun says whose it is (`meie firmas`), and is not a second subject.
    const owning = (at: number) => (nounReadings.get(lower[at + 1] ?? "") ?? []).some((r) => r.pos === "NOUN" || r.pos === "ADJECTIVE");
    const pronouns = lower.filter((w, at) => subjects.has(w) && !owners.has(w) && !(subjectAt.length > 0 && !subjectAt.includes(at) && owning(at))).length;
    const subjectCode = subjectAt.length === 1 && pronouns === 1 && unknown.size === 0 ? subjects.get(lower[subjectAt[0]!]!)!.code : null;
    const subjectPerson = subjectCode ? (subjectCode.slice(5) as Person) : null;
    if (subjectPerson && !lower.some((w, at) => owners.has(w) && at < (personAt[0] ?? 0))) {
      const s = subjectAt[0]!;
      if (personAt.length > 0) {
        const agrees = personAt.some((at) => readingsOf.get(lower[at]!)!.some((r) => r.person === subjectPerson));
        // The pronoun before its verb, or straight after it (`Kas tuled sina`); further on it is a word in a list.
        const s0 = subjectAt[0]!;
        const sure = subjects.get(lower[s0]!)!.sure;
        // After the verb only where no noun before it could be the subject instead (`Kohus tunnistas nad süüdi`).
        const fronted = lower.slice(0, personAt[0]!).some((w) => (nounReadings.get(w) ?? []).some((r) => r.case === "NOMINATIVE"));
        const before = personAt[0]! > s0 || (sure && personAt[0]! + 1 === s0 && !fronted);
        /*
          Straight after a pronoun that is only ever a subject (`ma`, `sina`),
          a word that is one verb's and also a rarer noun's (`sündis` and
          `sünt`) is read as the verb, which is all a word in that place can be.
        */
        const at0 = personAt[0]!;
        const oneVerb = new Set(readingsOf.get(lower[at0]!)!.map((r) => r.lemma)).size === 1;
        if (!agrees && before && (verbOnly(lower[at0]!) || (sure && s0 + 1 === at0 && oneVerb))) {
          const at = personAt[0]!;
          const hit = readingsOf.get(lower[at]!)![0]!;
          const right = formIn(hit.lemma, `${hit.family}${subjectPerson}`);
          const third = readingsOf.get(lower[at]!)!.every((r) => !NOT_THIRD_PERSON.has(r.person));
          const pronoun = pronounOf(lower[s]!);
          /*
            The person a feeling happens to (`ma meeldib kohv`), and a pronoun
            saying whose (`mina kass on suur`), are both written as a subject
            with a verb in the third person. Telling either one to change the
            verb (`meeldin`, `olen`) is a correct ending for a sentence nobody
            meant, so each is named as what it is.
          */
          const experienced = EXPERIENCED[hit.lemma]
            ?? (hit.lemma === "olema" && lower.slice(at + 1).includes("vaja") ? "ADESSIVE" : undefined);
          const owned = s + 1 < at && strictly(lower[s + 1]!)?.pos === "NOUN" && strictly(lower[s + 1]!)?.case === "NOMINATIVE"
            && known(s + 1) && onlyOf(lower[s + 1]!, [strictly(lower[s + 1]!)!.lemma]);
          // `Sa meeldid mulle`: where somebody already has the ending, the pronoun is who pleases, and the verb is what is wrong.
          const felt = experienced !== undefined && lower.some((w, i) => i !== s && (experienced === "ALLATIVE" ? allatives : owners).has(w));
          if (third && pronoun && experienced && !felt && s < at && NOT_THIRD_PERSON.has(subjectPerson)) {
            const form = pronounForm(pronoun, experienced, lower[s]!);
            if (form) findings.push({ kind: "experiencer", word: tokens[s]!.raw, verb: tokens[at]!.raw, right: likeTyped(tokens[s]!.raw, form), case: experienced });
          } else if (third && pronoun && owned && (pronoun === "mina" || pronoun === "sina")) {
            const form = pronounForm(pronoun, "GENITIVE", lower[s]!);
            if (form) findings.push({ kind: "possessive", word: tokens[s]!.raw, noun: tokens[s + 1]!.raw, right: likeTyped(tokens[s]!.raw, form) });
          } else if (right && right !== lower[at]) {
            const have = hit.lemma === "olema" && hit.family === "IndPr" && lower[at] === "on" && NOT_THIRD_PERSON.has(subjectPerson);
            findings.push({ kind: "person", word: tokens[at]!.raw, subject: lower[s]!, right, ...(have ? { have } : {}) });
          }
        }
      } else if (!lower.some((w) => NEGATORS.has(w)) && s + 1 < lower.length && maInf.has(lower[s + 1]!)) {
        const right = formIn(maInf.get(lower[s + 1]!)!, `IndPr${subjectPerson}`);
        if (right) findings.push({ kind: "dictionaryForm", word: tokens[s + 1]!.raw, subject: lower[s]!, right });
      }
    }

    /*
      A NOUN SUBJECT WITH A VERB SAYING "I" OR "YOU". Read only where the noun
      cannot be anything but who does it: owned by a pronoun before it (`Meie
      tütar õpin` is `Meie tütar õpib`), so it is no vocative, and with no
      personal pronoun anywhere in the clause. A verb that records an object
      needs another word there to be that object, since `minu raamat loen` is
      the object put wrong rather than the verb. With `olema` the word after
      the verb has to say how or where (`Meie maja olen suur`), since `Teie
      õpetaja olen` is "I am your teacher".
    */
    if (!subjectPerson) {
      for (let at = 0; at + 2 < lower.length; at += 1) {
        if (!possessives.has(lower[at]!) || !known(at + 1) || !known(at + 2)) continue;
        if (lower.some((w, i) => i !== at && (subjects.has(w) || owners.has(w) || allatives.has(w) || possessives.has(w)))) break;
        /*
          The noun's plain form, which for many nouns is its genitive too
          (`maja`): the genitive would be an object of the verb, which a verb
          recording none, or `olema`, cannot have.
        */
        const readings = nounReadings.get(lower[at + 1]!) ?? [];
        const noun = readings[0];
        if (!noun || noun.pos !== "NOUN" || verbOf.has(lower[at + 1]!) || !onlyOf(lower[at + 1]!, [noun.lemma])) continue;
        const plain = readings.find((r) => r.case === "NOMINATIVE");
        if (!plain || !readings.every((r) => r.lemma === plain.lemma && (r.case === "NOMINATIVE"
          || (!r.plural && !plain.plural && (r.case === "GENITIVE" || r.case === "PARTITIVE"))))) continue;
        const objectToo = readings.some((r) => r.case !== "NOMINATIVE");
        const verb = lower[at + 2]!;
        const hits = readingsOf.get(verb) ?? [];
        if (!isPerson(verb) || !verbOnly(verb) || hits.length === 0 || !hits.every((r) => NOT_THIRD_PERSON.has(r.person))) continue;
        const hit = hits[0]!;
        const after = lower[at + 3];
        if (hit.lemma === "olema") {
          const said = after !== undefined && known(at + 3) ? strictly(after) : null;
          const how = said !== null && ((said.pos === "ADJECTIVE" && said.case === "NOMINATIVE") || LOCAL.has(said.case));
          if (!how) continue;
        } else {
          const takes = objectOf(byLemma.get(hit.lemma)?.find((e) => e.pos === "VERB")?.government ?? null) !== null;
          const other = lower.slice(at + 3).some((w) => {
            const r = strictly(w);
            return r !== null && r.pos === "NOUN" && (r.case === "PARTITIVE" || r.case === "GENITIVE");
          });
          if (takes && (objectToo || !other)) continue;
        }
        const right = formIn(hit.lemma, `${hit.family}${plain.plural ? "Pl3" : "Sg3"}`);
        if (right && right !== verb) findings.push({ kind: "person", word: tokens[at + 2]!.raw, subject: lower[at + 1]!, right });
        break;
      }
    }

    /*
      A VERB AFTER `ja` OR A COMMA SHARING THE PRONOUN BEFORE IT. `Me loeme,
      kirjutan ja vastame` is one subject and three verbs, so a verb saying
      "I" or "you" that is not that pronoun's is wrong. A verb in the third
      person is left alone, since `Ma tulin koju ja sadas vihma` starts a
      sentence of its own about the weather.
    */
    /*
      Carried only along a run of clauses that each open on their verb, and
      never out of a clause `et` or `sest` opened, whose subject is its own.
    */
    const subordinate = joined !== null && !PAIRING.has(joined);
    if (subjectPerson && subjectAt.length === 1 && !subordinate) carried = { person: subjectPerson, word: lower[subjectAt[0]!]!, sentence };
    else if (carried && (carried.sentence !== sentence || subordinate || !isPerson(lower[0]!)
      || lower.some((w) => subjects.has(w) || owners.has(w)) || nounReadings.has(lower[0]!))) carried = null;
    // Only a list joined by `ja`, `ning`, `või` or `ega`, or a comma inside one: after `et` or `sest` a new subject may go unsaid.
    const following = all[index + 1];
    const listed = (joined !== null && PAIRING.has(joined))
      || (joined === null && following !== undefined && following.sentence === sentence && following.joined !== null && PAIRING.has(following.joined));
    if (carried && listed && !subjectPerson && index > 0 && all[index - 1]!.sentence === sentence && known(0) && isPerson(lower[0]!) && verbOnly(lower[0]!)) {
      const hits = readingsOf.get(lower[0]!)!;
      const want = carried.person;
      if (hits.every((r) => NOT_THIRD_PERSON.has(r.person)) && !hits.some((r) => r.person === want)) {
        const right = formIn(hits[0]!.lemma, `${hits[0]!.family}${want}`);
        if (right && right !== lower[0]) findings.push({ kind: "person", word: tokens[0]!.raw, subject: carried.word, right });
      }
    }

    // THE WRONG INFINITIVE, both ways round.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      const pairs: [number, number][] = [[at, at + 1], [at + 1, at]];
      for (const [finiteAt, infAt] of pairs) {
        const verb = daOnlyFinite.get(lower[finiteAt]!)
          ?? (finiteAt > 0 && lower[finiteAt - 1] === "ei" ? daOnlyNegative.get(lower[finiteAt]!) : undefined);
        const inf = maInf.get(lower[infAt]!);
        if (!verb || !inf || (DA_ONLY_EXEMPT[verb] ?? []).includes(inf)) continue;
        // `võib sadama hakata`: the ma-infinitive belongs to the verb after it.
        const after = lower[infAt + 1];
        if (finiteAt < infAt && after !== undefined && (daInf.has(after) || maInf.has(after))) continue;
        const right = formIn(inf, "Inf");
        if (right && right !== lower[infAt]) {
          findings.push({ kind: "infinitive", word: tokens[infAt]!.raw, after: tokens[finiteAt]!.raw, right, form: "da" });
        }
      }
      // `on vaja minna`: what is needed is a da-infinitive, `vaja minema` being an idiom of its own ("come in handy").
      const needed = lower[at] === "vaja" ? maInf.get(lower[at + 1]!) : undefined;
      if (needed && needed !== "minema" && known(at + 1) && lower.some((w) => beForms.has(w))) {
        const right = formIn(needed, "Inf");
        const after = lower[at + 2];
        if (right && right !== lower[at + 1] && !(after !== undefined && (daInf.has(after) || maInf.has(after)))) {
          findings.push({ kind: "infinitive", word: tokens[at + 1]!.raw, after: tokens[at]!.raw, right, form: "da" });
        }
      }
      // `pean minna` is `pean minema`: these take the ma-infinitive, straight after them.
      const must = maOnlyFinite.get(lower[at]!);
      const da = daInf.get(lower[at + 1]!);
      if (must && da && known(at) && known(at + 1) && !nominal.has(lower[at + 1]!)) {
        const right = formIn(da, "Sup");
        if (right && right !== lower[at + 1]) {
          findings.push({ kind: "infinitive", word: tokens[at + 1]!.raw, after: tokens[at]!.raw, right, form: "ma" });
        }
      }
    }

    /*
      AN ADJECTIVE IN ITS PLAIN FORM BESIDE A NOUN WITH AN ENDING: `Ma elan suur
      majas` is `suures majas`, `järgmine nädalal` is `järgmisel nädalal`.
      Three guards, each a correct sentence a run of the check once flagged.
      Nothing after the noun that could be the head the two belong to
      (`viimane ruumist lahkuja` is the last one to leave the room). A verb in
      the clause, or none anywhere in the sentence, since `Üks poeg on
      kaitseväes, teine ülikoolis` has left a noun out. And after `olema` or
      another linking verb only a word of time, since `Ta on haige kodus` is
      somebody ill at home. An adjective that never changes (`täis`, `eesti`)
      is not read at all, nor the genitive, which may say whose a later noun
      is (`ilus linna park`).
    */
    const linked = (at: number) => lower.slice(0, at).some((w) => linkingForms.has(w));
    const clauseVerb = lower.some((w, i) => known(i) && isPerson(w));
    const sentenceVerb = all.some((c) => c.sentence === sentence && c.tokens.some((t) => isPerson(t.low)));
    for (let at = 0; at + 1 < lower.length && (clauseVerb || !sentenceVerb); at += 1) {
      if (!known(at) || !known(at + 1) || particles.has(lower[at]!)) continue;
      const adjective = strictly(lower[at]!);
      const noun = strictly(lower[at + 1]!);
      if (!adjective || adjective.pos !== "ADJECTIVE" || adjective.case !== "NOMINATIVE" || adjective.plural) continue;
      if (!noun || noun.pos !== "NOUN" || noun.case === "NOMINATIVE" || noun.case === "GENITIVE") continue;
      /*
        The partitive only where the adjective is not saying something about a
        clause (`Oli kerge tööd leida`, `On võimalik raha säästa`): no linking
        verb before it and no infinitive or converb anywhere in the clause.
      */
      if (noun.case === "PARTITIVE" && (linked(at) || lower.some((w) => maInf.has(w) || daInf.has(w) || /des$/.test(w)))) continue;
      const after = lower[at + 2];
      // A pronoun is nobody's head (`järgmine nädalal ma tulen`, `viimane ajal midagi`): only a noun or an adjective is.
      if (after !== undefined && !tokens[at + 2]!.name && (!known(at + 2) || BUILT_AT_WILL.test(after)
        || (nounReadings.get(after) ?? []).some((r) => r.pos !== "PRONOUN" && (r.case === "NOMINATIVE" || r.case === "GENITIVE" || r.case === "PARTITIVE"))
        || (!nounReadings.has(after) && [...(entriesHolding.get(after) ?? [])].some((l) => byLemma.get(l)?.some((e) => e.pos === "NOUN" || e.pos === "ADJECTIVE"))))) continue;
      const nounEntry = byLemma.get(noun.lemma)?.find((e) => e.pos === "NOUN");
      if (linked(at) && !isTime(nounEntry?.semanticTypes)) continue;
      const adjEntry = byLemma.get(adjective.lemma)?.find((e) => e.pos === "ADJECTIVE");
      const declines = adjEntry !== undefined && !!adjEntry.parts.GEN_SG && adjEntry.parts.GEN_SG.toLowerCase() !== (adjEntry.parts.NOM_SG ?? adjEntry.lemma).toLowerCase();
      if (!declines || !onlyOf(lower[at]!, [adjective.lemma]) || !onlyOf(lower[at + 1]!, [noun.lemma])) continue;
      if ([...(entriesHolding.get(lower[at]!) ?? [])].some((lemma) => byLemma.get(lemma)?.some((e) => e.pos !== "ADJECTIVE"))) continue;
      /*
        Estonian makes nouns in `-us`, `-mus` and `-is`, so a spelling ending
        in `s` that the forms list files as a headword of its own may be that
        word's plain form (`elamus` beside the inessive of `elamu`). The other
        endings it files as headwords are adverbs cut from a case (`nädalal`).
      */
      const next = lower[at + 1]!;
      if (next.endsWith("s") && claims?.(next)?.some((l) => l.toLowerCase() === next && !byLemma.has(l))) continue;
      const target = GENITIVE_ATTRIBUTE.has(noun.case) ? "GENITIVE" : noun.case;
      const right = formOfCase(adjective.lemma, target, noun.plural);
      if (right && right !== lower[at]) findings.push({ kind: "agreement", word: tokens[at]!.raw, noun: tokens[at + 1]!.raw, right });
    }

    /** A noun whose spelling is its nominative singular and nothing else, which all three rules below read. */
    const plainNoun = (at: number): CheckEntry | null => {
      const word = lower[at];
      if (word === undefined || !known(at) || particles.has(word) || subjects.has(word) || verbOf.has(word)) return null;
      const entry = (byLemma.get(word) ?? []).find((e) => e.pos === "NOUN" && (e.parts.NOM_SG ?? e.lemma).toLowerCase() === word)
        ?? entries.find((e) => e.pos === "NOUN" && e.parts.NOM_SG?.toLowerCase() === word);
      if (!entry || isNumber(entry.semanticTypes) || QUANTITY.has(entry.lemma)) return null;
      if (caseOfForm(lexicon, entry.lemma, word) !== "NOMINATIVE") return null;
      /*
        AND IT IS NOTHING ELSE OF ANY OTHER WORD. `maal` is a painting and is
        also "in the country", `last` is cargo and is also "child" in the
        partitive, `mulle` is a form of `mull` and is "to me". The first run
        over the dictionary's own sentences flagged every one of them.
      */
      // Another word's plain form (`laud` is also eyelids) is still a plain form; another case is not.
      if ([...(entriesHolding.get(word) ?? [])].some((lemma) => {
        if (lemma === entry.lemma) return false;
        const reading = caseOfForm(lexicon, lemma, word);
        return reading !== null && reading !== "NOMINATIVE";
      })) return null;
      // A headword the forms list knows and the rows in hand do not may read the spelling another way.
      const owners = claims?.(word);
      if (owners?.some((l) => !byLemma.has(l) && !byLemma.has(l.charAt(0).toLocaleUpperCase("et") + l.slice(1)) && !alsoOf(l, [entry.lemma]) && !fragment(l, word))) return null;
      // A name after it is an apposition, `lell Valduri`, which this cannot read.
      if (tokens[at + 1]?.name) return null;
      return entry;
    };
    const formOf = (entry: CheckEntry, key: "PARTITIVE" | "GENITIVE") => lexicon.caseForm.get(caseKeyFor(entry.lemma, key)) ?? null;
    const caught = new Set<number>();

    /*
      AN ADJECTIVE IN THE SINGULAR BEFORE A NOUN IN THE PLURAL: `ilus lilled` is
      `ilusad lilled`. Both are the plain form, so this is the number alone, and
      an adjective that never changes (`valmis`) is not read.
    */
    for (let at = 0; at + 1 < lower.length; at += 1) {
      if (!known(at) || !known(at + 1) || particles.has(lower[at]!)) continue;
      const adjective = strictly(lower[at]!);
      const noun = strictly(lower[at + 1]!);
      if (!adjective || adjective.pos !== "ADJECTIVE" || adjective.case !== "NOMINATIVE" || adjective.plural) continue;
      if (!noun || noun.pos !== "NOUN" || noun.case !== "NOMINATIVE" || !noun.plural) continue;
      const adjEntry = byLemma.get(adjective.lemma)?.find((e) => e.pos === "ADJECTIVE");
      const declines = adjEntry !== undefined && !!adjEntry.parts.GEN_SG && adjEntry.parts.GEN_SG.toLowerCase() !== (adjEntry.parts.NOM_SG ?? adjEntry.lemma).toLowerCase();
      if (!declines || !onlyOf(lower[at]!, [adjective.lemma]) || !onlyOf(lower[at + 1]!, [noun.lemma])) continue;
      if ([...(entriesHolding.get(lower[at]!) ?? [])].some((lemma) => byLemma.get(lemma)?.some((e) => e.pos !== "ADJECTIVE"))) continue;
      const right = formOfCase(adjective.lemma, "NOMINATIVE", true);
      if (right && right !== lower[at]) findings.push({ kind: "agreement", word: tokens[at]!.raw, noun: tokens[at + 1]!.raw, right });
    }

    // `koos` takes the comitative: `koos sõber` is `koos sõbraga`.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      if (lower[at] !== "koos" || lower.some((w) => beForms.has(w))) continue;
      const noun = plainNoun(at + 1);
      const right = noun ? formOfCase(noun.lemma, "COMITATIVE") : null;
      if (!noun || !right) continue;
      caught.add(at + 1);
      findings.push({ kind: "governed", word: tokens[at + 1]!.raw, after: tokens[at]!.raw, right, case: "COMITATIVE" });
    }

    // `ära` takes the command's own form: `ära tuled` is `ära tule`, `ärge tulete` is `ärge tulge`.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      const command = lower[at] === "ära" ? "Sg2" : lower[at] === "ärge" ? "Pl2" : null;
      if (!command || !(at === 0 || (at === 1 && lower[0] === "palun")) || !known(at + 1)) continue;
      const next = lower[at + 1]!;
      const hits = (readingsOf.get(next) ?? []).filter((r) => r.family === "IndPr" && r.person === command);
      // What follows `ära` is its verb, so `tuled` there is "you come" and not fires.
      if (hits.length === 0 || new Set((readingsOf.get(next) ?? []).map((r) => r.lemma)).size > 1) continue;
      const right = formIn(hits[0]!.lemma, `ImpPr${command}`);
      if (right && right !== next) findings.push({ kind: "command", word: tokens[at + 1]!.raw, after: tokens[at]!.raw, right });
    }

    // COUNTED: a number above one, or a word of quantity, takes the partitive singular after it.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      // `kui palju pilet maksab` asks a price; the ticket is what costs.
      if (!counting.has(lower[at]!) || (at > 0 && COMPARING.has(lower[at - 1]!))) continue;
      // `viis` is five and is also "took": a number that is a verb's form too says nothing.
      if (verbOf.has(lower[at]!)) continue;
      if (!QUANTITY.has(lower[at]!) && !onlyOf(lower[at]!, [lower[at]!, ...(entriesHolding.get(lower[at]!) ?? [])].filter((l) => byLemma.has(l)))) continue;
      const next = lower[at + 1]!;
      const singular = plainNoun(at + 1);
      // `kaks raamatud` is the plural where the singular belongs: `kaks raamatut`.
      const plural = singular ? null : strictly(next);
      // `kolm euro` is the genitive and the nominative at once, and neither is what a number counts.
      const readings = nounReadings.get(next) ?? [];
      // Only where nothing follows it that it could be saying whose (`kolm kabe maailmameistrit`), and never a number (`kakskümmend üheksa`).
      const after = lower[at + 2];
      const ends = after === undefined || numberForms.has(after) || (verbOf.has(after) && !nounReadings.has(after)) || particles.has(after)
        // An adjective or a noun in another case after it heads nothing: `kaks aasta vana`, `kaks aasta keeltekoolis`.
        || (known(at + 2) && !(nounReadings.get(after) ?? []).some((r) => r.pos === "NOUN" && (r.case === "NOMINATIVE" || r.case === "GENITIVE" || r.case === "PARTITIVE"))
          && (nounReadings.has(after) || verbOf.has(after)))
        // Nor a word with no case and no person, which is an adverb (`kolm aasta juba`), unless it is a postposition the number would then go with.
        || (known(at + 2) && !nounReadings.has(after) && !verbOf.has(after) && !GENITIVE_POSTPOSITIONS.has(after)
          && (entriesHolding.get(after)?.size ?? 0) > 0 && [...entriesHolding.get(after)!].every((l) => byLemma.get(l)?.every((e) => e.pos === "ADVERB")));
      const plainOrOf = !singular && !plural && ends && known(at + 1) && !verbOf.has(next) && !numberForms.has(next) && readings.length > 0
        && readings.every((r) => r.pos === "NOUN" && !r.plural && (r.case === "NOMINATIVE" || r.case === "GENITIVE") && r.lemma === readings[0]!.lemma)
        ? readings[0]!.lemma : null;
      const pluralLemma = plural && plural.pos === "NOUN" && plural.plural && plural.case === "NOMINATIVE" && known(at + 1) ? plural.lemma : null;
      /*
        `palju` and `vähe` count a plural in the plural partitive (`palju
        inimesi`), and a singular there may be a thing counted or a mass
        (`palju vett`), which the check cannot tell, so it is left alone.
        `natuke` and `veidi` measure a mass and say nothing about a plural.
      */
      const many = lower[at] === "palju" || lower[at] === "vähe";
      const some = lower[at] === "natuke" || lower[at] === "veidi";
      const lemma = many ? pluralLemma : some ? singular?.lemma ?? plainOrOf : singular?.lemma ?? plainOrOf ?? pluralLemma;
      const right = lemma ? formOfCase(lemma, "PARTITIVE", many) : null;
      if (!lemma || !right || right === next || !onlyOf(next, [lemma])) continue;
      caught.add(at + 1);
      findings.push({ kind: "count", word: tokens[at + 1]!.raw, after: tokens[at]!.raw, right });
    }

    /*
      A THING AS THE SUBJECT, AND THE VERB SAYING "I" OR "YOU": `See olen hea
      mõte` is `See on hea mõte`, `Meie naaber olen sõbralik` is `on`. Read only
      where nobody in the clause is "I" or "you" in the nominative, nobody has
      or receives anything in it (`mul`, `mulle`), and the verb is one verb's
      first or second person and nothing else. Estonian drops the pronoun and
      fronts what it is talking about, so two more things hold. A verb that
      takes an object leaves a fronted plain noun alone, since `Raamat loen
      homme` is an object in the wrong case rather than a subject. And `olema`
      needs something said about the subject after it, since `Õpetaja olen
      juba kümme aastat` is "I have been a teacher".
    */
    if (findings.length === clauseFindingsFrom && !lower.some((w) => owners.has(w) || allatives.has(w))
      // A pronoun before a noun says whose it is (`Meie naaber`), and is nobody doing anything.
      && !lower.some((w, at) => {
        const s = subjects.get(w);
        // `teie oma` is "yours" and is the same whose, said without the noun.
        return s !== undefined && NOT_THIRD_PERSON.has(s.code.slice(5) as Person) && !(s.sure === false && (owning(at) || lower[at + 1] === "oma"));
      })) {
      const v = lower.findIndex((w, at) => known(at) && isPerson(w) && !afterNegator.has(at));
      const hits = v > 0 ? readingsOf.get(lower[v]!)! : [];
      const lemma = hits[0]?.lemma;
      const family = hits[0]?.family;
      const sameVerb = hits.length > 0 && hits.every((r) => r.lemma === lemma && r.family === family && NOT_THIRD_PERSON.has(r.person));
      const takesObject = lemma !== undefined && objectOf(byLemma.get(lemma)?.find((e) => e.pos === "VERB")?.government ?? null) !== null;
      // A word nobody could read may be the verb, and a participle after `olema` makes it the perfect (`olen mänginud`), whose subject is the speaker.
      const perfect = lemma === "olema" && lower.slice(v + 1).some((w) => /(n|t|d)ud$/.test(w));
      if (sameVerb && lemma && family && verbOnly(lower[v]!) && !takesObject && unknown.size === 0 && !perfect) {
        // The plain-form thing nearest before the verb, singular or plural, that is no word of time or amount and no name.
        let subject: { at: number; plural: boolean } | null = null;
        for (let at = v - 1; at >= 0 && subject === null; at -= 1) {
          if (tokens[at]!.name) break;
          const word = lower[at]!;
          const noun = plainNoun(at);
          if (noun) { if (!isTime(noun.semanticTypes) && !ADVERBIAL_NOUNS.has(noun.lemma)) subject = { at, plural: false }; break; }
          const reading = strictly(word);
          // The forms list files `seda` and `need` as headwords of their own, so a pointing word is read off its row alone.
          if (reading && reading.case === "NOMINATIVE" && known(at) && (POINTING.has(reading.lemma) || onlyOf(word, [reading.lemma]))) {
            const pointing = reading.pos === "PRONOUN" && POINTING.has(reading.lemma);
            // Several things in the plain form are also a whole object (`Murakad tegin moosiks`), so only `olema` reads them.
            const many = reading.pos === "NOUN" && reading.plural && lemma === "olema" && !isTime(byLemma.get(reading.lemma)?.[0]?.semanticTypes);
            if (pointing || many) subject = { at, plural: reading.plural };
            break;
          }
        }
        /*
          A thing cannot be "I" or "you", so where `olema` opens on a place or a
          time and a thing follows it in the plain form, the thing is what is
          there: `Siin olen menüü` is `Siin on menüü`. A person after it may be
          what the speaker is (`Siin olen õpetaja`), and is left alone.
        */
        const thing = (at: number) => {
          if (tokens[at]!.name || !known(at)) return null;
          // A noun whose plain form and genitive are spelled alike (`menüü`) is the plain form where nothing follows for it to own.
          const readings = nounReadings.get(lower[at]!) ?? [];
          const owns = at + 1 < lower.length && (nounReadings.get(lower[at + 1]!) ?? []).some((r) => r.pos === "NOUN" || r.pos === "ADJECTIVE");
          const reading = strictly(lower[at]!)
            ?? (!owns && !verbOf.has(lower[at]!) && readings.length > 0 && readings.every((r) => r.lemma === readings[0]!.lemma && r.plural === readings[0]!.plural
              && (r.case === "NOMINATIVE" || r.case === "GENITIVE")) ? { ...readings[0]!, case: "NOMINATIVE" as const } : null);
          if (!reading || reading.pos !== "NOUN" || reading.case !== "NOMINATIVE" || !onlyOf(lower[at]!, [reading.lemma])) return null;
          const entry = byLemma.get(reading.lemma)?.find((e) => e.pos === "NOUN");
          if (!entry || isTime(entry.semanticTypes) || isNumber(entry.semanticTypes) || ADVERBIAL_NOUNS.has(entry.lemma) || QUANTITY.has(entry.lemma)) return null;
          return isThing(entry.semanticTypes) ? reading : null;
        };
        if (subject === null && lemma === "olema" && !lower.slice(0, v).some((w) => (nounReadings.get(w) ?? []).some((r) => r.case === "NOMINATIVE"))) {
          for (let at = v + 1; at < lower.length; at += 1) {
            const found = thing(at);
            if (found) { subject = { at, plural: found.plural }; break; }
            // A word before the thing may say whose it is (`teie pilet`); anything else in the plain form ends the search.
            if ((nounReadings.get(lower[at]!) ?? []).every((r) => r.case !== "NOMINATIVE")) continue;
            if (subjects.has(lower[at]!) && owning(at)) continue;
            break;
          }
        }
        /*
          After `olema`, a word in the plain form, or a place, said about the
          subject; or a clause asking where (`kus mu võti olen`). Not needed
          where the subject is a thing, which nobody is.
        */
        const said = lemma !== "olema" || (subject !== null && thing(subject.at) !== null) || lower.slice(v + 1).some((w, i) => {
          const at = v + 1 + i;
          if (!known(at) || tokens[at]!.name) return false;
          const readings = nounReadings.get(w) ?? [];
          if (readings.some((r) => (r.pos === "ADJECTIVE" || r.pos === "NOUN") && r.case === "NOMINATIVE")) return true;
          return [...(entriesHolding.get(w) ?? [])].some((l) => byLemma.get(l)?.some((e) => e.pos === "ADJECTIVE"));
        }) || lower.slice(0, v).some((w) => QUESTIONS.has(w));
        const person = subject?.plural ? "Pl3" : "Sg3";
        const right = subject && said ? formIn(lemma, `${family}${person}`) : undefined;
        // `oli` and `olid` differ, and a subject this reads as singular may be several things joined (`pass ja kohver`).
        const joinedUp = subject !== null && lower.slice(0, subject.at).some((w) => PAIRING.has(w));
        const sameEither = formIn(lemma, `${family}Sg3`) === formIn(lemma, `${family}Pl3`);
        if (subject && right && right !== lower[v] && (!joinedUp || sameEither)) {
          caught.add(v);
          findings.push({ kind: "person", word: tokens[v]!.raw, subject: lower[subject.at]!, right });
        }
      }
    }

    /*
      BEFORE A POSTPOSITION: the genitive. Every one of these words is also an
      adverb, and `Vaasis on vesi sees` is the water being inside, which is
      right: so a clause naming its place in another word (`vaasis`) says
      nothing, and neither does a clause with no verb in it (`selg ees`),
      unless it is the whole of the answer, which is how somebody asked where
      a thing is says `laua peal`.
    */
    // A word the dictionary handed nothing for may be the one naming the place, so it settles nothing.
    const unread = lower.some((word, at) => !tokens[at]!.name && !lexicon.forms.has(word) && !GENITIVE_POSTPOSITIONS.has(word));
    const placed = unread || lower.some((word) => !GENITIVE_POSTPOSITIONS.has(word) && [...(entriesHolding.get(word) ?? [])].some((lemma) => {
      const at = caseOfForm(lexicon, lemma, word);
      return at !== null && LOCAL.has(at);
    }));
    const hasVerb = lower.some((word, at) => known(at) && verbOf.has(word) && !particles.has(word));
    const wholeAnswer = clauseCount === 1;
    /*
      Where the clause's verb says "I" or "you" and is not a form of `olema`,
      the plain noun cannot be who does it, so it is not the thing that is
      "inside" either: `Ma ootan kohvikus kirik kõrval` is by the church.
    */
    const mine = !lower.some((w) => beForms.has(w))
      && personAt.some((at) => readingsOf.get(lower[at]!)!.every((r) => NOT_THIRD_PERSON.has(r.person)));
    /*
      A word of time before `pärast` is how long until, and is always the
      genitive (`tunni pärast`, `nädala pärast`), wherever the clause says it
      is: nothing is "inside" an hour. Not where a partitive follows, since
      `tund pärast tundi` is hour after hour and `pärast` is its preposition.
    */
    const timeBefore = (at: number) => {
      if (lower[at + 1] !== "pärast" || caught.has(at)) return null;
      const after = lower[at + 2];
      if (after !== undefined && (nounReadings.get(after) ?? []).some((r) => r.case === "PARTITIVE")) return null;
      const noun = plainNoun(at);
      return noun && isTime(noun.semanticTypes) ? noun : null;
    };
    for (let at = 0; at + 1 < lower.length; at += 1) {
      const noun = timeBefore(at);
      const right = noun ? formOf(noun, "GENITIVE") : null;
      if (!noun || !right || right === lower[at]) continue;
      caught.add(at);
      findings.push({ kind: "postposition", word: tokens[at]!.raw, before: tokens[at + 1]!.raw, right });
    }
    for (let at = 0; at + 1 < lower.length && (!placed || (mine && !unread)) && (hasVerb || wholeAnswer); at += 1) {
      if (caught.has(at) || !GENITIVE_POSTPOSITIONS.has(lower[at + 1]!)) continue;
      // `buss poole tunni pärast`: a word that is a postposition and a noun's form, read as the noun's.
      const after = lower[at + 2];
      if (after !== undefined && nounReadings.has(after) && !verbOf.has(after)) continue;
      const noun = plainNoun(at);
      const right = noun ? formOf(noun, "GENITIVE") : null;
      if (!noun || !right) continue;
      caught.add(at);
      findings.push({ kind: "postposition", word: tokens[at]!.raw, before: tokens[at + 1]!.raw, right });
    }

    /*
      A NOUN JOINED TO ONE WITH AN ENDING. `Ma koristan elutoa ja köök`: the
      two things joined by `ja` are in one case, so a lone plain noun after it
      takes the ending of the noun closing the clause before. Read only where
      the clause after `ja` is that one word, and the one before closes on a
      noun in a single case, singular, that is not the plain form.
    */
    const before = all[index - 1];
    if (joined !== null && PAIRING.has(joined) && tokens.length === 1 && before !== undefined && before.sentence === sentence) {
      const last = before.tokens[before.tokens.length - 1]!;
      const reading = !last.name ? strictly(last.low) : null;
      const lone = plainNoun(0);
      if (reading && reading.pos === "NOUN" && !reading.plural && reading.case !== "NOMINATIVE" && lone
        && !isTime(lone.semanticTypes) && onlyOf(last.low, [reading.lemma]) && !findings.some((f) => f.word === tokens[0]!.raw)) {
        const right = formOfCase(lone.lemma, reading.case);
        if (right && right !== lower[0]) findings.push({ kind: "pair", word: tokens[0]!.raw, with: last.raw, right });
      } else if (lone && !reading && !isTime(lone.semanticTypes) && !findings.some((f) => f.word === tokens[0]!.raw)) {
        /*
          Or the second thing a verb is done to, where the first is spelled the
          same in the plain form, the genitive and the partitive (`Ostsin kala
          ja kartul`): it is the object too, and takes the object's case. Read
          only after a verb saying "I" or "you" that takes an object, which is
          where the object rule reads the first one.
        */
        const firstReadings = !last.name ? nounReadings.get(last.low) ?? [] : [];
        const sameWord = firstReadings.length > 0 && firstReadings.every((r) => r.pos === "NOUN" && !r.plural && r.lemma === firstReadings[0]!.lemma)
          && firstReadings.some((r) => r.case === "PARTITIVE");
        const verbs = before.tokens.map((t) => t.low).filter((w) => readingsOf.has(w) && !nominal.has(w) && verbOnly(w));
        const verbLemma = verbs.length === 1 ? readingsOf.get(verbs[0]!)!.every((r) => NOT_THIRD_PERSON.has(r.person)) ? readingsOf.get(verbs[0]!)![0]!.lemma : null : null;
        const sameVerb = verbLemma !== null && readingsOf.get(verbs[0]!)!.every((r) => r.lemma === verbLemma);
        const takes = sameVerb && !LINKING.includes(verbLemma as (typeof LINKING)[number])
          && objectOf(byLemma.get(verbLemma)?.find((e) => e.pos === "VERB")?.government ?? null) !== null;
        if (sameWord && takes && onlyOf(lower[0]!, [lone.lemma])) {
          const said = before.tokens.map((t) => t.low);
          const no = said.some((w) => NEGATORS.has(w)) || PARTIAL_ONLY.has(verbLemma!) || WANTING.has(verbLemma!);
          const partitive = formOf(lone, "PARTITIVE");
          const whole = no ? null : formOf(lone, "GENITIVE");
          const genitive = whole && whole !== partitive ? whole : null;
          if (partitive && partitive !== lower[0]) {
            caught.add(0);
            findings.push({ kind: "object", word: tokens[0]!.raw, verb: before.tokens.find((t) => t.low === verbs[0])!.raw, partitive, genitive });
          }
        }
      }
    }

    // THE OBJECT IN THE PLAIN FORM.
    if (lower.some((w) => beForms.has(w))) return;
    /*
      `osta` is the command and the da-infinitive both, so a spelling that is
      both reads as a command only where it opens its clause, after a `palun`
      at most: `Osta raamat!` is one and `Ma soovin raamatut osta` is not.
    */
    const commands = lower.some((w, at) => {
      if (!imperative.has(w) || isPerson(w) || (at > 0 && lower[at - 1] === "ei")) return false;
      return !daInf.has(w) || at === 0 || (at === 1 && lower[0] === "palun");
    });
    if (commands) return;
    // `Mul valutab kõht`: with somebody who has it, the plain noun is what is had or what hurts.
    if (lower.some((w) => owners.has(w))) return;
    // Somebody else doing something in this clause may be what the plain-form noun is the subject of.
    const third = (w: string) => isPerson(w) && readingsOf.get(w)!.every((r) => !NOT_THIRD_PERSON.has(r.person));
    if (lower.some((w, at) => known(at) && third(w))) return;
    const personal = (subjectPerson !== null && NOT_THIRD_PERSON.has(subjectPerson))
      || personAt.some((at) => readingsOf.get(lower[at]!)!.every((r) => NOT_THIRD_PERSON.has(r.person)));
    if (!personal) return;
    const verbs = lower.flatMap((word, at) => {
      if (!known(at) || particles.has(word) || !verbOf.has(word)) return [];
      const objects = verbOf.get(word)!
        .map((lemma) => objectOf(byLemma.get(lemma)?.find((e) => e.pos === "VERB")?.government ?? null))
        .filter((o): o is { genitive: boolean } => o !== null);
      return [{ at, infinitive: maInf.has(word) || daInf.has(word), object: objects.length > 0 }];
    });
    if (verbs.length === 0) return;
    /*
      An infinitive's object is the infinitive's: `soovin ... osta` takes what
      `ostma` takes. A verb that records an object leads, and where none does
      the finding says the word needs an ending without guessing which.
    */
    const withObject = verbs.filter((v) => v.object);
    const verb = withObject.find((v) => v.infinitive) ?? withObject[0] ?? verbs.find((v) => v.infinitive) ?? verbs[0]!;
    const negated = lower.some((w) => NEGATORS.has(w));
    /*
      A plain noun before the clause's first verb is far likelier its subject
      than its object (`Lennuk väljub hommikul`), and a clause already found
      wrong in another way has a sentence the rest cannot be read off.
    */
    const firstVerb = verbs[0]!.at;
    if (findings.length > clauseFindingsFrom) return;
    /*
      A noun whose plain form and genitive are spelled alike (`proosa`), or a
      genitive, is read only where neither can be the object: in a negated
      clause, whose object is always the partitive (`ei näe proosa` is `ei näe
      proosat`). Read from the government it is not, since `mida` there does
      not rule the genitive out (`Lükkasin kaardi pilusse` is right).
    */
    // `ära` is also the particle of `ära õiendama`, so only `ei` or a command opening on `ära` says no here.
    const saidNo = lower.includes("ei") || lower.includes("ärge") || lower[0] === "ära";
    /*
      Or where the verb is one whose object is only ever partial, because what
      it names never finishes (`ootan`, `armastan`, `vajan`), and no particle
      in the clause finishes it for it (`ootasin ta ära`).
    */
    const partialOnly = verbOf.get(lower[verb.at]!)?.some((lemma) => PARTIAL_ONLY.has(lemma)) === true
      && !lower.some((w) => particles.has(w) && !subjects.has(w));
    const plainOrOf = (at: number): CheckEntry | null => {
      const word = lower[at]!;
      if (!(saidNo || partialOnly) || !known(at) || particles.has(word) || subjects.has(word) || verbOf.has(word)) return null;
      const readings = nounReadings.get(word) ?? [];
      const first = readings[0];
      if (!first || first.pos !== "NOUN") return null;
      if (!readings.every((r) => r.lemma === first.lemma && !r.plural && (r.case === "NOMINATIVE" || r.case === "GENITIVE"))) return null;
      // The last word of the clause, or before a verb or a particle: anything else it may be saying whose.
      const next = lower[at + 1];
      if (next !== undefined && !((verbOf.has(next) && !nounReadings.has(next)) || particles.has(next))) return null;
      if (!onlyOf(word, [first.lemma]) || tokens[at + 1]?.name) return null;
      const entry = byLemma.get(first.lemma)?.find((e) => e.pos === "NOUN");
      return entry && !isNumber(entry.semanticTypes) && !QUANTITY.has(entry.lemma) ? entry : null;
    };
    for (let at = firstVerb + 1; at < lower.length; at += 1) {
      if (caught.has(at)) continue;
      const noun = plainNoun(at) ?? plainOrOf(at);
      if (!noun || isTime(noun.semanticTypes) || ADVERBIAL_NOUNS.has(noun.lemma)) continue;
      // Before a postposition the word is that postposition's, whatever form it took.
      if (lower[at + 1] !== undefined && GENITIVE_POSTPOSITIONS.has(lower[at + 1]!)) continue;
      const before = lower[at - 1];
      const next = lower[at + 1];
      if (before !== undefined && (numberForms.has(before) || ASKING.has(before) || COMPARING.has(before))) continue;
      if (next !== undefined && numberForms.has(next)) continue;
      const partitive = verb.object ? formOf(noun, "PARTITIVE") : null;
      /*
        Both, unless the clause rules the whole one out: Ekilex's `mida`
        names an object without saying whether a whole one is possible, and a
        finished act takes the genitive (`unustasin võtme koju`) where an
        ongoing one takes the partitive, which only the learner knows.
      */
      const wanting = !verb.infinitive && verbOf.get(lower[verb.at]!)?.some((lemma) => WANTING.has(lemma)) === true;
      const whole = verb.object && !negated && !partialOnly && !saidNo && !wanting ? formOf(noun, "GENITIVE") : null;
      const genitive = whole && whole !== partitive ? whole : null;
      findings.push({ kind: "object", word: tokens[at]!.raw, verb: tokens[verb.at]!.raw, partitive, genitive });
      break;
    }
  });

  return { findings, words: read };
}

/** The personal pronouns, whose adessive says who has something. */
const SUBJECT_LEMMAS = { mina: 1, sina: 1, tema: 1, meie: 1, teie: 1, nemad: 1 } as const;

/**
 * Verbs whose person is the one a thing happens to, in an ending, while the
 * verb agrees with the thing: `mulle meeldib kohv`, `mul valutab pea`. A
 * pronoun saying "I" or "you" beside one of these in the third person is the
 * person put in the wrong form, never "I please". `sobima` is left out, since
 * `ma sobin` is "I fit" and a learner writing `ma sobib` may mean either.
 */
const EXPERIENCED: Readonly<Record<string, "ALLATIVE" | "ADESSIVE">> = { meeldima: "ALLATIVE", valutama: "ADESSIVE" };
