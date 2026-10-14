import { plainPhrase } from "@/lib/copy/values";
import { lentFor, sentenceWords, type Example } from "@/lib/dict/examples";
import { isRefusedSentence } from "@/lib/dict/refused";
import { CASES, caseByKey } from "@/lib/estonian/cases";
import { buildCloze, mentions, naturalSentence } from "@/lib/estonian/cloze";
import { derivedVerbForms, pres1sgFrom } from "@/lib/estonian/conjugate";
import { gapForms } from "@/lib/estonian/gapForms";
import { stemsFrom } from "@/lib/estonian/derive";
import { caseFromMorphCode, morphCodeOf } from "@/lib/estonian/morph";
import { isPersonalPronoun } from "@/lib/estonian/pronouns";
import { tidyForm } from "@/lib/estonian/whichCase";
import { hintLadder, type Hint } from "@/lib/questions/hints";
import { CONJUGATION_SLOTS } from "@/lib/srs/slots";
import type { CaseKey } from "@/lib/estonian/types";
import { caseFits } from "@/lib/estonian/caseQuestion";
import { askableSlots, formIndex, markForm, subjectOf, type FlashMark, type FlashWord } from "./flash";

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
}

export interface Exercise {
  theme: Theme;
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
export function linesFor(word: FlashWord, gates: LineGates = OPEN, used: ReadonlySet<string> = new Set()): SheetItem[] {
  const index = indexFor(word);
  const pronoun = isPersonalPronoun(word.lemma);
  const stems = stemsFrom(word.forms);
  const sentences = word.examples.filter((e) => lineSentence(e.et) && gates.sentenceOk(e.et));
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
    };
    out.push({ ...base, themes: themesOf(base) });
  }
  return out;
}

/** The stem a verb's present persons are built on, so the hint can name an ending. */
function pres1sgStem(word: FlashWord): string | null {
  if (word.pos !== "VERB") return null;
  const first = pres1sgFrom(word.forms);
  return first && first.endsWith("n") ? first.slice(0, -1) : null;
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
    const claims = (index[tidyForm(cloze.answer)] ?? [])
      .filter((code) => !(code.startsWith("IndPrPs") && prior !== "ei"));
    if (claims.length !== 1 || claims[0] !== slot.slot) continue;
    if (prior === "ei" && slot.kind === "verb") continue;

    // And the gap may not leave another of its own answers standing.
    const blanked = cloze.text;
    if ([...accepted].some((form) => form !== tidyForm(cloze.answer) && mentions(blanked, form))) continue;
    // Nor print the headword beside the gap, which a bracket already does.
    if (mentions(blanked, word.lemma) && slot.kind === "case") continue;

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
  items: readonly SheetItem[], prefer: readonly Theme[], plans: readonly ExercisePlan[],
): Sheet {
  const taken = new Set<string>();
  const usedSentences = new Set<string>();
  const usedThemes = new Set<Theme>();
  const exercises: Exercise[] = [];

  for (const plan of plans) {
    const free = items.filter((i) => !taken.has(i.id) && !usedSentences.has(i.sentence));
    const theme = prefer.find((t) => !usedThemes.has(t) && available(free.filter((i) => i.themes.includes(t)), t) >= MIN_LINES + 1);
    if (!theme) continue;
    const pool = free.filter((i) => i.themes.includes(theme));
    const lines = pick(pool, plan.lines + 1, theme === "mixed", theme === "pronouns");
    if (lines.length < MIN_LINES + 1) continue;
    const example = [...lines].sort((a, b) => a.sentence.length - b.sentence.length)[0]!;
    const rest = lines.filter((l) => l !== example);
    for (const l of lines) { taken.add(l.id); usedSentences.add(l.sentence); }
    usedThemes.add(theme);
    exercises.push({ theme, example, lines: rest });
  }
  return { exercises };
}

/**
 * How many lines a theme could set. One per word, except on the pronoun page:
 * there are six personal pronouns and the page is about putting them through
 * their cases, which is what every course book's pronoun exercise does
 * (`mina` five times on one page, in five cases), so there a line is one per
 * pronoun and case.
 */
function available(items: readonly SheetItem[], theme: Theme): number {
  return new Set(items.map((i) => (theme === "pronouns" ? i.id : i.lexemeId))).size;
}

/**
 * Up to `n` lines, one per word (one per word and case on the pronoun page),
 * spreading the slots where the page is mixed, and never the same word twice
 * running where another is left.
 */
function pick(pool: readonly SheetItem[], n: number, spread: boolean, byCase = false): SheetItem[] {
  const out: SheetItem[] = [];
  const keys = new Set<string>();
  const sentences = new Set<string>();
  const keyOf = (i: SheetItem) => (byCase ? i.id : i.lexemeId);
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
 *   the personal pronouns, which every course book drills from the first
 *   month and which are short enough to be asked in every case;
 *   the present tense, the past, the conditional and the command;
 *   then every other case, and the mixed page last of all, which always has
 *   something.
 *
 * `themeOk` is the level's say: nothing about a case at A1, where the course
 * asks for none (`lib/course/plan.ts`).
 */
export function preferredThemes(input: {
  requested?: Theme | null;
  tonight?: string | null;
  weakest?: readonly string[];
  themeOk?: (theme: Theme) => boolean;
}): Theme[] {
  const ok = input.themeOk ?? (() => true);
  const out: Theme[] = [];
  const push = (t: Theme | null | undefined) => { if (t && ok(t) && !out.includes(t)) out.push(t); };
  push(input.requested ?? null);
  if (input.tonight && caseByKey(input.tonight)) push(`case:${input.tonight}` as Theme);
  for (const key of input.weakest ?? []) if (caseByKey(key)) push(`case:${key}` as Theme);
  push("pronouns");
  for (const t of TENSES) push(t);
  for (const c of CASES) if (!c.principal || c.key === "PARTITIVE" || c.key === "GENITIVE") push(`case:${c.key}`);
  push("mixed");
  return out;
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
