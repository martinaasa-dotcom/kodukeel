/**
 * THE FIRST WORDS OF A SENTENCE DECIDE THE LAST ONE.
 *
 * Estonian has no rule an English speaker can reason their way to here. After
 * `mulle meeldib` the thing you like keeps the form it has in the dictionary;
 * after `ma tahan` it takes the "some of it" ending; after `mul on` it keeps
 * its dictionary form again, and after `mul ei ole` it takes the ending. What
 * a verb or a little phrase does to the word that follows it is learned as a
 * pair, and the pair is learned by hearing the opener and reaching for the
 * ending without thinking.
 *
 * The existing government drill asks the same fact as "which case does this
 * verb take", which is a question nobody asks in a conversation and which
 * names a case. This asks the thing a speaker is actually doing: here is how a
 * sentence starts, what does its last word look like?
 *
 * WHAT IS WRITTEN HERE AND WHAT IS NOT. The openers are a small, closed list of
 * Estonian phrases that somebody who speaks the language has read, which is
 * the standing `lib/dict/authored.ts` and the scene bank already have
 * (ADR-005 amendment 4). The word that follows is never written here: its two
 * forms are read off the dictionary (`NOM_SG` and `PART_SG`, `NOM_PL` and
 * `PART_PL`, stored principal parts), so the round cannot teach a form nobody
 * recorded. A word is a request against the dictionary, and a word whose two
 * forms are spelled alike is dropped, since there is nothing to choose between.
 *
 * Every English line is authored, English being the one language this project
 * may write, and each word carries the English it needs rather than leaving a
 * rule to inflect it.
 *
 * Pure: no React, no Prisma. A round is a function of the words handed in.
 */

import { checkAnswer } from "./answer";

/** Which of two forms a sentence start asks for. */
export type Ending = "plain" | "partial";

export type Quantity = "sg" | "pl";

/**
 * A group of openers that behave alike, named by what the speaker is doing
 * rather than by a case.
 */
export interface Family {
  id: string;
  title: string;
}

export const FAMILIES: readonly Family[] = [
  { id: "liking", title: "Liking and feeling" },
  { id: "wanting", title: "Wanting and needing" },
  { id: "having", title: "Having and being there" },
  { id: "no", title: "Saying no" },
  { id: "past", title: "In the past" },
];

/** What a family is called on a screen. */
export function familyTitle(id: string): string {
  return FAMILIES.find((f) => f.id === id)?.title ?? id;
}

export interface OpenerSpec {
  /** Stable key. The review log's `slot` is `OP_` plus this. */
  id: string;
  family: string;
  stage: number;
  number: Quantity;
  /** The first words of the sentence, exactly as a person says them. */
  text: string;
  /** Which of the word's two forms follows. */
  ending: Ending;
  /**
   * The whole sentence in English. `{a}` is the word with its article, `{the}`
   * the same with "the", `{en}` the bare noun and `{pl}` its plural.
   */
  en: string;
  /** What the opener does, in the words a person would use. No case names. */
  why: string;
  /** If the opener only suits some words, which ones (a bus is waited for, a cat is not). */
  only?: readonly string[];
}

const KEEPS = "The thing stays as the dictionary has it.";
const TAKES = "The thing takes the “some of it” ending.";

export const OPENERS: readonly OpenerSpec[] = [
  // Stage 1: the four that carry the idea.
  { id: "like", family: "liking", stage: 1, number: "sg", text: "Mulle meeldib", ending: "plain",
    en: "I like {the}.",
    why: `The thing you like is the one doing the liking here, so it keeps its dictionary form. ${KEEPS}` },
  { id: "want", family: "wanting", stage: 1, number: "sg", text: "Ma tahan", ending: "partial",
    en: "I want {a}.",
    why: `Something you are after takes the “some of it” ending. ${TAKES}` },
  { id: "have", family: "having", stage: 1, number: "sg", text: "Mul on", ending: "plain",
    en: "I have {a}.",
    why: `It is simply there, so it keeps its dictionary form. ${KEEPS}` },
  { id: "nohave", family: "no", stage: 1, number: "sg", text: "Mul ei ole", ending: "partial",
    en: "I don't have {a}.",
    why: `After a no, the thing always takes the “some of it” ending, even though it had its dictionary form a moment ago after “mul on”.` },

  // Stage 2: more verbs in each family.
  { id: "need", family: "wanting", stage: 2, number: "sg", text: "Ma vajan", ending: "partial",
    en: "I need {a}.", why: `Needing is wanting. ${TAKES}` },
  { id: "look", family: "wanting", stage: 2, number: "sg", text: "Ma otsin", ending: "partial",
    en: "I'm looking for {a}.", why: `Looking for something is reaching for it. ${TAKES}` },
  { id: "wish", family: "wanting", stage: 2, number: "sg", text: "Ma soovin", ending: "partial",
    en: "I'd like {a}.", why: `A wish is wanting, politely. ${TAKES}` },
  { id: "wait", family: "wanting", stage: 2, number: "sg", text: "Ma ootan", ending: "partial",
    en: "I'm waiting for {the}.", why: `Waiting for something is reaching for it too. ${TAKES}`,
    only: ["buss", "pilet"] },
  { id: "taste", family: "liking", stage: 2, number: "sg", text: "Mulle maitseb", ending: "plain",
    en: "I like the taste of {the}.",
    why: `Like “mulle meeldib”, the thing is the one doing it: it tastes good to you. ${KEEPS}`,
    only: ["õun", "kook", "banaan"] },
  { id: "table", family: "having", stage: 2, number: "sg", text: "Laual on", ending: "plain",
    en: "There is {a} on the table.", why: `It is simply there. ${KEEPS}`,
    only: ["raamat", "telefon", "arvuti", "pliiats", "õun", "kook", "kott", "banaan"] },
  { id: "wehave", family: "having", stage: 2, number: "sg", text: "Meil on", ending: "plain",
    en: "We have {a}.", why: `Having is being there, for whoever has it. ${KEEPS}` },
  { id: "shehas", family: "having", stage: 2, number: "sg", text: "Tal on", ending: "plain",
    en: "She has {a}.", why: `Having is being there, for whoever has it. ${KEEPS}` },

  // Stage 3: the negatives, including the one that does not flip.
  { id: "notwant", family: "no", stage: 3, number: "sg", text: "Ma ei taha", ending: "partial",
    en: "I don't want {a}.", why: `After a no, the thing takes the “some of it” ending. ${TAKES}` },
  { id: "notneed", family: "no", stage: 3, number: "sg", text: "Ma ei vaja", ending: "partial",
    en: "I don't need {a}.", why: `After a no, the thing takes the “some of it” ending. ${TAKES}` },
  { id: "pole", family: "no", stage: 3, number: "sg", text: "Mul pole", ending: "partial",
    en: "I haven't got {a}.",
    why: `“Pole” is “ei ole” squeezed into one word, so it does what a no does. ${TAKES}` },
  { id: "wehavenot", family: "no", stage: 3, number: "sg", text: "Meil ei ole", ending: "partial",
    en: "We don't have {a}.", why: `After a no, the thing takes the “some of it” ending. ${TAKES}` },
  { id: "tablenot", family: "no", stage: 3, number: "sg", text: "Laual ei ole", ending: "partial",
    en: "There is no {en} on the table.", why: `After a no, the thing takes the “some of it” ending. ${TAKES}`,
    only: ["raamat", "telefon", "arvuti", "pliiats", "õun", "kook", "kott", "banaan"] },
  { id: "notlike", family: "no", stage: 3, number: "sg", text: "Mulle ei meeldi", ending: "plain",
    en: "I don't like {the}.",
    why: `The odd one out. A no usually brings the ending, but this thing is the one doing the liking, so it still keeps its dictionary form. ${KEEPS}` },

  // Stage 4: the same openers in the past, and one polite wish.
  { id: "wanted", family: "past", stage: 4, number: "sg", text: "Ma tahtsin", ending: "partial",
    en: "I wanted {a}.", why: `Wanting in the past is still wanting. ${TAKES}` },
  { id: "notwanted", family: "past", stage: 4, number: "sg", text: "Ma ei tahtnud", ending: "partial",
    en: "I didn't want {a}.", why: `Past or not, a no brings the ending. ${TAKES}` },
  { id: "had", family: "past", stage: 4, number: "sg", text: "Mul oli", ending: "plain",
    en: "I had {a}.", why: `It was simply there. ${KEEPS}` },
  { id: "hadnot", family: "past", stage: 4, number: "sg", text: "Mul ei olnud", ending: "partial",
    en: "I didn't have {a}.", why: `Past or not, a no brings the ending. ${TAKES}` },
  { id: "liked", family: "past", stage: 4, number: "sg", text: "Mulle meeldis", ending: "plain",
    en: "I liked {the}.", why: `The thing is still the one doing the liking. ${KEEPS}` },
  { id: "wouldwant", family: "past", stage: 4, number: "sg", text: "Ma tahaksin", ending: "partial",
    en: "I would like {a}.", why: `A polite “would” is still wanting. ${TAKES}` },

  // Stage 5: the same again with more than one, where the verb agrees too.
  { id: "pl-like", family: "liking", stage: 5, number: "pl", text: "Mulle meeldivad", ending: "plain",
    en: "I like {pl}.",
    why: `More than one thing is doing the liking, so the verb says “meeldivad” and the things keep their plural dictionary form.` },
  { id: "pl-want", family: "wanting", stage: 5, number: "pl", text: "Ma tahan", ending: "partial",
    en: "I want {pl}.", why: `Things you are after take the “some of them” ending. ${TAKES}` },
  { id: "pl-have", family: "having", stage: 5, number: "pl", text: "Mul on", ending: "plain",
    en: "I have {pl}.", why: `They are simply there, so they keep their plural dictionary form.` },
  { id: "pl-nohave", family: "no", stage: 5, number: "pl", text: "Mul ei ole", ending: "partial",
    en: "I don't have {pl}.", why: `After a no, the things take the “some of them” ending.` },
  { id: "pl-notwant", family: "no", stage: 5, number: "pl", text: "Ma ei taha", ending: "partial",
    en: "I don't want {pl}.", why: `After a no, the things take the “some of them” ending.` },
  { id: "pl-notlike", family: "no", stage: 5, number: "pl", text: "Mulle ei meeldi", ending: "plain",
    en: "I don't like {pl}.",
    why: `The odd one out again: the things are doing the liking, so they keep their plural dictionary form, and the verb is the same “meeldi” whatever their number.` },
];

export interface Stage {
  n: number;
  title: string;
  /** What this stage adds, in a line. */
  line: string;
}

export const STAGES: readonly Stage[] = [
  { n: 1, title: "Four openers", line: "Liking, wanting, having and saying no." },
  { n: 2, title: "More verbs", line: "Needing, looking for, waiting for, and who has it." },
  { n: 3, title: "Saying no every way", line: "Every no, and the one that does not flip." },
  { n: 4, title: "In the past", line: "Wanted, didn't want, had, would like." },
  { n: 5, title: "More than one", line: "The same openers with plurals, where the verb agrees." },
  { n: 6, title: "Everything mixed", line: "Any opener, any word, no order." },
];

/** The last stage that is a stage of its own; the one after it mixes them all. */
export const MIXED_STAGE = 6;

const SLOT_PREFIX = "OP_";

/** The `Review.slot` an answer to this opener is filed under. */
export function openerSlot(id: string): string {
  return `${SLOT_PREFIX}${id}`;
}

/** Every slot this module may write, for the closed list in `lib/srs/slots.ts`. */
export const OPENER_SLOTS: readonly string[] = OPENERS.map((o) => openerSlot(o.id));

export function isOpenerSlot(slot: string): boolean {
  return OPENER_SLOTS.includes(slot);
}

export function openerBySlot(slot: string): OpenerSpec | undefined {
  return OPENERS.find((o) => openerSlot(o.id) === slot);
}

/** What the word is, in English, and how the round says it. */
export interface OpenerWordSpec {
  lemma: string;
  en: string;
  a: string;
  the: string;
  pl: string;
}

/**
 * The words a round may be built on. Each is a request against the dictionary:
 * countable things a person likes, wants, has or hasn't, because a word that
 * names an amount (milk, coffee) is also said in the other form after
 * `mul on`, which would make the right answer two answers.
 */
export const OPENER_WORDS: readonly OpenerWordSpec[] = [
  { lemma: "raamat", en: "book", a: "a book", the: "the book", pl: "books" },
  { lemma: "auto", en: "car", a: "a car", the: "the car", pl: "cars" },
  { lemma: "telefon", en: "phone", a: "a phone", the: "the phone", pl: "phones" },
  { lemma: "koer", en: "dog", a: "a dog", the: "the dog", pl: "dogs" },
  { lemma: "kass", en: "cat", a: "a cat", the: "the cat", pl: "cats" },
  { lemma: "arvuti", en: "computer", a: "a computer", the: "the computer", pl: "computers" },
  { lemma: "jalgratas", en: "bike", a: "a bike", the: "the bike", pl: "bikes" },
  { lemma: "pliiats", en: "pencil", a: "a pencil", the: "the pencil", pl: "pencils" },
  { lemma: "õun", en: "apple", a: "an apple", the: "the apple", pl: "apples" },
  { lemma: "kook", en: "cake", a: "a cake", the: "the cake", pl: "cakes" },
  { lemma: "kott", en: "bag", a: "a bag", the: "the bag", pl: "bags" },
  { lemma: "pilet", en: "ticket", a: "a ticket", the: "the ticket", pl: "tickets" },
  { lemma: "banaan", en: "banana", a: "a banana", the: "the banana", pl: "bananas" },
  { lemma: "buss", en: "bus", a: "a bus", the: "the bus", pl: "buses" },
];

/** A word as the dictionary holds it: the four stored forms a round needs. */
export interface OpenerWord extends OpenerWordSpec {
  lexemeId: string;
  nom: string;
  part: string;
  nomPl: string | null;
  partPl: string | null;
}

/** The form that follows an opener, and the form that would follow its opposite. */
export function formsFor(word: OpenerWord, opener: Pick<OpenerSpec, "ending" | "number">):
  { answer: string; other: string } | null {
  const pl = opener.number === "pl";
  const plain = pl ? word.nomPl : word.nom;
  const partial = pl ? word.partPl : word.part;
  if (!plain || !partial) return null;
  // A word whose two forms are spelled alike gives nothing to choose between.
  if (plain.toLowerCase() === partial.toLowerCase()) return null;
  return opener.ending === "plain"
    ? { answer: plain, other: partial }
    : { answer: partial, other: plain };
}

/** Whether a word can carry an opener at all. */
export function suits(word: Pick<OpenerWordSpec, "lemma">, opener: OpenerSpec): boolean {
  return !opener.only || opener.only.includes(word.lemma);
}

/** The English sentence for one opener and one word. */
export function englishFor(word: OpenerWordSpec, opener: OpenerSpec): string {
  return opener.en
    .replace("{a}", word.a)
    .replace("{the}", word.the)
    .replace("{en}", word.en)
    .replace("{pl}", word.pl);
}

export interface OpenerQuestion {
  /** The opener's id. */
  id: string;
  slot: string;
  stage: number;
  family: string;
  number: Quantity;
  /** The opening words. */
  text: string;
  lexemeId: string;
  lemma: string;
  /** The English of the whole sentence. */
  en: string;
  ending: Ending;
  /** The right form. */
  answer: string;
  /** The form of the same word that the opposite opener wants. */
  other: string;
  /** What the opener does, said plainly. */
  why: string;
  /** Where the form the learner would reach for instead is right. */
  elsewhere: string | null;
  /** The two forms in the order a picking round shows them. */
  options: [string, string];
}

type Shuffle = <T>(items: readonly T[]) => T[];

/** The openers a stage asks about. The last stage asks all of them. */
export function openersIn(stage: number): OpenerSpec[] {
  return stage >= MIXED_STAGE ? [...OPENERS] : OPENERS.filter((o) => o.stage === stage);
}

/**
 * An opener, other than this one, that wants the opposite ending of the same
 * number, so a wrong answer can say where it would have been right.
 */
export function wantingInstead(opener: OpenerSpec, stage: number): OpenerSpec | null {
  const wanted: Ending = opener.ending === "plain" ? "partial" : "plain";
  const pool = OPENERS.filter((o) =>
    o.id !== opener.id && o.ending === wanted && o.number === opener.number && o.stage <= Math.max(stage, 1));
  // The one the learner most likely meant is the one in the same family.
  return pool.find((o) => o.family === opener.family) ?? pool[0] ?? null;
}

function questionFor(
  opener: OpenerSpec, word: OpenerWord, stage: number, order: Shuffle,
): OpenerQuestion | null {
  const forms = formsFor(word, opener);
  if (!forms) return null;
  const instead = wantingInstead(opener, stage);
  return {
    id: opener.id,
    slot: openerSlot(opener.id),
    stage,
    family: opener.family,
    number: opener.number,
    text: opener.text,
    lexemeId: word.lexemeId,
    lemma: word.lemma,
    en: englishFor(word, opener),
    ending: opener.ending,
    answer: forms.answer,
    other: forms.other,
    why: opener.why,
    elsewhere: instead ? instead.text : null,
    options: order([forms.answer, forms.other]) as [string, string],
  };
}

/** How many questions a round holds. */
export const ROUND_SIZE = 8;

/**
 * A round: one word, every opener of the stage, in no particular order.
 *
 * One word to a round is the point: the ending changes under the learner while
 * the word does not, and that is what makes the pattern visible. The mixed
 * stage is the exception and draws a fresh word for each question, since by
 * then the learner is meant to know the pattern rather than the word.
 */
export function buildRound(
  stage: number, words: readonly OpenerWord[], order: Shuffle, size = ROUND_SIZE,
): OpenerQuestion[] {
  const openers = openersIn(stage);
  if (openers.length === 0 || words.length === 0) return [];

  if (stage >= MIXED_STAGE) {
    const out: OpenerQuestion[] = [];
    for (const opener of order(openers)) {
      for (const word of order(words)) {
        if (!suits(word, opener)) continue;
        const q = questionFor(opener, word, stage, order);
        if (q) { out.push(q); break; }
      }
      if (out.length >= size) break;
    }
    return out;
  }

  // The word that suits the most openers of this stage, drawn at random among
  // the best, so a round is full wherever the dictionary can fill it.
  const scored = order(words).map((word) => ({
    word,
    n: openers.filter((o) => suits(word, o) && formsFor(word, o)).length,
  }));
  const best = Math.max(...scored.map((s) => s.n));
  const pick = scored.find((s) => s.n === best)?.word;
  if (!pick || best === 0) return [];
  return order(openers)
    .filter((o) => suits(pick, o))
    .flatMap((o) => { const q = questionFor(o, pick, stage, order); return q ? [q] : []; })
    .slice(0, size);
}

export interface OpenerMark {
  right: boolean;
  /** 1 Again, 2 Hard, 3 Good. Never Easy: the round does not know the card well enough. */
  rating: 1 | 2 | 3;
  /** The sentence to say about it. Empty when right. */
  note: string;
  /** Whether what was written is the other opener's form. */
  wrote: "answer" | "other" | "neither";
}

/** What a picked form was worth. The two options are exactly the two forms. */
export function markPick(q: OpenerQuestion, picked: string): OpenerMark {
  const right = picked === q.answer;
  return { right, rating: right ? 3 : 1, note: right ? "" : wrongNote(q), wrote: right ? "answer" : "other" };
}

/**
 * What a typed form was worth.
 *
 * The other form is a rival rather than a slip: the two are often one
 * keystroke apart, and calling the wrong ending a typo would teach the
 * opposite of the lesson (`checkAnswer`'s own argument for `rivals`).
 */
export function markTyped(q: OpenerQuestion, typed: string): OpenerMark {
  const check = checkAnswer(typed, q.answer, "et", [q.other]);
  if (check.verdict === "correct") return { right: true, rating: 3, note: "", wrote: "answer" };
  const wrote = typed.trim().toLowerCase() === q.other.toLowerCase() ? "other" : "neither";
  if (check.verdict === "diacritics") {
    return { right: false, rating: 2, note: check.note, wrote: "answer" };
  }
  if (wrote === "other") return { right: false, rating: 1, note: wrongNote(q), wrote };
  return { right: false, rating: 1, note: check.note || `This one wanted “${q.answer}”.`, wrote };
}

function wrongNote(q: OpenerQuestion): string {
  return q.elsewhere
    ? `That is the form that goes after “${q.elsewhere}”. After “${q.text}” it is “${q.answer}”.`
    : `After “${q.text}” it is “${q.answer}”.`;
}
