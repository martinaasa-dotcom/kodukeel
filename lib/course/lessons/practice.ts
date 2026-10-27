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
 * and a letter out is nearly only from eight letters up, which is
 * `lib/estonian/answer.ts`'s measured floor, because below it a letter out is
 * as often another word (`mina` and `sina`).
 *
 * Pure: no React, no Prisma, no clock. Seeded, so a reload asks the same
 * questions in the same order.
 */

import { editDistance, nearMiss } from "@/lib/estonian/answer";
import { fold } from "@/lib/estonian/fold";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { estonianIn, familiesOf, ledgerThrough, lessonRank, teach, unfold, withSlip, wordsOf, type Asked, type Ledger } from "./ledger";
import { STAND_IN, hasStandIn, personal } from "./ownAnswer";
import type { LessonSpec } from "./types";

/** What practice asks about: a verb is already its two spellings here. */
type Taught = Asked;
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
      readonly note?: string }
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
      readonly answer: string; readonly answerEn: string; readonly accept: readonly string[] }
  /**
   * A line with one word swapped for another form of it (`Fix`), typed back
   * put right. `shown` is the line with the slip, `answer` the line itself.
   */
  | { readonly kind: "fix"; readonly shown: string; readonly en: string; readonly answer: string;
      readonly accept: readonly string[]; readonly wrong: string; readonly right: string; readonly why: string };

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
export function fixesFor(lesson: LessonSpec, confusions: readonly (readonly [string, string])[] = []): PracticeItem[] {
  const rank = new Map(confusions.map((pair, i) => [pairKey(pair), i] as const));
  const ordered = (lesson.fixes ?? [])
    .map((fix, i) => ({ fix, i, mine: rank.get(pairKey(fix.pair)) }))
    .sort((a, b) => (a.mine ?? Infinity) - (b.mine ?? Infinity) || a.i - b.i);
  return ordered.slice(0, FIX_AT_MOST).map(({ fix }): PracticeItem => ({
    kind: "fix", shown: withSlip(fix), en: fix.line.en, answer: fix.line.et, accept: [fix.line.et],
    wrong: fix.wrong, right: fix.right, why: fix.why,
  }));
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
export function meaningShows(item: Taught): boolean {
  const asked = new Set(wordsOf(item.et).map((w) => w.low));
  return estonianIn(item.en).some((et) => wordsOf(et).some((w) => asked.has(w.low)));
}

/**
 * Three wrong meanings for `item`, from what has been taught, today's first.
 * Never a meaning equal to the answer's, since two right options are a trick.
 */
function optionsFor(item: Taught, pool: readonly Taught[], random: () => number): string[] {
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
function recognise(item: Taught, pool: readonly Taught[], random: () => number): PracticeItem {
  const options = optionsFor(item, pool, random);
  return wordsOf(item.et).length > 1
    ? { kind: "hear", et: item.et, options, answer: item.en }
    : { kind: "pick", et: item.et, options, answer: item.en };
}

/** The pool options are drawn from: today's items, then the most recent first. */
function poolFor(tonight: readonly Taught[], before: Ledger): Taught[] {
  return [...tonight, ...[...before.items].reverse().map((d) => d.item)];
}

/**
 * `list` with whatever stands nearest `item` in it first: a lesson keeps its
 * kinds together, so a da-form is asked among da-forms and a weekday among
 * weekdays, and the right answer is never the only one of its kind.
 */
function nearestFirst(item: Taught, list: readonly Taught[]): Taught[] {
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
function neighboursFirst(item: Taught, before: Ledger, rest: readonly Taught[]): Taught[] {
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
export function practiceSubjects(lesson: LessonSpec, before: Ledger): Taught[] {
  if (lesson.teaches.length > 0) return lesson.teaches.flatMap(unfold);
  const since = lessonRank(lesson) - CHECKIN_REACH;
  return before.items.filter((d) => d.lesson >= since).map((d) => d.item);
}

/** One item per English meaning, keeping the first, so "I" is not asked twice. */
function onePerMeaning(items: readonly Taught[]): Taught[] {
  const out: Taught[] = [];
  for (const item of items) if (!out.some((o) => sameEnglish(o.en, item.en))) out.push(item);
  return out;
}

/**
 * The English of the subject pronouns that name one person, so a verb in that
 * person may be typed with its pronoun. "You" is left out: it is `sa` and `te`,
 * and a verb for one must not be accepted with the other.
 */
const SUBJECTS = new Set(["i", "we", "they", "he she"]);

/**
 * "you were, they were" is one spelling for two persons, so it may be said
 * once or with each pronoun, in either order: `sa olid nad olid`. The
 * pronouns are the taught ones whose English opens each part; "you" means the
 * one-person `sa` here, since the polite and plural `te` takes another ending.
 */
function eachWithItsPronoun(item: Taught, pool: readonly Taught[]): string[] {
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

function noteFor(item: Taught): { note?: string } {
  if (/^with \{on\}:/i.test(item.en)) return { note: NOTE_WITH_ON };
  const parts = item.en.split(/,\s+/);
  // "you were, they were": two meanings, one spelling, which reads as two answers to give.
  // Only where each part is a different person ("you were, they were"), never a qualifier or a synonym.
  const people = parts.map(personOf);
  if (parts.length > 1 && people.every((p) => p !== null) && new Set(people).size === parts.length && wordsOf(item.et).length === 1) return { note: NOTE_ONE_WORD };
  return {};
}

/** A produce question, taking every taught spelling with the same English. */
function produce(item: Taught, pool: readonly Taught[]): PracticeItem {
  /* "outside/outdoors" is two English words for one meaning, so a taught word
     glossed with either one is right as well. Only a slash says so: a comma
     joins senses ("juice, some juice") and must not. */
  const senses = (en: string) => en.split("/").map((sense) => sense.trim().toLocaleLowerCase("en"));
  const sharesSense = (o: Taught) => {
    const mine = senses(item.en);
    return senses(o.en).some((sense) => mine.includes(sense)) && (mine.length > 1 || senses(o.en).length > 1);
  };
  const accept = [...new Set([item.et, ...pool.filter((o) => sameEnglish(o.en, item.en) || sharesSense(o)).map((o) => o.et)])];
  /* A person ending says who is meant, so Estonian drops the pronoun, and
     `me oleme` is as right as `oleme` for "we are". The pronouns are the taught
     items whose English is the first word of this one's, never a list of ours.
     Only where the verb has one spelling: "you are" is `oled` and `olete`, and
     crossing those with every "you" would accept a person the verb does not. */
  if (accept.length === 1 && wordsOf(item.et).length === 1) {
    const lead = (text: string) => text.replace(/,/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
    const said = lead(item.en);
    for (const o of pool) {
      if (o.et === item.et || wordsOf(o.et).length !== 1) continue;
      const names = [o.en, ...o.en.split(/,\s*/)].map(lead).filter(Boolean);
      // The pronoun stands for the whole of the English before one last word, the verb.
      if (names.some((n) => SUBJECTS.has(n) && said.startsWith(`${n} `) && !said.slice(n.length + 1).includes(" "))) {
        const joined = `${o.et} ${item.et}`;
        if (!accept.includes(joined)) accept.push(joined);
      }
    }
    /* "with {on}: we have" is `meil`, said whole as `meil on`. */
    if (/^with \{on\}:/i.test(item.en)) accept.push(`${item.et} on`);
  }
  const note = noteFor(item);
  if (note.note === NOTE_ONE_WORD) accept.push(...eachWithItsPronoun(item, pool));
  return { kind: "type", en: item.en, answer: item.et, accept, ...note };
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
function matchFrom(items: readonly Taught[], random: () => number): PracticeItem | null {
  const fit: Taught[] = [];
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
    .map((item) => produce(item, pool));
  const reworks = (lesson.reworks ?? []).slice(0, REWORK_AT_MOST).map((r): PracticeItem => ({
    kind: "rework", from: r.from, ask: r.ask, answer: r.to.et, answerEn: r.to.en, accept: [r.to.et, ...(r.also ?? [])],
  }));
  return [...(match ? [match] : []), ...recog, ...gaps, ...replies, ...reworks, ...fixesFor(lesson, confusions), ...asked];
}

/**
 * The typed question for every word and phrase a lesson could ask to have
 * typed, not only the seeded few it does ask: what a test holds the marking to,
 * since which few are asked is a selection and how each is marked is a rule.
 */
export function everyTypedQuestion(lesson: LessonSpec, before: Ledger): PracticeItem[] {
  const tonight = lesson.teaches.flatMap(unfold);
  const pool = poolFor(tonight, before);
  return onePerMeaning(practiceSubjects(lesson, before))
    .filter((item) => !meaningShows(item) && wordsOf(item.et).length <= TYPE_UP_TO_WORDS)
    .map((item) => produce(item, pool));
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

/** A phrase as it is compared: lower case, no punctuation, single spaces. */
export function normalisePhrase(text: string): string {
  return wordsOf(text).map((w) => w.low).join(" ");
}

/** The slip floor for a one-letter difference (`lib/estonian/answer.ts`). */
const SLIP_FLOOR = 8;

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
 * How a typed or spoken answer compares with the phrase it was asked for.
 * `accept` is every spelling that counts, the asked one first.
 */
export function markPhrase(typed: string, accept: readonly string[]): TypedMark {
  const said = normalisePhrase(typed);
  const wants = accept.map(normalisePhrase);
  const want = wants.find((w) => w === said) ?? wants.find((w) => fold(w) === fold(said)) ?? wants[0] ?? "";
  if (said.length === 0) return { verdict: "wrong", note: "Nothing typed.", close: false };
  // "sa olid ja nad olid": the joining word is not part of the answer.
  if (!wants.includes(said)) {
    const without = said.split(" ").filter((w) => w !== "ja" && w !== "ning").join(" ");
    if (without !== said && wants.includes(without)) return { verdict: "right", note: "That's it.", close: false };
  }
  if (said === want) return { verdict: "right", note: "That's it.", close: false };
  if (fold(said) === fold(want)) return { verdict: "nearly", note: "Nearly: mind the letters with marks on them.", close: false };
  // The right word with more around it: half of it is right, which is worth saying.
  if (said.split(" ").length > 1 && wants.some((w) => w.length > 0 && !w.includes(" ") && said.split(" ").includes(w))) {
    return { verdict: "nearly", note: "Half right: the word is in there, but only that one word was asked for.", close: false };
  }
  if (wants.some((w) => w.length >= SLIP_FLOOR && editDistance(said, w, 1) <= 1)) return { verdict: "nearly", note: "Nearly: one letter out.", close: false };
  return { verdict: "wrong", note: "Not quite.", close: wants.some((w) => nearMiss(said, w)) };
}

/**
 * HOW A CHANGED SENTENCE COMPARES WITH THE ONES THAT COUNT.
 *
 * Not `markPhrase`, for one reason: its slip rule forgives a letter out from
 * eight letters up, and in a sentence that letter is often the whole point,
 * since `raamatu` and `raamatut` are one letter and two meanings. So a changed
 * sentence is right where its words are the words of one that counts, nearly
 * where only the letters with marks on them differ, and otherwise not, with
 * one more thing worth saying: the sentence typed back unchanged.
 */
export function markRework(typed: string, item: Extract<PracticeItem, { kind: "rework" | "fix" }>): TypedMark {
  const said = normalisePhrase(typed);
  const wants = item.accept.map(normalisePhrase);
  if (said.length === 0) return { verdict: "wrong", note: "Nothing typed.", close: false };
  if (wants.includes(said)) return { verdict: "right", note: "That's it.", close: false };
  if (wants.some((w) => fold(w) === fold(said))) return { verdict: "nearly", note: "Nearly: mind the letters with marks on them.", close: false };
  if (said === normalisePhrase(item.kind === "fix" ? item.shown : item.from.et)) {
    return item.kind === "fix"
      ? { verdict: "wrong", note: "That's the line with the slip still in it.", close: false }
      : { verdict: "wrong", note: "That's the sentence as it was. Change it the way the line above asks.", close: false };
  }
  return { verdict: "wrong", note: "Not quite.", close: wants.some((w) => nearMiss(said, w)) };
}

/**
 * How an answer about yourself compares with the model: as `markPhrase` does,
 * against the model with your name in it, and with the stand-in's place open
 * to any one word, so `Minu nimi on Amanda` is "That's it."
 */
export function markOwnAnswer(typed: string, model: string, name: string | null): TypedMark {
  const accept = name ? [personal(model, name), model] : [model];
  const mark = markPhrase(typed, accept);
  if (mark.verdict === "right" || !hasStandIn(model)) return mark;
  const said = wordsOf(typed).map((w) => w.low);
  const want = wordsOf(model).map((w) => w.low);
  if (said.length !== want.length) return mark;
  const slot = STAND_IN.toLowerCase();
  let folded = false;
  for (let i = 0; i < want.length; i++) {
    if (want[i] === slot) continue;
    if (said[i] === want[i]) continue;
    if (fold(said[i]!) === fold(want[i]!)) { folded = true; continue; }
    return mark;
  }
  return folded
    ? { verdict: "nearly", note: "Nearly: mind the letters with marks on them.", close: false }
    : { verdict: "right", note: "That's it.", close: false };
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
  const asked = shuffle(typed, random).map((item) => produce(item, pool));
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
    if (item.kind !== "type" && item.kind !== "rework" && item.kind !== "fix") return said === item.answer ? "right" as const : "wrong" as const;
    const mark = (item.kind === "type" ? markPhrase(said, item.accept) : markRework(said, item)).verdict;
    return mark === "right" ? "right" as const : mark === "nearly" ? "nearly" as const : "wrong" as const;
  });
  const score = marks.reduce((sum, m) => sum + (m === "right" ? 1 : m === "nearly" ? 0.5 : 0), 0);
  const total = items.length;
  return { score, total, passed: total > 0 && score / total >= CHECK_PASS, marks };
}
