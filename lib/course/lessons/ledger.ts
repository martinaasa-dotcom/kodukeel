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
import { fold } from "@/lib/estonian/fold";
import { ROOMS, type Fix, type LessonSpec, type PatternId, type Taught } from "./types";
import { PARALLEL_FORMS } from "./parallelForms";
import { workOutProblems } from "./workOut";
import { fasterWindows } from "./faster";
import { DIALECT_WORDS, standardOf } from "./dialect";

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
  "Heinot",
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

/**
 * Where a rework's ask names how the sentence must begin, that beginning:
 * "Start with {Ma ei}." A suggestion ("You can start with {Kui}") is not one.
 * The marker holds an answer to it and the lesson check holds the accepted
 * sentences to it, so both read it here.
 */
export function opensOf(ask: string): string | null {
  const m = /(?:^|[.!?]\s+)Start with \{([^{}]+)\}/.exec(ask);
  return m ? m[1]! : null;
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

/**
 * A phrase as it is compared: lower case, no punctuation, single spaces. A
 * number is a word here, since `20 sõnumit` and `5 sõnumit` are two answers.
 */
export function normalisePhrase(text: string): string {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => m[0].toLocaleLowerCase("et")).join(" ");
}

/*
  WHAT A FIX'S PAIR MAY NAME. A case, a verb slot the app records, or one of
  the impersonal's codes, which the review log never records (no card asks
  for them), so a fix on one is shown in the order it was written rather than
  ahead of the learner's own mix-ups. Anything else is a misspelled code.
*/
const IMPERSONAL_CODES = ["IndPrIps", "IndIpfIps", "IndPrIpsNeg"] as const;
const PAIR_CODES: ReadonlySet<string> = new Set([...CASES.map((c) => c.key as string), ...VERB_SLOTS, ...IMPERSONAL_CODES]);

/** The names a lesson may use: the shared list and its own cast. */
export function namesOf(lesson: Pick<LessonSpec, "cast">): ReadonlySet<string> {
  return new Set([...NAMES, ...Object.keys(lesson.cast)]);
}

/**
 * The words of `text` the ledger does not cover, as written. Empty means
 * every word has been taught.
 */
export function uncovered(text: string, ledger: Ledger, names: ReadonlySet<string> = NAMES): string[] {
  const words = wordsOf(text);
  /* A parallel form shown beside the spelling it is parallel to (`{makse}, or
     {maksusid}`) is that spelling said the other way, in the very text that
     says so, and is covered where that spelling is. Only beside it: alone, it
     is a word nobody has been shown. */
  const here = new Set(words.map((w) => w.low));
  const besideItsTwin = (low: string) => {
    const stored = PARALLEL_FORMS[low];
    return stored !== undefined && here.has(stored) && ledger.spellings.has(stored);
  };
  const covered = words.map((w) => names.has(w.raw) || ledger.spellings.has(w.low) || besideItsTwin(w.low));
  for (const phrase of ledger.phrases) {
    for (let i = 0; i + phrase.length <= words.length; i++) {
      if (phrase.every((p, j) => words[i + j]!.low === p)) {
        for (let j = 0; j < phrase.length; j++) covered[i + j] = true;
      }
    }
  }
  return words.filter((_, i) => !covered[i]).map((w) => w.raw);
}

/**
 * One piece of Estonian a lesson puts on a screen. `heard` marks a piece that
 * may run ahead of the course, which the taught-word check leaves out and the
 * forms list still reads: a sound key's example word with its meaning beside
 * it, and every line of a real text read in the Listen step (`LessonSpec.read`,
 * B2), which is read and never asked about. `except` is the one word of a
 * work-it-out sentence that is there to be worked out (`WorkOut.word`): the
 * rest of the sentence is held to the ledger, and that word is not.
 */
export interface ShownEstonian {
  readonly where: string;
  readonly et: string;
  readonly heard?: true;
  readonly except?: readonly string[];
  /**
   * A line of a text read or a talk heard (C1), which may hold a regional
   * spelling from `DIALECT_WORDS`: such a spelling is checked against the
   * glossary and its standard word against the forms list, never itself
   * (`formsCheckWords`).
   */
  readonly dialect?: true;
}

/**
 * The longest line the speech route reads at once (`TtsRequest` in
 * `lib/api/contract.ts`, asserted equal in `ledger.test.ts`): a talk taken
 * down as notes is played a line at a time, so a line is under it.
 */
export const SPOKEN_LINE_MOST = 400;

/** Every piece of Estonian a lesson puts on a screen, with where it is. */
export function estonianOf(lesson: LessonSpec): ShownEstonian[] {
  const out: ShownEstonian[] = [];
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
      p.also?.forEach((et, j) => out.push({ where: `${label} ${i + 1}, also ${j + 1}`, et }));
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
    f.also?.forEach((et, j) => out.push({ where: `fix ${i + 1}, also ${j + 1}`, et }));
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
  // B2: a real text, read and never asked about, so ahead of the course by design.
  if (lesson.read) {
    english("the text's genre", lesson.read.genre);
    lesson.read.lines.forEach((line, i) => {
      out.push({ where: `text to read, line ${i + 1}`, et: line.et, heard: true, dialect: true });
      english(`text to read, line ${i + 1} English`, line.en);
    });
    // C1: its questions, held like the text: ahead of the course, in the forms list.
    lesson.read.questions?.forEach((q, i) => {
      const at = `text question ${i + 1}`;
      if (q.kind === "match") {
        q.statements.forEach((s, j) => {
          out.push({ where: `${at}, statement ${j + 1}`, et: s.et, heard: true });
          english(`${at}, statement ${j + 1} English`, s.en);
        });
      } else if (q.kind === "gap") {
        q.options.forEach((o, j) => {
          out.push({ where: `${at}, option ${j + 1}`, et: o.et, heard: true, dialect: true });
          english(`${at}, option ${j + 1} English`, o.en);
        });
      } else {
        out.push({ where: `${at}, asked`, et: q.q.et, heard: true });
        english(`${at}, asked in English`, q.q.en);
        q.accept.forEach((et, j) => out.push({ where: `${at}, answer ${j + 1}`, et, heard: true, dialect: true }));
      }
    });
  }
  // C1: a talk taken down as notes, held like a text read.
  if (lesson.notes) {
    const notes = lesson.notes;
    out.push({ where: "the talk's title", et: notes.title.et, heard: true });
    english("the talk's title in English", notes.title.en);
    notes.lines.forEach((line, i) => {
      out.push({ where: `the talk, line ${i + 1}`, et: line.et, heard: true, dialect: true });
      english(`the talk, line ${i + 1} English`, line.en);
    });
    notes.questions.forEach((q, i) => {
      const at = `the talk's question ${i + 1}`;
      out.push({ where: `${at}, asked`, et: q.q.et, heard: true });
      english(`${at}, asked in English`, q.q.en);
      if (q.kind === "short") q.accept.forEach((et, j) => out.push({ where: `${at}, answer ${j + 1}`, et, heard: true, dialect: true }));
      else q.options.forEach((o, j) => {
        out.push({ where: `${at}, option ${j + 1}`, et: o.et, heard: true });
        english(`${at}, option ${j + 1} English`, o.en);
      });
    });
    notes.keyIdeas.forEach((k, i) => english(`the talk's key idea ${i + 1}`, k.en));
  }
  // C1: one thing said three ways, each version held to the ledger like a rework's sentence.
  lesson.rooms?.forEach((r, i) => {
    r.versions.forEach((v) => {
      out.push({ where: `which room ${i + 1}, ${v.room}`, et: v.et });
      english(`which room ${i + 1}, ${v.room} English`, v.en);
    });
    r.rework?.accept.forEach((et, j) => out.push({ where: `which room ${i + 1}, also ${j + 1}`, et }));
  });
  lesson.faster?.topics?.forEach((topic, i) => english(`again-faster, topic ${i + 1}`, topic.en));
  // B2: a sentence with one word to work out, held to the ledger but for that word.
  lesson.workOut?.forEach((w, i) => {
    out.push({ where: `work it out ${i + 1}, the sentence`, et: w.sentence.et, except: [w.word] });
    english(`work it out ${i + 1}, the sentence's English`, w.sentence.en);
    english(`work it out ${i + 1}, the meaning`, w.means);
    w.options.forEach((o) => english(`work it out ${i + 1}, option`, o));
  });
  return out;
}

/**
 * THE SPELLINGS OF A LESSON THE FORMS LIST IS ASKED ABOUT, each with where it
 * stands. One reading for the lessons test and the per-part check
 * (`scripts/check-lesson-part.ts`), so the two cannot disagree. A name or a
 * place is let through; a regional spelling in a text read or a talk heard
 * (`ShownEstonian.dialect`) is asked as its standard word from `DIALECT_WORDS`,
 * never as itself, since the forms list does not know `mõtsa` and reads
 * `vällä` as a form of another word.
 */
export function formsCheckWords(lesson: LessonSpec, glossary: Readonly<Record<string, string>> = DIALECT_WORDS): { readonly low: string; readonly where: string }[] {
  const names = namesOf(lesson);
  const out: { low: string; where: string }[] = [];
  const pieces: { et: string; dialect?: true }[] = [
    ...estonianOf(lesson),
    ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [{ et: t.et }, { et: t.first }] : [{ et: t.et }])),
  ];
  for (const piece of pieces) {
    for (const w of wordsOf(piece.et)) {
      if (names.has(w.raw) || PLACE_SPELLINGS.has(w.raw)) continue;
      const standard = piece.dialect ? standardOf(w.low, glossary) : null;
      if (standard) out.push({ low: standard.toLocaleLowerCase("et"), where: `${lesson.id}: ${w.raw} (dialect for ${standard}) in "${piece.et}"` });
      else out.push({ low: w.low, where: `${lesson.id}: ${w.raw} in "${piece.et}"` });
    }
  }
  return out;
}

/**
 * Whether every word of an accepted answer is a word of the text it is asked
 * about or a spelling the ledger covers (a C1 question on a text or a talk):
 * an answer asks about what was said, never for a word nobody has met.
 */
function answerOffText(answer: string, text: string, ledger: Ledger, names: ReadonlySet<string>): string[] {
  const inText = new Set(wordsOf(text).map((w) => w.low));
  const rest = wordsOf(answer).filter((w) => !inText.has(w.low)).map((w) => w.raw).join(" ");
  return rest ? uncovered(rest, ledger, names) : [];
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
      if (normalisePhrase(r.from.et) === normalisePhrase(r.to.et)) problems.push(`${at}, rework ${i + 1}: the sentence it asks for is the one it starts from`);
      // An accepted sentence that is the starting one would mark the sentence typed back unchanged as right.
      if ((r.also ?? []).some((a) => normalisePhrase(a) === normalisePhrase(r.from.et))) problems.push(`${at}, rework ${i + 1}: an accepted sentence is the one it starts from`);
      const all = [r.to.et, ...(r.also ?? [])].map(normalisePhrase);
      if (new Set(all).size !== all.length) problems.push(`${at}, rework ${i + 1}: an accepted sentence is listed twice`);
      // An ask that names its start is answered only by sentences starting that way.
      const opens = opensOf(r.ask);
      if (opens) {
        const start = normalisePhrase(opens);
        const off = all.filter((a) => a !== start && !a.startsWith(`${start} `));
        if (off.length > 0) problems.push(`${at}, rework ${i + 1}: the ask says to start with "${opens}" and an accepted sentence does not`);
      }
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
      // An accepted line that is the slip would mark the line typed back unchanged as right.
      const lines = [f.line.et, ...(f.also ?? [])].map(normalisePhrase);
      if (lines.includes(normalisePhrase(withSlip(f)))) problems.push(`${at}, fix ${i + 1}: an accepted line is the line with the slip`);
      if (new Set(lines).size !== lines.length) problems.push(`${at}, fix ${i + 1}: an accepted line is listed twice`);
      // A pair code nobody recognizes is a slip that never matches the learner's own mix-ups, and says so nowhere.
      for (const code of f.pair) {
        if (!PAIR_CODES.has(code)) problems.push(`${at}, fix ${i + 1}: "${code}" names no case or verb slot`);
      }
      const of = wordOfSpelling(f.right);
      if (fold(f.wrong.toLocaleLowerCase("et")) === fold(f.right.toLocaleLowerCase("et"))) {
        problems.push(`${at}, fix ${i + 1}: "${f.wrong}" and "${f.right}" differ only in the letters with marks, which the marker forgives`);
      }
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
    if (lesson.retell?.hearings !== undefined && lesson.retell.hearings !== 1 && lesson.retell.hearings !== 2) {
      problems.push(`${at}: a story is heard once or twice, and this says ${String(lesson.retell.hearings)}`);
    }
    if (lesson.faster) {
      // Each go shorter than the one before, inside what a minute or three of talk can be.
      const windows = fasterWindows(lesson.faster);
      if (windows.length === 0 || windows.length > 3) problems.push(`${at}: again-faster has ${windows.length} goes, where it has one to three`);
      if (windows.some((sec) => !Number.isInteger(sec) || sec < 15 || sec > 180)) problems.push(`${at}: again-faster has a go of ${windows.join(", ")} seconds, outside 15 to 180`);
      if (windows.some((sec, i) => i > 0 && sec >= windows[i - 1]!)) problems.push(`${at}: again-faster's goes of ${windows.join(", ")} seconds are not each shorter than the last`);
      const prepare = lesson.faster.prepare;
      if (prepare !== undefined && (!Number.isInteger(prepare) || prepare < 10 || prepare > 300)) problems.push(`${at}: again-faster prepares for ${prepare} seconds, outside 10 to 300`);
    }
    if (lesson.read) {
      if (!lesson.read.genre.trim()) problems.push(`${at}: a text to read says what it is`);
      if (lesson.read.lines.length === 0) problems.push(`${at}: a text to read has no lines`);
      lesson.read.lines.forEach((line, i) => {
        if (!line.et.trim() || !line.en.trim()) problems.push(`${at}, text to read line ${i + 1}: has Estonian or English and not both`);
      });
    }
    lesson.workOut?.forEach((w, i) => {
      for (const p of workOutProblems(w, tonight, namesOf(lesson))) problems.push(`${at}, work it out ${i + 1}: ${p}`);
    });
    // A question on what was heard asks about a conversation, so there is one to hear.
    if (lesson.listenFor && lesson.listenFor.length > 0 && !lesson.conversation.some((l) => l.et)) {
      problems.push(`${at}: asks what was heard, and the conversation has no spoken line`);
    }
    if (lesson.faster?.topics) {
      if (lesson.faster.topics.length !== 2) problems.push(`${at}: again-faster offers ${lesson.faster.topics.length} topics, where a choice is between two`);
      if (lesson.faster.prepare === undefined) problems.push(`${at}: again-faster offers topics with no time to prepare, where a topic is chosen before the preparation`);
      if (lesson.faster.topics.some((t) => !t.en.trim())) problems.push(`${at}: again-faster has a topic that says nothing`);
    }
    // C1: a text's questions (`ReadQuestion`).
    if (lesson.read) {
      const lines = lesson.read.lines;
      const text = lines.map((l) => l.et).join(" ");
      const sectioned = lines.filter((l) => l.section !== undefined).length;
      if (sectioned > 0 && sectioned !== lines.length) problems.push(`${at}: a text with sections numbers every line, and ${lines.length - sectioned} have none`);
      lines.forEach((l, i) => {
        if (l.section === undefined) return;
        const before = i === 0 ? 0 : lines[i - 1]!.section ?? 0;
        if (!Number.isInteger(l.section) || (l.section !== before && l.section !== before + 1)) {
          problems.push(`${at}, text to read line ${i + 1}: section ${l.section} after ${before}, where sections count up from 1`);
        }
      });
      const sections = new Set(lines.flatMap((l) => (l.section === undefined ? [] : [l.section])));
      lesson.read.questions?.forEach((q, i) => {
        const where = `${at}, text question ${i + 1}`;
        if (q.kind === "match") {
          if (sections.size < 2) problems.push(`${where}: matches statements to sections, and the text has ${sections.size}`);
          if (q.statements.length < 2) problems.push(`${where}: matches ${q.statements.length} statement, where it matches two or more`);
          q.statements.forEach((s, j) => {
            if (!sections.has(s.section)) problems.push(`${where}, statement ${j + 1}: names section ${s.section}, which the text does not have`);
            if (!s.et.trim() || !s.en.trim()) problems.push(`${where}, statement ${j + 1}: has Estonian or English and not both`);
          });
        } else if (q.kind === "gap") {
          const line = lines[q.line];
          if (!Number.isInteger(q.line) || !line) problems.push(`${where}: takes out line ${q.line + 1}, which the text does not have`);
          if (q.options.length !== 3) problems.push(`${where}: offers ${q.options.length} sentences for the gap, where it offers three`);
          if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) problems.push(`${where}: its answer is not one of its options`);
          else if (line && normalisePhrase(q.options[q.answer]!.et) !== normalisePhrase(line.et)) problems.push(`${where}: the right sentence is not the line taken out`);
          const others = q.options.filter((_, j) => j !== q.answer).map((o) => normalisePhrase(o.et));
          if (line && others.includes(normalisePhrase(line.et))) problems.push(`${where}: a wrong sentence is the line taken out`);
          if (new Set(q.options.map((o) => normalisePhrase(o.et))).size !== q.options.length) problems.push(`${where}: offers one sentence twice`);
          q.options.forEach((o, j) => { if (!o.et.trim() || !o.en.trim()) problems.push(`${where}, option ${j + 1}: has Estonian or English and not both`); });
        } else {
          if (!q.q.et.trim() || !q.q.en.trim()) problems.push(`${where}: asks in Estonian or English and not both`);
          if (q.accept.length === 0) problems.push(`${where}: accepts no answer`);
          for (const a of q.accept) {
            const off = answerOffText(a, text, tonight, namesOf(lesson));
            if (off.length > 0) problems.push(`${where}: the answer "${a}" holds ${off.join(", ")}, which is no word of the text and not taught by now`);
          }
        }
      });
    }
    // C1: a talk taken down as notes (`NotesTalk`).
    if (lesson.notes) {
      const notes = lesson.notes;
      const where = `${at}, the talk`;
      const text = notes.lines.map((l) => l.et).join(" ");
      if (!(notes.speaker in lesson.cast)) problems.push(`${where}: is given by ${notes.speaker}, who is not in the cast`);
      if (notes.hearings !== 1 && notes.hearings !== 2) problems.push(`${where}: is heard once or twice, and this says ${String(notes.hearings)}`);
      if (!notes.title.et.trim() || !notes.title.en.trim()) problems.push(`${where}: its title has Estonian or English and not both`);
      if (notes.lines.length < 2) problems.push(`${where}: a talk is more than one line`);
      notes.lines.forEach((l, i) => {
        if (!l.et.trim() || !l.en.trim()) problems.push(`${where}, line ${i + 1}: has Estonian or English and not both`);
        if (l.et.length > SPOKEN_LINE_MOST) problems.push(`${where}, line ${i + 1}: runs to ${l.et.length} characters, over the ${SPOKEN_LINE_MOST} the speech route reads at once`);
      });
      if (notes.questions.length === 0) problems.push(`${where}: asks nothing the notes should answer`);
      if (notes.keyIdeas.length === 0 || notes.keyIdeas.some((k) => !k.en.trim())) problems.push(`${where}: names its key ideas, each in a line`);
      notes.questions.forEach((q, i) => {
        const at2 = `${where}, question ${i + 1}`;
        if (!q.q.et.trim() || !q.q.en.trim()) problems.push(`${at2}: asks in Estonian or English and not both`);
        if (q.kind === "choice") {
          if (q.options.length < 2) problems.push(`${at2}: offers ${q.options.length} option`);
          if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) problems.push(`${at2}: its answer is not one of its options`);
          if (new Set(q.options.map((o) => normalisePhrase(o.et))).size !== q.options.length) problems.push(`${at2}: offers one option twice`);
        } else {
          if (q.accept.length === 0) problems.push(`${at2}: accepts no answer`);
          for (const a of q.accept) {
            const off = answerOffText(a, text, tonight, namesOf(lesson));
            if (off.length > 0) problems.push(`${at2}: the answer "${a}" holds ${off.join(", ")}, which is no word of the talk and not taught by now`);
          }
        }
      });
    }
    // C1: which room (`WhichRoom`): three versions, one a room, and a rework that changes the room.
    lesson.rooms?.forEach((r, i) => {
      const where = `${at}, which room ${i + 1}`;
      const rooms = r.versions.map((v) => v.room);
      if (r.versions.length !== ROOMS.length || ROOMS.some((room) => !rooms.includes(room))) problems.push(`${where}: says it three ways, once for each room, and this has ${rooms.join(", ") || "none"}`);
      if (!rooms.includes(r.ask)) problems.push(`${where}: asks for the ${r.ask} version, which it does not have`);
      r.versions.forEach((v) => { if (!v.et.trim() || !v.en.trim()) problems.push(`${where}, ${v.room}: has Estonian or English and not both`); });
      if (new Set(r.versions.map((v) => normalisePhrase(v.et))).size !== r.versions.length) problems.push(`${where}: two versions are one sentence`);
      if (r.rework) {
        const from = r.versions.find((v) => v.room === r.rework!.from);
        const to = r.versions.find((v) => v.room === r.rework!.to);
        if (r.rework.from === r.rework.to) problems.push(`${where}: a rework turns a version into another room's, and this stays in ${r.rework.from}`);
        if (!from || !to) problems.push(`${where}: a rework names a room it has no version for`);
        const all = [to?.et ?? "", ...r.rework.accept].map(normalisePhrase);
        if (from && all.includes(normalisePhrase(from.et))) problems.push(`${where}: an accepted sentence is the one it starts from`);
        if (new Set(all).size !== all.length) problems.push(`${where}: an accepted sentence is listed twice`);
      }
    });
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
    for (const { where, et, heard, except } of estonianOf(lesson)) {
      if (heard) continue;
      const missing = uncovered(et, tonight, except ? new Set([...names, ...except]) : names);
      if (missing.length > 0) problems.push(`${at}, ${where}: "${et}" uses ${missing.join(", ")}, not taught by now`);
    }
    ledger = tonight;
  });
  return problems;
}
