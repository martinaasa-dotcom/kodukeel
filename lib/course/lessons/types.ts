/**
 * A LESSON, WHICH IS ONE THING A PERSON CAN DO AFTERWARDS (docs/43-lessons.md).
 *
 * The course used to be a unit's word list cut into fives in the order the
 * words were typed, so "who, what, where" taught `kes, mis, kus, kuhu, kust`
 * one evening and `kuidas` the next, and no evening said what tied its words
 * together. A lesson starts from the other end: a goal a learner can name
 * ("say your name and ask somebody theirs"), a short conversation that does
 * it, every word and phrase that conversation needs, and one pattern
 * explained. Teaching comes before testing, always: the first three steps ask
 * nothing at all.
 *
 * THE ESTONIAN HERE IS WRITTEN BY THIS APP, AND HELD TO TWO CHECKS. Every
 * conversation line, model answer and table cell is a sentence somebody wrote
 * for a beginner, which ADR-005 amendment 6 allows on the same terms as the
 * authored sentences of amendment 4: read by the native speaker in the pull
 * request that adds it, and checked mechanically before anybody reads it.
 * `lessons.test.ts` asks that every spelling is one the forms list knows
 * (`prisma/data/forms/`), and `ledger.ts` asks that every spelling has been
 * taught by the lesson it is shown in. Neither check can say a line is good
 * Estonian, which is the native speaker's job; both catch the mistakes a tired
 * evening of writing makes, and the plan itself recorded three of those.
 *
 * Estonian inside an English sentence (a rule, a note, a cue) is written in
 * braces, `{mina}`, so the screen can mark it `lang="et"` and the ledger can
 * hold it to the same rule as a conversation line. A brace in an English
 * sentence is never anything else.
 *
 * Pure data and pure types: no React, no Prisma, no clock.
 */

import type { Level } from "@/lib/collections/syllabus";

/** Somebody in the conversation, by name. Their voice is the lesson's `cast`. */
export type Speaker = string;

/**
 * One turn of the conversation. `et` and `en` together, or a stage direction
 * alone for what a beginner could not follow anyway ("a long sentence, very
 * fast"), which is how a lesson about being stuck shows the moment without
 * writing a sentence nobody has been taught.
 */
export interface Line {
  readonly who: Speaker;
  readonly et?: string;
  readonly en?: string;
  /** What happens, in English, in place of or after the words. */
  readonly stage?: string;
}

/**
 * What a lesson teaches, in the kinds a learner can be asked about later.
 *
 *   word    a headword: recognizing it, and producing it as it stands
 *   form    one exact spelling of a word (`olen`, `pole`)
 *   phrase  a whole phrase, learned as it stands and never taken apart
 *           before the lesson that explains it (chunks first)
 *
 *   verb    the ma-form and the I-form together, below
 *
 * A pattern is not in this list because it is not a spelling: it is what a
 * lesson's `how` explains, declared in `patterns`, and it is what lets a
 * later lesson use the forms it builds from a taught verb without listing
 * them.
 */
export type Taught =
  | { readonly kind: "word"; readonly et: string; readonly en: string }
  | { readonly kind: "form"; readonly et: string; readonly of: string; readonly en: string }
  | { readonly kind: "phrase"; readonly et: string; readonly en: string }
  /**
   * A verb learned as the pair a learner actually needs: the ma-form the
   * dictionary is headed by and the I-form the other persons follow
   * (`minema`, `lähen`). Once a lesson has explained the present (`present`
   * in `patterns`), every person of it is covered without being listed, and
   * once the no has been explained (`negative`), so is the form after {ei}.
   * The persons come off `lib/estonian/conjugate.ts`, which is the rule the
   * rest of the app conjugates with, so a lesson and a card cannot disagree.
   */
  | { readonly kind: "verb"; readonly et: string; readonly first: string; readonly en: string; readonly firstEn: string };

/** A pattern a lesson explains, which lets later lessons use forms it builds. */
export type PatternId = "present" | "negative" | "imperative";

/** A cell of a pattern's table: Estonian or English, never both. */
export type Cell = { readonly et: string } | { readonly en: string };

/**
 * THE ONE IDEA OF THE EVENING, IN ENGLISH, WITH ITS ESTONIAN IN BRACES.
 *
 * `point` is the rule in one line; `notes` are a sentence or two each; the
 * table is the rule laid out; `watchOut` is the one mistake an English
 * speaker makes. `examples` are lines of today's conversation by index, so
 * the rule is shown in the sentences the learner just heard rather than in
 * new ones.
 */
export interface HowItWorks {
  readonly point: string;
  readonly notes?: readonly string[];
  readonly table?: { readonly head: readonly string[]; readonly rows: readonly (readonly Cell[])[] };
  /**
   * The sounds an evening is about, each heard alone and inside a word. Both
   * are a native speaker's recordings, by id (`lib/audio/native.ts`), so the
   * Estonian on screen is the recording's own text and the ledger checks it.
   */
  readonly sounds?: readonly SoundRow[];
  /**
   * Words to hear side by side, for the evenings whose warning is about a
   * sound: `kaheksa` against `üheksa`, `kuus` against `kus`. Recordings again,
   * so the difference the warning names is one the learner can press.
   */
  readonly listen?: readonly ListenSet[];
  /**
   * The evening a learner is first asked to spell something: the step carries
   * the tool that says a typed name letter by letter in the native speaker's
   * recordings of the letters (`components/sounds/SpellIt.tsx`). Nothing in it
   * is Estonian the lesson writes, so the ledger has nothing to check.
   */
  readonly spell?: boolean;
  readonly watchOut: string;
  readonly examples?: readonly number[];
}

export interface SoundRow {
  /** The recording of the sound alone. */
  readonly sound: string;
  /** The letter or letters as written, which is what the key shows. */
  readonly glyph: string;
  /** What it sounds a bit like, in English. */
  readonly like: string;
  /** The recording of a word that carries it. */
  readonly word: string;
  /** The letters of that word to highlight, where they first occur. */
  readonly mark: string;
  /**
   * What the word means, printed under it. A word with a meaning beside it may
   * be one no evening has taught yet, because it is there to be heard for its
   * sound: `öö` is the clearest ö there is, and nobody needs "night" on the
   * first evening to hear it (`ledger.ts` reads it that way).
   */
  readonly en?: string;
}

export interface ListenSet {
  readonly words: readonly { readonly clip: string; readonly en: string; readonly mark?: string }[];
}

/**
 * A question put to the learner about themselves, or one turn of a role-play.
 *
 * `ask` is what the other side says, `cue` is what the learner is to do, in
 * English, and `model` is one way to say it, shown after the learner has had
 * a go. Say it checks an answer against `model` and grades nothing: often the
 * answer is the learner's own (their name, their country), so a different one
 * is never called wrong (ADR-028).
 */
export interface Prompt {
  readonly ask?: { readonly et: string; readonly en: string };
  readonly cue: string;
  readonly model: { readonly et: string; readonly en: string };
}

/** Which kind of evening it is. A check-in teaches nothing new; a part ends on one. */
export type LessonKind = "lesson" | "checkin" | "partEnd";

export interface LessonSpec {
  /** Stable, because a tick will key on it once lessons are the course. */
  readonly id: string;
  /** Its place in the level, from 1, counting core lessons only. */
  readonly n: number;
  /**
   * A vocabulary lesson's letter (section 4.9): `26a` is the first lesson
   * of more words after lesson 26 and shares its `n`. Absent on a core
   * lesson. A letter rather than a renumbering, so a core lesson keeps its
   * number and every "lesson 31" in a note still points where it did.
   */
  readonly extra?: string;
  readonly level: Level;
  /** The part it belongs to (`PartOfLessons.id`). */
  readonly part: string;
  readonly kind: LessonKind;
  /** What the lesson is called, short. */
  readonly title: string;
  /** What the learner can do afterwards, as they would say it. */
  readonly goal: string;
  /** Who speaks, by name, and the voice each is read in. */
  readonly cast: Readonly<Record<Speaker, string>>;
  readonly conversation: readonly Line[];
  /** Everything new tonight, in the order the Words step lists it. */
  readonly teaches: readonly Taught[];
  /** The patterns today's `how` explains, if any. Each is explained once in a level. */
  readonly patterns?: readonly PatternId[];
  readonly how: HowItWorks;
  /** Questions about the learner, answered aloud or typed. */
  readonly answers: readonly Prompt[];
  /** A role-play, on a check-in and at the end of a part. */
  readonly roleplay?: { readonly scene: string; readonly turns: readonly Prompt[] };
}

export interface PartOfLessons {
  readonly id: string;
  readonly level: Level;
  /**
   * What the part is called, in English. A beginner cannot read an Estonian
   * heading yet, so A1's parts are named in the language the learner thinks in.
   */
  readonly title: string;
  /** What the part is about, in English. */
  readonly about: string;
}
