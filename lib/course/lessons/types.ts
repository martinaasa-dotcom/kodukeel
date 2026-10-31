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
  /**
   * What happens, in English, in place of or after the words. On the first
   * line it is the setting, and is drawn before the line rather than after it
   * (`LessonConversation`): the scene is set before anybody speaks.
   */
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
  | {
      readonly kind: "word"; readonly et: string; readonly en: string;
      /**
       * What the word asks for after it, in English with its Estonian in
       * braces (B1): {huvitatud} wants the [seestütlev] (-st, out of). At B1
       * a word is learned with its case or not learned, so the Words step
       * prints it under the word.
       */
      readonly asks?: string;
    }
  | {
      readonly kind: "form"; readonly et: string; readonly of: string; readonly en: string;
      /**
       * The [omastav] (2nd form), the stem every other ending goes on (A2).
       * Once a lesson has explained an ending (`inside`, `outside` and the
       * rest of `PatternId`), the ledger covers that ending on this stem
       * without listing it, read off `lib/estonian/derive.ts`, the rule every
       * case table in the app is built with. A stem may be spelled like a word
       * already taught (`maja` is its own omastav), since saying so is new.
       */
      readonly stem?: true;
      /**
       * The [lihtminevik] (past) I form (A2). Once the `past` pattern is
       * explained, the other persons but the third are covered off it
       * (`lib/estonian/conjugate.ts`), and the third is taught by name, since
       * no rule reaches it (`tahtsin` but `tahtis`).
       */
      readonly past?: true;
    }
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
  | {
      readonly kind: "verb"; readonly et: string; readonly first: string; readonly en: string; readonly firstEn: string;
      /** What the verb asks for, as on a word: {aitama} wants somebody in the [osastav] (3rd form). B1 on. */
      readonly asks?: string;
    };

/**
 * A pattern a lesson explains, which lets later lessons use forms it builds.
 *
 * A1 explains three, on verbs. A2 explains the case endings on a noun's
 * [omastav] (2nd form), `inside` being -s, -sse and -st, `outside` -l, -le
 * and -lt, and the rest one ending each; the past's persons off its I form;
 * and the conditional off the present I form.
 */
export type PatternId =
  | "present" | "negative" | "imperative"
  | "inside" | "outside" | "comitative" | "translative" | "terminative" | "essive" | "abessive"
  | "past" | "conditional"
  | BPatternId;

/**
 * B1'S PATTERNS ARE RULES ABOUT CHOOSING, NOT RULES THAT BUILD A SPELLING
 * (docs/43-lessons.md §11.3).
 *
 * The whole object or some of it, what a verb asks for, the impersonal, had
 * done, `mis` and `kes` joining two clauses, and a verb with its particle:
 * none of these joins an ending to a taught stem the way `inside` does. The
 * object rule chooses between an [omastav] (2nd form) and an [osastav] (3rd
 * form) the learner already has; `tehakse` and `tehti` are stored per verb
 * because no rule reaches them, so they are taught by name, as the past's
 * third person is. So the ledger builds nothing off these. What they decide is
 * what a lesson may ask: Rework may only ask for a change whose pattern has
 * been explained, and the level contract holds each to being explained once.
 */
export type BPatternId = B1PatternId | B2PatternId | C1PatternId;

export type B1PatternId =
  | "object" | "government" | "impersonal" | "pluperfect" | "relative" | "particleVerb"
  | "participle" | "conditionalPast" | "subordinate" | "agreement" | "derivation";

/**
 * B2'S PATTERNS ARE THE SAME KIND OF RULE AS B1'S (docs/43-lessons.md §13.1):
 * they build no spelling and decide what Rework may ask.
 *
 *   quotative   passing on what you heard: {olevat}, {tulnud} said of another
 *   converb     the -des form, two things at once ({kooli minnes})
 *   supine      the -ma word in its cases: -mas (in the middle of it), -mast
 *               (back from it), -maks (in order to) and -mata (without doing
 *               it). The -ta case of a noun is `abessive` and builds a
 *               spelling; these do not, since each is taught by name.
 *   nominal     a -mine or -us noun standing for a clause, the written register
 *   hedging     probably rather than definitely ({pigem}, {võib-olla})
 *   concession  granting a point first ({küll ... aga}, {kuigi}, {samas})
 *   spoken      how people really talk: the particles, the fillers, the reactions
 */
export type B2PatternId = "quotative" | "converb" | "supine" | "nominal" | "hedging" | "concession" | "spoken";

/**
 * C1'S PATTERNS, THE SAME KIND OF RULE AGAIN (docs/43-lessons.md §15.3): C1
 * adds almost no morphology, so each is a rule about choosing or a register
 * skill, builds no spelling, and decides what Rework may ask. Each is
 * explained once in the level and counts its grammar page as read
 * (`PATTERN_PAGE`).
 *
 *   jussive            the third person command and the wish ({tulgu},
 *                      {elagu}, {olgu peale}, {las ta})
 *   stance             how sure the speaker is ({küllap}, {arvatavasti},
 *                      {nähtavasti}, {justkui} and {otsekui} with the would form)
 *   presentParticiple  the present participles as adjectives ({lugev},
 *                      {kehtiv}, {arutatav}, {lahendamata}) and the impersonal
 *                      quotative ({tehtavat})
 *   connective         the formal links built from verbs ({vastavalt},
 *                      {arvestades}, {võrreldes}, {hoolimata}, {selmet}) and
 *                      having a thing done ({lasta teha})
 *   cohesion           a long text that holds together: the comma before every
 *                      subordinate clause, and the signposts ({seejuures},
 *                      {ühtlasi}, {niisiis}, {järelikult})
 *   emphasis           word order for focus, the focus words ({just},
 *                      {nimelt}, {isegi}, {alles}), rhetorical questions, and
 *                      one thing said three ways
 *   argument           an argued text: a claim, two points, the other side's
 *                      best case and the answer ({samas}, {seevastu},
 *                      {teisalt}, {kokkuvõttes})
 *   literary           the old and literary forms (the i-plural, the stem
 *                      plural, regional words), read and never produced
 *   collocation        which verb goes with which noun, and near-synonyms
 */
export type C1PatternId =
  | "jussive" | "stance" | "presentParticiple" | "connective" | "cohesion"
  | "emphasis" | "argument" | "literary" | "collocation";

/** Every B1 pattern. */
export const B1_PATTERNS: readonly B1PatternId[] = [
  "object", "government", "impersonal", "pluperfect", "relative", "particleVerb",
  "participle", "conditionalPast", "subordinate", "agreement", "derivation",
];

/** Every B2 pattern, which the B2 contract's recycling rule reads (`b2LevelProblems`). */
export const B2_PATTERNS: readonly B2PatternId[] = ["quotative", "converb", "supine", "nominal", "hedging", "concession", "spoken"];

/** Every C1 pattern, which the C1 contract's recycling rule reads (`c1LevelProblems`). */
export const C1_PATTERNS: readonly C1PatternId[] = [
  "jussive", "stance", "presentParticiple", "connective", "cohesion", "emphasis", "argument", "literary", "collocation",
];

/**
 * Every rule about choosing, B1's, B2's and C1's, for a check that walks them
 * all: the one list. Named for B, where the kind began; C1's are the same kind.
 */
export const B_PATTERNS: readonly BPatternId[] = [...B1_PATTERNS, ...B2_PATTERNS, ...C1_PATTERNS];

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
  /**
   * Every other way of saying the model that counts, as a rework's `also`:
   * `Ma tahaksin autot, et sõita maale.` beside `Ma tahaksin autot, et maale sõita.`.
   * Marked right like the model, and held to the same ledger checks.
   */
  readonly also?: readonly string[];
}

/**
 * CHANGE A SENTENCE RATHER THAN CHOOSE ONE (docs/43-lessons.md §11.2, Rework).
 *
 * B1 grammar is turning one sentence into another: "say he finished it",
 * "say it without naming who did it". `from` is a sentence the learner has
 * met, `ask` says what to change in English (Estonian in braces), and `to` is
 * the changed sentence, written for the lesson and held to the same two
 * checks as every other line (ADR-005 amendment 6). `also` is any other way of
 * saying it that counts. The marking is a comparison with those, so no model
 * ever decides whether a change was right. `pattern` is the rule the change
 * is about, and the level check refuses a rework whose pattern has not been
 * explained by that lesson.
 */
export interface Rework {
  readonly from: { readonly et: string; readonly en: string };
  readonly ask: string;
  readonly to: { readonly et: string; readonly en: string };
  readonly also?: readonly string[];
  readonly pattern: PatternId;
}

/**
 * PUT RIGHT THE SLIP YOU KEEP MAKING (docs/43-lessons.md §11.2, Fix).
 *
 * A line the learner has met, with one word swapped for another form of the
 * same word: `Ma lugesin raamatu` where the line says `raamatut`. The learner
 * types the line put right. Both spellings are taught forms of one word, so
 * nothing on the screen is Estonian the app wrote wrongly on purpose: the line
 * was written for the lesson and the slip is a real form. `pair` is the two
 * slots the swap is between (`PARTITIVE` and `GENITIVE`), which is how a
 * learner's own recorded mix-ups (`lib/stats/confusions.ts`) put the fixes
 * they need first. Only a pair of slots the review log records can be ranked
 * that way; a pair of the impersonal's codes, which no card asks for, keeps the
 * order it was written in, and `lessonProblems` refuses any other code.
 * `why` is one line of English for after the answer.
 */
export interface Fix {
  readonly line: { readonly et: string; readonly en: string };
  /** The word as the line spells it. */
  readonly right: string;
  /** Another taught form of the same word, put in its place. */
  readonly wrong: string;
  readonly pair: readonly [string, string];
  readonly why: string;
  /**
   * Other ways of saying the line put right that the native speaker accepts,
   * as a rework's `also` (`juhi käest` beside `juhilt`). Each is the line with
   * the slip put right some other way, never the slip itself.
   */
  readonly also?: readonly string[];
}

/**
 * LISTEN FOR THE GIST BEFORE READING IT (B1 on).
 *
 * An A1 learner reads along from the first second, which is right for
 * somebody meeting every word for the first time. A B1 learner has to follow
 * speech they cannot read, because that is what a person talking to them is.
 * So a B lesson's Listen step opens with the text hidden: the conversation is
 * played, two or three questions in English ask what it was about, and only
 * then is the text shown. A wrong pick is told the right one and nothing is
 * graded, since it is a question about listening rather than about a word.
 */
export interface Gist {
  readonly q: string;
  readonly options: readonly string[];
  /** The right option, by index. */
  readonly answer: number;
  /**
   * A question about what was meant rather than what was said (C1, §15.5):
   * the irony, the polite refusal, the thing nobody says outright. Drawn the
   * same, with a line saying it asks what was meant.
   */
  readonly meant?: true;
}

/**
 * RETELL IT (B1 on, docs/43-lessons.md §11.2, Talk).
 *
 * A short story told by one of the cast, heard twice, then told back aloud.
 * A checklist under it lights as each point is heard: a point is lit by any
 * spelling in `any`, so "you said {oli parandatud}" or "you mentioned the
 * roof" is a fact about the words that came across, never about the sound
 * (ADR-018). The story is Estonian written for the lesson and is held to the
 * ledger like a line of the conversation; so is every spelling a point lights
 * on.
 */
export interface Retell {
  readonly who: Speaker;
  readonly story: readonly { readonly et: string; readonly en: string }[];
  readonly points: readonly { readonly en: string; readonly any: readonly string[] }[];
  /**
   * How many times the story may be heard before it is told back: twice, as
   * B1 hears it, where absent, and once from B2's third part on (§13.5), as a
   * person tells you something once. The story can still be shown to read
   * afterwards; what goes is the second hearing.
   */
  readonly hearings?: 1 | 2;
}

/**
 * AGAIN, FASTER (B1 on): the same short answer three times, in less time each
 * time (90, 60 and 45 seconds), with how many words came across and how long
 * it took drawn side by side. The 4/3/2 exercise, which moves fluency inside
 * one evening because the second and third go reuse what the first built.
 * There is no score; what the learner sees is their own three goes.
 */
export interface Faster {
  readonly ask: { readonly et: string; readonly en: string };
  readonly cue: string;
  /** One way to answer, shown after the first go, for somebody who ran dry. */
  readonly model: { readonly et: string; readonly en: string };
  /**
   * The windows, in seconds at the standard pace, one go each, in the order
   * they are taken. Absent is B1's 90, 60 and 45 (`FASTER_SECONDS`). B2
   * shortens them part by part (§13.5): 60, 45 and 30, then 45, 30 and 20, and
   * from part 7 the state exam's talk, a single go of 60 after two minutes to
   * prepare. Each window is shorter than the one before.
   */
  readonly seconds?: readonly number[];
  /**
   * Seconds to get ready before the first go, at the standard pace: the
   * exam's two minutes (120). A clock that counts down and can be cut short,
   * never one that starts the go by itself. Absent is no preparation.
   */
  readonly prepare?: number;
  /**
   * Two topics to choose between before the preparation starts (C1, the
   * paper's presentation): drawn as two buttons, and the go runs on the one
   * chosen. Only with a preparation, and exactly two.
   */
  readonly topics?: readonly { readonly en: string }[];
}

/**
 * A REAL TEXT, READ IN THE LISTEN STEP (B2 on, docs/43-lessons.md §13.6, B-L4).
 *
 * A notice in the stairwell, a message from the school, a headline: what the
 * situation of the part really puts in front of somebody, written by the
 * native speaker in that genre (ADR-005 amendment 6) and read after the
 * conversation's transcript. IT IS READ AND NEVER ASKED ABOUT, and that is
 * what lets its words run ahead of the course: nothing in it has to have been
 * taught (`ledger.ts` leaves it out of the taught-word check), but every
 * spelling has to be one the forms list knows, and the words the ledger has
 * not taught are underlined on the screen to their dictionary entries.
 */
export interface ReadText {
  /** What it is, in English: "a notice in the stairwell". */
  readonly genre: string;
  /**
   * The text a sentence (or a line) at a time, with its English. `section`
   * numbers the text's parts from 1 where a `match` question matches
   * statements to them (C1); then every line carries one, in order.
   */
  readonly lines: readonly { readonly et: string; readonly en: string; readonly section?: number }[];
  /**
   * Questions about the text, in the C1 paper's three shapes (C1 from its
   * third part, §15.7). Asked under the text after it is read, marked
   * mechanically and graded nowhere. A question asks about what the text says,
   * never for a form, and an answer is a word of the text or a taught one.
   */
  readonly questions?: readonly ReadQuestion[];
}

/**
 * ONE QUESTION ABOUT A TEXT READ (C1, §15.7), in the paper's own shapes.
 *
 *   match  statements, each to be matched to the section of the text it is
 *          about (`ReadText.lines[].section`)
 *   gap    one line of the text taken out (`line`, from 0) and a whole
 *          sentence chosen for the gap out of three; `options[answer]` is that
 *          line, which is cohesion tested directly
 *   short  a question answered in a word or two, marked against `accept`
 *          (`markPhrase`); every word of an accepted answer is a word of the
 *          text or a taught spelling
 *
 * Estonian with its English under it, held like the text itself: every
 * spelling in the forms list, and allowed to run ahead of the course.
 */
export type ReadQuestion =
  | { readonly kind: "match"; readonly statements: readonly { readonly et: string; readonly en: string; readonly section: number }[] }
  | { readonly kind: "gap"; readonly line: number; readonly options: readonly { readonly et: string; readonly en: string }[]; readonly answer: number }
  | { readonly kind: "short"; readonly q: { readonly et: string; readonly en: string }; readonly accept: readonly string[] };

/**
 * A TALK TAKEN DOWN AS NOTES (C1 from its second part, §15.7): the paper's
 * lecture, which the mock exam cannot set.
 *
 * A guest on the morning show talks, one short line after another (each under
 * the speech route's 400 characters, `TtsRequest`), played as a conversation
 * is. The screen keeps a notes box on the device and shows no transcript until
 * the questions are answered; then the transcript, with the words the lessons
 * have not taught underlined, and the author's key ideas beside the learner's
 * own notes. It grades nothing.
 *
 * The talk is held like a text read (`ReadText`): every spelling in the forms
 * list (a regional one in `DIALECT_WORDS` instead), allowed to run ahead of the
 * course, its English held to braces. A short answer's accepted answers are
 * words of the talk or taught spellings.
 */
export interface NotesTalk {
  /** What the talk is called, as the show announces it. */
  readonly title: { readonly et: string; readonly en: string };
  /** Who gives it, a speaker of the cast. */
  readonly speaker: Speaker;
  /** How often it may be heard before the questions: twice in C1's second part, once from its third. */
  readonly hearings: 1 | 2;
  readonly lines: readonly { readonly et: string; readonly en: string }[];
  readonly questions: readonly NotesQuestion[];
  /** The ideas a good set of notes catches, in English, set beside the learner's own afterwards. */
  readonly keyIdeas: readonly { readonly en: string }[];
}

/** A question the notes should answer: a word or two, or one of several. */
export type NotesQuestion =
  | { readonly kind: "short"; readonly q: { readonly et: string; readonly en: string }; readonly accept: readonly string[] }
  | { readonly kind: "choice"; readonly q: { readonly et: string; readonly en: string }; readonly options: readonly { readonly et: string; readonly en: string }[]; readonly answer: number };

/** Which room a thing is said in (C1, which room): to a friend, at work, or in writing. */
export type Room = "friend" | "work" | "writing";

export const ROOMS: readonly Room[] = ["friend", "work", "writing"];

/**
 * WHICH ROOM (C1, §15.7): one thing said three ways, to a friend, at work and
 * in writing, openings and closings included. The learner picks which version
 * fits the room asked for, then, where `rework` is given, turns one version
 * into another, marked as any rework is (`markRework`) against the `to`
 * version and `accept`. The three versions are the author's (ADR-005), each
 * held to the ledger like a rework's sentence.
 */
export interface WhichRoom {
  readonly versions: readonly { readonly room: Room; readonly et: string; readonly en: string }[];
  /** The room whose version is to be picked. */
  readonly ask: Room;
  /** A version to turn into another room's: the `to` version counts, and so does every sentence in `accept`. */
  readonly rework?: { readonly from: Room; readonly to: Room; readonly accept: readonly string[] };
}

/**
 * WORK IT OUT (B2 on, docs/43-lessons.md §13.6).
 *
 * At B2, understanding everything does not mean having been taught
 * everything: it means working a word out from what you know. A sentence
 * carries one word the ledger has not taught but whose parts it has
 * (`lasteaia` + `koht`, `ehita` + `ja`), and the learner picks its meaning out
 * of three before the parts and the word's dictionary entry are shown. It is
 * asked for its meaning and never for its form.
 *
 * The split is the author's and is checked mechanically (`workOutProblems`):
 * the word is its parts joined, every part but the last is a spelling the
 * ledger has taught by that lesson, and the last is a taught spelling or a
 * suffix of `DERIVATION_SUFFIXES`. The word itself is a spelling the forms
 * list knows, so it is a real word somebody wrote down rather than one the app
 * built (ADR-005); the rest of the sentence is held to the ledger as usual.
 */
export interface WorkOut {
  readonly sentence: { readonly et: string; readonly en: string };
  /** The untaught word as it stands in the sentence, once, as a whole word. */
  readonly word: string;
  /** How it is built, in order: `["lasteaia", "koht"]`, `["ehita", "ja"]`. */
  readonly parts: readonly string[];
  /** What the word means, in English. */
  readonly means: string;
  /** Three meanings to choose among, in English; one of them is `means`. */
  readonly options: readonly string[];
}

/**
 * ONE REAL TEXT A PART (B1 on, docs/43-lessons.md §11.2, Write).
 *
 * A writing evening reads a model text that does the job, fills in the same
 * text with its key words taken out, then writes the learner's own and has it
 * read: the dictionary first (`checkTypedSentence`, sentence by sentence),
 * then Anu's comments on the text as a whole where a model is configured,
 * behind the same guard every graded comment passes (`verify.ts`). Then a
 * second draft beside the first, and the sentences written right can be kept
 * as review cards.
 *
 * `model` is the text a sentence at a time, written for the lesson and held to
 * the ledger. `uses` are the words and forms the text turns on: they are the
 * gaps in the frame and the checklist under the learner's own draft, so each
 * has to stand in the model as a whole word.
 */
export interface WriteTask {
  /** What the text is, in English: "A note to the handyman". */
  readonly genre: string;
  /** What it has to get done, in English, one line. */
  readonly purpose: string;
  readonly model: readonly { readonly et: string; readonly en: string }[];
  readonly uses: readonly { readonly et: string; readonly en: string }[];
  /** The learner's own version: the same job, with their details. */
  readonly task: string;
  /** The fewest words the learner's own text should run to. */
  readonly least: number;
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
  /** Sentences to change, B1 on: practice that asks for the evening's pattern by name. */
  readonly reworks?: readonly Rework[];
  /** Lines with a slip in them to put right, B1 on, the learner's own mix-ups first. */
  readonly fixes?: readonly Fix[];
  /** Questions on what was heard, before the text is shown (B1 on). */
  readonly listenFor?: readonly Gist[];
  /**
   * How the conversation is heard on that first, hidden play (B1 on): down a
   * phone line, over café noise, or sped up, which are the rooms
   * `lib/audio/conditions.ts` already makes out of the one clip. Absent is a
   * quiet room. Only the listen-first play takes it; reading the text after,
   * and every line pressed on its own, is clean, since the point is to have
   * caught it once in the room and then to see what it was. `half` (B2) is
   * walking in on a conversation already going: the first line is joined two
   * fifths of the way in and the rest is heard as it is.
   */
  readonly hearing?: "phone" | "cafe" | "quick" | "half";
  /** A short story to hear twice and tell back aloud (B1 on). */
  readonly retell?: Retell;
  /** One answer said three times, faster each time (B1 on). */
  readonly faster?: Faster;
  /** The part's one real text, on its writing evening (B1 on). */
  readonly write?: WriteTask;
  /** A real text read in the Listen step after the transcript, and never asked about (B2 on). */
  readonly read?: ReadText;
  /** Words to work out from their parts, asked for their meaning in Practice (B2 on). */
  readonly workOut?: readonly WorkOut[];
  /** A talk taken down as notes in the Listen step (C1 from its second part). */
  readonly notes?: NotesTalk;
  /** One thing said three ways, for the room it is said in, in Practice (C1). */
  readonly rooms?: readonly WhichRoom[];
  /**
   * A role-play, on a check-in and at the end of a part. `who` is the person
   * the learner talks to, a speaker of the cast: named on the intro and the
   * thread, and every turn voiced in their voice (`otherSideOf`). It is said
   * rather than guessed from who opens the conversation, which named the
   * manager in a meeting whose role-play is an argument with a colleague.
   * Every lesson with a role-play sets it (`otherSide.test.ts`).
   */
  readonly roleplay?: { readonly scene: string; readonly who?: Speaker; readonly turns: readonly Prompt[] };
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
