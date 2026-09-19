/**
 * TURNING THE PLAN AND THE SYLLABUS INTO EVENINGS.
 *
 * `plan.ts` is the judgement and `lib/collections/syllabus/` is the course.
 * This has no opinions of its own: it slices, it rotates, and it reads what
 * those two already decided. That division is what makes a hundred and eighty
 * evenings reviewable, because the only things anybody has to check are the
 * eighteen part boundaries and five rotation lists.
 *
 * Pure, and it writes no Estonian: every lemma it hands to a day came out of a
 * unit, which is itself a request the Ekilex harvest either honors or reports
 * (ADR-005).
 */

import { CASES } from "@/lib/estonian/cases";
import { grammarTopic } from "@/lib/estonian/grammar";
import { isBuildable, naturalSentence, sentenceTiles } from "@/lib/estonian/cloze";
import { emojiFor } from "@/lib/collections/emoji";
import { spellable } from "@/lib/games/letters";
import { SCENES } from "@/lib/collections/scenes";
import { unitById, type SyllabusUnit } from "@/lib/collections/syllabus";
import { HARVESTED } from "@/prisma/data/harvested";
import { PARTS, ROTATION, SCENE_FOR_UNIT, VERB_HEAVY, type PartSpec } from "./plan";
import {
  ACTIVITIES, day, ordinaryWords,
  type ActivityKey, type CourseDay, type DaySpec, type Programme,
} from "./types";

const CASE_KEYS = new Set<string>(CASES.map((c) => c.key));

/**
 * Split a list into `n` pieces as evenly as it goes, longest first.
 *
 * Even rather than filling each evening to the ceiling, because eight and
 * eight and two is one evening that is barely a lesson: eighteen words over
 * three nights is six, six and six. The remainder goes to the front so the
 * short night is the last one, which is the night somebody is most likely to
 * be tired.
 */
export function slice<T>(items: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  let at = 0;
  for (let i = 0; i < n; i += 1) {
    const size = Math.ceil((items.length - at) / (n - i));
    out.push(items.slice(at, at + size));
    at += size;
  }
  return out;
}

/**
 * What an evening reads, from the unit's own list of what it teaches.
 *
 * A unit names its grammar in its own order and an evening takes the next one
 * along, so a unit spanning three nights opens three different pages rather
 * than the same one three times. Where the name is one of the fourteen cases
 * it is the case page, which is built out of the dictionary; where it is a
 * topic it is the reference page; and where it is neither, which happens for a
 * point the reference does not carry, the evening simply reads nothing rather
 * than linking somewhere that does not exist.
 */
export function reads(
  unit: SyllabusUnit, at: number, level: string = unit.level, readInPart: ReadonlySet<string> = new Set(),
): Pick<DaySpec, "grammar" | "grammarCase"> {
  const name = readingPlan(unit, level, readInPart)[at];
  return name ? readingFor(name) : {};
}

/** A declared grammar name as the page it opens: a case page, a topic page, or nothing the reference carries. */
function readingFor(name: string): Pick<DaySpec, "grammar" | "grammarCase"> {
  const asCase = name.toUpperCase();
  if (CASE_KEYS.has(asCase)) return { grammarCase: asCase };
  return grammarTopic(name) ? { grammar: name } : {};
}

/**
 * The pages a unit reads, one an evening, in order.
 *
 * NO CASE PAGE AT A1. A beginner is asked for no case anywhere in A1, and a
 * page of fourteen endings on the second evening is the reference being
 * handed to somebody who has just been told the language is impossible. So
 * at A1 an evening reads only a topic page, the present tense, the verb to
 * be, negation, and where a unit's grammar is nothing but cases it reads
 * nothing rather than a page it is not going to be asked about. The cases
 * are read from A2, where they are drilled.
 *
 * AND A PAGE IS READ ONCE. The first version walked a unit's list round and
 * round, so the greetings read the politeness page four evenings running and
 * the numbers read the numerals page five, and the impersonal was read
 * nineteen times between B1 and C1: a reading the learner did last night,
 * put in front of them again as tonight's step, is furniture, and it is the
 * step a learner reported skipping past. Each page a unit declares is read
 * once in the unit, in the order its author wrote them, and a page already
 * read in this part is not read again by a later unit of it. An evening past
 * the end of the list reads nothing, which the fifteen-minute test allows
 * for. The author's order is kept over a fresh-first one, which was tried
 * and put the conditional in front of the imperative on the request unit
 * because the imperative had been met at A1: a unit's list is a lesson plan
 * and the revision at the front of it is the revision the author wanted
 * first.
 */
export function readingPlan(unit: SyllabusUnit, level: string, readInPart: ReadonlySet<string>): string[] {
  const names = level === "A1"
    ? unit.grammar.filter((name) => !CASE_KEYS.has(name.toUpperCase()) && !builtOnACase(name))
    : unit.grammar;
  return [...new Set(names.filter((name) => !readInPart.has(name)))];
}

/**
 * WHAT A PAGE IS BUILT ON, WHICH IS THE ORDER THE LADDER MAY READ THEM IN.
 *
 * The reference's own dependencies and nothing finer: a page explains
 * something out of what an earlier page explained, so the object rule is read
 * after the genitive and the partitive, the perfect after the participles.
 * `course.test.ts` walks the whole ladder against it, and any case page but
 * the three principal ones needs the genitive, since every other ending is
 * glued onto that stem.
 *
 * AND IT IS WHAT KEEPS A CASE-SHAPED PAGE OUT OF A1. The rule above that A1
 * reads no case page had a hole the size of the pages *about* cases: the
 * numerals page is "the counted noun is partitive singular", the time page is
 * "days take -l and months take -s", and the adjective page is "the same
 * ending as its noun, for ten of the fourteen". Seven A1 evenings read one of
 * those, to somebody who by the operator's own rule has been shown no case at
 * all, which is a page of endings nobody has taught wearing a topic's name. A
 * page built on a case is read where the case is, from A2, and the same table
 * says so in both places, since a list in the test and a list in the builder
 * would be two answers to what a page needs.
 */
export const PAGE_NEEDS: Record<string, readonly string[]> = {
  partitive: ["genitive"],
  gradation: ["genitive"],
  object: ["genitive", "partitive"],
  government: ["genitive", "partitive"],
  numerals: ["partitive"],
  "adjective-agreement": ["genitive"],
  "time-expressions": ["genitive", "adessive", "inessive"],
  imperfect: ["present-tense"],
  conditional: ["present-tense"],
  imperative: ["present-tense"],
  perfect: ["participles"],
  pluperfect: ["participles"],
  impersonal: ["participles"],
  superlative: ["comparative"],
  nominalisation: ["derivation"],
  "relative-clause": ["subordination"],
  concession: ["subordination"],
  "reported-speech": ["quotative"],
};

/** A topic page that presupposes a case ending, which A1 never reads. */
export function builtOnACase(name: string): boolean {
  return (PAGE_NEEDS[name] ?? []).some((need) => CASE_KEYS.has(need.toUpperCase()));
}

/**
 * WHAT THE LADDER HAS TAUGHT SO FAR, WHICH IS WHAT DECIDES WHETHER A ROUND MAY
 * BE DEALT YET.
 *
 * Every round on the app is honest about one thing and quiet about another:
 * it draws on the deck or the dictionary, and it never asks whether the
 * learner has been shown what it is about to ask. The module chose the round,
 * so the module has to know. A conjugation table before a verb is a table of
 * verbs nobody has met; a picture board before a pictured noun is an empty
 * board with a way out on it; a case sprint before a case page is the whole
 * reference asked in sixty seconds; a dictation before a sentence made of
 * taught words is somebody typing words nobody has told them.
 *
 * So the builder keeps a ledger of what every evening has handed over, in the
 * vocabulary a round is dealt against, and `supportsRound` is the one place
 * that says what each round needs. The pages read the same ledger back off
 * the step's address (`scope.ts`) and narrow themselves to it, so a round
 * that is dealt is a round that has something to deal.
 */
export interface Taught {
  /** A verb has been taught, so the conjugation table has something to run down. */
  verbs: boolean;
  /** Taught nouns with a picture. The board needs `PICTURES_FOR_BOARD` of them. */
  pictured: number;
  /** The case pages read so far, by key. A case is asked only after it is read. */
  cases: ReadonlySet<string>;
  /** The topic pages read so far, by id. */
  topics: ReadonlySet<string>;
  /** Taught verbs the dictionary records a government for. */
  governed: number;
  /** A picture scene (`lib/collections/scenes.ts`) whose three words have all been taught. */
  scene: boolean;
  /** Taught words Tähed can scramble: one word, three letters or more (`spellable`). */
  spellable: number;
  /**
   * Whether a sentence a lexicographer wrote exists that is made entirely of
   * taught words, three to nine of them, which is what dictation and word
   * ordering are built out of inside the module.
   */
  readable: boolean;
}

export const NO_TAUGHT: Taught = {
  verbs: false, pictured: 0, cases: new Set(), topics: new Set(), governed: 0, scene: false,
  readable: false, spellable: 0,
};

const ALL_TAUGHT: Taught = {
  verbs: true, pictured: 99, cases: new Set(CASES.map((c) => c.key)),
  topics: new Set(["government", "conditional"]), governed: 99, scene: true, readable: true,
  spellable: 99,
};

/**
 * How many pictured nouns the board needs before it is dealt: six pairs, the
 * board's own size (`PAIRS` in `app/(app)/review/emoji/page.tsx`, asserted
 * equal). One pictured noun was the first gate, and inside the module the
 * board's top-up is the taught words, so with five of them it is the empty
 * state with a way out on it.
 */
export const PICTURES_FOR_BOARD = 6;

/**
 * How many case pages Target needs before it is dealt: it draws four forms of
 * one word and needs four cases it may draw from, so one page read is a round
 * that builds nothing.
 */
export const CASES_FOR_TARGET = 4;

/**
 * Describe wants a whole scene of taught words and a choice of case for it,
 * since a case the pictured word does not take builds no task: an animal is
 * not in the inside trio, and the first case page read is the inessive.
 */
export const CASES_FOR_DESCRIBE = 3;

/** How many governed verbs a government round needs before it is dealt. */
export const GOVERNED_FOR_ROUND = 4;

/**
 * How many words Tähed needs before it is dealt: its round is eight and it
 * draws only words with an order to find, so on the first evening's five
 * words it would be a round of three. Four is a game; the first evening
 * stays Match.
 */
export const WORDS_FOR_LETTERS = 4;

/**
 * What each round needs to have been taught before the module deals it.
 *
 * Match and Listening need nothing but words, which is why they stand in for
 * everything else. A case round needs a case page read; the picture board is
 * the word at A1 and a case above it; government wants its own page and a
 * handful of verbs that carry one; dictation and word ordering want a sentence
 * of taught words to exist at all. Sõnad is on no rotation, because its word
 * is dealt off the dictionary by design and marked on the server from the
 * date, and there is no honest way to hold it to a taught list.
 */
export function supportsRound(key: ActivityKey, taught: Taught, _level = "A2"): boolean {
  const cases = taught.cases.size > 0;
  switch (key) {
    case "conjugation": return taught.verbs;
    // The board is the word until a case page has been read, on every level
    // (`app/(app)/review/emoji/page.tsx`), so a pictured noun is all it needs.
    case "picture": return taught.pictured >= PICTURES_FOR_BOARD;
    case "sprint": case "write": return cases;
    case "target": return taught.cases.size >= CASES_FOR_TARGET;
    case "describe": return taught.scene && taught.cases.size >= CASES_FOR_DESCRIBE;
    case "dictation": case "sentences": return taught.readable;
    case "government": return taught.topics.has("government") && taught.governed >= GOVERNED_FOR_ROUND;
    case "letters": return taught.spellable >= WORDS_FOR_LETTERS;
    case "sonad": return false;
    default: return true;
  }
}

/** The rotation's rounds this evening could deal, given what has been taught. */
export function supportedRounds(level: string, taught: Taught): ActivityKey[] {
  const rotation = ROTATION[level] ?? ROTATION.A1!;
  return rotation.filter((key) => supportsRound(key, taught, level));
}

/** The rounds that need something taught first, for the tests to walk. */
export const NEEDS: Partial<Record<ActivityKey, keyof Taught>> = {
  conjugation: "verbs",
  picture: "pictured",
  letters: "spellable",
};

/**
 * The round that stands in for one the words cannot carry yet: the same kind,
 * so the evening still has its game and its drill, and always available,
 * because Match and Listening ask the words back as meanings and every taught
 * word has one.
 */
const STAND_IN: Record<"game" | "drill", ActivityKey> = { game: "match", drill: "listening" };

/**
 * The two rounds an evening does.
 *
 * One game and one drill, taken as neighbours off the level's rotation, which
 * alternates the two. Walking by two per evening means the pair moves every
 * night and repeats every five, so a fortnight covers the whole rotation twice
 * without ever running the same evening twice.
 *
 * A unit that is mostly verbs takes the conjugation table instead of the
 * drill on `table` evenings, because a verb you cannot put in the third
 * person is a verb you cannot use, and it keeps the rotation's game so the
 * evening still has one. The caller says which evenings: every other one of
 * the unit's, since the first version pinned every evening and A2 opened on
 * six tables running, which is a fortnight of one drill with a different
 * name on the tin.
 *
 * A round whose material has not been taught yet is swapped for its stand-in.
 * Early in a level that is most evenings, and the pair repeats: a fact about
 * the words rather than a fault in the walk, and `course.test.ts` allows
 * exactly that case.
 */
export function rounds(
  level: string, at: number, table: boolean, taught: Taught = ALL_TAUGHT,
  /**
   * Whether this unit pins the table on its alternate evenings. On the other
   * evenings the rotation's own drill may itself be the table, since A1
   * carries it on the rotation, and that is the fortnight of tables the
   * alternation exists to stop: the drill after it on the rotation stands in.
   */
  pinsTable = false,
  /**
   * What the evening before dealt, so a stand-in does not deal it again: two
   * unsupported rounds on consecutive evenings walk to the same supported
   * one, and the sixth evening of A1 was the fifth again. Preferred rather
   * than refused, since early in a level the supported rounds may be one.
   */
  avoid: readonly ActivityKey[] = [],
): ActivityKey[] {
  const rotation = ROTATION[level] ?? ROTATION.A1!;
  const first = rotation[(at * 2) % rotation.length]!;
  const second = rotation[(at * 2 + 1) % rotation.length]!;
  const game = ACTIVITIES[first].kind === "game" ? first : second;
  const other = game === first ? second : first;
  /*
    The stand-in is the next round of the same kind along the rotation that
    the ledger does support, so it still alternates with the evening: early
    in A2 the games the words can carry are Match and the board, and a
    stand-in fixed on Match would deal Match six evenings running with the
    board sitting there. Walked from the round it stands in for rather than
    indexed on the evening, because two unsupported rounds on consecutive
    evenings indexed the same way landed on the same stand-in, and the sixth
    evening of A1 was the fifth again. Where nothing on the rotation is
    supported, Match and Listening.
  */
  const standIn = (key: ActivityKey, skip: ActivityKey | null = null): ActivityKey => {
    const kind = ACTIVITIES[key].kind === "game" ? "game" : "drill";
    const from = rotation.indexOf(key);
    for (const fresh of [true, false]) {
      for (let step = 1; step <= rotation.length; step++) {
        const next = rotation[(from + step) % rotation.length]!;
        if (next === skip || ACTIVITIES[next].kind !== kind) continue;
        if (fresh && avoid.includes(next)) continue;
        if (supportsRound(next, taught, level)) return next;
      }
    }
    return STAND_IN[kind];
  };
  const offTable = other === "conjugation" && pinsTable ? standIn(other, "conjugation") : other;
  const drill = table ? "conjugation" : offTable;
  return [game, drill].map((key) => (supportsRound(key, taught, level) ? key : standIn(key)));
}

/**
 * THE LEDGER, WALKED DAY BY DAY.
 *
 * Reads the harvest rather than a database, because the builder runs at
 * import and may reach nothing (ADR-005 keeps the words a unit's; this only
 * reads what the harvest already brought back for them). The readability
 * check stops the moment one sentence qualifies, since a boolean that has
 * turned true stays true, so the whole walk costs a few milliseconds.
 */
export class Ledger {
  private readonly harvest = HARVEST_BY_KEY;
  private readonly spellings = new Set<string>();
  private readonly cases = new Set<string>();
  private readonly topics = new Set<string>();
  private pending: string[] = [];
  private readonly lemmas = new Set<string>();
  private verbs = false;
  private pictured = 0;
  private governed = 0;
  private scene = false;
  private readable = false;
  private spellable = 0;

  /** A word handed over, with what the harvest holds for it. */
  teach(lemma: string, pos: string): void {
    if (pos === "VERB") this.verbs = true;
    if (pos === "NOUN" && emojiFor(lemma) !== undefined && !this.lemmas.has(lemma)) this.pictured += 1;
    if (spellable(lemma) && !this.lemmas.has(lemma)) this.spellable += 1;
    this.lemmas.add(lemma);
    if (!this.scene) this.scene = SCENES.some((s) => s.lemmas.every((l) => this.lemmas.has(l)));
    const word = this.harvest.get(`${lemma}|${pos}`);
    this.spellings.add(lemma.toLowerCase());
    if (!word) return;
    if (pos === "VERB" && word.government) this.governed += 1;
    for (const form of Object.values(word.parts)) this.spellings.add(form.toLowerCase());
    for (const extra of word.extraForms) this.spellings.add(extra.value.toLowerCase());
    if (!this.readable) this.pending.push(...word.usages);
  }

  /** A page read, which counts on the evening it is read. */
  read(reads: Pick<DaySpec, "grammar" | "grammarCase">): void {
    if (reads.grammarCase) this.cases.add(reads.grammarCase);
    if (reads.grammar) this.topics.add(reads.grammar);
  }

  /** What the ledger says now, as a snapshot a day can be dealt against. */
  taught(): Taught {
    if (!this.readable) {
      this.readable = this.pending.some((usage) => readableSentence(usage, this.spellings));
      if (this.readable) this.pending = [];
    }
    return {
      verbs: this.verbs,
      pictured: this.pictured,
      cases: new Set(this.cases),
      topics: new Set(this.topics),
      governed: this.governed,
      scene: this.scene,
      readable: this.readable,
      spellable: this.spellable,
    };
  }
}

const HARVEST_BY_KEY: ReadonlyMap<string, (typeof HARVESTED)[number]> = new Map(
  HARVESTED.map((w) => [`${w.lemma}|${w.pos}`, w]),
);

/**
 * Four to nine tiles, every one a taught spelling, and a sentence at all.
 * Four rather than three because word ordering refuses fewer than four tiles
 * and dictation refuses more than nine, and one flag serves both.
 */
export const DICTATION_TILES = { min: 4, max: 9 } as const;

export function readableSentence(sentence: string, spellings: ReadonlySet<string>): boolean {
  const tiles = sentenceTiles(sentence);
  if (tiles.length < DICTATION_TILES.min || tiles.length > DICTATION_TILES.max) return false;
  // `isBuildable` is word ordering's own rule, no repeated tile among them,
  // and a sentence that passes it is one both rounds can set.
  if (!naturalSentence(sentence) || !isBuildable(sentence)) return false;
  return tiles.every((t) => spellings.has(t.toLowerCase()));
}

/** What a list of words, taught in order, can carry, for a test to rebuild. */
export function taughtFrom(
  words: readonly { lemma: string; pos: string }[],
  reads: readonly Pick<DaySpec, "grammar" | "grammarCase">[] = [],
): Taught {
  const ledger = new Ledger();
  for (const w of words) ledger.teach(w.lemma, w.pos);
  for (const r of reads) ledger.read(r);
  return ledger.taught();
}

/**
 * A unit takes the conjugation table where it is mostly verbs AND says so, by
 * declaring the card. The share alone pinned nine B1 evenings in a row to the
 * table, because the object, government and conditional units are grammar
 * units that happen to be full of verbs and are about something else.
 */
const isVerbHeavy = (unit: SyllabusUnit): boolean =>
  unit.cardTypes.includes("CONJUGATION")
  && unit.vocabulary.filter((v) => v.pos === "VERB").length / Math.max(1, unit.vocabulary.length)
    >= VERB_HEAVY;

/**
 * One part, built.
 *
 * A word is taught once inside a part. A unit may legitimately name a word an
 * earlier unit already taught, because a grammar unit teaches a rule using
 * vocabulary the learner has, and repeating it inside one fortnight would make
 * an evening that teaches nothing new. Across parts it is left alone: meeting
 * an A1 verb again inside B1's object unit is the course revisiting it on
 * purpose, and the review queue is what decides whether it is still known.
 */
export function buildPart(spec: PartSpec, ledger: Ledger = ledgerBefore(spec)): Programme {
  /*
    ONE SIZE, BECAUSE AN EVENING IS FIFTEEN MINUTES WHATEVER SHAPE IT TAKES.
    The fixed part is a reading, two rounds and the closing review, or a
    conversation and the closing review, and `TALK_MINUTES` is defined as
    exactly what the conversation displaces. What is left over is new words,
    and that is the same number either way.
  */
  const perDay = ordinaryWords(spec.level);
  const taught = new Set<string>();
  /* A page read once in a part is not read again by a later unit of it. */
  const readInPart = new Set<string>();
  const days: CourseDay[] = [];
  /* The rotation walks the whole part rather than restarting per unit, or the
     first evening of every unit would be the same pair for a fortnight. */
  let turn = 0;

  for (const unitId of spec.units) {
    const unit = unitById(unitId);
    if (!unit) continue;

    const words = unit.lemmas.filter((lemma) => !taught.has(lemma));
    for (const lemma of words) taught.add(lemma);
    if (words.length === 0) continue;

    const verbs = isVerbHeavy(unit);
    const scene = SCENE_FOR_UNIT[unitId];

    const chunks = slice(words, Math.max(1, Math.ceil(words.length / perDay)));
    const plan = readingPlan(unit, spec.level, readInPart);
    /* The conversation replaces the reading (`day()` in types.ts), so a scene
       evening takes no page off the plan: the first version handed it one,
       counted it read in the ledger, and never showed it to anybody. */
    let nextPage = 0;

    chunks.forEach((chunk, n) => {
      const last = n === chunks.length - 1;
      /*
        The day's own words and its own reading count on the day, since
        meeting the words is the first step of the evening and the reading
        the second, and the rounds come after both.
      */
      for (const lemma of chunk) {
        const entry = unit.vocabulary.find((v) => v.lemma === lemma);
        if (entry) ledger.teach(entry.lemma, entry.pos);
      }
      const name = last && scene ? undefined : plan[nextPage++];
      const reading = name ? readingFor(name) : {};
      ledger.read(reading);
      if (name) readInPart.add(name);
      days.push(day(
        {
          id: `${spec.id}-${String(days.length + 1).padStart(2, "0")}`,
          title: unit.title,
          subtitle: unit.subtitle,
          canDo: unit.canDo,
          unitId,
          level: spec.level,
          words: chunk,
          ...reading,
          // The table on the unit's first evening and every other one after,
          // so a unit of verbs is still conjugated and still has its other drill.
          practice: rounds(spec.level, turn, verbs && n % 2 === 0, ledger.taught(), verbs, days.at(-1)?.practice ?? []),
          ...(last && scene ? { scene } : {}),
        },
        days.length + 1,
        { n: n + 1, of: chunks.length },
      ));
      turn += 1;
    });
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    level: spec.level as Programme["level"],
    blurb: spec.blurb,
    days,
  };
}

/** The ledger as it stands at the start of a part: every part before it, built. */
export function ledgerBefore(spec: PartSpec): Ledger {
  const ledger = new Ledger();
  const at = PARTS.findIndex((p) => p.id === spec.id);
  for (const before of at > 0 ? PARTS.slice(0, at) : []) buildPart(before, ledger);
  return ledger;
}

/**
 * The whole ladder, built in order over one ledger, so what a1.6 taught is what
 * a2.1's first evening is dealt against.
 */
export function buildProgrammes(): Programme[] {
  const ledger = new Ledger();
  return PARTS.map((spec) => buildPart(spec, ledger));
}
