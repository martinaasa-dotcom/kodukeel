/**
 * PRACTICE, AND THE REVIEW AFTER IT: BUILT FROM THE LEDGER, SO THEY CANNOT ASK
 * ANYTHING ELSE (docs/43-lessons.md §1, steps 4 and 6).
 *
 * Recognize first, then produce. Every new word and phrase is met once more
 * as a question about its meaning, by ear for a phrase and by eye for a word,
 * and then asked for from its English. The wrong options are the English of
 * other things the learner has been taught, today's first, so a beginner on
 * their first evening chooses between greetings they met five minutes ago
 * rather than between glosses of words nobody has shown them. Nothing here is
 * typed by hand, and `lessons.test.ts` still asks every item it builds whether
 * it is covered, rather than trusting that it is.
 *
 * A check-in teaches nothing new, so its practice is the last few lessons'
 * words mixed, which is what a check-in is for.
 *
 * THE REVIEW STEP is older lessons' words, by ear and by eye. Once lessons
 * are the course it is the review queue held to the ledger, which grades;
 * while lessons are in preview it is this, and grades nothing.
 *
 * TYPING IS MARKED HERE, NOT BY `checkAnswer`. That marker used to split an
 * Estonian answer on its commas, so `Aeglasemalt, palun.` would accept `palun`
 * on its own; it splits only an English gloss that way now, and this one
 * still reads a phrase as one answer. The slip rule is the app's own, though: a dropped õ or ä is nearly,
 * and a letter out is nearly only on one word of eight letters or more, the
 * rest of the phrase as asked, which is `lib/estonian/answer.ts`'s measured
 * floor, because below it a letter out is as often another word (`mina` and
 * `sina`). A changed sentence is marked by `markRework`, against what it says
 * as well as how it was written (`sameSentence.ts`).
 *
 * Pure: no React, no Prisma, no clock. Seeded, so a reload asks the same
 * questions in the same order.
 */

import { editDistance, nearMiss } from "@/lib/estonian/answer";
import { fold } from "@/lib/estonian/fold";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { estonianIn, familiesOf, ledgerThrough, lessonRank, normalisePhrase, opensOf, teach, unfold, withSlip, wordsOf, type Asked, type Ledger } from "./ledger";
import { STAND_IN, hasStandIn, personal } from "./ownAnswer";
import { FRONTABLE, combinedSentences, sameSentence, spokenPhrase, subjectPerson, type Persons } from "./sameSentence";
import { personForms, type Person } from "@/lib/estonian/conjugate";
import { lessonOrders, type OrderContext } from "@/lib/estonian/wordOrder";
import type { LessonSpec } from "./types";

import type { Verdict } from "@/lib/ux/verdict";

export type PracticeItem =
  /** Heard, then which English it means. For a phrase. */
  | { readonly kind: "hear"; readonly et: string; readonly options: readonly string[]; readonly answer: string }
  /** Read, then which English it means. For a word. */
  | { readonly kind: "pick"; readonly et: string; readonly options: readonly string[]; readonly answer: string }
  /**
   * The English, then the Estonian typed or said. `accept` is every taught
   * spelling with the same English, since `mina` and `ma` both answer "I".
   */
  | { readonly kind: "type"; readonly en: string; readonly answer: string; readonly accept: readonly string[];
      /** One line of English saying what is wanted, where the meaning alone could be read two ways. */
      readonly note?: string;
      /** Taught forms of the same word one letter from the answer, which a letter out is not a slip for (`notSlipsFor`). */
      readonly notSlips?: readonly string[];
      /** Taught spellings of another word one letter from the answer (`notSlipsFor`). */
      readonly otherWords?: readonly string[] }
  /**
   * Pairs to put together, Estonian with English, tapped one then the other.
   * The quick warm-up a lesson's practice opens on, for words said alone.
   */
  | { readonly kind: "match"; readonly pairs: readonly { readonly et: string; readonly en: string }[] }
  /**
   * A line of a conversation the learner has heard, with one word taken out,
   * and the forms of that same word to choose from: the evening's pattern put
   * to work (`olen`, `oled` or `on`; `kodus`, `koju` or `kodust`). The English
   * of the whole line says which is meant. `answer` is the word as the line
   * spells it, so `before + answer + after` is the line again.
   */
  | { readonly kind: "gap"; readonly before: string; readonly after: string; readonly en: string;
      readonly options: readonly string[]; readonly answer: string }
  /**
   * A question somebody asked in a conversation, and what was said back,
   * among the answers to other questions: the conversation, rather than a
   * word of it, is what is asked about.
   */
  | { readonly kind: "reply"; readonly ask: { readonly et: string; readonly en: string };
      readonly options: readonly string[]; readonly answer: string; readonly answerEn: string }
  /**
   * A sentence to change, typed (`Rework`): the sentence, what to do to it,
   * and every way of saying the result that counts, the lesson's own first.
   */
  | { readonly kind: "rework"; readonly from: { readonly et: string; readonly en: string }; readonly ask: string;
      readonly answer: string; readonly answerEn: string; readonly accept: readonly string[];
      /** Where the ask names how the sentence must begin ("Start with {Ma ei}"), that beginning. */
      readonly opens: string | null } & Checkable
  /**
   * A line with one word swapped for another form of it (`Fix`), typed back
   * put right. `shown` is the line with the slip, `answer` the line itself.
   */
  | { readonly kind: "fix"; readonly shown: string; readonly en: string; readonly answer: string;
      readonly accept: readonly string[]; readonly wrong: string; readonly right: string; readonly why: string;
      /** Taught spellings one letter from a word of the line, which a letter out on the other word is not a slip for. */
      readonly notSlips?: readonly string[];
      /** Taught spellings of another word one letter from a word of the line. */
      readonly otherWords?: readonly string[] } & Checkable;

/**
 * What a typed sentence is checked against beyond the sentences written for it.
 * `persons` is which person each verb taught by now is, so a subject pronoun
 * left out or put in is read against the verb beside it (`sameSentence.ts`).
 * `orders` is the other orders of an accepted sentence the dictionary vouches
 * for (`alsoRightOrders` in `lib/estonian/wordOrder.ts`), filled where the
 * lesson is read (`lib/progress/lessonView.ts`), since the reading needs the
 * dictionary and this module may not reach it.
 */
interface Checkable {
  readonly persons: Persons;
  readonly orders: readonly string[];
}

/** The Estonian a practice item asks about, which the ledger has to cover. */
export function itemEstonian(item: PracticeItem): string[] {
  switch (item.kind) {
    case "type": return [item.answer];
    case "match": return item.pairs.map((p) => p.et);
    case "gap": return [`${item.before}${item.answer}${item.after}`, ...item.options];
    case "reply": return [item.ask.et, ...item.options];
    case "rework": return [item.from.et, ...item.accept];
    case "fix": return [item.shown, ...item.accept];
    default: return [item.et];
  }
}

/** Longest answer a learner is asked to produce whole, in words. */
export const TYPE_UP_TO_WORDS = 4;

/** How many older words the review step goes over. */
export const REVIEW_ITEMS = 6;

/** How many of the last lessons a check-in mixes. */
export const CHECKIN_REACH = 4;

/**
 * At most this many recognize questions and this many to produce, so the step
 * stays the five minutes the plan gives it. A lesson teaching more than that
 * (the six persons, long and short, are twelve words) asks a different
 * selection each lesson id, and every word is on the Words step whatever this
 * picks.
 */
export const RECOGNISE_AT_MOST = 10;
export const PRODUCE_AT_MOST = 6;

/** At most this many sentences to change in one evening's practice. */
export const REWORK_AT_MOST = 4;

/** At most this many slips to put right in one evening's practice. */
export const FIX_AT_MOST = 3;

/** A pair of slots as one key, whichever way round it was recorded. */
const pairKey = (pair: readonly [string, string]) => [...pair].sort().join(" ");

/**
 * The fixes an evening asks, the learner's own mix-ups first: a fix whose
 * pair the learner has been recorded confusing comes before one they have
 * not, commoner confusions first, and the lesson's own order stands within
 * each. Never more than `FIX_AT_MOST`.
 */
export function fixesFor(lesson: LessonSpec, taught: Ledger, confusions: readonly (readonly [string, string])[] = []): PracticeItem[] {
  const rank = new Map(confusions.map((pair, i) => [pairKey(pair), i] as const));
  const ordered = (lesson.fixes ?? [])
    .map((fix, i) => ({ fix, i, mine: rank.get(pairKey(fix.pair)) }))
    .sort((a, b) => (a.mine ?? Infinity) - (b.mine ?? Infinity) || a.i - b.i);
  return ordered.slice(0, FIX_AT_MOST).map(({ fix }) => fixItem(fix, taught));
}

/** One fix as the question that asks it, read against everything taught by its lesson's end. */
export function fixItem(fix: NonNullable<LessonSpec["fixes"]>[number], taught: Ledger): Extract<PracticeItem, { kind: "fix" }> {
  return {
    kind: "fix", shown: withSlip(fix), en: fix.line.en, answer: fix.line.et, accept: [fix.line.et],
    wrong: fix.wrong, right: fix.right, why: fix.why,
    persons: personsFor(taught, [fix.line.et, withSlip(fix)]), orders: [],
    ...slipFields(notSlipsFor([fix.line.et], taught)),
  };
}

/** One rework as the question that asks it, read against everything taught by its lesson's end. */
export function reworkItem(r: NonNullable<LessonSpec["reworks"]>[number], taught: Ledger): Extract<PracticeItem, { kind: "rework" }> {
  const accept = [r.to.et, ...(r.also ?? [])];
  return {
    kind: "rework", from: r.from, ask: r.ask, answer: r.to.et, answerEn: r.to.en, accept, opens: opensOf(r.ask),
    persons: personsFor(taught, [r.from.et, ...accept]), orders: [],
  };
}

/** Options under a recognize question, the answer included. */
const OPTIONS = 4;

const sameEnglish = (a: string, b: string) => a.toLocaleLowerCase("en") === b.toLocaleLowerCase("en");

/**
 * Whether a meaning spells its own answer: `ole` glossed "{ei ole} is not"
 * puts the word being asked for inside the question, or inside the right
 * option, and a question nobody can get wrong measures nothing. Such an item
 * is still on the Words step; it is just never asked about.
 */
export function meaningShows(item: Asked): boolean {
  const asked = new Set(wordsOf(item.et).map((w) => w.low));
  return estonianIn(item.en).some((et) => wordsOf(et).some((w) => asked.has(w.low)));
}

/**
 * Three wrong meanings for `item`, from what has been taught, today's first.
 * Never a meaning equal to the answer's, since two right options are a trick.
 */
function optionsFor(item: Asked, pool: readonly Asked[], random: () => number): string[] {
  const wrong: string[] = [];
  for (const other of pool) {
    if (wrong.length >= OPTIONS - 1) break;
    if (other.et === item.et || sameEnglish(other.en, item.en)) continue;
    // An option quoting the word on screen points at itself, right or wrong.
    if (wordsOf(item.et).some((w) => estonianIn(other.en).some((et) => wordsOf(et).some((o) => o.low === w.low)))) continue;
    if (wrong.some((w) => sameEnglish(w, other.en))) continue;
    wrong.push(other.en);
  }
  return shuffle([item.en, ...wrong], random);
}

/** A recognize question for one item: by ear for a phrase, by eye for a word. */
function recognise(item: Asked, pool: readonly Asked[], random: () => number): PracticeItem {
  const options = optionsFor(item, pool, random);
  return wordsOf(item.et).length > 1
    ? { kind: "hear", et: item.et, options, answer: item.en }
    : { kind: "pick", et: item.et, options, answer: item.en };
}

/** The pool options are drawn from: today's items, then the most recent first. */
function poolFor(tonight: readonly Asked[], before: Ledger): Asked[] {
  return [...tonight, ...[...before.items].reverse().map((d) => d.item)];
}

/**
 * `list` with whatever stands nearest `item` in it first: a lesson keeps its
 * kinds together, so a da-form is asked among da-forms and a weekday among
 * weekdays, and the right answer is never the only one of its kind.
 */
function nearestFirst(item: Asked, list: readonly Asked[]): Asked[] {
  const at = list.indexOf(item);
  if (at < 0) return [...list];
  return list.map((other, i) => ({ other, far: Math.abs(i - at) })).sort((a, b) => a.far - b.far).map(({ other }) => other);
}

/**
 * The pool for one older item, with the lesson that taught it first: on a
 * check-in or in the review, "five" is asked among the other numbers rather
 * than among whatever the last lesson happened to teach, which would make the
 * right answer the only number on the screen.
 */
function neighboursFirst(item: Asked, before: Ledger, rest: readonly Asked[]): Asked[] {
  const at = before.items.findIndex((d) => d.item === item);
  if (at < 0) return [...rest];
  const taughtIn = before.items[at]!.lesson;
  // Nearest in the Words list first, which is where a lesson keeps its kinds together.
  const same = before.items
    .map((d, i) => ({ d, far: Math.abs(i - at) }))
    .filter(({ d }) => d.lesson === taughtIn)
    .sort((a, b) => a.far - b.far)
    .map(({ d }) => d.item);
  return [...same, ...rest];
}

/** What today's practice goes over: today's new things, or for a check-in the last few lessons'. */
export function practiceSubjects(lesson: LessonSpec, before: Ledger): Asked[] {
  if (lesson.teaches.length > 0) return lesson.teaches.flatMap(unfold);
  const since = lessonRank(lesson) - CHECKIN_REACH;
  return before.items.filter((d) => d.lesson >= since).map((d) => d.item);
}

/** One item per English meaning, keeping the first, so "I" is not asked twice. */
function onePerMeaning(items: readonly Asked[]): Asked[] {
  const out: Asked[] = [];
  for (const item of items) if (!out.some((o) => sameEnglish(o.en, item.en))) out.push(item);
  return out;
}

/**
 * "you were, they were" is one spelling for two persons, so it may be said
 * once or with each pronoun, in either order: `sa olid nad olid`. The
 * pronouns are the taught ones whose English opens each part; "you" means the
 * one-person `sa` here, since the polite and plural `te` takes another ending.
 */
function eachWithItsPronoun(item: Asked, pool: readonly Asked[]): string[] {
  const clean = (text: string) => text.replace(/,/g, "").trim().toLocaleLowerCase("en");
  const perPart = item.en.split(/,\s+/).map((part) => {
    const lead = clean(part).split(" ")[0] ?? "";
    return pool
      .filter((o) => wordsOf(o.et).length === 1 && PRONOUN_ENGLISH[lead] === clean(o.en))
      .map((o) => `${o.et} ${item.et}`);
  });
  if (perPart.length < 2 || perPart.length > 3 || perPart.some((p) => p.length === 0)) return [];
  const sets = perPart.reduce<string[][]>((acc, options) => acc.flatMap((a) => options.map((o) => [...a, o])), [[]]);
  const permute = (xs: string[]): string[][] => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permute([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
  return sets.flatMap(permute).map((p) => p.join(" "));
}

/** The English a subject pronoun is taught under, by the word that opens its part of a prompt. */
const PRONOUN_ENGLISH: Record<string, string> = {
  i: "i", we: "we", they: "they", he: "he she", you: "you one person you know",
};

/** The person a part of a prompt is about, if it opens on a subject pronoun. */
const personOf = (part: string) => {
  const first = part.trim().split(/\s+/)[0]?.toLocaleLowerCase("en") ?? "";
  return first in PRONOUN_ENGLISH ? first : null;
};

/** What a typed question says it wants, where its English could be read two ways. */
export const NOTE_ONE_WORD = "It's the one spelling for both. Type it alone, or with each pronoun.";
export const NOTE_WITH_ON = "Just the word that goes with “on”. “… on” is fine too.";

function noteFor(item: Asked): { note?: string } {
  if (/^with \{on\}:/i.test(item.en)) return { note: NOTE_WITH_ON };
  const parts = item.en.split(/,\s+/);
  // "you were, they were": two meanings, one spelling, which reads as two answers to give.
  // Only where each part is a different person ("you were, they were"), never a qualifier or a synonym.
  const people = parts.map(personOf);
  if (parts.length > 1 && people.every((p) => p !== null) && new Set(people).size === parts.length && wordsOf(item.et).length === 1) return { note: NOTE_ONE_WORD };
  return {};
}

/**
 * A produce question, taking every taught spelling with the same English.
 * `taught` is every spelling taught by now, which says which near spellings
 * are another form rather than a slip (`notSlipsFor`).
 */
function produce(item: Asked, pool: readonly Asked[], taught: Ledger): PracticeItem {
  /* "outside/outdoors" is two English words for one meaning, so a taught word
     glossed with either one is right as well. Only a slash says so: a comma
     joins senses ("juice, some juice") and must not. */
  const senses = (en: string) => en.split("/").map((sense) => sense.trim().toLocaleLowerCase("en"));
  const sharesSense = (o: Asked) => {
    const mine = senses(item.en);
    return senses(o.en).some((sense) => mine.includes(sense)) && (mine.length > 1 || senses(o.en).length > 1);
  };
  const accept = [...new Set([item.et, ...pool.filter((o) => sameEnglish(o.en, item.en) || sharesSense(o)).map((o) => o.et)])];
  /* A person ending says who is meant, so Estonian drops the pronoun, and
     `me oleme` is as right as `oleme` for "we are". Each spelling takes the
     taught pronouns of the one person its own English names (`personsInEnglish`:
     "I was afraid", "he thought, she thought", "you would be, polite or more
     than one"), so "you are" accepts `sa oled` and `te olete` and never
     `sa olete`. A spelling whose English names two persons ("you were, they
     were") takes none here: `eachWithItsPronoun` is that one. Only a form of a
     verb: a pronoun is not its own verb. */
  const verbForm = item.kind === "form" && /(?:ma|da)$/u.test(item.of);
  if (verbForm && wordsOf(item.et).length === 1) {
    const englishOf = (spelling: string) => (spelling === item.et ? item.en : pool.find((o) => o.et === spelling)?.en ?? "");
    const pronouns = pool.filter((o) => wordsOf(o.et).length === 1 && subjectPerson(o.et) !== undefined);
    for (const spelling of accept.filter((a) => wordsOf(a).length === 1)) {
      const persons = personsInEnglish(englishOf(spelling));
      if (persons.length !== 1) continue;
      for (const o of pronouns) {
        if (subjectPerson(o.et) !== persons[0]) continue;
        const joined = `${o.et} ${spelling}`;
        if (!accept.includes(joined)) accept.push(joined);
      }
    }
  }
  /* "with {on}: we have" is `meil`, said whole as `meil on`. */
  if (accept.length === 1 && wordsOf(item.et).length === 1 && /^with \{on\}:/i.test(item.en)) accept.push(`${item.et} on`);
  const note = noteFor(item);
  if (note.note === NOTE_ONE_WORD) accept.push(...eachWithItsPronoun(item, pool));
  return { kind: "type", en: item.en, answer: item.et, accept, ...note, ...slipFields(notSlipsFor(accept, taught)) };
}

/*
  THREE MORE SHAPES OF QUESTION, SO A PRACTICE STEP IS NOT ONE QUESTION
  ASKED SIXTEEN TIMES.

  Every lesson used to practice the same two ways, a meaning picked out of
  four and then typed back, which is fair to every word and is also the same
  screen a hundred and ten evenings running, and none of it asked about the
  one thing the How it works step had just explained. So a practice step now
  opens on a quick match, picks out the rest, puts the evening's pattern to
  work in a gap cut from a line the learner has heard, asks what was said
  back in a conversation, and ends on typing, which is recognize, then use,
  then produce, in that order. Every option on every one of them is a
  spelling the ledger covers, and the tests still ask that of each item.
*/

/** Pairs in a match. */
export const MATCH_PAIRS = 5;
/** Fewest pairs worth a match: three is a guess, four is a question. */
const MATCH_AT_LEAST = 4;
/** Gaps in a lesson's practice. */
export const GAPS_AT_MOST = 3;
/** "What do they say back?" questions in a lesson's practice. */
export const REPLIES_AT_MOST = 2;

/**
 * A match of words said alone, each with a short meaning: a phrase is heard
 * and a long gloss is a sentence to read, and neither is what a quick pairing
 * is for. Null where too few fit.
 */
function matchFrom(items: readonly Asked[], random: () => number): PracticeItem | null {
  const fit: Asked[] = [];
  for (const item of items) {
    if (fit.length >= MATCH_PAIRS) break;
    if (wordsOf(item.et).length !== 1 || item.en.length > 30 || /[{}]/.test(item.en)) continue;
    if (fit.some((f) => sameEnglish(f.en, item.en) || f.et.toLocaleLowerCase("et") === item.et.toLocaleLowerCase("et"))) continue;
    fit.push(item);
  }
  if (fit.length < MATCH_AT_LEAST) return null;
  return { kind: "match", pairs: shuffle(fit, random).map((item) => ({ et: item.et, en: item.en })) };
}

/** A spoken line, Estonian and English. */
interface Said { readonly who: string; readonly et: string; readonly en: string }

/** The spoken lines of some lessons, in order. */
function linesOf(lessons: readonly LessonSpec[]): Said[] {
  return lessons.flatMap((l) => l.conversation.flatMap((line) => (line.et && line.en ? [{ who: line.who, et: line.et, en: line.en }] : [])));
}

/**
 * Gaps cut from `lines`, a sentence at a time: one word taken out, with other forms of
 * that word to choose from. A word is taken out only where the ledger knows
 * at least two other forms of it that mean something else (`mina` and `ma`
 * are one meaning, so neither is offered against the other), where it stands
 * once in the line, and where it is the form of one word only. The long
 * illative built by rule is never an option or a target, since `linna` and
 * `linnasse` can both be right.
 */
function gapsFrom(lines: readonly Said[], ledger: Ledger, random: () => number, max: number): PracticeItem[] {
  if (max <= 0) return [];
  const families = familiesOf(ledger);
  const meaning = new Map<string, string>();
  for (const { item } of ledger.items) {
    const low = item.et.toLocaleLowerCase("et");
    if (wordsOf(item.et).length === 1 && !meaning.has(low)) meaning.set(low, item.en);
  }
  const longIllative = (s: string) => s.endsWith("sse") && !meaning.has(s);
  const out: PracticeItem[] = [];
  const usedLines = new Set<string>();
  const usedWords = new Set<string>();
  // One sentence of a line at a time, since `Mina olen Mari. Ma olen õpetaja.` says `olen` twice and either half alone asks it once.
  const sentences = lines.flatMap((line) => line.et.split(/(?<=[.!?…])\s+/).filter((et) => wordsOf(et).length > 1).map((et) => ({ ...line, et })));
  for (const line of shuffle(sentences, random)) {
    if (out.length >= max) break;
    if (usedLines.has(line.et)) continue;
    const tokens = [...line.et.matchAll(/\p{L}+/gu)];
    const lows = tokens.map((m) => m[0].toLocaleLowerCase("et"));
    const candidates = tokens.flatMap((m, i) => {
      const low = lows[i]!;
      if (usedWords.has(low) || longIllative(low)) return [];
      if (lows.filter((x) => x === low).length > 1) return [];
      const lemma = families.of.get(low);
      if (!lemma) return [];
      const own = meaning.get(low);
      const siblings = [...(families.forms.get(lemma) ?? [])].filter((s) =>
        s !== low && families.of.get(s) === lemma && !longIllative(s) && !lows.includes(s) && !(own !== undefined && meaning.get(s) !== undefined && sameEnglish(meaning.get(s)!, own)));
      return siblings.length >= 2 ? [{ m, low, lemma, siblings }] : [];
    });
    if (candidates.length === 0) continue;
    // A form rather than the word as the dictionary heads it, where there is one: that is the pattern.
    const forms = candidates.filter((c) => c.low !== c.lemma);
    const pick = shuffle(forms.length > 0 ? forms : candidates, random)[0]!;
    const raw = pick.m[0];
    const at = pick.m.index ?? 0;
    const cased = (s: string) => (/^\p{Lu}/u.test(raw) ? s.charAt(0).toLocaleUpperCase("et") + s.slice(1) : s);
    const options = shuffle([raw, ...shuffle(pick.siblings, random).slice(0, OPTIONS - 1).map(cased)], random);
    out.push({ kind: "gap", before: line.et.slice(0, at), after: line.et.slice(at + raw.length), en: line.en, options, answer: raw });
    usedLines.add(line.et);
    usedWords.add(pick.low);
  }
  return out;
}

/** The words a question can open on, so a reply is to a real question. */
const QUESTION_WORDS = new Set([
  "kes", "mis", "kus", "kuhu", "kust", "kuidas", "millal", "miks", "mitu", "mida", "kelle", "kellega",
  "kellele", "milline", "mitmes", "kui", "kas", "mille", "millega", "mitmendal", "kelleks", "kuni",
]);

/** A question and what was said back, from one conversation. */
interface Exchange { readonly ask: Said; readonly back: Said }

/** Every question in `lessons` answered on the next line by somebody else. */
function exchangesOf(lessons: readonly LessonSpec[]): Exchange[] {
  const out: Exchange[] = [];
  for (const lesson of lessons) {
    const said = linesOf([lesson]);
    for (let i = 0; i + 1 < said.length; i++) {
      const ask = said[i]!;
      const back = said[i + 1]!;
      const first = wordsOf(ask.et)[0]?.low ?? "";
      if (!ask.et.trim().endsWith("?") || !QUESTION_WORDS.has(first)) continue;
      if (back.who === ask.who || back.et.trim().endsWith("?") || wordsOf(back.et).length > 8) continue;
      out.push({ ask, back });
    }
  }
  return out;
}

/**
 * "What do they say back?": a question from `prompts`, its answer, and the
 * answers to other questions from `pool`. An answer is offered against this
 * question only where its own question opened on another question word and it
 * shares no word with this question, so `Tallinnas.` is never a wrong answer
 * to "do you live in Tallinn?".
 */
function repliesFrom(prompts: readonly Exchange[], pool: readonly Exchange[], random: () => number, max: number): PracticeItem[] {
  const out: PracticeItem[] = [];
  const asked = new Set<string>();
  for (const ex of shuffle(prompts, random)) {
    if (out.length >= max) break;
    if (asked.has(ex.ask.et)) continue;
    const askWords = new Set(wordsOf(ex.ask.et).map((w) => w.low));
    const opener = wordsOf(ex.ask.et)[0]?.low;
    const right = normalisePhrase(ex.back.et);
    const wrong: string[] = [];
    for (const other of shuffle(pool, random)) {
      if (wrong.length >= OPTIONS - 1) break;
      if (wordsOf(other.ask.et)[0]?.low === opener) continue;
      const said = normalisePhrase(other.back.et);
      if (said === right || wrong.some((w) => normalisePhrase(w) === said)) continue;
      if (wordsOf(other.back.et).some((w) => askWords.has(w.low))) continue;
      wrong.push(other.back.et);
    }
    if (wrong.length < 2) continue;
    out.push({ kind: "reply", ask: { et: ex.ask.et, en: ex.ask.en }, options: shuffle([ex.back.et, ...wrong], random), answer: ex.back.et, answerEn: ex.back.en });
    asked.add(ex.ask.et);
  }
  return out;
}

/**
 * Step 4: a match to warm up, the rest picked out, the evening's pattern put
 * to work in gaps, what was said back, and then typing. In the order taught
 * where everything fits, since that is the order the Words step just showed;
 * a seeded selection where it does not. `history` is the lessons before this
 * one, whose conversations the dialogue questions draw on as well.
 */
export function practiceFor(
  lesson: LessonSpec, before: Ledger, history: readonly LessonSpec[] = [],
  /** The pairs of forms this learner mixes up, commonest first, which put their own slips first. */
  confusions: readonly (readonly [string, string])[] = [],
): PracticeItem[] {
  const random = rng(seedFrom(`practice:${lesson.id}`));
  const subjects = onePerMeaning(practiceSubjects(lesson, before)).filter((item) => !meaningShows(item));
  const tonight = lesson.teaches.flatMap(unfold);
  const pool = poolFor(tonight, before);
  const fits = tonight.length > 0 && subjects.length <= RECOGNISE_AT_MOST;
  const chosen = fits ? subjects : shuffle(subjects, random).slice(0, RECOGNISE_AT_MOST);
  const match = matchFrom(chosen, random);
  const matched = new Set(match?.kind === "match" ? match.pairs.map((p) => p.et) : []);
  const recog = chosen
    .filter((item) => !matched.has(item.et))
    .map((item) => recognise(item, tonight.includes(item) ? [...nearestFirst(item, tonight), ...pool] : neighboursFirst(item, before, pool), random));
  const after = teach(before, lesson.teaches, lessonRank(lesson), lesson.patterns);
  const gaps = gapsFrom(linesOf([lesson]), after, random, GAPS_AT_MOST);
  const replies = repliesFrom(exchangesOf([lesson]), exchangesOf([...history, lesson]), random, REPLIES_AT_MOST);
  const asked = shuffle(chosen.filter((item) => wordsOf(item.et).length <= TYPE_UP_TO_WORDS), random)
    .slice(0, PRODUCE_AT_MOST)
    .map((item) => produce(item, pool, after));
  const reworks = (lesson.reworks ?? []).slice(0, REWORK_AT_MOST).map((r) => reworkItem(r, after));
  return [...(match ? [match] : []), ...recog, ...gaps, ...replies, ...reworks, ...fixesFor(lesson, after, confusions), ...asked];
}

/**
 * The typed question for every word and phrase a lesson could ask to have
 * typed, not only the seeded few it does ask: what a test holds the marking to,
 * since which few are asked is a selection and how each is marked is a rule.
 */
export function everyTypedQuestion(lesson: LessonSpec, before: Ledger): PracticeItem[] {
  const tonight = lesson.teaches.flatMap(unfold);
  const pool = poolFor(tonight, before);
  const taught = teach(before, lesson.teaches, lessonRank(lesson), lesson.patterns);
  return onePerMeaning(practiceSubjects(lesson, before))
    .filter((item) => !meaningShows(item) && wordsOf(item.et).length <= TYPE_UP_TO_WORDS)
    .map((item) => produce(item, pool, taught));
}

/**
 * Step 6: older words, matched and picked out, and a line from an older
 * conversation with a gap in it. Empty on the first lesson.
 */
export function reviewFor(lesson: LessonSpec, before: Ledger, history: readonly LessonSpec[] = []): PracticeItem[] {
  const random = rng(seedFrom(`review:${lesson.id}`));
  const older = before.items.map((d) => d.item).filter((item) => !meaningShows(item));
  if (older.length === 0) return [];
  // The newest older lessons are likeliest to need it, so they are drawn from first.
  const recent = [...older].reverse().slice(0, REVIEW_ITEMS * 3);
  const picked = shuffle(recent, random).slice(0, REVIEW_ITEMS);
  const match = matchFrom(picked, random);
  const matched = new Set(match?.kind === "match" ? match.pairs.map((p) => p.et) : []);
  const rest = picked.filter((item) => !matched.has(item.et))
    .map((item) => recognise(item, neighboursFirst(item, before, [...older].reverse()), random));
  const gaps = gapsFrom(linesOf(history.slice(-CHECKIN_REACH)), before, random, 1);
  return [...(match ? [match] : []), ...rest, ...gaps];
}

export { normalisePhrase };

/** The slip floor for a one-letter difference (`lib/estonian/answer.ts`). */
const SLIP_FLOOR = 8;

/** An item answered by typing, which is marked by spelling rather than by the option picked. One test, so a new typed kind is added in one place. */
export type TypedItem = Extract<PracticeItem, { kind: "type" | "rework" | "fix" }>;
export function isTyped(item: PracticeItem): item is TypedItem {
  return item.kind === "type" || item.kind === "rework" || item.kind === "fix";
}

export interface TypedMark {
  readonly verdict: Verdict;
  /** What to say, in English, beside the answer. */
  readonly note: string;
  /**
   * A wrong answer most of the way there, which is painted nearly and still
   * says "Not quite" (`nearMiss`: the color, never the verdict).
   */
  readonly close: boolean;
}

/**
 * Every note a typed answer can be marked with, so each has one spelling and
 * every one is translated (`practice.test.ts` holds the second half).
 */
export const NOTES = {
  nothing: "Nothing typed.",
  right: "That's it.",
  marks: "Nearly: mind the letters with marks on them.",
  halfRight: "Half right: the word is in there, but only that one word was asked for.",
  letterOut: "Nearly: one letter out.",
  otherForm: "Not quite: that's another form you've learned, not a typo.",
  otherWord: "Not quite: that's another word you've learned, not a typo.",
  notQuite: "Not quite.",
  asItWas: "That's the sentence as it was. Change it the way the line above asks.",
  slipStill: "That's the line with the slip still in it.",
  otherOrder: "That's it. We wrote it in another order; ours is below.",
  pronoun: "That's it. Ours has the pronoun the other way, and both are right.",
  orderUnchecked: "These are the right words. We have them in another order; ours is below.",
  orderMarks: "Nearly: the right words, in another order. Mind the letters with marks on them.",
  opens: "The words are right, but start it the way the line above asks.",
  reasonPlace: "The words are right, but put the reason where the line above asks.",
  fixHalf: "The slip is put right. Mind the spelling of one other word.",
} as const;

/**
 * Whether two phrases are one letter apart on one word long enough for that
 * to be a slip of the hand (`SLIP_FLOOR`), every other word the same.
 *
 * Word by word, because in a sentence the one letter is often the whole point:
 * `poes` and `poest`, `raamatu` and `raamatut`, are one letter and two
 * meanings, and measured on the whole sentence they read as a typo.
 */
function oneLetterOut(said: string, want: string): boolean {
  const a = said.split(" ");
  const b = want.split(" ");
  if (a.length !== b.length) return false;
  const off = a.map((w, i) => [w, b[i]!] as const).filter(([x, y]) => x !== y);
  return off.length === 1 && off[0]![1].length >= SLIP_FLOOR && editDistance(off[0]![0], off[0]![1], 1) <= 1;
}

/**
 * How a typed or spoken answer compares with the phrase it was asked for.
 * `accept` is every spelling that counts, the asked one first.
 */
export function markPhrase(typed: string, accept: readonly string[], notSlips: readonly string[] = [], otherWords: readonly string[] = []): TypedMark {
  // Words read as `markRework` reads them: `mina` as `ma`, `pole` as `ei ole` (D1), digits kept.
  const said = spokenPhrase(typed);
  const wants = accept.map(spokenPhrase);
  const want = wants.find((w) => w === said) ?? wants.find((w) => fold(w) === fold(said)) ?? wants[0] ?? "";
  if (said.length === 0) return { verdict: "wrong", note: NOTES.nothing, close: false };
  /* "sa olid ja nad olid": a joining word between two answers, each a pronoun
     and its verb, is not part of either. Only there: `vabal ja ajal` is not
     `vabal ajal` with a join in it. */
  if (!wants.includes(said)) {
    const parts = said.split(/ (?:ja|ning) /u).map((p) => p.split(" "));
    const pronounAndVerb = (p: readonly string[]) => p.length === 2 && subjectPerson(p[0]!) !== undefined;
    const without = parts.map((p) => p.join(" ")).join(" ");
    if (parts.length > 1 && parts.every(pronounAndVerb) && wants.includes(without)) return { verdict: "right", note: NOTES.right, close: false };
  }
  if (said === want) return { verdict: "right", note: NOTES.right, close: false };
  /* ONLY THE MARKS DIFFER: the marks note, whatever else it spells. A learner
     with no õ key types `kook` for `köök` and `tool` for `tööl`, and that is
     the cause, even where the folded spelling is another taught word. */
  if (fold(said) === fold(want)) return { verdict: "nearly", note: NOTES.marks, close: false };
  // The one word asked for with more around it (`ma pole` for `pole`): half of it is right, which is worth saying.
  const saidWords = said.split(" ");
  const inside = (w: string) => {
    const ws = w.split(" ");
    return saidWords.length > ws.length && saidWords.some((_, i) => ws.every((x, j) => saidWords[i + j] === x));
  };
  if (accept.some((a, i) => wordsOf(a).length === 1 && wants[i]!.length > 0 && inside(wants[i]!))) {
    return { verdict: "nearly", note: NOTES.halfRight, close: false };
  }
  /* A spelling the learner has been taught is never a slip for another one:
     `raamatu` for `raamatut` and `kohtumisel` for `kohtumisele` are one letter
     and the very contrast the lesson teaches (another form of the word), and
     `kaheksa` for `kaheksas` is one letter and another word. */
  const lower = (ws: readonly string[]) => new Set(ws.map((w) => w.toLocaleLowerCase("et")));
  const forms = lower(notSlips);
  const words = lower(otherWords);
  const asked = new Set(want.split(" "));
  const typedOther = (set: ReadonlySet<string>) => saidWords.some((w) => set.has(w) && !asked.has(w));
  if (wants.some((w) => oneLetterOut(said, w))) {
    if (typedOther(forms)) return { verdict: "wrong", note: NOTES.otherForm, close: true };
    if (typedOther(words)) return { verdict: "wrong", note: NOTES.otherWord, close: true };
    return { verdict: "nearly", note: NOTES.letterOut, close: false };
  }
  return { verdict: "wrong", note: NOTES.notQuite, close: wants.some((w) => nearMiss(said, w)) };
}

/** Which word each taught spelling is a form of, read once per ledger: a family's own (`familiesOf`), or a word taught as itself. */
const WORD_OF = new WeakMap<Ledger, (spelling: string) => string | undefined>();
function wordOfIn(ledger: Ledger): (spelling: string) => string | undefined {
  const known = WORD_OF.get(ledger);
  if (known) return known;
  const families = familiesOf(ledger);
  const headwords = new Set(ledger.items.filter((d) => d.item.kind === "word").map((d) => d.item.et.toLocaleLowerCase("et")));
  const wordOf = (s: string) => families.of.get(s) ?? (headwords.has(s) ? s : undefined);
  WORD_OF.set(ledger, wordOf);
  return wordOf;
}

/** The taught near spellings of an answer's words, split by whether they are the same word (`notSlipsFor`). */
export interface NotSlips {
  /** Other forms of a word of the answer: `raamatut` beside `raamatud`. */
  readonly forms: string[];
  /** Other words: `kaheksa` beside `kaheksas`. */
  readonly words: string[];
}

/**
 * The taught spellings a slip of the hand would otherwise forgive for a word
 * of `answers`, which are therefore not slips: on a word long enough for a
 * letter out to count as a slip, one a letter away, said to be another form of
 * the same word where the ledger can tell they are and another word where it
 * cannot. A spelling that differs only in its marks is not here: that is the
 * marks note, whatever it spells. Carried on the item, since the marker reads
 * no ledger.
 */
export function notSlipsFor(answers: readonly string[], ledger: Ledger): NotSlips {
  const words = new Set(answers.flatMap((a) => normalisePhrase(a).split(" ")).filter(Boolean));
  const long = [...words].filter((w) => w.length >= SLIP_FLOOR);
  const wordOf = wordOfIn(ledger);
  const forms = new Set<string>();
  const others = new Set<string>();
  for (const spelling of ledger.spellings) {
    if (words.has(spelling) || spelling.includes(" ") || words.has(fold(spelling))) continue;
    for (const w of long) {
      if (fold(w) === fold(spelling) || Math.abs(w.length - spelling.length) > 1 || editDistance(spelling, w, 1) > 1) continue;
      const of = wordOf(spelling);
      if (of !== undefined && of === wordOf(w)) forms.add(spelling);
      else others.add(spelling);
    }
  }
  return { forms: [...forms].sort(), words: [...others].filter((s) => !forms.has(s)).sort() };
}

/** The item fields for `notSlipsFor`'s answer, the empty ones left off. */
const slipFields = (n: NotSlips) => ({
  ...(n.forms.length > 0 ? { notSlips: n.forms } : {}),
  ...(n.words.length > 0 ? { otherWords: n.words } : {}),
});

/**
 * The person a taught form's English names, read off the pronoun it opens
 * on: "I live", "we were", "you are, to one person you know", "you live,
 * polite or more than one". A form whose English opens on no pronoun ("would
 * be", "live, after {ei}") names none, which is right for the form after
 * `ei`, since that one is every person.
 */
export function personsInEnglish(en: string): Person[] {
  const out = new Set<Person>();
  for (const part of en.split(/[,;]\s*/)) {
    const first = part.trim().split(/\s+/)[0]?.toLocaleLowerCase("en") ?? "";
    if (first === "i") out.add("Sg1");
    else if (first === "we") out.add("Pl1");
    else if (first === "he" || first === "she") out.add("Sg3");
    else if (first === "they") out.add("Pl3");
    // "you leave, polite", "you would be, to more than one or politely": the plural you.
    else if (first === "you") out.add(/\bpolite(?:ly)?\b|\bmore than one\b/i.test(en) ? "Pl2" : "Sg2");
  }
  return [...out];
}

/**
 * Which person each finite form taught by now is, for the words of these
 * sentences only, so an item carries what its own marking reads and no more.
 *
 * EVERY VERB TAUGHT, HOWEVER IT WAS TAUGHT. A verb learned as a pair
 * (`ootama`, `ootan`) is conjugated off its first person; so is a verb learned
 * as a row of forms (`olen`, `oled`, `oleme`; `elan`, `elad`), off whichever
 * of its forms is an I-form, since the first and second persons take the same
 * endings on every stem, present, past or would (`olin`, `olid`, `olime`;
 * `oleksin`, `oleksid`). The form's own English says its person as well, which
 * covers a form taught without its I-form beside it. Read this way, `olema`
 * has persons, and `Olen huvitatud ajaloost` drops its `Mina` as `Ootan` does.
 */
export function personsFor(ledger: Ledger, sentences: readonly string[]): Persons {
  const wanted = new Set(sentences.flatMap((s) => wordsOf(s).map((w) => w.low)));
  const out: Record<string, Person[]> = {};
  const add = (value: string, persons: readonly Person[]) => {
    if (!wanted.has(value) || persons.length === 0 || NOT_A_PERSON.has(value)) return;
    out[value] = [...new Set([...(out[value] ?? []), ...persons])];
  };
  for (const verb of ledger.verbs) for (const f of personForms({ lemma: verb.lemma, pres1sg: verb.first })) add(f.value, f.persons);
  for (const past of ledger.pasts) for (const f of personForms({ lemma: "", pres1sg: null, past1sg: past })) add(f.value, f.persons);
  for (const { item } of ledger.items) {
    if (item.kind !== "form" || !/(?:ma|da)$/u.test(item.of)) continue;
    const low = item.et.toLocaleLowerCase("et");
    const named = personsInEnglish(item.en);
    add(low, named);
    if (named.includes("Sg1") && low.endsWith("n")) {
      for (const f of personForms({ lemma: item.of, pres1sg: low })) add(f.value, f.persons.filter((p) => DROPPABLE_PERSONS.has(p)));
    }
  }
  return out;
}

/**
 * A first person that is a particle far more often than a verb: `palun` is
 * "I ask" and is "please" in every request a lesson writes (`Tule palun
 * homme`), so read as a verb it agreed with an `ma` put in front of a command.
 */
const NOT_A_PERSON: ReadonlySet<string> = new Set(["palun"]);

/** The persons whose pronoun Estonian drops beside a verb that says it; a third person's ending on another stem is not read. */
const DROPPABLE_PERSONS: ReadonlySet<Person> = new Set(["Sg1", "Sg2", "Pl1", "Pl2"]);

/** Every sentence a rework or a fix counts, which is what the dictionary is asked about to fill `orders`. */
export function acceptedSentences(items: readonly PracticeItem[]): string[] {
  return items.flatMap((item) => (item.kind === "rework" || item.kind === "fix" ? item.accept : []));
}

/**
 * The reworks and fixes with the orders of their sentences the dictionary
 * vouches for (`lessonOrders`), given its reading of the words; everything
 * else as it was. Where the lesson is read (`lib/progress/lessonView.ts`).
 */
export function withOrders(items: readonly PracticeItem[], dict: OrderContext): PracticeItem[] {
  return items.map((item) => {
    if (item.kind !== "rework" && item.kind !== "fix") return item;
    const orders = [...new Set(item.accept.flatMap((a) => lessonOrders(a, dict)))]
      .filter((o) => !item.accept.map(normalisePhrase).includes(normalisePhrase(o)));
    return { ...item, orders };
  });
}

/**
 * HOW A CHANGED SENTENCE COMPARES WITH THE ONES THAT COUNT.
 *
 * Not `markPhrase`, for one reason: a letter out in a sentence is often the
 * whole point, since `raamatu` and `raamatut` are one letter and two meanings,
 * so no slip is forgiven here except on the other word of a fix.
 *
 * A sentence is right where it is one that counts, or one of them said
 * another way the marker can vouch for (`sameSentence.ts`: a pronoun's short
 * or long spelling, a first- or second-person subject left out or put in
 * beside a verb that says who, a reason or condition moved to the other end,
 * or another order the dictionary vouches for, `orders`); each of those but
 * the first says so, and the sentence written down is shown beside it. The
 * same words in an order nothing here can vouch for are nearly, with a note
 * that says only that: Estonian word order is free enough that some of those
 * are right and some are not, and this cannot tell which.
 */
export function markRework(typed: string, item: Extract<PracticeItem, { kind: "rework" | "fix" }>): TypedMark {
  const said = spokenPhrase(typed);
  const wants = item.accept.map(spokenPhrase);
  if (said.length === 0) return { verdict: "wrong", note: NOTES.nothing, close: false };
  if (wants.includes(said)) return { verdict: "right", note: NOTES.right, close: false };
  // The sentence typed back unchanged, however it is reordered or spelled, is not a change.
  const before = item.kind === "fix" ? item.shown : item.from.et;
  const unchanged = sameSentence(before, typed, item.persons);
  if (unchanged && (unchanged.how === "same" || unchanged.how === "order")) {
    return { verdict: "wrong", note: item.kind === "fix" ? NOTES.slipStill : NOTES.asItWas, close: false };
  }
  // An ask naming how it starts is answered only by a sentence that starts that way, `Mina ei` for `Ma ei` included (D1).
  const opens = item.kind === "rework" ? item.opens : null;
  const opensRight = !opens || said.startsWith(`${spokenPhrase(opens)} `) || said === spokenPhrase(opens);
  /* Each sentence that counts, two or three accepted changes made at once and a
     demonstrative put before the noun it stands for (`combinedSentences`, read
     as ours, since every change in them is in a row the native speaker wrote),
     then each order the dictionary vouches for, and how the typed one says it. */
  const length = wordCount(said);
  const combined = combinedFor(item).filter((s) => Math.abs(wordCount(s) - length) <= 1);
  const ways = [
    ...[...item.accept, ...combined].map((w) => ({ m: sameSentence(w, typed, item.persons), ours: true })),
    ...item.orders.map((w) => ({ m: sameSentence(w, typed, item.persons), ours: false })),
  ].flatMap(({ m, ours }) => (m ? [{ ...m, ours }] : []));
  const find = (how: "same" | "pronoun" | "order", folded: boolean, ours?: boolean) =>
    ways.find((w) => w.how === how && w.folded === folded && (ours === undefined || w.ours === ours));
  if (!opensRight && ways.length > 0) return { verdict: "nearly", note: NOTES.opens, close: false };
  /*
    AN ASK THAT PUTS THE REASON IN ITS PLACE IS ANSWERED IN THAT PLACE. A
    reason moved to the other end is right (D3), and "You can put the reason
    first" allows it; "the reason second" and "the reason first" ask for one
    end, so the swapped sentence is the right words where the line did not ask.
  */
  const placed = item.kind === "rework" ? reasonPlace(item.ask) : null;
  if (placed && ways.length > 0) {
    // Read off the sentence typed, since an order the dictionary vouches for (`orders`) may be the swapped one.
    const reasonFirst = FRONTABLE.has(said.split(" ")[0] ?? "");
    if (reasonFirst !== (placed === "first")) return { verdict: "nearly", note: NOTES.reasonPlace, close: false };
  }
  if (find("same", false, true)) return { verdict: "right", note: NOTES.right, close: false };
  if (find("same", false, false)) return { verdict: "right", note: NOTES.otherOrder, close: false };
  if (find("pronoun", false)) return { verdict: "right", note: NOTES.pronoun, close: false };
  if (find("same", true, true)) return { verdict: "nearly", note: NOTES.marks, close: false };
  if (find("pronoun", true)) return { verdict: "nearly", note: NOTES.marks, close: false };
  if (find("same", true, false)) return { verdict: "nearly", note: NOTES.orderMarks, close: false };
  if (find("order", false)) return { verdict: "nearly", note: NOTES.orderUnchecked, close: false };
  if (find("order", true)) return { verdict: "nearly", note: NOTES.orderMarks, close: false };
  /*
    A FIX IS ABOUT ONE WORD. The whole line is retyped, so a slip of the hand
    anywhere else in it used to cost the fix itself: the learner put the slip
    right and read "Not quite". Where the word in question is now right and the
    only other difference is one letter out on a word long enough for that to
    be a slip, it is nearly, and says which half they got. (A difference in
    marks alone is caught above, as the whole line folded.)
  */
  if (item.kind === "fix") {
    const typedWords = said.split(" ");
    const wanted = spokenPhrase(item.answer).split(" ");
    const right = spokenPhrase(item.right);
    if (typedWords.length === wanted.length && typedWords.includes(right) && !typedWords.includes(spokenPhrase(item.wrong))) {
      const off = typedWords.map((w, i) => ({ w, want: wanted[i]! })).filter(({ w, want }) => w !== want);
      // `sina` typed for `mina` is a different word and not a slip, so only one letter out from eight letters up.
      const taught = new Set([...(item.notSlips ?? []), ...(item.otherWords ?? [])]);
      if (off.length === 1 && off[0]!.want.length >= SLIP_FLOOR && editDistance(off[0]!.w, off[0]!.want, 1) <= 1 && !taught.has(off[0]!.w)) {
        return { verdict: "nearly", note: NOTES.fixHalf, close: false };
      }
    }
  }
  // Never painted as nearly: a third of a sentence's letters is room for the one ending the exercise is about.
  return { verdict: "wrong", note: NOTES.notQuite, close: false };
}

const wordCount = (text: string) => (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;

/** A rework's combined sentences, worked out once per item (`combinedSentences`); a fix has one line and none. */
const COMBINED = new WeakMap<object, readonly string[]>();
function combinedFor(item: Extract<PracticeItem, { kind: "rework" | "fix" }>): readonly string[] {
  if (item.kind !== "rework") return [];
  const known = COMBINED.get(item);
  if (known) return known;
  const made = combinedSentences(item.answer, item.accept.slice(1), item.persons);
  COMBINED.set(item, made);
  return made;
}

/**
 * Where a rework's ask puts the reason: "Join them with {kuna}, the reason
 * second" asks for one end. "You can put the reason first" offers a choice,
 * and so fixes nothing.
 */
export function reasonPlace(ask: string): "first" | "second" | null {
  if (/\byou can put\b/i.test(ask)) return null;
  const m = /\bthe reason (first|second)\b/i.exec(ask);
  return m ? (m[1]!.toLowerCase() as "first" | "second") : null;
}

/** A typed item marked by the marker its kind takes, the one place that choice is made. */
export function markTyped(item: TypedItem, typed: string): TypedMark {
  return item.kind === "type" ? markPhrase(typed, item.accept, item.notSlips, item.otherWords) : markRework(typed, item);
}

/**
 * How an answer about yourself compares with the model: as `markPhrase` does,
 * against the model with your name in it, and with the stand-in's place open
 * to any one word, so `Minu nimi on Amanda` is "That's it."
 */
export function markOwnAnswer(typed: string, model: string, name: string | null, also: readonly string[] = []): TypedMark {
  const accept = [...(name ? [personal(model, name), model] : [model]), ...also];
  const mark = markPhrase(typed, accept);
  if (mark.verdict === "right" || !hasStandIn(model)) return mark;
  const said = spokenPhrase(typed).split(" ").filter(Boolean);
  const want = spokenPhrase(model).split(" ");
  const slot = want.indexOf(STAND_IN.toLowerCase());
  // The name may be one word or up to three (`Mary-Ann`, `Amanda Lucas`); everything around it is held as the model has it.
  const extra = said.length - want.length;
  if (slot < 0 || extra < 0 || extra > 2) return mark;
  let folded = false;
  const around = [...want.slice(0, slot).map((w, i) => [said[i], w] as const), ...want.slice(slot + 1).map((w, i) => [said[slot + 1 + extra + i], w] as const)];
  for (const [s, w] of around) {
    if (s === w) continue;
    if (s !== undefined && fold(s) === fold(w)) { folded = true; continue; }
    return mark;
  }
  return folded
    ? { verdict: "nearly", note: NOTES.marks, close: false }
    : { verdict: "right", note: NOTES.right, close: false };
}

/*
  THE CHECK AT THE END OF A PART, AND AT THE END OF A1.

  The October feedback: a learner flew through all 49 A1 lessons without
  practicing anything, and asked for a short test after each part and a
  bigger one at the end of A1 before A2 opens. A check is the lesson's own
  questions, recognize then produce, drawn from every lesson of the part
  rather than one evening, and marked here the same way the lesson marks
  them. It is built from the lessons alone, so it asks nothing a lesson did
  not teach, and seeded by its id and the attempt, so the server rebuilds the
  very paper it marks and a second go asks a different selection.
*/

/** The share of a check that passes it. */
export const CHECK_PASS = 0.8;

/** How many questions of each kind a check asks. */
export interface CheckSize {
  readonly recognise: number;
  /** Lines of the part's conversations with a form taken out: the patterns, asked. */
  readonly gap: number;
  readonly produce: number;
}

/** A part's check: about five minutes. */
export const PART_CHECK: CheckSize = { recognise: 10, gap: 4, produce: 6 };
/** The check at the end of a level: every part, about ten minutes. */
export const LEVEL_CHECK: CheckSize = { recognise: 18, gap: 6, produce: 12 };

/** How many questions a check of this size asks, where the lessons can fill it. */
export const checkLength = (size: CheckSize) => size.recognise + size.gap + size.produce;

/**
 * The questions of one check: `scope` is the lessons it covers, in order, and
 * `all` every lesson of the course, which is what the ledger is built over.
 */
export function checkFor(
  all: readonly LessonSpec[], scope: readonly LessonSpec[], seed: string, size: CheckSize,
): PracticeItem[] {
  const last = scope[scope.length - 1];
  if (!last) return [];
  const ledger = ledgerThrough(all, last.id);
  if (!ledger) return [];
  const covered = new Set(scope.map(lessonRank));
  const subjects = onePerMeaning(ledger.items.filter((d) => covered.has(d.lesson)).map((d) => d.item))
    .filter((item) => !meaningShows(item));
  const random = rng(seedFrom(`check:${seed}`));
  const pool = [...ledger.items].reverse().map((d) => d.item);
  /*
    NO QUESTION PRINTS ANOTHER ONE'S ANSWER. A meaning picked out shows its
    Estonian, so a typed question asking for that same Estonian later in the
    paper is answered by scrolling up; and a gap shows its whole line. So the
    typed questions are chosen first, the picks from what is left, and the
    gaps from lines holding none of the typed answers wherever there are
    enough of those.
  */
  const order = shuffle(subjects, random);
  const typed = order.filter((item) => wordsOf(item.et).length <= TYPE_UP_TO_WORDS).slice(0, size.produce);
  // By spelling, since `kino` the word and `kino` its [omastav] (2nd form) are two items and one answer.
  const held = new Set(typed.map((item) => item.et.toLocaleLowerCase("et")));
  const recog = order.filter((item) => !held.has(item.et.toLocaleLowerCase("et"))).slice(0, size.recognise)
    .map((item) => recognise(item, neighboursFirst(item, ledger, pool), random));
  const answers = typed.map((item) => normalisePhrase(item.et));
  const shows = (line: Said) => {
    const said = ` ${normalisePhrase(line.et)} `;
    return answers.some((a) => said.includes(` ${a} `));
  };
  const lines = linesOf(scope);
  const clean = gapsFrom(lines.filter((l) => !shows(l)), ledger, random, size.gap);
  const gaps = clean.length >= size.gap
    ? clean
    : [...clean, ...gapsFrom(lines.filter(shows), ledger, random, size.gap - clean.length)];
  const asked = shuffle(typed, random).map((item) => produce(item, pool, ledger));
  return [...recog, ...gaps, ...asked];
}

export interface CheckResult {
  /** Points, a right answer one and a nearly half. */
  readonly score: number;
  readonly total: number;
  readonly passed: boolean;
  /** Per question, in order. */
  readonly marks: readonly ("right" | "nearly" | "wrong")[];
}

/** Marks a check from what was picked or typed for each question, in order. */
export function markCheck(items: readonly PracticeItem[], responses: readonly (string | null)[]): CheckResult {
  const marks = items.map((item, i) => {
    const said = responses[i] ?? "";
    // A match is never on a check: it is several answers in one, and a check marks one each.
    if (item.kind === "match") return "wrong" as const;
    if (!isTyped(item)) return said === item.answer ? "right" as const : "wrong" as const;
    const mark = markTyped(item, said).verdict;
    return mark === "right" ? "right" as const : mark === "nearly" ? "nearly" as const : "wrong" as const;
  });
  const score = marks.reduce((sum, m) => sum + (m === "right" ? 1 : m === "nearly" ? 0.5 : 0), 0);
  const total = items.length;
  return { score, total, passed: total > 0 && score / total >= CHECK_PASS, marks };
}
