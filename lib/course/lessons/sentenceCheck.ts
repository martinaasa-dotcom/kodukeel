import {
  buildLexicon, caseKeyFor, caseOfForm, DA_ONLY_EXEMPT, DA_ONLY_VERBS, PERSON_CODES, subjectsIn,
  type DictEntry, type Lexicon, type PersonCode,
} from "@/lib/scenes/lexicon";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { editDistance } from "@/lib/estonian/answer";
import { governmentParts } from "@/lib/estonian/government";
import { fold } from "@/lib/estonian/fold";
import { isNumber, isTime } from "@/lib/estonian/semantics";
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
 * EIGHT THINGS, EACH DRAWN TO MISS RATHER THAN TO FIRE. A check that tells
 * somebody their correct Estonian is wrong is worse than no check, so each one
 * reads only what the dictionary settles on its own:
 *
 * - SPELLING. A word no form in the language is spelled like. Where folding
 *   the diacritics finds a word the dictionary holds, or one letter (two on a
 *   long word) does, that word is offered. Anything else is said to be a word
 *   the dictionary does not know, which is a fact rather than a verdict.
 * - PERSON. Exactly one subject pronoun and a present-tense verb in none of
 *   its persons: `ma soovib` is `ma soovin`. Read per clause, at the comma
 *   for the reason `disagrees` gives and at a joining word (`JOINERS`).
 * - THE NEGATIVE. After `ei` the verb takes no person ending: `ei soovin` is
 *   `ei soovi`.
 * - THE DICTIONARY FORM AS A VERB. A subject pronoun straight before a
 *   ma-infinitive, with no verb in a person anywhere in the clause: `ma tulema`
 *   is `ma tulen`.
 * - THE WRONG INFINITIVE. One of the verbs that only ever take the
 *   da-infinitive, next to a ma-infinitive: `tahan ostma` is `tahan osta`.
 *   `DA_ONLY_VERBS` and its one exemption, the gate's own list.
 * - COUNTED. After a number above one, or a word of quantity, a noun in its
 *   plain form takes the partitive: `kaks kook` is `kaks kooki`.
 * - BEFORE A POSTPOSITION. A noun in its plain form straight before one that
 *   takes the genitive: `laud peal` is `laua peal`. Only where the clause has a
 *   verb and names no place in another word, since `Vaasis on vesi sees` is the
 *   water being inside and is right.
 * - THE OBJECT IN THE PLAIN FORM. In a clause whose subject is I, you or we,
 *   with no form of `olema`, no command and no third-person verb in it, a noun
 *   whose spelling is its nominative and nothing else, of this word or any
 *   other, is in the wrong case: the thing you want or buy takes an ending. Offered
 *   as the partitive, and as the genitive too where that verb's government
 *   names one and nothing in the clause negates it, or said to need an
 *   ending, and not which, where the verb records no object. A plural is never read
 *   (`Ma ostan kaardid` is right), nor a name, nor a word of time (`Ma ootasin
 *   tund aega` is right), nor a verb particle.
 *
 * MEASURED RATHER THAN REASONED ABOUT. `npm run measure:sentence-check` runs
 * this over every lesson line and every usage in the shipped dictionary, which
 * are known to be right, and every guard below a check was a false alarm that
 * run printed. The count it prints is the number to keep at nought.
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
  /** The verb is in another person than its subject, which is given in lower case since it is quoted mid-sentence. */
  | { readonly kind: "person"; readonly word: string; readonly subject: string; readonly right: string }
  /** A person ending after `ei`. */
  | { readonly kind: "negative"; readonly word: string; readonly right: string }
  /** The ma-infinitive standing where a verb in a person belongs. */
  | { readonly kind: "dictionaryForm"; readonly word: string; readonly subject: string; readonly right: string }
  /** A ma-infinitive after a verb that only takes the da-infinitive. */
  | { readonly kind: "infinitive"; readonly word: string; readonly after: string; readonly right: string }
  /**
   * An object in its nominative. `partitive` is null where the verb records no
   * object, and then the finding says the word needs an ending and not which.
   */
  | { readonly kind: "object"; readonly word: string; readonly verb: string; readonly partitive: string | null; readonly genitive: string | null }
  /** A noun in its plain form after a number above one, or a word of quantity: `kaks kook` is `kaks kooki`. */
  | { readonly kind: "count"; readonly word: string; readonly after: string; readonly right: string }
  /** A noun in its plain form before a postposition: `laud peal` is `laua peal`. */
  | { readonly kind: "postposition"; readonly word: string; readonly before: string; readonly right: string };

export interface SentenceCheck {
  readonly findings: readonly Finding[];
  /** How many words were read, so a screen never says "nothing wrong" about nothing. */
  readonly words: number;
}

/**
 * The lemmas the checks need whatever the sentence says: the subject
 * pronouns, the verb to be, and the da-only verbs. Requests against the
 * dictionary, like `SUBJECT_PRONOUN` itself.
 */
export const ALWAYS_READ: readonly string[] = [
  "mina", "sina", "tema", "meie", "teie", "nemad", "olema", ...DA_ONLY_VERBS,
];

/** The persons whose subject a nominative noun cannot be. */
const NOT_THIRD: ReadonlySet<PersonCode> = new Set<PersonCode>(["IndPrSg1", "IndPrSg2", "IndPrPl1", "IndPrPl2"]);

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
const JOINERS: ReadonlySet<string> = new Set(["ja", "ning", "aga", "kuid", "et", "sest", "kuna", "või", "ega", "siis"]);

/** The cases that say where something is, goes or comes from. */
const LOCAL: ReadonlySet<CaseKey> = new Set<CaseKey>(["ILLATIVE", "INESSIVE", "ELATIVE", "ALLATIVE", "ADESSIVE", "ABLATIVE"]);

/** Words of quantity that take the partitive after them, like a number above one: `palju vett`, `natuke juustu`. */
const QUANTITY: ReadonlySet<string> = new Set(["palju", "vähe", "natuke", "veidi", "mitu", "paar"]);

/**
 * The postpositions that take the genitive and are never a verb's particle or
 * an adverb on their own, so a plain-form noun straight before one is wrong:
 * `laud peal` is `laua peal`. `ette`, `peale`, `alla`, `üle` and `taha` are
 * left out, since each is also a particle or another word (`taha` is a form of
 * `tahtma`), and a check that cannot tell is a check that says nothing.
 */
const GENITIVE_POSTPOSITIONS: ReadonlySet<string> = new Set([
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
}

/**
 * The sentence as clauses of tokens, cut at a stop and at a comma. A word in
 * quotation marks is a word mentioned rather than used (`ei ütle „pool”`), so
 * it is read as a name and nothing is said about it.
 */
function clauses(text: string): Token[][] {
  const out: Token[][] = [];
  const quoted = new Set<string>();
  for (const [, inside] of text.matchAll(/[„"“«]([^„"“”«»]+)[”"»“]/g)) {
    for (const word of inside!.match(ESTONIAN_WORD) ?? []) quoted.add(word.toLowerCase());
  }
  for (const sentence of text.split(/[.!?]+/)) {
    let first = true;
    for (const clause of sentence.split(/[,;:]+/)) {
      const tokens: Token[] = [];
      for (const raw of clause.match(ESTONIAN_WORD) ?? []) {
        if (JOINERS.has(raw.toLowerCase()) && tokens.length > 0) {
          out.push([...tokens]);
          tokens.length = 0;
          first = false;
          continue;
        }
        if (JOINERS.has(raw.toLowerCase())) { first = false; continue; }
        tokens.push({ raw, low: raw.toLowerCase(), name: (!first && /^\p{Lu}/u.test(raw)) || quoted.has(raw.toLowerCase()), first });
        first = false;
      }
      if (tokens.length > 0) out.push(tokens);
    }
  }
  return out;
}

/**
 * The nearest form the dictionary holds, where exactly one is close enough to
 * be the word meant. A tie is broken by the sample sentence, since a learner
 * one letter off `raamatukogukaarti` is likelier to mean the form in front of
 * them than `raamatukogukaardi`; a tie it cannot break offers nothing.
 */
function nearest(word: string, lexicon: Lexicon, preferred: ReadonlySet<string>): { form: string; diacritics: boolean } | null {
  const unfolded = lexicon.folded.get(fold(word));
  if (unfolded && unfolded !== word) return { form: unfolded, diacritics: true };
  const allowance = word.length >= 9 ? 2 : word.length >= 5 ? 1 : 0;
  if (allowance === 0) return null;
  let closest: string[] = [];
  let bestDistance = allowance + 1;
  for (const form of lexicon.forms) {
    if (form.includes(" ")) continue;
    const distance = editDistance(fold(word), fold(form), allowance);
    if (distance === 0 || distance > allowance) continue;
    if (distance < bestDistance) { closest = [form]; bestDistance = distance; }
    else if (distance === bestDistance && !closest.includes(form)) closest.push(form);
  }
  if (closest.length > 1) closest = closest.filter((form) => preferred.has(form));
  return closest.length === 1 ? { form: closest[0]!, diacritics: false } : null;
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
): SentenceCheck {
  const preferred = new Set((sample.match(ESTONIAN_WORD) ?? []).map((w) => w.toLowerCase()));
  const lexicon = buildLexicon(entries);
  const subjects = subjectsIn(entries);
  const byLemma = new Map<string, CheckEntry[]>();
  for (const entry of entries) byLemma.set(entry.lemma, [...(byLemma.get(entry.lemma) ?? []), entry]);

  // Which person a spelling is, of which verb.
  const persons = new Map<string, { lemma: string; code: PersonCode }[]>();
  // A phrase's verb (`ära tulema`) shares its spellings with the plain verb and is never what a lone form means.
  const single = (lemma: string) => !/\s/.test(lemma);
  for (const [lemma, table] of lexicon.persons) {
    if (!single(lemma)) continue;
    for (const code of PERSON_CODES) {
      const form = table.get(code)?.toLowerCase();
      if (form) persons.set(form, [...(persons.get(form) ?? []), { lemma, code }]);
    }
  }
  // Every form of a word that is not a verb, so a spelling two words share is never read as a verb's person.
  const nominal = new Set<string>();
  // Every form of a verb, to the verb.
  const verbOf = new Map<string, string[]>();
  for (const entry of entries) {
    const forms = lexicon.byLemma.get(entry.lemma) ?? new Set<string>();
    for (const form of forms) {
      if (entry.pos === "VERB" && single(entry.lemma)) verbOf.set(form, [...new Set([...(verbOf.get(form) ?? []), entry.lemma])]);
      else nominal.add(form);
    }
  }
  const isPerson = (word: string) => persons.has(word) && !nominal.has(word);
  const maInf = new Map<string, string>();
  for (const [lemma, forms] of lexicon.infinitives) if (single(lemma)) for (const form of forms) maInf.set(form, lemma);
  const daInf = new Map<string, string>();
  const daOf = new Map<string, string>();
  for (const entry of entries) {
    if (entry.pos !== "VERB" || !entry.parts.INF_DA || !single(entry.lemma)) continue;
    const da = entry.parts.INF_DA.toLowerCase();
    daInf.set(da, entry.lemma);
    if (!daOf.has(entry.lemma)) daOf.set(entry.lemma, da);
  }
  // A da-only verb in any person or the conditional.
  const daOnlyFinite = new Map<string, string>();
  for (const lemma of DA_ONLY_VERBS) {
    for (const [code, form] of lexicon.persons.get(lemma) ?? []) {
      if (code === "IndPrPs_" || code === "ImpPrSg2") continue;
      daOnlyFinite.set(form.toLowerCase(), lemma);
    }
  }
  // A command takes its object in the plain form (`Pane aken kinni`), so a clause holding one is left alone.
  const imperative = new Set<string>();
  for (const [lemma, table] of lexicon.persons) {
    const form = single(lemma) ? table.get("ImpPrSg2") : undefined;
    if (form) imperative.add(form.toLowerCase());
  }
  for (const entry of entries) {
    if (entry.pos !== "VERB" || !single(entry.lemma)) continue;
    for (const form of entry.extraForms ?? []) if (form.code === "ImpPrPl2") imperative.add(form.value.toLowerCase());
  }
  // Every form of a number word, which a noun beside it is counted by rather than governed by.
  const numberForms = new Set<string>();
  for (const entry of entries) {
    if (isNumber(entry.semanticTypes)) for (const form of lexicon.byLemma.get(entry.lemma) ?? []) numberForms.add(form);
  }
  const beForms = lexicon.byLemma.get("olema") ?? new Set<string>();
  // A number above one in its plain form, which counts the noun after it in the partitive.
  const counting = new Set<string>(QUANTITY);
  for (const entry of entries) {
    if (entry.pos !== "NOUN" || !isNumber(entry.semanticTypes) || entry.lemma === "üks") continue;
    counting.add((entry.parts.NOM_SG ?? entry.lemma).toLowerCase());
  }
  // The past in a person, which says who the subject is as surely as the present does.
  const pastNotThird = new Set<string>();
  const thirdPerson = new Set<string>();
  for (const entry of entries) {
    if (entry.pos !== "VERB" || !single(entry.lemma)) continue;
    if (entry.parts.PAST_1SG) pastNotThird.add(entry.parts.PAST_1SG.toLowerCase());
    for (const form of entry.extraForms ?? []) {
      if (/^IndIpf(Sg1|Sg2|Pl1|Pl2)$/.test(form.code)) pastNotThird.add(form.value.toLowerCase());
      if (/^(IndIpf|IndPr)(Sg3|Pl3)$/.test(form.code)) thirdPerson.add(form.value.toLowerCase());
    }
  }
  for (const [form, hits] of persons) if (hits.every((p) => !NOT_THIRD.has(p.code))) thirdPerson.add(form);
  const particles = new Set(PARTICLES);

  // Which headwords a spelling is a form of, for reading a case off a word.
  const entriesHolding = new Map<string, Set<string>>();
  for (const [lemma, forms] of lexicon.byLemma) for (const form of forms) (entriesHolding.get(form) ?? entriesHolding.set(form, new Set()).get(form)!).add(lemma);
  const clauseCount = clauses(text).length;

  const findings: Finding[] = [];
  let read = 0;
  const flagged = new Set<string>();

  for (const tokens of clauses(text)) {
    const lower = tokens.map((t) => t.low);
    read += tokens.length;

    // SPELLING.
    const unknown = new Set<number>();
    tokens.forEach((token, at) => {
      if (token.name || exact(token.low) || lexicon.forms.has(token.low)) return;
      const near = nearest(token.low, lexicon, preferred);
      // A capital at the start of a sentence may be a name too, unless it is plainly a slip of a word.
      if (!near && token.first && /^\p{Lu}/u.test(token.raw)) return;
      unknown.add(at);
      if (flagged.has(token.low)) return;
      flagged.add(token.low);
      // The learner's own capital is kept, so `Aitah` is offered `Aitäh`.
      const suggestion = near && /^\p{Lu}/u.test(token.raw) ? near.form.charAt(0).toLocaleUpperCase("et") + near.form.slice(1) : near?.form ?? null;
      findings.push({ kind: "spelling", word: token.raw, suggestion, diacritics: near?.diacritics ?? false });
    });
    const known = (at: number) => !unknown.has(at) && !tokens[at]!.name;

    // THE NEGATIVE.
    const afterNegator = new Set<number>();
    lower.forEach((word, at) => {
      if (word !== "ei" || at + 1 >= lower.length) return;
      afterNegator.add(at + 1);
      const next = lower[at + 1]!;
      if (!known(at + 1) || !isPerson(next)) return;
      const hit = persons.get(next)![0]!;
      const right = lexicon.persons.get(hit.lemma)?.get("IndPrPs_");
      if (right && right.toLowerCase() !== next) findings.push({ kind: "negative", word: tokens[at + 1]!.raw, right });
    });

    // PERSON, AND THE DICTIONARY FORM WHERE THE PERSON BELONGS.
    const subjectAt = lower.flatMap((word, at) => {
      const subject = subjects.get(word);
      if (!subject || tokens[at]!.name || (at > 0 && COMPARING.has(lower[at - 1]!))) return [];
      const next = lower[at + 1];
      return subject.sure || (next !== undefined && isPerson(next)) ? [at] : [];
    });
    const personAt = lower.flatMap((word, at) => (known(at) && isPerson(word) && !afterNegator.has(at) && !subjects.has(word) ? [at] : []));
    const subject = subjectAt.length === 1 ? subjects.get(lower[subjectAt[0]!]!)! : null;
    if (subject) {
      const s = subjectAt[0]!;
      if (personAt.length > 0) {
        const agrees = personAt.some((at) => persons.get(lower[at]!)!.some((p) => p.code === subject.code));
        if (!agrees) {
          const at = personAt[0]!;
          const lemma = persons.get(lower[at]!)![0]!.lemma;
          const right = lexicon.persons.get(lemma)?.get(subject.code);
          if (right && right.toLowerCase() !== lower[at]) {
            findings.push({ kind: "person", word: tokens[at]!.raw, subject: lower[s]!, right });
          }
        }
      } else if (!lower.some((w) => NEGATORS.has(w)) && s + 1 < lower.length && maInf.has(lower[s + 1]!)) {
        const right = lexicon.persons.get(maInf.get(lower[s + 1]!)!)?.get(subject.code);
        if (right) findings.push({ kind: "dictionaryForm", word: tokens[s + 1]!.raw, subject: lower[s]!, right });
      }
    }

    // THE WRONG INFINITIVE.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      const pairs: [number, number][] = [[at, at + 1], [at + 1, at]];
      for (const [finiteAt, infAt] of pairs) {
        const verb = daOnlyFinite.get(lower[finiteAt]!);
        const inf = maInf.get(lower[infAt]!);
        if (!verb || !inf || (DA_ONLY_EXEMPT[verb] ?? []).includes(inf)) continue;
        // `võib sadama hakata`: the ma-infinitive belongs to the verb after it.
        const after = lower[infAt + 1];
        if (finiteAt < infAt && after !== undefined && (daInf.has(after) || maInf.has(after))) continue;
        const right = daOf.get(inf);
        if (right && right !== lower[infAt]) {
          findings.push({ kind: "infinitive", word: tokens[infAt]!.raw, after: tokens[finiteAt]!.raw, right });
        }
      }
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
      // A name after it is an apposition, `lell Valduri`, which this cannot read.
      if (tokens[at + 1]?.name) return null;
      return entry;
    };
    const formOf = (entry: CheckEntry, key: "PARTITIVE" | "GENITIVE") => lexicon.caseForm.get(caseKeyFor(entry.lemma, key)) ?? null;
    const caught = new Set<number>();

    // COUNTED: a number above one, or a word of quantity, takes the partitive after it.
    for (let at = 0; at + 1 < lower.length; at += 1) {
      // `kui palju pilet maksab` asks a price; the ticket is what costs.
      if (!counting.has(lower[at]!) || (at > 0 && COMPARING.has(lower[at - 1]!))) continue;
      const noun = plainNoun(at + 1);
      const right = noun ? formOf(noun, "PARTITIVE") : null;
      if (!noun || !right) continue;
      caught.add(at + 1);
      findings.push({ kind: "count", word: tokens[at + 1]!.raw, after: tokens[at]!.raw, right });
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
    for (let at = 0; at + 1 < lower.length && !placed && (hasVerb || wholeAnswer); at += 1) {
      if (caught.has(at) || !GENITIVE_POSTPOSITIONS.has(lower[at + 1]!)) continue;
      const noun = plainNoun(at);
      const right = noun ? formOf(noun, "GENITIVE") : null;
      if (!noun || !right) continue;
      caught.add(at);
      findings.push({ kind: "postposition", word: tokens[at]!.raw, before: tokens[at + 1]!.raw, right });
    }

    // THE OBJECT IN THE PLAIN FORM.
    if (lower.some((w) => beForms.has(w))) continue;
    /*
      `osta` is the command and the da-infinitive both, so a spelling that is
      both reads as a command only where it opens its clause, after a `palun`
      at most: `Osta raamat!` is one and `Ma soovin raamatut osta` is not.
    */
    const commands = lower.some((w, at) => {
      if (!imperative.has(w) || isPerson(w) || (at > 0 && lower[at - 1] === "ei")) return false;
      return !daInf.has(w) || at === 0 || (at === 1 && lower[0] === "palun");
    });
    if (commands) continue;
    // Somebody else doing something in this clause may be what the plain-form noun is the subject of.
    if (lower.some((w, at) => known(at) && thirdPerson.has(w) && !nominal.has(w))) continue;
    const personal = (subject !== null && NOT_THIRD.has(subject.code))
      || personAt.some((at) => persons.get(lower[at]!)!.every((p) => NOT_THIRD.has(p.code)))
      || lower.some((w, at) => known(at) && pastNotThird.has(w) && !nominal.has(w));
    if (!personal) continue;
    const verbs = lower.flatMap((word, at) => {
      if (!known(at) || particles.has(word) || !verbOf.has(word)) return [];
      const objects = verbOf.get(word)!
        .map((lemma) => objectOf(byLemma.get(lemma)?.find((e) => e.pos === "VERB")?.government ?? null))
        .filter((o): o is { genitive: boolean } => o !== null);
      return [{ at, infinitive: maInf.has(word) || daInf.has(word), object: objects.length > 0, genitive: objects.some((o) => o.genitive) }];
    });
    if (verbs.length === 0) continue;
    /*
      An infinitive's object is the infinitive's: `soovin ... osta` takes what
      `ostma` takes. A verb that records an object leads, and where none does
      the finding says the word needs an ending without guessing which.
    */
    const withObject = verbs.filter((v) => v.object);
    const verb = withObject.find((v) => v.infinitive) ?? withObject[0] ?? verbs.find((v) => v.infinitive) ?? verbs[0]!;
    const negated = lower.some((w) => NEGATORS.has(w));
    for (let at = 0; at < lower.length; at += 1) {
      if (caught.has(at)) continue;
      const noun = plainNoun(at);
      if (!noun || isTime(noun.semanticTypes) || ADVERBIAL_NOUNS.has(noun.lemma)) continue;
      const before = lower[at - 1];
      const next = lower[at + 1];
      if (before !== undefined && (numberForms.has(before) || ASKING.has(before) || COMPARING.has(before))) continue;
      if (next !== undefined && numberForms.has(next)) continue;
      const partitive = verb.object ? formOf(noun, "PARTITIVE") : null;
      const genitive = verb.object && verb.genitive && !negated ? formOf(noun, "GENITIVE") : null;
      findings.push({ kind: "object", word: tokens[at]!.raw, verb: tokens[verb.at]!.raw, partitive, genitive });
      break;
    }
  }

  return { findings, words: read };
}
