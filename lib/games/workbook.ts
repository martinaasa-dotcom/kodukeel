import { plainPhrase } from "@/lib/copy/values";
import { lentFor, sentenceWords, type Example } from "@/lib/dict/examples";
import { isRefusedSentence } from "@/lib/dict/refused";
import { CASES, caseByKey } from "@/lib/estonian/cases";
import { buildCloze, mentions, naturalSentence } from "@/lib/estonian/cloze";
import { derivedVerbForms, pres1sgFrom } from "@/lib/estonian/conjugate";
import { gapForms } from "@/lib/estonian/gapForms";
import { stemsFrom } from "@/lib/estonian/derive";
import { caseFromMorphCode, morphCodeOf } from "@/lib/estonian/morph";
import { PRONOUN_LEMMAS, isPersonalPronoun } from "@/lib/estonian/pronouns";
import { tidyForm } from "@/lib/estonian/whichCase";
import { hintLadder, type Hint } from "@/lib/questions/hints";
import { CONJUGATION_SLOTS } from "@/lib/srs/slots";
import type { CaseKey } from "@/lib/estonian/types";
import { caseFits } from "@/lib/estonian/caseQuestion";
import { askableSlots, formIndex, markForm, subjectOf, type FlashMark, type FlashWord } from "./flash";
import { plainnessCost, type PlainReach } from "@/lib/dict/plainness";
import { differentText, formNearness, pickOptions } from "@/lib/questions/distractors";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";

/**
 * TÖÖVIHIK: A WORKBOOK PAGE, THE WAY A COURSE BOOK SETS ONE.
 *
 * Every Estonian course book is built out of the same exercise, and every
 * learner who has sat in a class in Tallinn has done hundreds of them as
 * homework: a numbered list of sentences, each with a word in brackets and a
 * line beside it, and the instruction to put the word into the form the
 * sentence needs. `Palun aita (mina) ____ põrand ära pesta!` The first line
 * is already filled in, in red, so you can see what is being asked. It is
 * the bread and butter of the language because it is the one exercise where
 * a learner has to *think*: read a whole sentence, work out what job the
 * missing word is doing in it, and produce the ending that job needs.
 *
 * Every other round in this app asks one thing at a time. This asks a page,
 * and the page has a subject, which is what makes it teach rather than test:
 * eight sentences all wanting the osastav, or the six personal pronouns
 * through every case, or one verb tense for whoever is doing it. A learner
 * meets the same ending eight times in eight different sentences and comes
 * out the other side knowing when it is used, which no flashcard can do.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS GENERATED (ADR-005). Every sentence
 * is one a lexicographer recorded, under this word or lent from another
 * (`lib/dict/borrow.ts`), and the exercise is that sentence with one of its
 * own words taken out, which is `buildCloze`'s standing and the cards'. Every
 * answer is a form the dictionary vouches for: a stored form, a case built on
 * the genitive stem, or a person built on the stored first person (ADR-005
 * amendment 1). The word in brackets is the headword. Every mark is a string
 * comparison against those forms, through `markForm`, which is the flash
 * round's own marker, so a slip and a wrong ending are told apart the same
 * way on both screens.
 *
 * WHAT A GAP MAY BE. The rules the card builder and the flash round already
 * keep, and one of the worksheet's: the spelling in the sentence has to be
 * claimed by exactly one slot of this word (`aadressi` is three cases and
 * names none), the gap may not leave another of its own answers standing in
 * the line, and the answer may not be the word in the brackets, since a gap
 * answered by copying its own cue is the third of the printable worksheet
 * that had to be thrown away.
 *
 * Pure: no React, no Prisma, no clock. The rows come from the page.
 */

/** The six themes a page can have, and the seventh that is all of them. */
export type Theme =
  | `case:${CaseKey}`
  | "pronouns"
  | "present"
  | "past"
  | "conditional"
  | "imperative"
  | "mixed";

export type Tense = "present" | "past" | "conditional" | "imperative";

export const TENSES: readonly Tense[] = ["present", "past", "conditional", "imperative"];

/** One line of a page: a recorded sentence with one word taken out. */
export interface SheetItem {
  /** Stable per word and slot, so a page can deduplicate without a counter. */
  id: string;
  lexemeId: string;
  /** The word in the brackets: the headword, as a dictionary prints it. */
  cue: string;
  /** Its English, for the line under the sentence. */
  translation: string;
  pos: string;
  /**
   * What was asked, in `Review.slot`'s vocabulary where there is one: a case
   * key, or a verb's morph code.
   */
  slot: string;
  kind: "case" | "verb";
  /** The case, where the line asks one. */
  caseKey: CaseKey | null;
  /** The tense and the person, where the line asks a verb. */
  tense: Tense | null;
  person: Person | null;
  /** Whether the word is one of the six personal pronouns. */
  pronoun: boolean;
  /** The sentence up to the gap. */
  before: string;
  /** The sentence after the gap. */
  after: string;
  /** The sentence whole, as it was recorded. */
  sentence: string;
  /** Its English, where the dictionary holds one. */
  sentenceEn: string | null;
  /** The spelling the sentence carries, which is the answer shown. */
  answer: string;
  /** Every spelling the marking lets through. */
  accepted: string[];
  /**
   * Every spelling of this word, to the slots that claim it, so a wrong answer
   * can be told what it *was*. See `formIndex` in `./flash`.
   */
  index: Record<string, string[]>;
  /** The themes this line can sit under. */
  themes: Theme[];
  /** The letters of the answer the second pass uncovers. See `secondChance`. */
  hint: Hint | null;
  /**
   * The forms offered to pick from, on a "pick the form" exercise, the answer
   * among them. Null on every other kind of page. See `choicesFor`.
   */
  choices: string[] | null;
  /**
   * The personal pronoun the bracket names beside the verb, where the
   * sentence does not say who is doing it. See `whoFor`. Null on every line
   * `linesFor` builds: whether the sentence names its subject is read against
   * the pronouns' own spellings, which the page holds and this word does not.
   */
  who: string | null;
}

/**
 * THREE KINDS OF EXERCISE, WHICH IS WHAT A COURSE BOOK'S PAGE IS MADE OF.
 *
 *   `write`, "Kirjutage õige vorm": the word in brackets, written in the form
 *   the sentence needs. The heart of every workbook and the default.
 *
 *   `choose`, "Valige õige vorm": the same line with three forms of the word
 *   under it, one of them right. Recognising the form before producing it is
 *   how a course book opens a new point, and it is where a beginner starts.
 *
 *   `box`, "Valige sobiv sõna": the brackets are gone and the words sit in a
 *   box over the page. Each line wants one of them, in the right form, so a
 *   learner has to read the sentence for what it means before they can choose
 *   its ending, which is the step between drilling a form and using one.
 *
 * All three are marked by the same comparison against forms the dictionary
 * vouches for (`markLine`), and grade the same cards the same way.
 */
export type ExerciseKind = "write" | "choose" | "box";

export interface Exercise {
  kind: ExerciseKind;
  theme: Theme;
  /**
   * The words in the box, shuffled, on a `box` exercise: every line's word
   * and the worked example's, which a course book prints crossed out. Null
   * on the other two kinds.
   */
  box: string[] | null;
  /** The worked example, filled in, as the first line of a course book is. */
  example: SheetItem | null;
  /** The lines to fill. */
  lines: SheetItem[];
}

export interface Sheet {
  exercises: Exercise[];
}

/** Who does it, for a verb line. English, because the sentence names the Estonian. */
export type Person = "I" | "you" | "he or she" | "we" | "you all" | "they";

/**
 * The person a verb code is in. `Ps` is how Ekilex spells the impersonal and
 * the conditional's shared third person, which the conjugation page reads as
 * the third person singular; the negative has no person and is never a line.
 */
const PERSON_OF: Readonly<Record<string, Person>> = {
  Sg1: "I", Sg2: "you", Sg3: "he or she", Pl1: "we", Pl2: "you all", Pl3: "they", Ps: "he or she",
};

/** The tense a finite verb code is in, by its opening. */
const TENSE_OF: readonly { opens: string; tense: Tense }[] = [
  { opens: "IndPr", tense: "present" },
  { opens: "IndIpf", tense: "past" },
  { opens: "KndPr", tense: "conditional" },
  { opens: "ImpPr", tense: "imperative" },
];

/**
 * A verb code as a tense and a person, or null for one that is not a line.
 *
 * The negative (`IndPrPs_`, `IndPrPsN`) is left out on purpose: its answer is
 * two words, `ei loe`, and a bracket holding `lugema` gives no reason to put
 * an `ei` in front of it, so the line would be a guess at the sentence rather
 * than a question about the verb.
 */
export function verbSlot(code: string): { tense: Tense; person: Person } | null {
  if (/^IndPrPs/.test(code)) return null;
  const tense = TENSE_OF.find((t) => code.startsWith(t.opens))?.tense;
  if (!tense) return null;
  const person = PERSON_OF[code.slice(TENSE_OF.find((t) => t.tense === tense)!.opens.length)];
  return person ? { tense, person } : null;
}

/*
  WHO IS DOING IT, WHERE THE SENTENCE DOES NOT SAY.

  Estonian drops the pronoun wherever the ending already says who: `Homme
  alustan dieeti` is "I'm starting a diet tomorrow" with no "I" in it. On a
  page that is a line with no right answer, because `alustan`, `alustame` and
  `alustad` all make a sentence, and only the English underneath says which;
  hide the English and the line is a guess. Course books meet this the same
  way every time: the person goes in the bracket beside the verb, `(mina,
  alustama)`. So does it here, read off the pronoun table rather than typed.

  The first and second persons only, and every command. A third person is
  nearly always named in the sentence (`Kontsert algab`, `Lapsed mängivad`),
  and where a noun is the subject no rule here can see it, so a cue there
  would sit beside a subject already in the line. A command never names its
  subject, and its two persons (`anna`, `andke`) are the singular you and the
  plural one, so it always carries the cue.
*/
const PERSON_ORDER: readonly Person[] = ["I", "you", "he or she", "we", "you all", "they"];

/**
 * The pronoun the bracket names beside a verb line, or null where the
 * sentence already says who, or the line is not a verb.
 *
 * `nominatives` is each personal pronoun's subject spellings as the
 * dictionary stores them (`mina` and `ma`), keyed on the headword, which the
 * page reads off the six entries. A spelling of the right pronoun anywhere in
 * the sentence settles the person, and the line needs no cue.
 */
export function whoFor(
  item: Pick<SheetItem, "kind" | "person" | "tense" | "sentence" | "before" | "after">,
  nominatives: ReadonlyMap<string, readonly string[]>,
): string | null {
  if (item.kind !== "verb" || !item.person) return null;
  const at = PERSON_ORDER.indexOf(item.person);
  const pronoun = at >= 0 ? PRONOUN_LEMMAS[at] ?? null : null;
  if (!pronoun) return null;
  if (item.tense === "imperative") return pronoun;
  if (item.person === "he or she" || item.person === "they") return null;
  const spellings = new Set([pronoun, ...(nominatives.get(pronoun) ?? [])].map((w) => w.toLocaleLowerCase("et")));
  const words = sentenceWords(`${item.before} ${item.after}`);
  return words.some((w) => spellings.has(w)) ? null : pronoun;
}

/** A case or a verb form this word can be asked in, with every right spelling of it. */
interface Slot {
  slot: string;
  kind: "case" | "verb";
  caseKey: CaseKey | null;
  accepted: string[];
}

/**
 * Every case and verb form this word can be asked in on a page.
 *
 * Three sources, one per kind of word, and none of them new:
 *
 *   a noun, an adjective or a pronoun that is not personal: the cases
 *   `askableSlots` already asks, which is the flash round's list and carries
 *   every refusal it learned (a case the word does not take, a form spelled
 *   like the headword or like a word in its gloss);
 *
 *   a personal pronoun: the forms the dictionary stores for it, case by case,
 *   long and short together (`minule`, `mulle`). The plural three, `meie`,
 *   `teie` and `nemad`, have no singular at all, so nothing built on a
 *   singular stem reaches them, and they are half of what a pronoun exercise
 *   is: `teilt`, `neile`, `meil`;
 *
 *   a verb: the stored forms and the persons the rule builds on the stored
 *   first person (`derivedVerbForms`, which `npm run audit:verbs` checked
 *   against Ekilex for every verb), every person rather than the three a card
 *   drills, since a page about the present tense is about all six.
 */
export function slotsFor(word: FlashWord): Slot[] {
  const lemma = tidyForm(word.lemma);
  const notCue = (s: Slot) => !s.accepted.some((a) => tidyForm(a) === lemma);

  if (word.pos === "VERB") {
    const byCode = new Map<string, string[]>();
    const add = (code: string | null | undefined, value: string) => {
      if (!code || !verbSlot(code)) return;
      const list = byCode.get(code) ?? [];
      if (!list.includes(value)) list.push(value);
      byCode.set(code, list);
    };
    for (const f of word.forms) {
      const code = morphCodeOf(f);
      const named = CONJUGATION_SLOTS.find((s) => s.formType === f.formType)?.code;
      add(named ?? code, f.value);
    }
    for (const d of derivedVerbForms({ lemma: word.lemma, pres1sg: pres1sgFrom(word.forms) ?? undefined })) {
      add(d.morphCode, d.value);
    }
    return [...byCode.entries()]
      .map(([code, accepted]) => ({ slot: code, kind: "verb" as const, caseKey: null, accepted }))
      .filter(notCue);
  }

  if (isPersonalPronoun(word.lemma)) {
    const byCase = new Map<CaseKey, string[]>();
    for (const f of word.forms) {
      const key = caseFromMorphCode(morphCodeOf(f));
      if (!key || key === "NOMINATIVE") continue;
      const list = byCase.get(key) ?? [];
      if (!list.includes(f.value)) list.push(f.value);
      byCase.set(key, list);
    }
    return [...byCase.entries()]
      .map(([key, accepted]) => ({ slot: key, kind: "case" as const, caseKey: key, accepted }))
      .filter(notCue);
  }

  /*
    AND THE GENITIVE AND THE PARTITIVE, WHICH THE FLASH ROUND NEVER ASKS.

    `askableSlots` asks the eleven cases built on the genitive stem and leaves
    the three stored ones alone, which is right for a round that asks one form
    with nothing around it. A page is different: the partitive is the case a
    course book drills more than any other, because it is the one an English
    speaker cannot reason their way to, and measured over the shipped
    dictionary the page had two words that could carry a partitive line. The
    sentence is what makes it askable here. A stored form is a line only where
    the spelling is that case and no other (`linesFor` holds every line to it),
    so `raamatut` is asked and `tuba`, which is its own nominative and its own
    partitive, never is.
  */
  const stems = stemsFrom(word.forms);
  const subject = subjectOf(word);
  const principal: Slot[] = (["GENITIVE", "PARTITIVE"] as const)
    .filter((key) => caseFits(key, subject))
    .flatMap((key) => {
      const value = key === "GENITIVE" ? stems.genSg : stems.partSg;
      return value ? [{ slot: key, kind: "case" as const, caseKey: key, accepted: [value] }] : [];
    });

  return [
    ...principal,
    ...askableSlots(word)
      .filter((s) => caseByKey(s.slot) !== undefined)
      .map((s) => ({ slot: s.slot, kind: "case" as const, caseKey: s.slot as CaseKey, accepted: [...s.accepted] })),
  ].filter(notCue);
}

/**
 * Every spelling of a word to the slots that claim it.
 *
 * `formIndex` for everything it reaches; for a personal pronoun it reads the
 * stored forms across both numbers, since the plural pronouns are stored as
 * `PlAll` and the like and a singular case index cannot see them. `tema` is
 * its own nominative and its own genitive, and so is `ta`, so neither can be
 * named, which is exactly the strict rule `readCase` keeps.
 */
export function indexFor(word: FlashWord): Record<string, string[]> {
  if (word.pos === "VERB" || !isPersonalPronoun(word.lemma)) {
    const base = formIndex(word);
    if (word.pos !== "VERB") return base;
    // The persons `formIndex` reaches through the rule, plus the stored codes
    // it does not name (the past third person, the polite imperative), so a
    // wrong person is named rather than marked as a stranger.
    const out: Record<string, string[]> = { ...base };
    for (const f of word.forms) {
      const code = morphCodeOf(f);
      if (!code || !/^(Ind|Knd|Imp)/.test(code)) continue;
      const form = tidyForm(f.value);
      if (!form) continue;
      const held = out[form] ?? [];
      if (!held.includes(code)) out[form] = [...held, code];
    }
    return out;
  }
  const out: Record<string, string[]> = {};
  for (const f of word.forms) {
    const key = caseFromMorphCode(morphCodeOf(f));
    const form = tidyForm(f.value);
    if (!key || !form) continue;
    const held = out[form] ?? [];
    if (!held.includes(key)) out[form] = [...held, key];
  }
  return out;
}

/** The longest sentence a line may be. A page is read, and a page of essays is not. */
export const MAX_LINE_CHARS = 110;

/**
 * Whether a sentence may be a line at all: a whole sentence (`naturalSentence`),
 * nobody's refusal, and short enough to read on a phone in one go.
 */
export function lineSentence(et: string): boolean {
  const text = et.trim();
  if (text.length < 12 || text.length > MAX_LINE_CHARS) return false;
  if (isRefusedSentence(text)) return false;
  return naturalSentence(text);
}

/**
 * The themes a line can sit under: its case and the mixed page for a case,
 * the pronoun page as well for a personal pronoun, and its tense for a verb.
 */
export function themesOf(item: Pick<SheetItem, "kind" | "caseKey" | "tense" | "pronoun">): Theme[] {
  const out: Theme[] = [];
  if (item.kind === "case" && item.caseKey) {
    if (item.pronoun) out.push("pronouns");
    out.push(`case:${item.caseKey}`);
  }
  if (item.kind === "verb" && item.tense) out.push(item.tense);
  out.push("mixed");
  return out;
}

/** What may be asked inside the module, and which sentences may be shown. */
export interface LineGates {
  /** `slotWithin`, for the slot and the word. */
  slotOk: (slot: string, lemma: string) => boolean;
  /** `sentenceWithin`, for a sentence of taught spellings. */
  sentenceOk: (sentence: string) => boolean;
  /** Which themes the learner's level may be asked at all. */
  themeOk: (theme: Theme) => boolean;
}

export const OPEN: LineGates = { slotOk: () => true, sentenceOk: () => true, themeOk: () => true };

/**
 * Every line this word can be on a page, one per slot, each cut from the
 * plainest recorded sentence that carries the slot's form and no other.
 *
 * `examples` is the word's own sentences first and the lent ones behind them,
 * which is the order a caller has already ranked them in, so the first
 * sentence that qualifies is the one to use. `used` is the sentences already
 * on the page, so one sentence is never two lines.
 */
export function linesFor(
  word: FlashWord, gates: LineGates = OPEN, used: ReadonlySet<string> = new Set(), quality: LineQuality | null = null,
): SheetItem[] {
  const index = indexFor(word);
  const pronoun = isPersonalPronoun(word.lemma);
  const stems = stemsFrom(word.forms);
  const sentences = workbookSentences(word.examples, gates, quality);
  if (sentences.length === 0) return [];
  // What a gap may hide is one answer for the whole app: a spelling outside
  // it is one nothing vouches for, so a line is never cut for it.
  const hideable = gapForms(word);

  const out: SheetItem[] = [];
  for (const slot of slotsFor(word)) {
    if (!gates.slotOk(slot.slot, word.lemma)) continue;
    const verb = slot.kind === "verb" ? verbSlot(slot.slot) : null;
    const item = lineFor(word, slot, sentences, index, used, hideable);
    if (!item) continue;
    const spec = slot.caseKey ? caseByKey(slot.caseKey) : undefined;
    const ladder = hintLadder({
      answer: item.answer,
      stems: [stems.genSg, pres1sgStem(word)].filter((s): s is string => !!s),
      suffix: spec?.suffix,
    });
    const base = {
      id: `${word.lexemeId}:${slot.slot}`,
      lexemeId: word.lexemeId,
      cue: plainPhrase(word.lemma, word.pos),
      translation: plainPhrase(word.translation, word.pos),
      pos: word.pos,
      slot: slot.slot,
      kind: slot.kind,
      caseKey: slot.caseKey,
      tense: verb?.tense ?? null,
      person: verb?.person ?? null,
      pronoun,
      ...item,
      accepted: slot.accepted,
      index,
      hint: ladder.find((h) => h.kind === "ending") ?? ladder.find((h) => h.kind === "start") ?? null,
      choices: null,
      who: null,
    };
    out.push({ ...base, themes: themesOf(base) });
  }
  return out;
}

/**
 * WHAT MAKES A RECORDED SENTENCE A GOOD WORKBOOK LINE, AS FAR AS A MACHINE CAN SAY.
 *
 * Ekilex records a usage to illustrate a word to somebody who already reads
 * Estonian, so what it holds is sometimes a noun phrase, sometimes an idiom,
 * and sometimes a sentence full of words from further up the dictionary. A
 * course book's lines are chosen; these are filtered, and this is the filter:
 *
 *   it has an English line, so the page can say what it means and the
 *   corrected page can hand it back understood;
 *   it has a finite verb in it, because a page of labels (`Laste joonistatud
 *   pildid.`) is a page of puzzles about grammar nobody can see;
 *   every word of it is one the dictionary knows, and at most one is above
 *   the learner's band (`withinReach`);
 *   and of the sentences left, the plainest at the learner's own band leads,
 *   by the cost `lib/dict/plainness.ts` already puts on a sentence for a
 *   beginner's first meeting: a word nobody can look up costs most, then a
 *   missing verb, then a word above the band, then a clause.
 *
 * What it cannot judge is whether a native speaker would set the sentence as
 * an exercise, which is the person's reading: `npm run audit:workbook` prints
 * the lines a band can deal for that reading, and a sentence somebody refuses
 * goes in `lib/dict/refused.ts`, which every line already asks.
 */
export interface LineQuality {
  reach: PlainReach;
  /** The learner's band, as a `LEVELS` index: a word above it costs more. */
  limit: number;
}

/**
 * AT MOST ONE WORD THE LEARNER HAS NOT REACHED, AND NONE NOBODY CAN LOOK UP.
 *
 * Every word of the sentence has to be one the dictionary places at some band,
 * which keeps out the names and the rare words a learner cannot even look up,
 * and at most one may sit above the learner's own band. One is a word to meet
 * with the English underneath; two is a sentence read for its vocabulary
 * rather than for its ending. Measured over the shipped dictionary, this still
 * leaves 354 A1 words and 763 A2 words with a line, where the strict rule of
 * none above the band left 234 and 594.
 */
export function withinReach(sentence: string, quality: LineQuality): boolean {
  let above = 0;
  for (const word of sentenceWords(sentence)) {
    const band = quality.reach.bandOf.get(word);
    if (band === undefined) return false;
    if (band > quality.limit && ++above > 1) return false;
  }
  return true;
}

/** The sentences a word's lines may be cut from, best first. */
export function workbookSentences(
  examples: readonly Example[], gates: LineGates, quality: LineQuality | null,
): Example[] {
  const kept = examples.filter((e) => lineSentence(e.et) && !!e.en && gates.sentenceOk(e.et));
  if (!quality) return kept;
  const finite = (et: string) => sentenceWords(et).some((w) => quality.reach.finite.has(w));
  return kept
    .filter((e) => finite(e.et) && withinReach(e.et, quality))
    .map((e, i) => ({ e, i, cost: plainnessCost(e.et, quality.reach, quality.limit) }))
    // The order the caller gave settles a tie, which keeps a word's own sentences ahead of lent ones.
    .sort((a, b) => a.cost - b.cost || a.i - b.i)
    .map(({ e }) => e);
}

/** The stem a verb's present persons are built on, so the hint can name an ending. */
function pres1sgStem(word: FlashWord): string | null {
  if (word.pos !== "VERB") return null;
  const first = pres1sgFrom(word.forms);
  return first && first.endsWith("n") ? first.slice(0, -1) : null;
}

/**
 * The words a negated verb stands after. `ei loe` is the plain negative and
 * `ei küsi ega hoiata` the second half of a "neither, nor": in both the verb
 * is the stem the negative stands on, which is spelled like the singular
 * command, and a line tagging it as the command teaches the wrong form.
 */
const NEGATORS: ReadonlySet<string> = new Set(["ei", "ega"]);

/** The forms of `olema` a participle is said with, each one the dictionary holds for it (asserted). */
export const OLEMA: ReadonlySet<string> = new Set(["olen", "oled", "on", "oleme", "olete", "olin", "oli", "olnud", "pole"]);

/**
 * The words of the gap's own clause, before it and after it. A clause ends at
 * a comma, a semicolon, a colon, a dash or a stop, and at the conjunctions
 * that start another one, which is coarse and is only asked to refuse.
 */
const CLAUSE_WORDS: ReadonlySet<string> = new Set(["ja", "ning", "aga", "kuid", "sest", "et", "kui", "ega", "või"]);
function clauseAround(before: string, after: string): [string[], string[]] {
  const ahead = before.split(/[,;:\u2013\u2014.!?]/).at(-1) ?? "";
  const behind = after.split(/[,;:\u2013\u2014.!?]/)[0] ?? "";
  const back = sentenceWords(ahead);
  const cut = back.map((w, i) => (CLAUSE_WORDS.has(w) ? i : -1)).filter((i) => i >= 0).at(-1);
  const forward = sentenceWords(behind);
  const stop = forward.findIndex((w) => CLAUSE_WORDS.has(w));
  // The conjunction itself stays with the clause it opens, so `ega` before the gap is still read.
  return [cut === undefined ? back : back.slice(cut), stop < 0 ? forward : forward.slice(0, stop)];
}

/*
  GAPS THE SPELLING ALONE CANNOT SETTLE, READ OFF THE SENTENCE.

  All three were found by a reader going through every line the audit deals
  (`npm run audit:workbook`), and each is a real word in the gap that is not
  the form the line says it is, so a learner who answers it right has learned
  the wrong rule.

  A capital past the start of the sentence is a name: `Maia ja Andrus on
  pruut ja peigmees` was cut as the inessive of `andur`, a sensor, and `Oleme
  Anniga kälid` as the comitative of `and`, a gift. A name is nobody's case
  form, so a capitalised gap anywhere but the first word is refused.

  And a verb's command and its da-infinitive are one spelling for every verb
  whose stem ends that way (`mõista`, `pista`): `Ainult minevikku tundes võib
  mõista olevikku` holds the infinitive after `võib`, and telling the two
  apart is a parse this module does not have. Where the gap's spelling is the
  word's own infinitive, the line is refused rather than guessed.

  A second reading of every line the module and Practice deal found two more of
  the same shape, both read off the gap's own clause (`clauseAround`). A verb
  with `ei` or `ega` anywhere ahead of it in its clause is never the command,
  where the first rule only looked at the word right before the gap. And a
  third person plural in `-vad` beside a form of `olema` is the participle
  describing a noun: `Inimesed on mõtlevad olendid`. Measured over the lines
  read, both fire only on lines a reader had already refused.
*/
function plainTarget(word: FlashWord, slot: Slot, answer: string, before: string, after: string): boolean {
  const first = answer.trim()[0];
  if (first && first !== first.toLocaleLowerCase("et") && /\p{L}/u.test(before)) return false;
  if (slot.kind !== "verb") return true;
  const [ahead, behind] = clauseAround(before, after);
  // A command never has a negator in front of it in its own clause: `Ega hunt
  // hunti murra` and `Ma ei muutnud kõnni rütmi` are the negative and a noun.
  if (slot.slot.startsWith("ImpPr") && ahead.some((w) => NEGATORS.has(w))) return false;
  // `Karjuvad lapsed on sageli andekad`: beside a form of olema in its own
  // clause, a word in -vad is the participle describing a noun, not the verb.
  if (slot.slot === "IndPrPl3" && [...ahead, ...behind].some((w) => OLEMA.has(w))) return false;
  const spelled = tidyForm(answer);
  return !word.forms.some((f) => {
    const code = morphCodeOf(f);
    const infinitive = f.formType === "INF_DA" || f.formType === "INF_MA" || code === "Inf" || code === "Sup";
    return infinitive && tidyForm(f.value) === spelled;
  });
}

/** The sentence a slot is asked out of, or nothing. */
function lineFor(
  word: FlashWord, slot: Slot, sentences: readonly Example[], index: Record<string, string[]>,
  used: ReadonlySet<string>, hideable: ReadonlyMap<string, unknown>,
): Pick<SheetItem, "before" | "after" | "sentence" | "sentenceEn" | "answer"> | null {
  const accepted = new Set(slot.accepted.map(tidyForm));
  for (const example of sentences) {
    if (used.has(example.et)) continue;
    const words = sentenceWords(example.et);
    const spelling = slot.accepted.find((form) =>
      words.includes(form.toLocaleLowerCase("et")) && hideable.has(form.trim().toLowerCase()));
    if (!spelling) continue;
    // A loan only on the spelling it was lent for (`Example.via`).
    if (!lentFor(example, spelling)) continue;
    const cloze = buildCloze(example.et, [spelling]);
    if (!cloze) continue;

    /*
      EXACTLY ONE SLOT CLAIMS THE SPELLING, READ IN THIS SENTENCE.

      `loe` is the singular command and the stem the negative stands on, and
      the sentence settles which: the negative has an `ei` in front of it and
      the command does not. So the negative's claim is dropped wherever the
      word before the gap is not `ei`, which is the one place a sentence can
      decide between two slots without being parsed, and everything else
      keeps the strict rule.
    */
    const before = cloze.full.slice(0, cloze.index);
    const prior = sentenceWords(before).at(-1);
    const negated = prior !== undefined && NEGATORS.has(prior);
    const claims = (index[tidyForm(cloze.answer)] ?? [])
      .filter((code) => !(code.startsWith("IndPrPs") && !negated));
    if (claims.length !== 1 || claims[0] !== slot.slot) continue;
    if (negated && slot.kind === "verb") continue;
    if (!plainTarget(word, slot, cloze.answer, before, cloze.full.slice(cloze.index + cloze.answer.length))) continue;

    // And the gap may not leave another of its own answers standing.
    const blanked = cloze.text;
    if ([...accepted].some((form) => form !== tidyForm(cloze.answer) && mentions(blanked, form))) continue;
    /*
      NOR ANY OTHER FORM OF THE SAME WORD. `Nii (arvama) ____ mina, teised ei
      pea ju nii arvama.` is a real sentence and a poor line: the word is
      printed beside its own gap, so the line reads as a repetition and hands
      over the stem. One form of the word to a sentence, which is how a course
      book's lines are written.
    */
    const answerForm = tidyForm(cloze.answer);
    const ownForms = new Set([tidyForm(word.lemma), ...Object.keys(index)]);
    ownForms.delete(answerForm);
    if (sentenceWords(blanked).some((w) => ownForms.has(tidyForm(w)))) continue;

    return {
      before,
      after: cloze.full.slice(cloze.index + cloze.answer.length),
      sentence: cloze.full,
      sentenceEn: example.en ?? null,
      answer: cloze.answer,
    };
  }
  return null;
}

/** How many lines a theme has to offer before it may head an exercise: three and the example. */
export const MIN_LINES = 3;

export interface ExercisePlan {
  /** Lines to fill, not counting the worked example. */
  lines: number;
  /** Which kind of exercise. `write` unless said. */
  kind?: ExerciseKind;
}

/**
 * The page: one exercise per plan, each under the first theme in `prefer`
 * that has enough lines left and a theme no earlier exercise took.
 *
 * `items` arrive in the order the words are worth asking, which is the
 * caller's judgement (due and lapsing first, or tonight's words first inside
 * the module). A line is taken in that order with two rules on top: one line
 * per word in an exercise, so a page about the osastav is eight words in it
 * rather than one word eight times, and on a mixed page no two lines running
 * in the same slot, so the page moves between endings the way a review does.
 * The worked example is the plainest line the theme has, which is the
 * shortest sentence: a model to read, not a question.
 */
export function composeSheet(
  items: readonly SheetItem[], prefer: readonly Theme[], plans: readonly ExercisePlan[], urgent = prefer.length,
): Sheet {
  const taken = new Set<string>();
  /*
    A word sits on one page of a sitting. Two pages are two themes, and a word
    on both was graded twice in one sitting on the one card it has, which tells
    the scheduler the same thing twice; and a learner who wrote `arvan` on the
    first page and met `arvas` on the second had less of a second page.
  */
  const usedWords = new Set<string>();
  const usedSentences = new Set<string>();
  const usedThemes = new Set<Theme>();
  const exercises: Exercise[] = [];

  for (const plan of plans) {
    const kind = plan.kind ?? "write";
    const free = items
      .filter((i) => !taken.has(i.id) && !usedWords.has(i.lexemeId) && !usedSentences.has(i.sentence))
      .flatMap((i) => (kind === "choose" ? withChoices(i) : [i]));
    const fits = (t: Theme) => !usedThemes.has(t) && !(kind === "box" && t === "pronouns")
      && available(free.filter((i) => i.themes.includes(t)), t, kind) >= MIN_LINES + 1;
    /*
      A THEME THAT LEADS FOR WHO THE LEARNER IS IS TAKEN EVEN SHORT; ONE
      TAKING ITS TURN IS TAKEN FULL WHERE ANOTHER CAN BE. The first `urgent`
      themes are what was asked for, tonight's case and the weakest, and a page
      of five lines on the case somebody keeps getting wrong is worth more than
      eight on one they do not. The rest are only taking their turn, so the
      first of them that can fill the whole exercise goes ahead of one that
      cannot, and a short one is used only where nothing fills.
    */
    const full = (t: Theme) => fits(t)
      && available(free.filter((i) => i.themes.includes(t)), t, kind) >= plan.lines + 1;
    const onTurn = prefer.slice(urgent);
    const candidates = [
      ...prefer.slice(0, urgent).filter(fits),
      ...onTurn.filter(full),
      ...onTurn.filter((t) => fits(t) && !full(t)),
    ];
    /*
      AND A THEME THAT CANNOT BE PICKED IS PASSED OVER, NOT THE EXERCISE. A
      theme can count four words and still give fewer lines, because two words
      can share a sentence and a sentence is one line; measured over the shipped
      dictionary that skipped the whole exercise, and one B2 sitting in four
      hundred came out a page with nothing on it.
    */
    let theme: Theme | null = null;
    let lines: SheetItem[] = [];
    for (const t of candidates) {
      const picked = pick(free.filter((i) => i.themes.includes(t)), plan.lines + 1, t === "mixed", t === "pronouns", kind === "box");
      if (picked.length >= MIN_LINES + 1) { theme = t; lines = picked; break; }
    }
    if (!theme) continue;
    const example = [...lines].sort((a, b) => a.sentence.length - b.sentence.length)[0]!;
    const rest = lines.filter((l) => l !== example);
    for (const l of lines) { taken.add(l.id); usedWords.add(l.lexemeId); usedSentences.add(l.sentence); }
    usedThemes.add(theme);
    const box = kind === "box"
      ? shuffle(lines.map((l) => l.cue), rng(seedFrom(lines.map((l) => l.id).join("|"))))
      : null;
    exercises.push({ kind, theme, box, example, lines: rest });
  }
  return { exercises };
}

/** A line with its options set, or nothing where three honest options cannot be found. */
function withChoices(item: SheetItem): SheetItem[] {
  const choices = choicesFor(item);
  return choices ? [{ ...item, choices }] : [];
}

/*
  THE TWO OBJECT CASES ARE NEVER OFFERED AGAINST EACH OTHER. Whether an object
  is in the omastav or the osastav turns on whether the action is finished,
  and a sentence often reads both ways: `Ma lugesin raamatu` and `Ma lugesin
  raamatut` are both Estonian. Typed, the learner wrote one and the marker
  names which; offered, the other one would sit there as a wrong answer that
  is not wrong.
*/
const OBJECT_PAIR: Readonly<Record<string, string>> = { GENITIVE: "PARTITIVE", PARTITIVE: "GENITIVE" };

/**
 * Three forms of the line's word to pick from, the answer among them, or null.
 *
 * The wrong ones are this word's own other forms, ranked by `formNearness`,
 * which is the mock exam's and the quest's ranking: `toast` and `toale`
 * against `toas`, `loeb` and `lugesin` against `loen`. The word as the
 * bracket prints it is a candidate too, since writing it unchanged is the
 * commonest mistake on a page like this. Nothing is written: every option is
 * a spelling the word's own forms hold. Seeded on the line, so a reload
 * offers the same three in the same order.
 */
export function choicesFor(item: SheetItem): string[] | null {
  const barred = new Set([item.answer, ...item.accepted].map(tidyForm));
  const partner = OBJECT_PAIR[item.slot];
  const seen = new Set<string>();
  const pool: { text: string }[] = [];
  for (const form of [...Object.keys(item.index), tidyForm(item.cue)]) {
    if (!form || /\s/.test(form) || barred.has(form) || seen.has(form)) continue;
    if (partner && (item.index[form] ?? []).includes(partner)) continue;
    seen.add(form);
    pool.push({ text: form });
  }
  const picked = pickOptions({
    answer: { text: tidyForm(item.answer) },
    candidates: pool,
    rng: rng(seedFrom(`${item.id}|${item.sentence}`)),
    distinct: differentText,
    nearness: formNearness,
    count: 3,
  });
  if (!picked) return null;
  // A line that opens on its gap writes the answer with a capital, so every option does.
  const capital = item.answer.charAt(0) !== item.answer.charAt(0).toLocaleLowerCase("et");
  return picked.options.map((o) => (o === tidyForm(item.answer) ? item.answer : capital ? o.charAt(0).toLocaleUpperCase("et") + o.slice(1) : o));
}

/**
 * On a box page: the other word in the box the learner wrote a form of, or
 * null. A form of the wrong word is a different mistake from the wrong form of
 * the right one, and it is said differently: the sentence was read for the
 * wrong meaning, not put in the wrong case.
 */
export function otherWordIn(written: string, item: SheetItem, lines: readonly SheetItem[]): string | null {
  const form = tidyForm(written);
  if (!form) return null;
  for (const other of lines) {
    if (other.lexemeId === item.lexemeId) continue;
    if (tidyForm(other.cue) === form || other.index[form] || other.accepted.some((a) => tidyForm(a) === form)) return other.cue;
  }
  return null;
}

/** Whether `items` can fill an exercise of `lines` lines and its example on `theme`. */
export function canFill(items: readonly SheetItem[], theme: Theme, lines: number, kind: ExerciseKind = "write"): boolean {
  return available(items.filter((i) => i.themes.includes(theme)), theme, kind) >= lines + 1;
}

/**
 * How many lines a theme could set. One per word, except on the pronoun page:
 * there are six personal pronouns and the page is about putting them through
 * their cases, which is what every course book's pronoun exercise does
 * (`mina` five times on one page, in five cases), so there a line is one per
 * pronoun and case.
 */
function available(items: readonly SheetItem[], theme: Theme, kind: ExerciseKind = "write"): number {
  if (kind === "box") return new Set(items.map((i) => tidyForm(i.cue))).size;
  return new Set(items.map((i) => (theme === "pronouns" ? i.id : i.lexemeId))).size;
}

/**
 * Up to `n` lines, one per word (one per word and case on the pronoun page),
 * spreading the slots where the page is mixed, and never the same word twice
 * running where another is left.
 */
function pick(pool: readonly SheetItem[], n: number, spread: boolean, byCase = false, byCue = false): SheetItem[] {
  const out: SheetItem[] = [];
  const keys = new Set<string>();
  const sentences = new Set<string>();
  // A box prints each word once, so two entries spelled alike (`hall`, frost and grey) are one word there.
  const keyOf = (i: SheetItem) => (byCue ? tidyForm(i.cue) : byCase ? i.id : i.lexemeId);
  const ok = (i: SheetItem) => !keys.has(keyOf(i)) && !sentences.has(i.sentence);
  const take = (i: SheetItem) => { out.push(i); keys.add(keyOf(i)); sentences.add(i.sentence); };
  while (out.length < n) {
    const last = out.at(-1);
    const next = (spread && pool.find((i) => ok(i) && i.slot !== last?.slot))
      || (byCase && pool.find((i) => ok(i) && i.lexemeId !== last?.lexemeId))
      || pool.find(ok);
    if (!next) break;
    take(next);
  }
  return out;
}

/**
 * The themes worth offering, in the order the page should try them.
 *
 * The caller says what it knows about the learner and this decides the order,
 * so the judgement is in one place and unit tested:
 *
 *   asked for by name (a theme chip pressed on the last page) first;
 *   tonight's case, inside the module, since an evening that read the
 *   elative practises the elative;
 *   the learner's weakest cases off their own review log, weakest first,
 *   which is `caseAccuracy`'s order;
 *   then the rest of what a course book drills: the personal pronouns, the
 *   four verb themes and every other case, in turn (`turn`, below);
 *   and the mixed page last of all, which always has something.
 *
 * `themeOk` is the level's say: nothing about a case at A1, where the course
 * asks for none (`lib/course/plan.ts`).
 *
 * THE REST TAKES ITS TURN, BECAUSE A FIXED ORDER IS THE SAME PAGE FOR EVER.
 * With the pronouns and the present at the head of the rest, every sitting by
 * a learner whose cases were all doing well was the pronoun page and then the
 * present tense, on every "Another page" and every day: measured over the
 * shipped dictionary, the present on 84 percent of B2 sittings and the
 * pronouns on half, and at A1 the present and then the past on every one.
 * `turn` rotates where the rest starts, so a day and a second page each start
 * somewhere new, and the things a learner most needs (what they asked for,
 * tonight's case, their weakest) still lead whatever the turn.
 */
export function preferredThemes(input: {
  requested?: Theme | null;
  tonight?: string | null;
  weakest?: readonly string[];
  themeOk?: (theme: Theme) => boolean;
  /** Where the rest starts: the page's round and the learner's day. 0 is the course book's own order. */
  turn?: number;
  /** Whether the learner's words can fill a whole page on a theme; see `themeOrder`. */
  fills?: (theme: Theme) => boolean;
}): Theme[] {
  return themeOrder(input).themes;
}

/**
 * The same order, with how many of its themes lead because of who the learner
 * is rather than because it is their turn. A page needs the second half: a
 * weakest case is worth a short page, and a theme that is only taking its turn
 * is not when another could fill the page (`composeSheet`'s `urgent`).
 */
export function themeOrder(input: {
  requested?: Theme | null;
  tonight?: string | null;
  weakest?: readonly string[];
  themeOk?: (theme: Theme) => boolean;
  turn?: number;
  /**
   * Whether this learner's words can fill a whole page on a theme. The turn
   * walks those alone, and the rest follow it: walked over all of them, the
   * themes few words can fill were passed over every time their turn came,
   * so the next fillable one took every one of their turns and the comitative
   * led a third of A2 sittings.
   */
  fills?: (theme: Theme) => boolean;
}): { themes: Theme[]; urgent: number } {
  const ok = input.themeOk ?? (() => true);
  const out: Theme[] = [];
  const push = (t: Theme | null | undefined) => { if (t && ok(t) && !out.includes(t)) out.push(t); };
  push(input.requested ?? null);
  if (input.tonight && caseByKey(input.tonight)) push(`case:${input.tonight}` as Theme);
  for (const key of input.weakest ?? []) if (caseByKey(key)) push(`case:${key}` as Theme);
  const urgent = out.length;
  const rest: Theme[] = ["pronouns", ...TENSES];
  for (const c of CASES) if (!c.principal || c.key === "PARTITIVE" || c.key === "GENITIVE") rest.push(`case:${c.key}`);
  const fills = input.fills ?? (() => true);
  const open = rest.filter((t) => ok(t) && !out.includes(t) && fills(t));
  const turn = Math.abs(Math.trunc(input.turn ?? 0));
  const start = open.length ? turn % open.length : 0;
  for (const t of [...open.slice(start), ...open.slice(0, start)]) push(t);
  for (const t of rest) push(t);
  push("mixed");
  return { themes: out, urgent };
}

/** A theme from a query string, or null for anything that is not one. */
export function parseTheme(raw: string | null | undefined): Theme | null {
  if (!raw) return null;
  if (raw === "pronouns" || raw === "mixed" || (TENSES as readonly string[]).includes(raw)) return raw as Theme;
  const key = raw.startsWith("case:") ? raw.slice(5) : "";
  return key && caseByKey(key) ? (`case:${key}` as Theme) : null;
}

/** The case a theme is about, or null. */
export function themeCase(theme: Theme): CaseKey | null {
  return theme.startsWith("case:") ? (theme.slice(5) as CaseKey) : null;
}

/* ------------------------------------------------------------------------ */
/* Marking                                                                   */
/* ------------------------------------------------------------------------ */

/** What happened to one line, over both passes. */
export type Outcome =
  /** Right on the first go. */
  | "right"
  /** Right on the first go with a slip of the hand: a dropped õ, one letter. */
  | "slip"
  /** Right on the second go, with the ending uncovered. */
  | "second"
  /** Not right after the second go; the answer was shown. */
  | "missed";

/**
 * What each outcome tells the scheduler (ADR-016).
 *
 * Never Easy: a page is the harder pass, not a victory lap. A slip is Hard,
 * which is what `markForm` already rates it. A line right only once its
 * ending was uncovered is Hard too, because the hint is paid for in exactly
 * the currency `lib/questions/hints.ts` charges everywhere else: the word
 * comes back sooner. A line missed twice is Again.
 */
export const OUTCOME_RATING: Readonly<Record<Outcome, 1 | 2 | 3>> = {
  right: 3, slip: 2, second: 2, missed: 1,
};

/** One line, marked. */
export interface LineMark {
  right: boolean;
  /** Right, but with a slip worth naming. */
  slip: boolean;
  /** The slot the learner's spelling is, where exactly one slot claims it and it is not the one asked. */
  reached: string | null;
  /** What to say, as a key and its values, so a screen can say it in the reader's language. */
  note: LineNote;
}

export type LineNote =
  | { kind: "none" }
  | { kind: "blank" }
  | { kind: "checker"; text: string }
  | { kind: "otherCase"; got: CaseKey; wanted: CaseKey }
  | { kind: "otherPerson"; got: Person; wanted: Person }
  | { kind: "otherTense"; got: Tense; wanted: Tense }
  /** The word copied out of the bracket as it stands, which is the commonest slip on any page like this. */
  | { kind: "unchanged" }
  /** On a box page: a form of another word in the box. */
  | { kind: "otherWord"; word: string }
  | { kind: "wrong" };

/**
 * One line, marked against the dictionary.
 *
 * `markForm` decides, which is the flash round's marker: it asks the word's
 * own forms before the typo rule, so `toast` written for `toas` is the
 * seestütlev rather than a slip of the hand. What this adds is the note in a
 * shape a screen can translate, and the person and the tense of a verb named
 * in English, since `toas` and `loeb` are both "another form of the word"
 * and only one of those sentences is about a case.
 */
export function markLine(item: SheetItem, typed: string): LineMark {
  const written = typed.trim();
  if (!written) return { right: false, slip: false, reached: null, note: { kind: "blank" } };
  // The answer as the sentence spells it leads, so a capital at the front of
  // the line is no reason to mark anybody wrong (`Mul on külm.` typed `mul`).
  const accepted = [item.answer, ...item.accepted.filter((a) => tidyForm(a) !== tidyForm(item.answer))];
  const mark: FlashMark = markForm({ accepted, slot: item.slot, label: item.slot, index: item.index }, written);
  if (mark.right) {
    return {
      right: true,
      slip: mark.rating < 3,
      reached: null,
      note: mark.rating < 3 && mark.note ? { kind: "checker", text: mark.note } : { kind: "none" },
    };
  }
  /*
    THE BRACKET COPIED OUT. Writing the word as it stands is the first thing a
    learner does when they have not yet seen that the line wants it changed,
    and for a verb `markForm` has nothing to call it, since the infinitive is
    no person. So it is named for what it is, ahead of any other reading: for
    a noun "that's the nimetav" is true and less use than this.
  */
  if (tidyForm(written) === tidyForm(item.cue)) {
    return { right: false, slip: false, reached: null, note: { kind: "unchanged" } };
  }
  const got = mark.wroteSlot;
  if (got && got !== item.slot) {
    const gotCase = caseByKey(got);
    if (gotCase && item.caseKey) {
      return { right: false, slip: false, reached: got, note: { kind: "otherCase", got: gotCase.key, wanted: item.caseKey } };
    }
    const gotVerb = verbSlot(got);
    if (gotVerb && item.tense && item.person) {
      return {
        right: false, slip: false, reached: got,
        note: gotVerb.tense === item.tense
          ? { kind: "otherPerson", got: gotVerb.person, wanted: item.person }
          : { kind: "otherTense", got: gotVerb.tense, wanted: item.tense },
      };
    }
  }
  /*
    A MISS SAYS NOTHING ABOUT THE ANSWER. `markForm`'s note for a plain miss
    is "Not quite, it's toas", which is right on a round that moves on and
    wrong on a page that hands the line back for a second go: the answer
    printed under the box is the second go answered for the learner. The
    answer is shown once the second pass is over, by the screen.
  */
  return { right: false, slip: false, reached: null, note: { kind: "wrong" } };
}

/**
 * The card a line grades, among the learner's cards for its word.
 *
 * The card about this very slot where the learner has one, so its own
 * scheduling moves with the answer; otherwise the card that comes closest to
 * being about producing a form of the word, in the flash round's order. Null
 * where the learner holds no card for the word, and then the line writes
 * nothing, which is what every round does with a word it did not deal from
 * the deck (ADR-016).
 */
export function cardForLine(
  cards: readonly { id: string; cardType: string; targetCase: string | null; slot?: string | null }[],
  slot: string,
): string | null {
  const exact = cards.find((c) => (c.targetCase ?? c.slot ?? c.cardType) === slot);
  if (exact) return exact.id;
  for (const type of ["CASE_FORM", "CONJUGATION", "CLOZE", "PRODUCTION", "RECOGNITION"]) {
    const card = cards.find((c) => c.cardType === type);
    if (card) return card.id;
  }
  return cards[0]?.id ?? null;
}

/**
 * Where a line stands after a pass, given what it was before.
 *
 * The first pass settles a line that is right or slipped; anything else opens
 * again for a second go with its ending uncovered. The second pass settles
 * everything: right then is `second`, and not right is `missed`.
 */
export function outcomeAfter(pass: 1 | 2, mark: LineMark): Outcome | null {
  if (mark.right) return pass === 1 ? (mark.slip ? "slip" : "right") : "second";
  return pass === 1 ? null : "missed";
}

/**
 * The reading of a finished page: how many lines, how many right first time,
 * and the slot confusion that came back most often, where one came back twice.
 * That last is what the finish screen leads with, because a page that went
 * wrong in one direction is worth one sentence more than a score.
 */
export function pageReading(
  items: readonly { slot: string; outcome: Outcome; reached: string | null }[],
): { total: number; firstTime: number; settled: number; confusion: { got: string; wanted: string; times: number } | null } {
  const total = items.length;
  const firstTime = items.filter((i) => i.outcome === "right" || i.outcome === "slip").length;
  const settled = items.filter((i) => i.outcome !== "missed").length;
  const pairs = new Map<string, { got: string; wanted: string; times: number }>();
  for (const i of items) {
    if (!i.reached) continue;
    const key = `${i.reached}>${i.slot}`;
    const held = pairs.get(key) ?? { got: i.reached, wanted: i.slot, times: 0 };
    held.times += 1;
    pairs.set(key, held);
  }
  const confusion = [...pairs.values()].sort((a, b) => b.times - a.times || a.got.localeCompare(b.got))[0] ?? null;
  return { total, firstTime, settled, confusion: confusion && confusion.times >= 2 ? confusion : null };
}
