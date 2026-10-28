/**
 * NEVER ASK WHAT HAS NOT BEEN TAUGHT, AS A CHECK RATHER THAN A HABIT
 * (docs/43-lessons.md §3).
 *
 * The operator's rule for every level: nothing a learner is shown to read, say
 * or answer may hold a word they have not been taught by that evening. A rule
 * kept by care is broken by the first tired evening of writing, and the plan's
 * own draft conversations broke it three times in seven lessons (`kes` in the
 * lesson before `kes`, `ja` three lessons early, `Maril` eleven lessons
 * early), so it is a function the unit suite runs over every lesson in order.
 *
 * WHAT COUNTS AS TAUGHT. A word or a form is its one spelling. A phrase covers
 * its own words only where they stand together as the phrase: `Ma ei saa aru`
 * makes `saa` sayable inside that phrase and nowhere else, which is "chunks
 * first" written as a rule. Names are not vocabulary and are let through, both
 * the shared list below and the lesson's own cast. Nothing else is: there is no
 * "close enough" here, because a spelling the learner has never seen is the
 * whole of what this exists to catch.
 *
 * WHAT IT READS. Every piece of Estonian a lesson puts on a screen: the
 * conversation, the rule's Estonian in braces, its table, the questions and
 * the model answers, the role-play. The practice and the review are built from
 * the ledger itself (`practice.ts`), so they cannot ask anything else, and the
 * test asks that of them too rather than trusting it.
 *
 * Pure: no React, no Prisma, no clock.
 */

import { conditional, imperativeSingular, negativePresent, pastPersons, presentTense, VERB_SLOTS } from "@/lib/estonian/conjugate";
import { CASES } from "@/lib/estonian/cases";
import { buildCaseTable } from "@/lib/estonian/derive";
import { levelIndex } from "@/lib/collections/syllabus/types";
import { nativeClip } from "@/lib/audio/native";
import { lessonLabel } from "./label";
import type { Fix, LessonSpec, PatternId, Taught } from "./types";

/** A taught item as a learner is asked about it: a verb counts as its two spellings. */
export type Asked = Exclude<Taught, { kind: "verb" }>;

/**
 * A verb as the two items it is asked as: its ma-form, and its I-form. Every
 * other kind is itself.
 */
export function unfold(item: Taught): readonly Asked[] {
  if (item.kind !== "verb") return [item];
  // The same two objects every time, so a caller can find one in a list it unfolded earlier.
  const held = UNFOLDED.get(item);
  if (held) return held;
  const pair: Asked[] = [
    { kind: "word", et: item.et, en: item.en },
    { kind: "form", et: item.first, of: item.et, en: item.firstEn },
  ];
  UNFOLDED.set(item, pair);
  return pair;
}

const UNFOLDED = new WeakMap<Taught, readonly Asked[]>();

/**
 * People's names a lesson may use without teaching them. Names are not
 * Estonian vocabulary, and every one here is a name an Estonian conversation
 * plausibly has in it. A lesson's cast is allowed on top of these.
 */
export const NAMES: ReadonlySet<string> = new Set([
  "Mari", "Tom", "Jaan", "Anna", "Peeter", "Kati", "Liis", "Smith",
  /*
    And the same names with an ending on, from A2, where a name takes the
    endings every noun does: {Jaani telefon}, {Marile}, {Peetriga}. Still not
    vocabulary, and still the only words let through on that ground.
  */
  "Jaani", "Peetri", "Liisi", "Marit", "Marile", "Maril", "Marilt", "Mariga",
  "Jaanile", "Jaaniga", "Liisile", "Liisiga", "Katile", "Katiga", "Annale", "Annaga", "Peetrile", "Peetriga",
]);

/** The word an item is about: a form's lemma, or the item itself. */
function wordOf(item: Asked): string {
  return item.kind === "form" ? item.of : item.et;
}

/**
 * Places, spelled with the capital a place takes. The forms list holds no
 * capitalized word, so `Eestis` is not in it however often it is said; these
 * are the spellings the forms check lets through on that ground and no other.
 * The ledger is not loosened by it: a place is still taught before it is
 * shown, like any word.
 */
export const PLACE_SPELLINGS: ReadonlySet<string> = new Set(["Eestis", "Eestist", "Eestisse", "Ameerikast", "Ukrainast", "Soomest", "Rootsist", "Rootsis", "Lätist"]);

export interface Ledger {
  /** Every single spelling taught, lower-cased. */
  readonly spellings: ReadonlySet<string>;
  /** Every phrase taught, as its words lower-cased, so its words are covered only together. */
  readonly phrases: readonly (readonly string[])[];
  /** Everything taught, in the order it was taught, with the lesson that taught it. */
  readonly items: readonly { readonly item: Asked; readonly lesson: number }[];
  /** The patterns explained so far. */
  readonly patterns: ReadonlySet<PatternId>;
  /** Every verb taught as a pair, which a pattern builds more forms from. */
  readonly verbs: readonly { readonly lemma: string; readonly first: string }[];
  /** Every noun whose [omastav] (2nd form) was taught as its stem, which the case patterns build on. */
  readonly stems: readonly { readonly lemma: string; readonly gen: string }[];
  /** Every past I form taught, which the `past` pattern builds the other persons from. */
  readonly pasts: readonly string[];
}

export const EMPTY_LEDGER: Ledger = { spellings: new Set(), phrases: [], items: [], patterns: new Set(), verbs: [], stems: [], pasts: [] };

/**
 * WHERE A LESSON STANDS IN THE WHOLE COURSE, AS ONE NUMBER.
 *
 * A lesson's `n` counts from 1 in its own level, so A2's lesson 5 and A1's
 * lesson 5 share a number, and everything the ledger keys on a lesson (which
 * lesson taught an item, how far back a check-in reaches, which lessons a
 * check covers) would mix the two. The level goes in front, a thousand apart,
 * which no level will ever fill.
 */
export function lessonRank(lesson: Pick<LessonSpec, "level" | "n">): number {
  return levelIndex(lesson.level) * 1000 + lesson.n;
}

/** The case endings each pattern explains, by the case keys `derive.ts` builds them under. */
const CASE_PATTERNS: Partial<Record<PatternId, readonly string[]>> = {
  inside: ["INESSIVE", "ILLATIVE", "ELATIVE"],
  outside: ["ADESSIVE", "ALLATIVE", "ABLATIVE"],
  comitative: ["COMITATIVE"],
  translative: ["TRANSLATIVE"],
  terminative: ["TERMINATIVE"],
  essive: ["ESSIVE"],
  abessive: ["ABESSIVE"],
};

/** The case keys a pattern explains, for a screen naming the page it is. */
export function casesOfPattern(pattern: PatternId): readonly string[] {
  return CASE_PATTERNS[pattern] ?? [];
}

/**
 * The forms the explained case patterns build on one taught stem, lower-cased.
 * Read off `buildCaseTable`, the one place a suffix is joined to a stem, so
 * the long illative is built (`linnasse`) and the short one, which no rule
 * reaches, is left to be taught by name.
 */
function builtCases(stem: { lemma: string; gen: string }, patterns: ReadonlySet<PatternId>): string[] {
  const keys = new Set([...patterns].flatMap((p) => CASE_PATTERNS[p] ?? []));
  if (keys.size === 0) return [];
  return buildCaseTable({ nomSg: stem.lemma, genSg: stem.gen, illSgShort: null, nomPl: null })
    .filter((f) => keys.has(f.spec.key) && f.origin === "DERIVED" && f.singular)
    .map((f) => f.singular!.toLocaleLowerCase("et"));
}

export interface Token {
  /** As written. */
  readonly raw: string;
  /** Lower-cased the Estonian way. */
  readonly low: string;
}

/**
 * The words of a piece of Estonian, without its punctuation. Letters only,
 * since a digit is not a word anybody was taught and a lesson writes none.
 */
export function wordsOf(text: string): Token[] {
  return [...text.matchAll(/\p{L}+/gu)].map((m) => ({ raw: m[0], low: m[0].toLocaleLowerCase("et") }));
}

/** The Estonian quoted inside an English sentence, which is written in braces. */
export function estonianIn(english: string): string[] {
  return [...english.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]!);
}

/**
 * The forms a pattern builds from one taught verb, lower-cased. Read off the
 * app's own conjugation, so `minema` gives `lähed` from `lähen` and `olema`,
 * which the rule does not reach, gives nothing.
 */
function builtForms(verb: { lemma: string; first: string }, patterns: ReadonlySet<PatternId>): string[] {
  const stems = { lemma: verb.lemma, pres1sg: verb.first };
  const out: string[] = [];
  if (patterns.has("present")) out.push(...(presentTense(stems) ?? []).map((f) => f.value));
  if (patterns.has("negative")) {
    const no = negativePresent(stems);
    if (no) out.push(no.value);
  }
  // The command to one person: `tule`, `oota`. Nothing for `minema`, which says `mine` and is taught by name.
  if (patterns.has("imperative")) {
    const go = imperativeSingular(stems);
    if (go) out.push(go.value);
  }
  // Would: `tahaksin`, `sooviks`. Regular for every verb, `olema` included (`oleksin`).
  if (patterns.has("conditional")) out.push(...(conditional(stems) ?? []).map((f) => f.value));
  return out.map((f) => f.toLocaleLowerCase("et"));
}

/** The ledger with a lesson's items, and the patterns it explains, added. */
export function teach(ledger: Ledger, items: readonly Taught[], lesson: number, patterns: readonly PatternId[] = []): Ledger {
  const spellings = new Set(ledger.spellings);
  const phrases = [...ledger.phrases];
  const verbs = [...ledger.verbs];
  const stems = [...ledger.stems];
  const pasts = [...ledger.pasts];
  for (const item of items) {
    if (item.kind === "verb") verbs.push({ lemma: item.et, first: item.first });
    if (item.kind === "form" && item.stem) stems.push({ lemma: item.of, gen: item.et });
    if (item.kind === "form" && item.past) pasts.push(item.et);
    for (const part of unfold(item)) {
      const words = wordsOf(part.et).map((w) => w.low);
      if (part.kind === "phrase" && words.length > 1) phrases.push(words);
      else for (const w of words) spellings.add(w);
    }
  }
  const known = new Set([...ledger.patterns, ...patterns]);
  for (const verb of verbs) for (const form of builtForms(verb, known)) spellings.add(form);
  for (const stem of stems) for (const form of builtCases(stem, known)) spellings.add(form);
  if (known.has("past")) {
    for (const first of pasts) for (const form of pastPersons(first)) spellings.add(form.value.toLocaleLowerCase("et"));
  }
  return {
    spellings,
    phrases,
    items: [...ledger.items, ...items.flatMap(unfold).map((item) => ({ item, lesson }))],
    patterns: known,
    verbs,
    stems,
    pasts,
  };
}

/**
 * THE TAUGHT SPELLINGS OF ONE WORD, GROUPED, which is what a gap is asked
 * among: `olen`, `oled` and `on` are one verb, `kodus`, `koju` and `kodust`
 * one noun. Read off what the ledger already builds (a verb's persons off
 * `conjugate.ts`, a stem's endings off `derive.ts`) and off every form taught
 * by name, so the options under a gap are only ever spellings the learner has
 * been given, and only ever forms of the word the sentence holds.
 *
 * `of` answers which word a spelling is a form of. A spelling that is a form
 * of two words (`on` is `olema` and nothing else, but `tuli` is the fire and
 * the past of `tulema`) answers nothing, so a gap is never cut on it.
 */
export interface Families {
  readonly forms: ReadonlyMap<string, ReadonlySet<string>>;
  readonly of: ReadonlyMap<string, string>;
}

export function familiesOf(ledger: Ledger): Families {
  const forms = new Map<string, Set<string>>();
  const owners = new Map<string, Set<string>>();
  const add = (lemma: string, spelling: string) => {
    const word = lemma.toLocaleLowerCase("et");
    const low = spelling.toLocaleLowerCase("et");
    if (!ledger.spellings.has(low)) return;
    (forms.get(word) ?? forms.set(word, new Set()).get(word)!).add(low);
    (owners.get(low) ?? owners.set(low, new Set()).get(low)!).add(word);
  };
  for (const verb of ledger.verbs) {
    add(verb.lemma, verb.lemma);
    add(verb.lemma, verb.first);
    for (const form of builtForms(verb, ledger.patterns)) add(verb.lemma, form);
  }
  for (const stem of ledger.stems) {
    add(stem.lemma, stem.lemma);
    add(stem.lemma, stem.gen);
    for (const form of builtCases(stem, ledger.patterns)) add(stem.lemma, form);
  }
  for (const { item } of ledger.items) {
    if (item.kind !== "form" || wordsOf(item.et).length !== 1) continue;
    add(item.of, item.et);
    if (item.past && ledger.patterns.has("past")) {
      for (const form of pastPersons(item.et)) add(item.of, form.value);
    }
  }
  const of = new Map<string, string>();
  for (const [spelling, lemmas] of owners) if (lemmas.size === 1) of.set(spelling, [...lemmas][0]!);
  return { forms, of };
}

/**
 * A fix's line with its slip in, or the line unchanged where the word it names
 * is not in the line once as a whole word, which the level check refuses.
 */
export function withSlip(fix: Pick<Fix, "line" | "right" | "wrong">): string {
  const at = [...fix.line.et.matchAll(/\p{L}+/gu)].filter((m) => m[0] === fix.right);
  if (at.length !== 1) return fix.line.et;
  const m = at[0]!;
  const i = m.index ?? 0;
  return fix.line.et.slice(0, i) + fix.wrong + fix.line.et.slice(i + m[0].length);
}

/** Words lower-cased and joined, as two sentences are compared. */
const normalisePhraseOf = (text: string) => wordsOf(text).map((w) => w.low).join(" ");

/** The names a lesson may use: the shared list and its own cast. */
/*
  WHAT A FIX'S PAIR MAY NAME. A case, a verb slot the app records, or one of
  the impersonal's codes, which the review log never records (no card asks
  for them), so a fix on one is shown in the order it was written rather than
  ahead of the learner's own mix-ups. Anything else is a misspelled code.
*/
const IMPERSONAL_CODES = ["IndPrIps", "IndIpfIps", "IndPrIpsNeg"] as const;
const PAIR_CODES: ReadonlySet<string> = new Set([...CASES.map((c) => c.key as string), ...VERB_SLOTS, ...IMPERSONAL_CODES]);

export function namesOf(lesson: Pick<LessonSpec, "cast">): ReadonlySet<string> {
  return new Set([...NAMES, ...Object.keys(lesson.cast)]);
}

/**
 * The words of `text` the ledger does not cover, as written. Empty means
 * every word has been taught.
 */
export function uncovered(text: string, ledger: Ledger, names: ReadonlySet<string> = NAMES): string[] {
  const words = wordsOf(text);
  const covered = words.map((w) => names.has(w.raw) || ledger.spellings.has(w.low));
  for (const phrase of ledger.phrases) {
    for (let i = 0; i + phrase.length <= words.length; i++) {
      if (phrase.every((p, j) => words[i + j]!.low === p)) {
        for (let j = 0; j < phrase.length; j++) covered[i + j] = true;
      }
    }
  }
  return words.filter((_, i) => !covered[i]).map((w) => w.raw);
}

/** Every piece of Estonian a lesson puts on a screen, with where it is. */
export function estonianOf(lesson: LessonSpec): { where: string; et: string; heard?: true }[] {
  const out: { where: string; et: string; heard?: true }[] = [];
  const english = (where: string, text: string | undefined) => {
    for (const et of estonianIn(text ?? "")) out.push({ where, et });
  };
  lesson.conversation.forEach((line, i) => {
    if (line.et) out.push({ where: `line ${i + 1}`, et: line.et });
    english(`line ${i + 1} English`, line.en);
    english(`line ${i + 1} stage`, line.stage);
  });
  for (const t of lesson.teaches) {
    english(`the meaning of ${t.et}`, t.en);
    if (t.kind === "verb") english(`the meaning of ${t.first}`, t.firstEn);
    if ((t.kind === "verb" || t.kind === "word") && t.asks) english(`what ${t.et} asks for`, t.asks);
  }
  const how = lesson.how;
  english("the point", how.point);
  how.notes?.forEach((n, i) => english(`note ${i + 1}`, n));
  english("watch out", how.watchOut);
  how.table?.head.forEach((h) => english("the table's head", h));
  how.table?.rows.forEach((row, r) =>
    row.forEach((cell) => ("et" in cell ? out.push({ where: `table row ${r + 1}`, et: cell.et }) : english(`table row ${r + 1}`, cell.en))),
  );
  how.sounds?.forEach((row, r) => {
    english(`sound ${r + 1}`, row.like);
    // A word printed with its meaning is there for its sound and may be ahead of the course (`SoundRow.en`).
    out.push({ where: `sound ${r + 1}, the word`, et: nativeClip(row.word).text, ...(row.en ? { heard: true as const } : {}) });
    english(`sound ${r + 1}, meaning`, row.en);
  });
  how.listen?.forEach((set, s) =>
    set.words.forEach((w) => {
      out.push({ where: `listen ${s + 1}`, et: nativeClip(w.clip).text });
      english(`listen ${s + 1}, meaning`, w.en);
    }),
  );
  const prompts = (label: string, list: LessonSpec["answers"]) =>
    list.forEach((p, i) => {
      if (p.ask) out.push({ where: `${label} ${i + 1}, asked`, et: p.ask.et });
      english(`${label} ${i + 1}, cue`, p.cue);
      out.push({ where: `${label} ${i + 1}, model`, et: p.model.et });
    });
  prompts("question", lesson.answers);
  lesson.reworks?.forEach((r, i) => {
    out.push({ where: `rework ${i + 1}, from`, et: r.from.et });
    english(`rework ${i + 1}, from English`, r.from.en);
    english(`rework ${i + 1}, ask`, r.ask);
    out.push({ where: `rework ${i + 1}, to`, et: r.to.et });
    english(`rework ${i + 1}, to English`, r.to.en);
    r.also?.forEach((et, j) => out.push({ where: `rework ${i + 1}, also ${j + 1}`, et }));
  });
  lesson.fixes?.forEach((f, i) => {
    out.push({ where: `fix ${i + 1}, the line`, et: f.line.et });
    english(`fix ${i + 1}, the line's English`, f.line.en);
    out.push({ where: `fix ${i + 1}, with the slip`, et: withSlip(f) });
    english(`fix ${i + 1}, why`, f.why);
  });
  lesson.listenFor?.forEach((g, i) => {
    english(`gist ${i + 1}, question`, g.q);
    g.options.forEach((o) => english(`gist ${i + 1}, option`, o));
  });
  if (lesson.retell) {
    lesson.retell.story.forEach((line, i) => {
      out.push({ where: `retell line ${i + 1}`, et: line.et });
      english(`retell line ${i + 1} English`, line.en);
    });
    lesson.retell.points.forEach((p, i) => {
      english(`retell point ${i + 1}`, p.en);
      p.any.forEach((et) => out.push({ where: `retell point ${i + 1}, heard as`, et }));
    });
  }
  if (lesson.faster) {
    out.push({ where: "again-faster, asked", et: lesson.faster.ask.et });
    english("again-faster, cue", lesson.faster.cue);
    out.push({ where: "again-faster, model", et: lesson.faster.model.et });
  }
  if (lesson.write) {
    english("the writing's genre", lesson.write.genre);
    english("the writing's purpose", lesson.write.purpose);
    english("the writing task", lesson.write.task);
    lesson.write.model.forEach((line, i) => {
      out.push({ where: `model text sentence ${i + 1}`, et: line.et });
      english(`model text sentence ${i + 1} English`, line.en);
    });
    lesson.write.uses.forEach((u, i) => {
      out.push({ where: `writing use ${i + 1}`, et: u.et });
      english(`writing use ${i + 1}, meaning`, u.en);
    });
  }
  if (lesson.roleplay) {
    english("the role-play's scene", lesson.roleplay.scene);
    prompts("role-play turn", lesson.roleplay.turns);
  }
  return out;
}

/**
 * Whether a phrase stands in a text as whole words, case aside: a writing
 * use is a gap in the frame and a tick under the draft, so it has to be in
 * the model as it stands.
 */
export function standsIn(text: string, phrase: string): boolean {
  const words = wordsOf(text).map((w) => w.low);
  const want = wordsOf(phrase).map((w) => w.low);
  if (want.length === 0) return false;
  for (let i = 0; i + want.length <= words.length; i++) {
    if (want.every((w, j) => words[i + j] === w)) return true;
  }
  return false;
}

/** The ledger as it stands when each lesson starts, by lesson id. */
export function ledgersBefore(lessons: readonly LessonSpec[]): Map<string, Ledger> {
  const out = new Map<string, Ledger>();
  let ledger = EMPTY_LEDGER;
  for (const lesson of lessons) {
    out.set(lesson.id, ledger);
    ledger = teach(ledger, lesson.teaches, lessonRank(lesson), lesson.patterns);
  }
  return out;
}

/**
 * THE LEDGER AT THE END OF A LESSON, ITS OWN ITEMS INCLUDED.
 *
 * What a conversation played inside that lesson may use: everything the
 * lessons before it taught and everything it taught itself. Null for a lesson
 * id the list does not hold.
 */
export function ledgerThrough(lessons: readonly LessonSpec[], lessonId: string): Ledger | null {
  let ledger = EMPTY_LEDGER;
  for (const lesson of lessons) {
    ledger = teach(ledger, lesson.teaches, lessonRank(lesson), lesson.patterns);
    if (lesson.id === lessonId) return ledger;
  }
  return null;
}

/**
 * The words a ledger teaches, as the dictionary heads them: a word and a verb
 * by their own spelling, a form by the word it is a form of, and a phrase as
 * the phrase, which is how the dictionary heads `Tere hommikust!`. This is the
 * closed list a scene played inside a lesson composes in (`SceneSpec.lemmas`);
 * the ledger itself, spelling by spelling, is what holds the line to it.
 */
export function ledgerLemmas(ledger: Ledger): string[] {
  const out = new Set<string>();
  for (const { item } of ledger.items) out.add(item.kind === "form" ? item.of : item.et);
  for (const verb of ledger.verbs) out.add(verb.lemma);
  return [...out];
}

/**
 * The words of a line a ledger does not cover, for the gate. A word written
 * with a capital after the first of its sentence is a name, which nobody is
 * taught and anybody may be called, so a line answering "what is your name?"
 * with the learner's own is not refused for it.
 */
export function untaughtIn(ledger: Ledger): (text: string) => string[] {
  return (text) => {
    const names = new Set<string>(NAMES);
    for (const sentence of text.split(/[.!?]+/)) {
      for (const [at, token] of wordsOf(sentence).entries()) if (at > 0 && /^\p{Lu}/u.test(token.raw)) names.add(token.raw);
    }
    return uncovered(text, ledger, names);
  };
}

/**
 * Everything wrong with a level's lessons, as sentences naming the lesson,
 * where, and the words. Empty means a learner walking them in order is never
 * shown a word they have not been taught.
 */
export function lessonProblems(lessons: readonly LessonSpec[]): string[] {
  const problems: string[] = [];
  let ledger = EMPTY_LEDGER;
  const ids = new Set<string>();
  let core = 0;
  let letter = "";
  let level: string | null = null;
  lessons.forEach((lesson) => {
    const at = `Lesson ${lessonLabel(lesson)} (${lesson.id})`;
    if (ids.has(lesson.id)) problems.push(`${at}: the id is used twice`);
    ids.add(lesson.id);
    // Each level counts its own lessons from 1, and the levels come in order.
    if (lesson.level !== level) {
      if (level !== null && levelIndex(lesson.level) < levelIndex(level as LessonSpec["level"])) {
        problems.push(`${at}: ${lesson.level} comes after ${level}`);
      }
      level = lesson.level;
      core = 0;
      letter = "";
    }
    // Core lessons count 1, 2, 3; a vocabulary lesson takes the number before it and the next letter.
    if (lesson.extra === undefined) {
      core += 1;
      letter = "";
      if (lesson.n !== core) problems.push(`${at}: numbered ${lesson.n} where the core lessons are at ${core}`);
    } else {
      const want = String.fromCharCode((letter || "`").charCodeAt(0) + 1);
      if (core === 0 || lesson.n !== core || lesson.extra !== want) problems.push(`${at}: lettered ${lessonLabel(lesson)} where ${core}${want} comes next`);
      if (lesson.kind !== "lesson") problems.push(`${at}: a vocabulary lesson is an ordinary lesson`);
      letter = lesson.extra;
    }
    if (lesson.kind !== "lesson" && lesson.teaches.length > 0) {
      problems.push(`${at}: a ${lesson.kind === "checkin" ? "check-in" : "part's last lesson"} teaches nothing new, and this teaches ${lesson.teaches.length}`);
    }
    if (lesson.kind !== "lesson" && !lesson.roleplay) problems.push(`${at}: a check-in and a part's end carry a role-play`);
    if (lesson.answers.length === 0) problems.push(`${at}: Say it has no questions for the learner`);
    for (const line of lesson.conversation) {
      if (!(line.who in lesson.cast)) problems.push(`${at}: ${line.who} speaks and is not in the cast`);
      if (!line.et && !line.stage) problems.push(`${at}: a line by ${line.who} says nothing`);
      if (Boolean(line.et) !== Boolean(line.en)) problems.push(`${at}: a line by ${line.who} has Estonian or English and not both`);
    }
    for (const i of lesson.how.examples ?? []) {
      if (!lesson.conversation[i]?.et) problems.push(`${at}: example ${i} is not a spoken line of the conversation`);
    }
    for (const item of lesson.teaches.flatMap(unfold)) {
      if (item.kind !== "phrase" && wordsOf(item.et).length !== 1) problems.push(`${at}: the ${item.kind} "${item.et}" is more than one word`);
      /* A stem may be spelled like a word already taught, since `maja` is its own
         [omastav] and saying so is new; and a past I form may restate one A1
         taught by name (`sõin`), since what is new is that the other persons
         follow it. A form of a different word spelled like one already taught is
         a homograph (`tuli` the fire, and `tuli` he came), and saying so is new
         too. A second stem, a second past, or the same word twice, is not. */
      const again = ledger.items.filter((done) => done.item.et.toLocaleLowerCase("et") === item.et.toLocaleLowerCase("et"));
      const restem = item.kind === "form" && item.stem && again.every((done) => !(done.item.kind === "form" && done.item.stem));
      const repast = item.kind === "form" && item.past && again.every((done) => !(done.item.kind === "form" && done.item.past));
      const homograph = item.kind === "form" && again.every((done) => wordOf(done.item) !== item.of);
      if (again.length > 0 && !restem && !repast && !homograph) problems.push(`${at}: "${item.et}" was taught already`);
      if (item.kind === "form" && item.stem && item.past) problems.push(`${at}: "${item.et}" is a noun's stem and a verb's past at once`);
    }
    for (const pattern of lesson.patterns ?? []) {
      if (ledger.patterns.has(pattern)) problems.push(`${at}: the ${pattern} pattern was explained already`);
    }
    for (const item of lesson.teaches) {
      if (item.kind === "verb" && !item.et.endsWith("ma")) problems.push(`${at}: the verb "${item.et}" is not a ma-form`);
    }
    const tonight = teach(ledger, lesson.teaches, lessonRank(lesson), lesson.patterns);
    // A change is asked for by its rule, so the rule has to have been explained by tonight.
    lesson.reworks?.forEach((r, i) => {
      if (!tonight.patterns.has(r.pattern)) problems.push(`${at}, rework ${i + 1}: asks for the ${r.pattern} pattern before it is explained`);
      if (normalisePhraseOf(r.from.et) === normalisePhraseOf(r.to.et)) problems.push(`${at}, rework ${i + 1}: the sentence it asks for is the one it starts from`);
    });
    // A slip is another taught form of the same word, standing once in the line, or it is not a slip.
    const families = familiesOf(tonight);
    // A word taught as itself is the dictionary form of its own family: `auto` beside `autot`.
    const headwords = new Set(tonight.items.filter((d) => d.item.kind === "word").map((d) => d.item.et.toLocaleLowerCase("et")));
    const wordOfSpelling = (s: string) => {
      const low = s.toLocaleLowerCase("et");
      return families.of.get(low) ?? (headwords.has(low) ? low : undefined);
    };
    lesson.fixes?.forEach((f, i) => {
      if (withSlip(f) === f.line.et) problems.push(`${at}, fix ${i + 1}: "${f.right}" is not in the line once as a word`);
      // A pair code nobody recognizes is a slip that never matches the learner's own mix-ups, and says so nowhere.
      for (const code of f.pair) {
        if (!PAIR_CODES.has(code)) problems.push(`${at}, fix ${i + 1}: "${code}" names no case or verb slot`);
      }
      const of = wordOfSpelling(f.right);
      if (!of || wordOfSpelling(f.wrong) !== of || f.wrong === f.right) {
        problems.push(`${at}, fix ${i + 1}: "${f.wrong}" is not another taught form of the word "${f.right}" is`);
      }
    });
    lesson.listenFor?.forEach((g, i) => {
      if (g.options.length < 2 || !Number.isInteger(g.answer) || g.answer < 0 || g.answer >= g.options.length) {
        problems.push(`${at}, gist ${i + 1}: its answer is not one of its options`);
      }
    });
    if (lesson.retell) {
      if (!(lesson.retell.who in lesson.cast)) problems.push(`${at}: the retell is told by ${lesson.retell.who}, who is not in the cast`);
      if (lesson.retell.story.length < 2) problems.push(`${at}: a story to retell is more than one line`);
      if (lesson.retell.points.length < 2) problems.push(`${at}: a retell checks at least two points`);
      lesson.retell.points.forEach((p, i) => {
        if (p.any.length === 0) problems.push(`${at}, retell point ${i + 1}: lights on nothing`);
        // A point lights on a word of the story, or the learner has nothing to retell it from.
        if (!p.any.some((et) => lesson.retell!.story.some((line) => standsIn(line.et, et)))) {
          problems.push(`${at}, retell point ${i + 1}: none of ${p.any.join(", ")} is in the story`);
        }
      });
    }
    if (lesson.write) {
      const text = lesson.write.model.map((l) => l.et).join(" ");
      if (lesson.write.model.length < 3) problems.push(`${at}: a model text is three sentences or more`);
      if (lesson.write.uses.length < 2) problems.push(`${at}: a writing evening turns on two uses or more`);
      lesson.write.uses.forEach((u, i) => {
        if (!standsIn(text, u.et)) problems.push(`${at}, writing use ${i + 1}: "${u.et}" is not in the model text as it stands`);
      });
      if (!(lesson.write.least >= 20)) problems.push(`${at}: a text of its own runs to twenty words or more`);
    }
    const names = namesOf(lesson);
    for (const { where, et, heard } of estonianOf(lesson)) {
      if (heard) continue;
      const missing = uncovered(et, tonight, names);
      if (missing.length > 0) problems.push(`${at}, ${where}: "${et}" uses ${missing.join(", ")}, not taught by now`);
    }
    ledger = tonight;
  });
  return problems;
}
