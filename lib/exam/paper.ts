import { courseWords, unitIntroducing } from "@/lib/collections/syllabus";
import { SCENES, type Scene } from "@/lib/collections/scenes";
import { emojiFor } from "@/lib/collections/emoji";
import { buildCloze, ESTONIAN_WORD, isBuildable, naturalSentence, nominalOpener, sentenceTiles } from "@/lib/estonian/cloze";
import { alsoRightOrders, type OrderContext } from "@/lib/estonian/wordOrder";
import { buildOptions, governmentCue, parseGovernment } from "@/lib/estonian/government";
import { caseByKey } from "@/lib/estonian/cases";
import { PARTS, givesItselfAway } from "@/lib/copy/values";
import { sayEnglish, type Said } from "@/lib/copy/said";
import { dictationWords } from "@/lib/estonian/dictation";
import { writingTasksFor } from "@/lib/estonian/writing";
import { twinsOf } from "@/lib/estonian/gapForms";
import {
  blueprintFor, PAPER_FORMAT, specFor,
  type ExamLevel, type ExamSpec, type PartSpec, type SpeakingShape, type TaskKind, type TaskSpec,
  type WritingGenre,
} from "./spec";
import {
  AGREE, ARGUMENTS, CARD_CITIES, CARD_HOURS, CARD_JOBS, CARD_PEOPLE, DATASETS, DEBATES, DESCRIPTIONS,
  DISCUSSIONS, IDEA_CARDS, LETTERS, NOTES, OPINIONS, PHONE, PICTURE_QUESTIONS, PRESENTATIONS,
  TALKS, TOPICS, topicByKey, topicFits, unfitForExam,
  type AgreeBrief, type ArgumentBrief, type Dataset, type DebateBrief, type DescriptionBrief,
  type DiscussionBrief, type IdeaCard, type LetterBrief, type NoteBrief, type OpinionBrief,
  type PhoneBrief, type PresentationBrief, type TalkBrief, type TopicKey,
} from "./briefs";
import {
  bandOf, differentMeaning, differentText, formNearness, glossNearness, glossOption,
  pickOptions, sentenceNearness, sentenceOption, type GlossOption, type Textual,
} from "@/lib/questions/distractors";
import type { SkillKey } from "./types";
import { drawKeyOf } from "./seed";

/**
 * Assembling one paper.
 *
 * THE WHOLE MODULE EXISTS BECAUSE THE APP MAY NOT WRITE ESTONIAN (ADR-005).
 * A mock exam is the most tempting place in this codebase to break that rule:
 * a model would happily produce four reading passages and thirty questions in
 * a second, and roughly one form in every ten would be invented. So every
 * Estonian character in a finished paper came out of the dictionary, and this
 * module only ever hides, shuffles, or surrounds it. The same discipline
 * `lib/estonian/cloze.ts` already applies to a single exercise, applied to a
 * three hour paper. The situations a written or spoken task is set in are
 * English and live in `./briefs`.
 *
 * The consequence is that a paper is only as long as the dictionary can make
 * it, and the honest thing to do about that is say so. Every task reports a
 * `shortfall`: how many items it could not fill and why. The exam screen prints
 * it, and `../exam/score` marks the part out of what was actually asked rather
 * than out of what the specification wanted. A paper that quietly dropped six
 * questions would inflate every score built on it.
 *
 * DETERMINISTIC. A paper is a pure function of the level, the seed and the
 * pool, so a reload during a sitting rebuilds the same questions instead of
 * quietly handing the learner a fresh set halfway through the listening part.
 *
 * Pure: no React, no Prisma, no clock, no Math.random.
 */

export interface PoolExample {
  et: string;
  en?: string | null;
}

/** One dictionary word, with everything a task builder might need from it. */
export interface PoolWord {
  lexemeId: string;
  lemma: string;
  translation: string;
  pos: string;
  cefr: string | null;
  /**
   * Which of the two sets of local cases the word takes, and whether it
   * answers `kes?` or `mis?`.
   *
   * A narrowing of what this paper asks rather than a widening of it, which is
   * why it is here despite the rule about not changing a measurement in
   * passing: the case-form task was setting the sisseütlev of `hobune` and
   * marking `hobusesse` correct. See lib/estonian/caseQuestion.ts. The
   * business card reads it too, for a job and a place of work.
   */
  semanticTypes: string | null;
  /** Stored principal parts plus anything retrieved from Ekilex. */
  forms: { formType: string; value: string; morphCode: string | null; morphName: string | null }[];
  /** Attested sentences. Never generated. */
  examples: PoolExample[];
  /** The raw government string, when the entry carries one. */
  government: string | null;
  /**
   * The learner's own card for this word, when they have one.
   *
   * Carried so that submitting the paper can grade through the same action
   * every other mode grades through (ADR-016). A word the learner has no card
   * for still makes a perfectly good question; it simply tells the scheduler
   * nothing, because there is nothing of theirs to schedule.
   */
  cardId: string | null;
}

// ── The random number generator ──────────────────────────────────────────────

/*
  `seedFrom` and `rng` moved to `lib/random/seeded.ts` when `lib/scenes/` needed
  the same property for the same reason. Re-exported here because this module's
  own header is about them and because the exam is where the rule that they may
  never change was first written down. The sequence is unchanged: the move was
  a move.
*/
import { rng, seedFrom } from "@/lib/random/seeded";

export { rng, seedFrom };

/**
 * The one shuffle not folded into `lib/random/shuffle.ts`, on purpose.
 *
 * The client never sends a mark, only a level, a seed and its answers, so the
 * server rebuilds the paper from that seed to mark it (ADR-022). A paper is a
 * long sitting: change how this draws and a candidate who started before a
 * deploy and handed in after it has their answers marked against a different
 * paper from the one they sat. That is the worst mark this app could produce,
 * on the feature where a wrong one matters most. `PAPER_FORMAT` is what tells
 * a sitting it was built by other code; this function keeps its algorithm so
 * that the format has to be raised on purpose rather than by accident.
 *
 * So it stays where it is and keeps its own algorithm, and the invariant that
 * bans a hand-rolled shuffle names this function as its single exception.
 */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  return items
    .map((item) => ({ item, k: random() }))
    .sort((a, b) => a.k - b.k)
    .map(({ item }) => item);
}

// ── Items ────────────────────────────────────────────────────────────────────

interface BaseItem {
  id: string;
  /** The word this question was built from, so the report can link to it. */
  lexemeId: string;
  lemma: string;
  translation: string;
  /** The learner's card, when they have one. Grades reach the log through it. */
  cardId: string | null;
}

export interface MatchItem extends BaseItem {
  kind: "match-usage";
  /** The sentence, with every form of its own headword blanked out. */
  sentence: string;
  /** The choice id that is right: the lexeme's own id. */
  answer: string;
}

export interface GapChoiceItem extends BaseItem {
  kind: "gap-choice";
  sentence: string;
  full: string;
  answer: string;
  options: string[];
}

/**
 * One gap of a task whose answers share a bank.
 *
 * The answer is the form itself, which is also the bank entry's id: the bank
 * never holds one spelling twice, so a spelling names one entry.
 */
export interface GapBankItem extends BaseItem {
  kind: "gap-bank";
  sentence: string;
  full: string;
  answer: string;
}

export interface OrderItem extends BaseItem {
  kind: "order";
  tiles: string[];
  answer: string;
  /**
   * The other orders of this sentence Estonian allows.
   *
   * On the item rather than worked out at marking time, because the marker
   * rebuilds the paper offline and may not reach a dictionary to do it.
   *
   * Which questions a paper asks is a function of (level, seed, pool) exactly
   * as before, and this changes none of it: the reading is resolved from the
   * dictionary again when the paper is rebuilt to mark it, so a word added
   * between the sitting and the hand-in could add or drop one alternative
   * order on one item. That is the same window the pool itself has, it can
   * only ever change which of two right answers is marked right, and it costs
   * at most the one mark a candidate would have lost before this existed.
   */
  alsoRight: string[];
}

export interface CaseFormItem extends BaseItem {
  kind: "case-form";
  caseKey: string;
  caseEt: string;
  caseQuestion: string;
  /** Every spelling that is right, joined on `PARTS`: `tuppa / toasse`. */
  answer: string;
  /**
   * The word's other forms, for the marker to tell a slip of the hand from the
   * wrong ending: `toast` is one keystroke from `toas` and is the elative.
   */
  rivals: string[];
  provenance: "ekilex" | "derived";
}

export interface GovernmentItem extends BaseItem {
  kind: "government";
  /** The example with its governed word hidden, when there is one. */
  cue: string | null;
  options: { key: string; et: string; question: string }[];
  answer: string;
}

export interface DictationItem extends BaseItem {
  kind: "dictation";
  /** The sentence or word, which is both the audio and the answer. */
  answer: string;
  words: number;
  unit: "sentence" | "word";
}

export interface ListenChooseItem extends BaseItem {
  kind: "listen-choose";
  answer: string;
  options: string[];
  /** Whether the recording is a sentence or a single word. Said on screen. */
  unit: "sentence" | "word";
}

/** A sentence heard whole, and printed with one word missing. */
export interface ListenGapItem extends BaseItem {
  kind: "listen-gap";
  /** What is printed: the sentence with its word taken out. */
  sentence: string;
  /** What is played: the sentence as a lexicographer recorded it. */
  full: string;
  answer: string;
}

/** A recording, a line printed under it, and whether the line is what it said. */
export interface ListenTrueFalseItem extends BaseItem {
  kind: "listen-truefalse";
  /** What is played. */
  audio: string;
  /** What is printed. The same sentence, or another one a lexicographer recorded. */
  statement: string;
  answer: "true" | "false";
}

export interface GlossChoiceItem extends BaseItem {
  kind: "gloss-choice";
  /** The Estonian word, as the dictionary holds it. */
  word: string;
  /** English meanings. Written by lexicographers and translators, not by this app. */
  options: string[];
  answer: string;
}

export interface FormChoiceItem extends BaseItem {
  kind: "form-choice";
  caseKey: string;
  caseEt: string;
  caseQuestion: string;
  options: string[];
  answer: string;
  provenance: "ekilex" | "derived";
}

/**
 * A word a written task names, carrying the forms that mark it.
 *
 * `pos` and `forms` are not decoration. `usesRequiredWord` used to prefix-match
 * a truncated lemma, which credited `kirjutan` for `kiri` and `aeglane` for
 * `aeg`; what tells those apart is the word's own forms, so the paper carries
 * them and the marker and the screen read one set of forms. The speak task's idea card
 * keeps the lighter shape, because nothing marks it.
 */
export interface MustUseWord {
  lemma: string;
  translation: string;
  lexemeId: string;
  pos: string;
  forms: { formType: string; value: string }[];
}

/** One dictionary word offered on a card, which nothing marks. */
export interface IdeaWord {
  lemma: string;
  translation: string;
  lexemeId: string;
}

/**
 * What a written task is written from, where the real paper hands one over.
 *
 * The A2 paper opens with a business card and the B2 and C1 papers set a
 * summary of figures. Both are drawn as an object rather than described in a
 * sentence, because "summarize the figures" over no figures is not the task.
 * Told apart by `layout` rather than `kind`, which is what names a question.
 */
export type Exhibit =
  | {
    layout: "card";
    name: string;
    email: string;
    city: string;
    /** In English, because carrying it over into Estonian is the task. */
    hours: string;
    /** The job and the workplace are dictionary words, and the text has to use both. */
    job: IdeaWord;
    workplace: IdeaWord;
  }
  | {
    layout: "table";
    title: string;
    unit: string;
    columns: readonly [string, string];
    rows: readonly { label: string; values: readonly [number, number] }[];
  };

/**
 * One of the briefs a written task offers.
 *
 * Each carries its own words, because two briefs on two topics asking for the
 * same four words would be asking for words one of them has nothing to do with.
 * Every one is marked the same way, on length and on its own words, so the
 * choice changes what somebody writes and not what it is worth.
 */
export interface WrittenVariant {
  genre: WritingGenre;
  /** Shown on the button that picks it: "A story", "An informal letter". */
  label: string;
  /** The task, in English. The app teaches in English; only the answer is Estonian. */
  prompt: string;
  /** The points the text has to cover, which the real task always lists. */
  cover: string[];
  /**
   * `prompt` and `cover` as templates and the fragments that fill them, so a
   * screen can say the brief in Russian or Ukrainian. The English above is
   * `sayEnglish` of these, byte for byte, so the two cannot come apart.
   */
  promptSaid: Said;
  coverSaid: Said[];
  /** What it is about, as a prompt names it. */
  topic: string;
  /** Words from the dictionary the text must use, with their glosses. */
  mustUse: MustUseWord[];
  exhibit: Exhibit | null;
}

interface WrittenBase extends BaseItem {
  /**
   * The briefs the real paper offers, and the learner picks one.
   *
   * "Testitaval tuleb kirjutada kas a) jutt etteantud teemal või b) isiklik
   * kiri" is the B1 specification's own wording for the second writing task, so
   * a mock that hands over one brief and no choice is setting a different task.
   */
  variants: WrittenVariant[];
  minWords: number;
  /** The most words the text may run to, where the real paper sets a ceiling. */
  maxWords: number | null;
}

export interface MessageItem extends WrittenBase {
  kind: "message";
}

export interface ComposeItem extends WrittenBase {
  kind: "compose";
}

/** What a spoken task puts in front of the candidate, by shape. */
export type SpeakCard =
  | { shape: "picture"; situation: string; emoji: string[]; questions: string[] }
  | { shape: "idea-card"; about: string; ask: string[] }
  | { shape: "agree"; questions: string[]; situation: string; alternatives: string[] }
  | { shape: "phone"; call: string; find: string[]; answerAs: string; facts: string[] }
  | {
    shape: "talk";
    task: string;
    followUp: string;
    /** The real paper lets a candidate swap the topic card once. */
    swap: { task: string; followUp: string } | null;
  }
  | {
    shape: "debate";
    questions: string[];
    situation: string;
    sides: { label: string; points: string[] }[];
  }
  | { shape: "presentation"; topics: string[]; followUps: string[] }
  | { shape: "discussion"; question: string; thoughts: string[] };

export interface SpeakItem extends BaseItem {
  kind: "speak";
  shape: SpeakingShape;
  /** What it is about, in English. */
  topic: string;
  /** What to do, in English. */
  prompt: string;
  /** `prompt` as a template and its fragments, for a screen in another language. */
  promptSaid: Said;
  /** How long to speak for. */
  seconds: number;
  /** How long to prepare first, where the real paper gives time to. */
  prepSeconds: number;
  card: SpeakCard;
  /** Words to reach for, from the dictionary, on the task's topic. */
  ideas: IdeaWord[];
}

export type ExamItem =
  | MatchItem | GapChoiceItem | GapBankItem | OrderItem | CaseFormItem | GovernmentItem
  | DictationItem | ListenChooseItem | ListenGapItem | ListenTrueFalseItem
  | MessageItem | ComposeItem | SpeakItem
  | GlossChoiceItem | FormChoiceItem;

export interface ExamTask {
  spec: TaskSpec;
  items: ExamItem[];
  /**
   * Choices shared by every item of a matching task or a word bank.
   *
   * `gloss` is empty on a word bank, because the meaning of each form beside it
   * would answer the question for anybody who can read English.
   */
  choices?: { id: string; label: string; gloss: string }[];
  /**
   * The shape this task was actually set as, when it is not the one the
   * specification asked for. Null when it is.
   */
  fallbackFrom: TaskKind | null;
  /** Marks the dictionary could not supply a question for. */
  shortfall: number;
  /** Why, in one line, when there is a shortfall. Null otherwise. */
  shortfallReason: string | null;
  /** Marks actually on offer: the spec's raw marks less the shortfall. */
  rawAvailable: number;
}

export interface ExamPart {
  spec: PartSpec;
  tasks: ExamTask[];
}

export interface Paper {
  level: ExamLevel;
  spec: ExamSpec;
  /** The string the paper was built from. Put it in a URL to get it back. */
  seed: string;
  /** Which version of the builders made it. See `PAPER_FORMAT`. */
  format: number;
  parts: ExamPart[];
  /** True when at least one task could not be filled. */
  thin: boolean;
  /** True when at least one task was set in its fallback shape. */
  substituted: boolean;
  /** Which numbered paper this is, or absent for one drawn at random (`lib/exam/assemble.ts`). */
  number?: number | null;
  /** The one part being sat on its own, or absent for the whole paper. */
  part?: SkillKey | null;
}

// ── Choosing the material ────────────────────────────────────────────────────

const RANK: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };

/**
 * The longest sentence a level reads, in characters.
 *
 * A dictionary usage is written to show a word to somebody who already reads
 * Estonian, so the longest of them are a paragraph's worth of clauses, and an
 * A2 candidate handed one is reading at C1 to answer a question about A2.
 * The real A2 paper's longest text is 150 words of plain sentences.
 */
const LONGEST_SENTENCE: Record<ExamLevel, number> = { A1: 60, A2: 80, B1: 110, B2: 140, C1: 140 };

/**
 * Words this level may be examined on.
 *
 * A level examines everything up to and including itself, which is how the real
 * paper works: a B2 candidate is not excused an A2 word. Sorted so the words at
 * the level itself come first, then the level below, and so on, and the
 * builders take from the front.
 *
 * AN ENTRY WITH NO CEFR TAG IS ADMITTED AT C1 ALONE. It used to come in from
 * B1, where the untagged part of the dictionary mostly sits, and the untagged
 * part is the tail of the Wiktionary expansion: a B1 paper asked about
 * `ajatolla` and set a usage about medieval tax law. A word the course and the
 * Institute both left unbanded is not a word the B1 or B2 examination tests.
 *
 * AND NEVER A WORD NOBODY WOULD PUT ON A PAPER. See `unfitForExam`.
 */
export function eligibleWords(pool: readonly PoolWord[], level: ExamLevel): PoolWord[] {
  const ceiling = RANK[level] ?? 2;
  const scored: { word: PoolWord; rank: number }[] = [];
  for (const word of pool) {
    if (unfitForExam(word.translation)) continue;
    const rank = word.cefr ? RANK[word.cefr] : undefined;
    if (rank === undefined) {
      if (ceiling >= RANK.C1!) scored.push({ word, rank: ceiling });
      continue;
    }
    if (rank <= ceiling) scored.push({ word, rank });
  }
  // Closest to the level first, so a C1 paper is not quietly made of A1 nouns.
  return scored.sort((a, b) => b.rank - a.rank).map(({ word }) => word);
}

/** Every spelling the dictionary vouches for, for this word. */
export function formsOf(word: PoolWord): string[] {
  return [...new Set([word.lemma, ...word.forms.map((f) => f.value)])].filter(Boolean);
}

/** A gloss with what a candidate could otherwise be eliminated by. */
function glossFor(word: PoolWord): GlossOption {
  return glossOption({
    text: word.translation,
    pos: word.pos,
    band: bandOf(word.cefr),
    theme: unitIntroducing(word.lemma, word.pos),
  });
}

export const BLANK = "____";

/**
 * Hides every form of one word in a sentence.
 *
 * Used by the matching task, where the sentence would otherwise name its own
 * answer. Longest match first, for the same reason `buildCloze` prefers it: a
 * word list for `tuba` holds `toa` and `toas`, and blanking the shorter inside
 * the longer leaves `____s`, which asks a question nobody can answer.
 */
export function maskForms(sentence: string, forms: readonly string[]): string {
  const wanted = new Set(forms.map((f) => f.trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) return sentence;
  let out = "";
  let cursor = 0;
  for (const token of sentence.matchAll(ESTONIAN_WORD)) {
    const value = token[0];
    if (!wanted.has(value.toLowerCase())) continue;
    const start = token.index;
    out += sentence.slice(cursor, start) + BLANK;
    cursor = start + value.length;
  }
  return out + sentence.slice(cursor);
}

/** Sentences worth using, shortest first, with the word they came from. */
interface Sentence {
  word: PoolWord;
  text: string;
}

export function sentencesFrom(words: readonly PoolWord[], longest = 140): Sentence[] {
  const out: Sentence[] = [];
  for (const word of words) {
    /*
      The same guard the placement check applies, and for the same reason: a
      usage that trails off, offers two alternatives round a slash, or opens
      with its own headword before a comma is lexicography rather than a
      sentence, and a candidate asked to read one cannot answer it or argue
      with it. One definition in `lib/estonian/cloze.ts`, because two papers
      disagreeing about what counts as a sentence is two answers to one
      question.

      And the label pattern is read through `nominalOpener` rather than a
      copy of it, because the copy that stood here kept the old exemption,
      `VERB` alone, after the rule was narrowed to the noun: an interjection,
      an adverb or a phrase opening its own usage before a comma was refused
      in this paper and kept by the deck and the placement check.
    */
    const opener = nominalOpener(word.pos, formsOf(word));
    for (const example of word.examples) {
      const text = example.et.trim().replace(/\s+/g, " ");
      if (text.length < 8 || text.length > longest) continue;
      if (!naturalSentence(text, opener)) continue;
      out.push({ word, text });
    }
  }
  return out;
}

// ── What the written and spoken tasks are about ──────────────────────────────

/**
 * The course words on each topic a level may draw on, hardest first.
 *
 * A word belongs to a topic when any unit that teaches it is one of the topic's
 * units, and it is on offer at a level when the unit that introduces it is at
 * or below that level. Content words only: a text asked to use `ja` or `kas`
 * is not being asked anything.
 */
const TOPIC_VOCABULARY: ReadonlyMap<TopicKey, readonly { lemma: string; pos: string; rank: number }[]> = (() => {
  const out = new Map<TopicKey, { lemma: string; pos: string; rank: number }[]>();
  for (const topic of TOPICS) {
    const units = new Set(topic.units);
    out.set(
      topic.key,
      courseWords()
        .filter((w) => (w.pos === "NOUN" || w.pos === "VERB" || w.pos === "ADJECTIVE") && w.units.some((u) => units.has(u)))
        .map((w) => ({ lemma: w.lemma, pos: w.pos, rank: RANK[w.level] ?? 0 }))
        .sort((a, b) => b.rank - a.rank || (a.lemma < b.lemma ? -1 : a.lemma > b.lemma ? 1 : 0)),
    );
  }
  return out;
})();

function vocabularyFor(topic: TopicKey, level: ExamLevel): { lemma: string; pos: string; rank: number }[] {
  const ceiling = RANK[level] ?? 0;
  return (TOPIC_VOCABULARY.get(topic) ?? []).filter((w) => w.rank <= ceiling);
}

/** A topic is set only where the course has taught enough words on it to write with. */
const ENOUGH_WORDS = 12;

function setsAt(topic: TopicKey, level: ExamLevel): boolean {
  return topicFits(topicByKey(topic), level) && vocabularyFor(topic, level).length >= ENOUGH_WORDS;
}

/** One brief for a written task, resolved from the tables in `./briefs`. */
export type WrittenBrief =
  | { genre: "card"; topic: "work"; person: { name: string; email: string }; city: string; hours: string; fallback: NoteBrief }
  | { genre: "note"; topic: TopicKey; note: NoteBrief }
  | { genre: "description"; topic: TopicKey; description: DescriptionBrief }
  | { genre: "story" | "personal-letter"; topic: TopicKey }
  | { genre: "letter-semiformal" | "letter-informal"; topic: TopicKey; letter: LetterBrief }
  | { genre: "data-comment" | "data-summary"; topic: TopicKey; dataset: Dataset }
  | { genre: "argument"; topic: TopicKey; argument: ArgumentBrief }
  | { genre: "opinion"; topic: TopicKey; opinion: OpinionBrief };

/** One brief for a spoken task. */
export type SpokenBrief =
  | { shape: "picture"; scene: Scene }
  | { shape: "idea-card"; topic: TopicKey; card: IdeaCard }
  | { shape: "agree"; topic: TopicKey; brief: AgreeBrief }
  | { shape: "phone"; topic: TopicKey; brief: PhoneBrief }
  | { shape: "talk"; topic: TopicKey; brief: TalkBrief; swap: TalkBrief | null }
  | { shape: "debate"; topic: TopicKey; brief: DebateBrief }
  | { shape: "presentation"; topic: TopicKey; brief: PresentationBrief }
  | { shape: "discussion"; topic: TopicKey; brief: DiscussionBrief };

/**
 * What every written and spoken task on one paper is about.
 *
 * Decided before the pool is read and from the seed alone, on a stream of its
 * own, so that `lib/progress/exam.ts` can fetch the course words those topics
 * need before the paper is built (`planLemmas`). The words a task asks for were
 * any five off the front of the pool, which is how a B1 story about your family
 * came to require `ayatollah`, `wolf` and `flee`.
 */
export interface PaperPlan {
  writing: WrittenBrief[][];
  speaking: SpokenBrief[];
}

export function planFor(level: ExamLevel, seed: string): PaperPlan {
  const spec = specFor(level);
  const random = rng(seedFrom(`plan:${level}:${seed}`));
  const used = new Set<TopicKey>();

  /** One brief off a table, on a topic the level sets, a topic not used yet if there is one. */
  function pick<T extends { topic: TopicKey }>(list: readonly T[], keep: (b: T) => boolean = () => true): T | null {
    const fits = list.filter((b) => setsAt(b.topic, level) && keep(b));
    const fresh = fits.filter((b) => !used.has(b.topic));
    const from = fresh.length > 0 ? fresh : fits;
    const chosen = shuffle(from, random)[0] ?? null;
    if (chosen) used.add(chosen.topic);
    return chosen;
  }

  function freeTopic(): TopicKey {
    const fits = TOPICS.filter((t) => setsAt(t.key, level));
    const fresh = fits.filter((t) => !used.has(t.key));
    const chosen = shuffle(fresh.length > 0 ? fresh : fits, random)[0]?.key ?? "home";
    used.add(chosen);
    return chosen;
  }

  const writing = spec.parts
    .find((p) => p.skill === "writing")!.tasks
    .filter((t) => t.kind === "message" || t.kind === "compose")
    .map((t) => {
      const genres = t.genres ?? [];
      /*
        A story and a personal letter are two ways of writing about one topic,
        which is how the B1 paper words it; every other pair is two separate
        briefs, each on a topic of its own.
      */
      const shared = genres.includes("story") ? freeTopic() : null;
      return genres.map((genre): WrittenBrief => {
        switch (genre) {
          case "card":
            return {
              genre, topic: "work",
              person: shuffle(CARD_PEOPLE, random)[0]!,
              city: shuffle(CARD_CITIES, random)[0]!,
              hours: shuffle(CARD_HOURS, random)[0]!,
              fallback: pick(NOTES) ?? NOTES[0]!,
            };
          case "note": {
            const note = pick(NOTES) ?? NOTES[0]!;
            return { genre, topic: note.topic, note };
          }
          case "description": {
            const description = pick(DESCRIPTIONS) ?? DESCRIPTIONS[0]!;
            return { genre, topic: description.topic, description };
          }
          case "story":
          case "personal-letter":
            return { genre, topic: shared ?? freeTopic() };
          case "letter-semiformal":
          case "letter-informal": {
            const register = genre === "letter-semiformal" ? "semiformal" : "informal";
            const letter = pick(LETTERS, (l) => l.register === register)
              ?? LETTERS.find((l) => l.register === register)!;
            return { genre, topic: letter.topic, letter };
          }
          case "data-comment":
          case "data-summary": {
            const dataset = pick(DATASETS) ?? DATASETS[0]!;
            return { genre, topic: dataset.topic, dataset };
          }
          case "argument": {
            const argument = pick(ARGUMENTS) ?? ARGUMENTS[0]!;
            return { genre, topic: argument.topic, argument };
          }
          case "opinion": {
            const opinion = pick(OPINIONS) ?? OPINIONS[0]!;
            return { genre, topic: opinion.topic, opinion };
          }
        }
      });
    });

  const speaking = spec.parts
    .find((p) => p.skill === "speaking")!.tasks
    .map((t): SpokenBrief => {
      switch (t.shape ?? "idea-card") {
        case "picture":
          return { shape: "picture", scene: shuffle(scenesAt(level), random)[0]! };
        case "idea-card": {
          const card = pick(IDEA_CARDS) ?? IDEA_CARDS[0]!;
          return { shape: "idea-card", topic: card.topic, card };
        }
        case "agree": {
          const brief = pick(AGREE) ?? AGREE[0]!;
          return { shape: "agree", topic: brief.topic, brief };
        }
        case "phone": {
          const brief = pick(PHONE) ?? PHONE[0]!;
          return { shape: "phone", topic: brief.topic, brief };
        }
        case "talk": {
          const brief = pick(TALKS) ?? TALKS[0]!;
          const swap = shuffle(TALKS.filter((b) => b !== brief && setsAt(b.topic, level)), random)[0] ?? null;
          return { shape: "talk", topic: brief.topic, brief, swap };
        }
        case "debate": {
          const brief = pick(DEBATES) ?? DEBATES[0]!;
          return { shape: "debate", topic: brief.topic, brief };
        }
        case "presentation": {
          const brief = pick(PRESENTATIONS) ?? PRESENTATIONS[0]!;
          return { shape: "presentation", topic: brief.topic, brief };
        }
        case "discussion": {
          const brief = pick(DISCUSSIONS) ?? DISCUSSIONS[0]!;
          return { shape: "discussion", topic: brief.topic, brief };
        }
      }
    });

  return { writing, speaking };
}

/**
 * The pictures a level may be shown: every thing in it a word the course has
 * taught by then. A picture of three things nobody has the words for yet is a
 * silence rather than a speaking task.
 */
function scenesAt(level: ExamLevel): readonly Scene[] {
  const ceiling = RANK[level] ?? 0;
  const taught = new Map<string, number>();
  for (const w of courseWords()) {
    const rank = RANK[w.level] ?? 0;
    taught.set(w.lemma, Math.min(rank, taught.get(w.lemma) ?? rank));
  }
  const fits = SCENES.filter((s) => s.lemmas.every((l) => (taught.get(l) ?? 99) <= ceiling));
  return fits.length > 0 ? fits : SCENES;
}

/** The topics a plan is about, and the course words it may ask for. */
function topicsOf(plan: PaperPlan): TopicKey[] {
  const out: TopicKey[] = [];
  for (const brief of plan.writing.flat()) {
    out.push(brief.topic);
    if (brief.genre === "card") out.push("town", brief.fallback.topic);
  }
  for (const brief of plan.speaking) if (brief.shape !== "picture") out.push(brief.topic);
  return [...new Set(out)];
}

/**
 * Every lemma a paper's written and spoken tasks may ask for, so the pool can
 * be made to hold them.
 *
 * The pool is five hundred entries drawn from the whole level, and a topic's
 * course words are a few dozen of several thousand, so a pool left to chance
 * holds four or five of them at B1. `lib/progress/exam.ts` adds these to the
 * draw, under the same rules every other entry in the pool is held to.
 */
export function planLemmas(level: ExamLevel, seed: string): string[] {
  // A numbered paper is built on its draw key (`assemblePaper`), so its plan is that key's.
  const plan = planFor(level, drawKeyOf(seed));
  const out = new Set<string>();
  for (const topic of topicsOf(plan)) for (const w of vocabularyFor(topic, level)) out.add(w.lemma);
  for (const brief of plan.speaking) if (brief.shape === "picture") for (const l of brief.scene.lemmas) out.add(l);
  if (plan.writing.flat().some((b) => b.genre === "card")) {
    for (const pair of CARD_JOBS) out.add(pair.job).add(pair.place);
  }
  return [...out].sort();
}

// ── The builders, one per task shape ─────────────────────────────────────────

interface BuildContext {
  level: ExamLevel;
  words: PoolWord[];
  sentences: Sentence[];
  random: () => number;
  /** Words already used for a question, so one word does not carry the paper. */
  spent: Set<string>;
  /** What the dictionary says about the words of the sentences in the pool. */
  wordOrder: OrderContext;
  plan: PaperPlan;
}

function base(word: PoolWord, id: string): BaseItem {
  return {
    id,
    lexemeId: word.lexemeId,
    lemma: word.lemma,
    translation: word.translation,
    cardId: word.cardId,
  };
}

/** Sentences whose word has not been used yet, in a shuffled order. */
function freshSentences(ctx: BuildContext): Sentence[] {
  return shuffle(ctx.sentences.filter((s) => !ctx.spent.has(s.word.lexemeId)), ctx.random);
}

/** The options a choice task offers: the spec's count, or the three the real paper mostly sets. */
function optionCount(spec: TaskSpec): number {
  return spec.options ?? 3;
}

/** A form, and whether it belongs to the word the question is about. */
interface FormOption extends Textual {
  readonly sibling: boolean;
}

/**
 * How near one form is to another, with a form of the same word always first.
 *
 * `lib/questions/distractors.ts` decides what near means and this adds the one
 * fact it cannot know: which word an option came off. A form-choice question
 * claims to be asking the learner to choose an *ending*, and it only is while
 * every option stands on one stem, so a sibling outranks any stranger however
 * close the stranger's spelling happens to be.
 */
const SIBLING_FIRST = 100;

function stemFirst(candidate: FormOption, answer: FormOption): number {
  return formNearness(candidate, answer) + (candidate.sibling ? SIBLING_FIRST : 0);
}

/** The first letter capitalized, the way a word opening a sentence is written. */
function opening(text: string): string {
  return text.charAt(0).toLocaleUpperCase("et") + text.slice(1);
}

function buildMatch(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: MatchItem[] = [];
  const choices: { id: string; label: string; gloss: string }[] = [];
  for (const sentence of freshSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;
    const masked = maskForms(sentence.text, formsOf(sentence.word));
    // A sentence that never names its own word teaches nothing here: with the
    // headword absent there is no evidence to match on, only a guess.
    if (!masked.includes(BLANK)) continue;
    // Nor one where every word is gone, which leaves a row of blanks to match.
    if ([...masked.matchAll(ESTONIAN_WORD)].length < 2) continue;
    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "match-usage",
      sentence: masked,
      answer: sentence.word.lexemeId,
    });
    choices.push({
      id: sentence.word.lexemeId,
      label: sentence.word.lemma,
      gloss: sentence.word.translation,
    });
  }
  return finish(spec, items, shuffle(choices, ctx.random), "a sentence written to show off one particular word");
}

/**
 * The gapped text: a recorded sentence with a word gone, and forms of that word.
 *
 * EVERY OPTION IS A FORM OF THE ONE WORD. Forms of other words were allowed to
 * top up a word with too few of its own, and an option that is a different
 * word altogether is a vocabulary question dressed as a grammar one, crossed
 * out by anybody who recognizes the sentence's subject. A word without enough
 * forms of its own is passed over for one that has them.
 *
 * AND A GAP AT THE START OF A SENTENCE IS OFFERED IN CAPITALS. The answer kept
 * the capital it has in the sentence and the other forms did not, so the one
 * option with a capital letter was the answer, on every gap that opened a
 * sentence.
 */
function buildGapChoice(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: GapChoiceItem[] = [];
  for (const sentence of freshSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;

    const forms = formsOf(sentence.word);
    const cloze = buildCloze(sentence.text, forms);
    if (!cloze) continue;

    const inSentence = new Set(
      [...cloze.text.matchAll(ESTONIAN_WORD)].map((m) => m[0].toLowerCase()),
    );
    // Not the answer, and not its twin: `aegasid` is right wherever `aegu` is.
    const twins = twinsOf(sentence.word, cloze.answer);
    const opens = cloze.index === 0;
    const shape = (text: string) => (opens ? opening(text) : text);
    const siblings = [...new Set(
      forms
        .filter((f) => !twins.has(f.toLowerCase()) && !inSentence.has(f.toLowerCase()))
        .filter((f) => f.toLowerCase() !== cloze.answer.toLowerCase())
        .map(shape),
    )];

    const set = pickOptions({
      answer: { text: cloze.answer },
      candidates: siblings.map((text) => ({ text })),
      rng: ctx.random,
      distinct: differentText,
      nearness: formNearness,
      count: optionCount(spec),
    });
    if (!set) continue;

    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "gap-choice",
      sentence: cloze.text,
      full: cloze.full,
      answer: cloze.answer,
      options: set.options,
    });
  }
  return finish(spec, items, undefined, "a sentence that uses a word with enough forms of its own");
}

/**
 * Gaps filled from one bank, with more in the bank than there are gaps.
 *
 * "Variante on rohkem kui lünki", says the B1 specification. The extra entries
 * are other forms of words already in the bank, which can never be right for
 * their own gap and are a grammar question for every other one: a learner has
 * to choose the ending as well as the word. A form spelled like any answer, or
 * like a twin of one, never goes in, so no gap has two right entries. How many
 * is the level's: two at B1, which publishes no number, and one at B2, whose
 * specification says the bank holds exactly one entry that fits nowhere.
 */
const BANK_EXTRAS = 2;

function buildGapBank(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: GapBankItem[] = [];
  const words: PoolWord[] = [];
  const taken = new Set<string>();
  for (const sentence of freshSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;
    const cloze = buildCloze(sentence.text, formsOf(sentence.word));
    // Never the first word of a sentence: its capital would mark it in the bank.
    if (!cloze || cloze.index === 0) continue;
    const answer = cloze.answer.toLowerCase();
    if (taken.has(answer)) continue;
    taken.add(answer);
    ctx.spent.add(sentence.word.lexemeId);
    words.push(sentence.word);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "gap-bank",
      sentence: cloze.text,
      full: cloze.full,
      answer,
    });
  }

  const shown = new Set(items.flatMap((i) => [...i.full.matchAll(ESTONIAN_WORD)].map((m) => m[0].toLowerCase())));
  const ruledOut = new Set<string>(taken);
  items.forEach((item, i) => {
    for (const twin of twinsOf(words[i]!, item.answer)) ruledOut.add(twin.toLowerCase());
  });
  const extras: string[] = [];
  for (const word of shuffle(words, ctx.random)) {
    if (extras.length >= (spec.spares ?? BANK_EXTRAS)) break;
    const spare = shuffle(formsOf(word), ctx.random).find((f) => {
      const lower = f.toLowerCase();
      return !ruledOut.has(lower) && !/\s/.test(f) && f.length >= 3 && !shown.has(lower);
    });
    if (!spare) continue;
    ruledOut.add(spare.toLowerCase());
    extras.push(spare.toLowerCase());
  }

  const bank = shuffle([...items.map((i) => i.answer), ...extras], ctx.random)
    .map((form) => ({ id: form, label: form, gloss: "" }));
  return finish(spec, items, items.length > 0 ? bank : undefined, "a sentence whose word is not its first");
}

function buildOrder(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: OrderItem[] = [];
  for (const sentence of freshSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;
    if (!isBuildable(sentence.text)) continue;
    const tiles = sentenceTiles(sentence.text);

    // Shuffled until the order actually differs. Four attempts, because a
    // three word sentence can land back on itself and an infinite loop in a
    // pure function is still an infinite loop.
    let scrambled = tiles;
    for (let attempt = 0; attempt < 4 && scrambled.join(" ") === tiles.join(" "); attempt++) {
      scrambled = shuffle(tiles, ctx.random);
    }
    if (scrambled.join(" ") === tiles.join(" ")) continue;

    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "order",
      tiles: scrambled,
      answer: sentence.text,
      alsoRight: alsoRightOrders(sentence.text, ctx.wordOrder),
    });
  }
  return finish(spec, items, undefined, "a sentence of four to twelve different words");
}

function buildCaseForm(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: CaseFormItem[] = [];
  for (const word of shuffle(ctx.words, ctx.random)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(word.lexemeId)) continue;
    const tasks = writingTasksFor(word);
    if (tasks.length === 0) continue;
    const task = tasks[Math.floor(ctx.random() * tasks.length)] ?? tasks[0]!;
    ctx.spent.add(word.lexemeId);
    /*
      Both illatives are right, as they are on every other screen that asks
      for one: the item carried `targetForm` alone, so a candidate who wrote
      `toasse` for the illative of `tuba` was marked wrong on a mock state
      examination. And the word's other forms travel with it, because without
      them the typo rule reads `toast` for `toas` as one letter out and the
      grade batch logs the wrong case as a recall.
    */
    const right = [task.targetForm, task.alsoRight].filter((f): f is string => Boolean(f));
    const rivals = [...new Set([
      ...word.forms.map((f) => f.value),
      ...tasks.flatMap((t) => [t.targetForm, t.alsoRight]),
    ])].filter((f): f is string => Boolean(f) && !right.includes(f!));
    items.push({
      ...base(word, `${spec.id}-${items.length}`),
      kind: "case-form",
      caseKey: task.caseKey,
      caseEt: task.caseEt,
      caseQuestion: task.caseQuestion,
      answer: right.join(PARTS),
      rivals,
      provenance: task.provenance,
    });
  }
  return finish(spec, items, undefined, "a noun whose omastav is in the dictionary");
}

function buildGovernment(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const governed = ctx.words
    /*
      Verbs only. The task asks "which case does the verb take", and the
      dictionary records a government for 36 nouns and 12 adjectives too:
      `osa` genuinely takes the partitive and the elative, but asking about it
      as a verb is a question worded as a fact the entry does not support. The
      government drill at /review/government has always filtered this way and
      this builder never did.
    */
    .filter((word) => word.pos === "VERB")
    .map((word) => ({ word, government: parseGovernment(word.government) }))
    .filter((row): row is { word: PoolWord; government: NonNullable<ReturnType<typeof parseGovernment>> } =>
      row.government !== null);
  const casePool = governed.map((row) => row.government.caseKey);

  const items: GovernmentItem[] = [];
  for (const row of shuffle(governed, ctx.random)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(row.word.lexemeId)) continue;
    // Null when the word governs so much that no honest distractor is left.
    // Dropped rather than padded, and reported as a shortfall like any other.
    const keys = buildOptions(row.government, casePool, 4, ctx.random);
    if (!keys) continue;
    ctx.spent.add(row.word.lexemeId);
    const options = keys.map((key) => {
      const named = caseByKey(key);
      return {
        key,
        et: named?.et ?? key,
        question: named?.question ?? "",
      };
    });
    items.push({
      ...base(row.word, `${spec.id}-${items.length}`),
      kind: "government",
      cue: governmentCue(row.government),
      options,
      answer: row.government.caseKey,
    });
  }
  return finish(spec, items, undefined, "a verb whose case the dictionary has on record");
}

/** Sentences short enough to hold in your head after a hearing, at this level. */
function heardSentences(ctx: BuildContext): Sentence[] {
  return freshSentences(ctx).filter((s) => {
    const words = dictationWords(s.text).length;
    return words >= 3 && words <= 12 && s.text.length <= Math.min(90, LONGEST_SENTENCE[ctx.level]);
  });
}

function buildDictation(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: DictationItem[] = [];
  for (const sentence of heardSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;
    const words = dictationWords(sentence.text).length;
    // Short enough to hold in your head after one hearing, long enough to be
    // more than a word. The same window the dictation mode uses.
    if (words > 9 || sentence.text.length > 80) continue;
    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "dictation",
      answer: sentence.text,
      words,
      unit: "sentence",
    });
  }

  /*
    A keyless install has no recorded sentences at all, and a listening part
    with nothing in it is not a listening part. A single word is still a
    listening test, and a harder one than it sounds in Estonian: hearing `toas`
    and writing `toa` is the exact failure this exercise exists to catch.
  */
  for (const word of shuffle(ctx.words, ctx.random)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(word.lexemeId)) continue;
    const spoken = pickSpokenForm(word, ctx.random);
    if (!spoken) continue;
    ctx.spent.add(word.lexemeId);
    items.push({
      ...base(word, `${spec.id}-${items.length}`),
      kind: "dictation",
      answer: spoken,
      words: 1,
      unit: "word",
    });
  }

  return finish(spec, items, undefined, "a sentence of three to nine words, or a word to say");
}

/**
 * One form of a word worth playing aloud.
 *
 * An inflected form rather than the headword wherever there is one: the
 * headword is the spelling the learner has already seen most, and a case ending
 * is what a listening test is actually for.
 */
function pickSpokenForm(word: PoolWord, random: () => number): string | null {
  const forms = formsOf(word).filter((f) => f.length >= 3 && !/\s/.test(f));
  if (forms.length === 0) return null;
  const inflected = forms.filter((f) => f.toLowerCase() !== word.lemma.toLowerCase());
  const pool = inflected.length > 0 ? inflected : forms;
  return pool[Math.floor(random() * pool.length)] ?? pool[0] ?? null;
}

function buildListenChoose(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const all = heardSentences(ctx).map((s) => s.text);
  const items: ListenChooseItem[] = [];
  for (const sentence of heardSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;

    /*
      A similar length is the floor rather than the rule: an option half the
      length of the answer is crossed out on the page before the recording has
      played. Inside that, the nearest are the ones sharing words with what was
      said, because those are the ones that have to be *heard* apart rather
      than picked out by the one word the learner recognized.

      Two sentences that say the same thing are still two different recordings,
      so this asks for a different *text* where the reading comprehension
      question asks for a different meaning: there, either option would be a
      right answer, and here the question is which one was played.
    */
    const candidates = all
      .filter((t) => t !== sentence.text && Math.abs(t.length - sentence.text.length) <= 25)
      .map(sentenceOption);
    const set = pickOptions({
      answer: sentenceOption(sentence.text),
      candidates,
      rng: ctx.random,
      distinct: differentText,
      nearness: sentenceNearness,
      count: optionCount(spec),
    });
    if (!set) continue;

    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "listen-choose",
      answer: sentence.text,
      options: set.options,
      unit: "sentence",
    });
  }

  // The same fallback the dictation makes, and for the same reason: without an
  // Ekilex key there are no recorded sentences to hide one among.
  const spokenPool = ctx.words
    .map((word) => pickSpokenForm(word, ctx.random))
    .filter((form): form is string => Boolean(form));
  for (const word of shuffle(ctx.words, ctx.random)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(word.lexemeId)) continue;
    const spoken = pickSpokenForm(word, ctx.random);
    if (!spoken) continue;
    // Words that look, and so mostly sound, like the one being played. A
    // recording is only a listening question while the spellings are close
    // enough that hearing is the only way to tell them apart.
    const set = pickOptions({
      answer: { text: spoken },
      candidates: spokenPool.map((text) => ({ text })),
      rng: ctx.random,
      distinct: differentText,
      nearness: formNearness,
      count: optionCount(spec),
    });
    if (!set) continue;
    ctx.spent.add(word.lexemeId);
    items.push({
      ...base(word, `${spec.id}-${items.length}`),
      kind: "listen-choose",
      answer: spoken,
      options: set.options,
      unit: "word",
    });
  }

  return finish(spec, items, undefined, "a recording, plus similar ones to mix it in with");
}

/**
 * A sentence played whole and printed with one word missing.
 *
 * The real paper's gap task in the listening part: the candidate completes a
 * line on the page with what they heard. The line is the recorded sentence and
 * the word is one of its own, so nothing on the page was written by this app.
 */
function buildListenGap(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: ListenGapItem[] = [];
  for (const sentence of heardSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;
    const cloze = buildCloze(sentence.text, formsOf(sentence.word));
    if (!cloze) continue;
    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "listen-gap",
      sentence: cloze.text,
      full: cloze.full,
      answer: cloze.answer,
    });
  }
  return finish(spec, items, undefined, "a sentence short enough to hear, that uses the word it's about");
}

/**
 * A recording, a sentence under it, and whether they are the same.
 *
 * A wrong line is another recorded sentence, the nearest one there is, which
 * shares words with what was played: a line that has nothing in common with
 * the recording is crossed out on sight. Never a recorded sentence with one
 * word swapped, which would be this app writing Estonian (ADR-005). Half of
 * them are true, near enough, and which half is the seed's.
 */
function buildListenTrueFalse(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const all = heardSentences(ctx).map((s) => s.text);
  const truths = shuffle(
    Array.from({ length: spec.items }, (_, i) => i < Math.ceil(spec.items / 2)),
    ctx.random,
  );
  const items: ListenTrueFalseItem[] = [];
  for (const sentence of heardSentences(ctx)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(sentence.word.lexemeId)) continue;
    const isTrue = truths[items.length] ?? true;
    let statement = sentence.text;
    if (!isTrue) {
      const asked = sentenceOption(sentence.text);
      const ranked = shuffle(
        all.filter((t) =>
          differentText(t, sentence.text)
          && !t.toLowerCase().includes(sentence.text.toLowerCase())
          && !sentence.text.toLowerCase().includes(t.toLowerCase())
          && Math.abs(t.length - sentence.text.length) <= 20),
        ctx.random,
      )
        .map((t) => ({ t, score: sentenceNearness(sentenceOption(t), asked) }))
        .sort((a, b) => b.score - a.score);
      const nearest = ranked[0]?.t;
      if (!nearest) continue;
      statement = nearest;
    }
    ctx.spent.add(sentence.word.lexemeId);
    items.push({
      ...base(sentence.word, `${spec.id}-${items.length}`),
      kind: "listen-truefalse",
      audio: sentence.text,
      statement,
      answer: isTrue ? "true" : "false",
    });
  }
  return finish(spec, items, undefined, "a sentence short enough to hear, and another near it");
}

/**
 * An Estonian word and English meanings. Needs no sentence and no key.
 *
 * The options are ranked rather than shuffled, and the wrong ones are checked
 * against the right one first. This task used to do neither, so it could
 * offer a word's own synonym as a distractor and mark a candidate wrong for
 * choosing it, and it filled a B2 question with whatever came first out of a
 * deck that spans four levels.
 */
function buildGlossChoice(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const seen = new Set<string>();
  const glosses: GlossOption[] = [];
  for (const word of ctx.words) {
    if (!word.translation || seen.has(word.translation)) continue;
    seen.add(word.translation);
    glosses.push(glossFor(word));
  }

  const items: GlossChoiceItem[] = [];
  for (const word of shuffle(ctx.words, ctx.random)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(word.lexemeId) || !word.translation) continue;
    /*
      AND NOT A WORD SPELLED THE SAME IN BOTH LANGUAGES. Thirty entries in the
      shipped dictionary are: `film`, `moment`, `sport`, `park`. The question
      is the Estonian word and the right option is the English gloss, so on
      those two the question prints its own answer and the item cannot be got
      wrong. It is a mark a candidate is given rather than one they earned,
      and this paper's whole claim is that its marking is mechanical and
      fair. The level check refuses the same shape for the same reason, with
      case folded, since `august` beside "August" is no harder to answer.
    */
    if (givesItselfAway(word.lemma, word.translation)) continue;
    const set = pickOptions({
      answer: glossFor(word),
      candidates: glosses,
      rng: ctx.random,
      distinct: differentMeaning,
      nearness: glossNearness,
      count: optionCount(spec),
    });
    if (!set) continue;
    ctx.spent.add(word.lexemeId);
    items.push({
      ...base(word, `${spec.id}-${items.length}`),
      kind: "gloss-choice",
      word: word.lemma,
      answer: word.translation,
      options: set.options,
    });
  }
  return finish(spec, items, undefined, "a word, plus other meanings to mix in with its own");
}

/**
 * A word, a case, and real forms to choose between.
 *
 * The recognition half of the same question `case-form` asks by hand, and the
 * one the real paper's gapped text actually asks: the distractors are other
 * forms of the same word, so the ending is what is being chosen.
 */
function buildFormChoice(spec: TaskSpec, ctx: BuildContext): ExamTask {
  const items: FormChoiceItem[] = [];
  for (const word of shuffle(ctx.words, ctx.random)) {
    if (items.length >= spec.items) break;
    if (ctx.spent.has(word.lexemeId)) continue;
    const tasks = writingTasksFor(word);
    if (tasks.length < 2) continue;
    const task = tasks[Math.floor(ctx.random() * tasks.length)] ?? tasks[0]!;
    const siblings = [
      ...new Set(tasks.map((t) => t.targetForm).filter((f) => f !== task.targetForm)),
    ];
    const own = new Set(siblings.map((f) => f.toLowerCase()));
    const strangers = ctx.words
      .filter((w) => w.lexemeId !== word.lexemeId)
      .flatMap((w) => writingTasksFor(w).map((t) => t.targetForm));
    const candidates: FormOption[] = [...new Set([...siblings, ...strangers])]
      .filter((f) => f !== task.targetForm)
      .map((text) => ({ text, sibling: own.has(text.toLowerCase()) }));
    const set = pickOptions({
      answer: { text: task.targetForm, sibling: true },
      candidates,
      rng: ctx.random,
      distinct: differentText,
      nearness: stemFirst,
      count: optionCount(spec),
    });
    if (!set) continue;

    ctx.spent.add(word.lexemeId);
    items.push({
      ...base(word, `${spec.id}-${items.length}`),
      kind: "form-choice",
      caseKey: task.caseKey,
      caseEt: task.caseEt,
      caseQuestion: task.caseQuestion,
      answer: task.targetForm,
      options: set.options,
      provenance: task.provenance,
    });
  }
  return finish(spec, items, undefined, "a word with several case forms to choose between");
}

// ── The written tasks ────────────────────────────────────────────────────────

/** A pool word as a written task carries it: the gloss to show, the forms to mark with. */
function requiredWord(word: PoolWord): MustUseWord {
  return {
    lemma: word.lemma,
    translation: word.translation,
    lexemeId: word.lexemeId,
    pos: word.pos,
    forms: word.forms.map((f) => ({ formType: f.formType, value: f.value })),
  };
}

function idea(word: PoolWord): IdeaWord {
  return { lemma: word.lemma, translation: word.translation, lexemeId: word.lexemeId };
}

/** English words that say nothing about what a brief is about. */
const QUIET = new Set([
  "about", "after", "also", "been", "both", "could", "each", "every", "from", "have", "into",
  "like", "more", "most", "much", "only", "other", "over", "should", "some", "somebody",
  "something", "than", "that", "their", "them", "then", "there", "they", "this", "what", "when",
  "where", "which", "while", "will", "with", "would", "your", "yours", "make", "made", "does",
  "done", "goes", "give", "gives", "tell", "says", "asks", "know",
]);

/** The content words of an English line, singular. */
function contentWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z]+/)) {
    if (raw.length < 4 || QUIET.has(raw)) continue;
    out.add(raw.endsWith("ies") ? `${raw.slice(0, -3)}y` : raw.endsWith("s") && !raw.endsWith("ss") ? raw.slice(0, -1) : raw);
  }
  return out;
}

/**
 * The pool's words on one topic, the ones the brief itself names first, then
 * hardest first, shuffled within each.
 *
 * Named first because a topic is broader than a task: health takes in a sports
 * day and a health insurance policy, and an argument about sport at school
 * asked to use `saatekiri`, a doctor's referral. A word whose English gloss the
 * brief uses is a word the task is about. Hardest after that, because a C1
 * text asked to use `kodu` and `ema` is not asking anything of a C1 writer;
 * shuffled within a rank so two papers on one topic do not ask for the same
 * words.
 */
function topicWords(ctx: BuildContext, topic: TopicKey, about = ""): PoolWord[] {
  const vocabulary = vocabularyFor(topic, ctx.level);
  const rankOf = new Map<string, number>();
  for (const w of vocabulary) rankOf.set(`${w.lemma}|${w.pos}`, w.rank);
  const named = contentWords(about);
  const seen = new Set<string>();
  const on = ctx.words.filter((w) => {
    if (/\s/.test(w.lemma) || seen.has(w.lemma)) return false;
    if (!rankOf.has(`${w.lemma}|${w.pos}`)) return false;
    seen.add(w.lemma);
    return true;
  });
  const relevance = (w: PoolWord) => [...contentWords(w.translation)].filter((c) => named.has(c)).length;
  return shuffle(on, ctx.random)
    .map((word, i) => ({ word, i, hit: relevance(word), rank: rankOf.get(`${word.lemma}|${word.pos}`) ?? 0 }))
    .sort((a, b) => b.hit - a.hit || b.rank - a.rank || a.i - b.i)
    .map(({ word }) => word);
}

/** Words a text has to use: on its topic, not asked anywhere else on the paper. */
function mustUseFor(ctx: BuildContext, topic: TopicKey, count: number, taken: Set<string>, about = ""): MustUseWord[] {
  const out: MustUseWord[] = [];
  for (const word of topicWords(ctx, topic, about)) {
    if (out.length >= count) break;
    if (ctx.spent.has(word.lexemeId) || taken.has(word.lexemeId)) continue;
    taken.add(word.lexemeId);
    out.push(requiredWord(word));
  }
  return out;
}

/**
 * How many words a text is asked to use.
 *
 * Two in a short text and three or four in a long one: four given words inside
 * twenty of your own is asking for a word list, and this is the one mark in the
 * writing part a machine can give, so it is spent on words that fit the task.
 */
function wordsAsked(genre: WritingGenre, level: ExamLevel): number {
  if (genre === "card") return 2;
  if (genre === "note" || genre === "description") return RANK[level]! >= RANK.B1! ? 3 : 2;
  return RANK[level]! <= RANK.A2! ? 3 : 4;
}

export const GENRE_LABEL: Record<WritingGenre, string> = {
  card: "The business card",
  note: "A note",
  description: "A description",
  story: "A story",
  "personal-letter": "A personal letter",
  "letter-semiformal": "A semi-formal letter",
  "letter-informal": "An informal letter",
  "data-comment": "A summary with your comment",
  argument: "An argument",
  "data-summary": "A summary of the figures",
  opinion: "An opinion piece",
};

/**
 * A job and the place it is done, out of the pool, for the business card.
 *
 * A pair from `CARD_JOBS` whose two words the pool holds at this level, so the
 * card never says a doctor works at a café. Null where none is there, and the
 * task is set as a note instead, which the screen says.
 */
function cardWords(ctx: BuildContext): { job: PoolWord; workplace: PoolWord } | null {
  const find = (lemma: string) =>
    ctx.words.find((w) => w.lemma === lemma && w.pos === "NOUN" && !ctx.spent.has(w.lexemeId));
  for (const pair of shuffle(CARD_JOBS, ctx.random)) {
    const job = find(pair.job);
    const workplace = find(pair.place);
    if (job && workplace) return { job, workplace };
  }
  return null;
}

/** Everything a written brief says in English, for choosing the words it asks for. */
function briefText(brief: WrittenBrief): string {
  switch (brief.genre) {
    case "card": return "";
    case "note": return [brief.note.scenario, ...brief.note.cover].join(" ");
    case "description": return [brief.description.subject, ...brief.description.cover].join(" ");
    case "story":
    case "personal-letter": return topicByKey(brief.topic).phrase;
    case "letter-semiformal":
    case "letter-informal": return [brief.letter.scenario, ...brief.letter.cover].join(" ");
    case "data-comment":
    case "data-summary": return [brief.dataset.title, ...brief.dataset.rows.map((r) => r.label)].join(" ");
    case "argument": return brief.argument.statement;
    case "opinion": return [brief.opinion.situation, ...brief.opinion.points].join(" ");
  }
}

/** Everything a spoken brief says in English, for choosing the words on its card. */
function spokenText(brief: SpokenBrief): string {
  switch (brief.shape) {
    case "picture": return brief.scene.situation;
    case "idea-card": return [brief.card.about, ...brief.card.ask].join(" ");
    case "agree": return [...brief.brief.questions, brief.brief.situation, ...brief.brief.options].join(" ");
    case "phone": return [brief.brief.call, ...brief.brief.find].join(" ");
    case "talk": return [brief.brief.task, brief.brief.followUp].join(" ");
    case "debate": return [...brief.brief.questions, brief.brief.situation, ...brief.brief.sideA.points, ...brief.brief.sideB.points].join(" ");
    case "presentation": return [...brief.brief.choices, ...brief.brief.followUps].join(" ");
    case "discussion": return [brief.brief.question, ...brief.brief.thoughts].join(" ");
  }
}

/**
 * THE CONTEXT EVERY FRAGMENT OF A BRIEF IS TRANSLATED UNDER.
 *
 * A brief is English built out of the tables in `./briefs`, and a screen in
 * Russian or Ukrainian says it through `lib/copy/i18n/areas/exam.ts`. Each
 * fragment is kept there under a context of its own, so a short line such as
 * "work" or "a museum" can be said the way its slot needs it without clashing
 * with the same English on another screen: `brief` where it stands alone or is
 * the object of "Write", `about` for a topic after "about" (the preposition
 * travels with it), `ring` for the place a phone call goes to, `for` for the
 * readers an opinion piece is written for, `card` for the points about the
 * person on a business card, which an idea card asks of a partner in other
 * words.
 */
export const BRIEF_CONTEXT = { brief: "brief", about: "about", ring: "ring", for: "for", card: "card" } as const;

/** A line off the tables, said whole. */
function line(en: string, context: string = BRIEF_CONTEXT.brief): Said {
  return { en, context };
}

/** A template with brief fragments in it, each under the context its slot needs. */
function template(
  en: string,
  words: Readonly<Record<string, readonly [english: string, context: string]>>,
  values?: Readonly<Record<string, string | number>>,
): Said {
  return {
    en,
    ...(values ? { values } : {}),
    words: Object.fromEntries(Object.entries(words).map(([k, [w]]) => [k, w])),
    contexts: Object.fromEntries(Object.entries(words).map(([k, [, c]]) => [k, c])),
  };
}

/** A variant's brief, with its English worked out from the templates, so the two say one thing. */
function briefed(promptSaid: Said, coverSaid: Said[]): { prompt: string; cover: string[]; promptSaid: Said; coverSaid: Said[] } {
  return { prompt: sayEnglish(promptSaid), cover: coverSaid.map(sayEnglish), promptSaid, coverSaid };
}

const lines = (list: readonly string[], context: string = BRIEF_CONTEXT.brief): Said[] => list.map((en) => line(en, context));

/**
 * What a written brief says, as templates and fragments: the task and the
 * points to cover. `asNote` is the business card's fallback, set where the pool
 * holds no job and workplace pair.
 *
 * Exported so `lib/exam/briefs.i18n.test.ts` can walk every brief the tables
 * can produce and hold each to a translation in both languages.
 */
export function writtenSaid(brief: WrittenBrief, asNote = false): { promptSaid: Said; coverSaid: Said[] } {
  const { brief: B, about: ABOUT, for: FOR } = BRIEF_CONTEXT;
  const phrase = (topic: TopicKey) => topicByKey(topic).phrase;
  const said = (promptSaid: Said, coverSaid: Said[]) => ({ promptSaid, coverSaid });

  switch (brief.genre) {
    case "card":
      if (asNote) {
        return said(template("Write {scenario}.", { scenario: [brief.fallback.scenario, B] }), lines(brief.fallback.cover));
      }
      return said(
        template(
          "This is {name}'s business card. Write a short text about them for somebody who has never met them.",
          {},
          { name: brief.person.name },
        ),
        lines(["who they are and what they do", "where they work", "when and how to get in touch"], BRIEF_CONTEXT.card),
      );
    case "note":
      return said(template("Write {scenario}.", { scenario: [brief.note.scenario, B] }), lines(brief.note.cover));
    case "description":
      return said(template("Describe {subject}.", { subject: [brief.description.subject, B] }), lines(brief.description.cover));
    case "story":
      return said(
        template(
          "Write a story about {topic}: something that happened to you or somebody you know.",
          { topic: [phrase(brief.topic), ABOUT] },
        ),
        lines(["what happened, and when", "why it happened", "what you think of it now"]),
      );
    case "personal-letter":
      return said(
        template("Write a personal letter to a friend about {topic}.", { topic: [phrase(brief.topic), ABOUT] }),
        lines(["greet them and ask how they are", "tell them your news on the topic", "ask them something", "sign off"]),
      );
    case "letter-semiformal":
      return said(
        template(
          "Write {scenario}. Address them politely, as you would somebody in an office " +
          "you don't know, and open and close the letter the way that kind of letter does.",
          { scenario: [brief.letter.scenario, B] },
        ),
        lines(brief.letter.cover),
      );
    case "letter-informal":
      return said(
        template("Write {scenario}. Write the way you would to a friend.", { scenario: [brief.letter.scenario, B] }),
        lines(brief.letter.cover),
      );
    case "data-comment":
    case "data-summary":
      return said(
        line(brief.genre === "data-comment"
          ? "Write a summary of the figures in the table for the general public, then say what you think they mean."
          : "Write a general summary of the figures in the table for the readers of a newspaper. Keep your own opinion out of it."),
        lines(brief.genre === "data-comment"
          ? ["compare the figures", "say what has changed or stands out", "give your own comment, with a reason"]
          : ["compare the two columns", "pick out what matters most", "say what follows from the figures, without an opinion"]),
      );
    case "argument":
      return said(
        template('Write a text arguing for or against this statement: "{statement}"', { statement: [brief.argument.statement, B] }),
        lines(["say where you stand", "give two reasons, each with an example", "answer one argument on the other side", "end with a conclusion"]),
      );
    case "opinion":
      return said(
        template("{situation} Write an opinion piece about it for {reader}.", {
          situation: [brief.opinion.situation, B],
          reader: [brief.opinion.reader, FOR],
        }),
        [
          line("introduce the issue"),
          template("develop the first point: {point}", { point: [brief.opinion.points[0], B] }),
          template("develop the second point: {point}", { point: [brief.opinion.points[1], B] }),
          line("end with a short conclusion"),
        ],
      );
  }
}

function variantFor(brief: WrittenBrief, ctx: BuildContext, taken: Set<string>): WrittenVariant {
  const level = ctx.level;
  const words = (topic: TopicKey) => mustUseFor(ctx, topic, wordsAsked(brief.genre, level), taken, briefText(brief));
  const phrase = (topic: TopicKey) => topicByKey(topic).phrase;
  const label = GENRE_LABEL[brief.genre];
  const told = (asNote = false) => {
    const { promptSaid, coverSaid } = writtenSaid(brief, asNote);
    return briefed(promptSaid, coverSaid);
  };

  switch (brief.genre) {
    case "card": {
      const found = cardWords(ctx);
      if (!found) {
        // No job and workplace in the pool: a note on the brief's fallback, said plainly.
        const note = brief.fallback;
        return {
          genre: "note", label: GENRE_LABEL.note, topic: phrase(note.topic),
          ...told(true),
          mustUse: words(note.topic), exhibit: null,
        };
      }
      taken.add(found.job.lexemeId);
      taken.add(found.workplace.lexemeId);
      return {
        genre: "card", label, topic: phrase("work"),
        ...told(),
        mustUse: [requiredWord(found.job), requiredWord(found.workplace)],
        exhibit: {
          layout: "card",
          name: brief.person.name,
          email: brief.person.email,
          city: brief.city,
          hours: brief.hours,
          job: idea(found.job),
          workplace: idea(found.workplace),
        },
      };
    }
    case "note":
    case "description":
    case "letter-semiformal":
    case "letter-informal":
    case "argument":
    case "opinion":
      return { genre: brief.genre, label, topic: phrase(brief.topic), ...told(), mustUse: words(brief.topic), exhibit: null };
    case "story":
    case "personal-letter":
      return { genre: brief.genre, label, topic: phrase(brief.topic), ...told(), mustUse: [], exhibit: null };
    case "data-comment":
    case "data-summary":
      return {
        genre: brief.genre, label, topic: phrase(brief.topic),
        ...told(),
        mustUse: words(brief.topic),
        exhibit: {
          layout: "table",
          title: brief.dataset.title,
          unit: brief.dataset.unit,
          columns: brief.dataset.columns,
          rows: brief.dataset.rows,
        },
      };
  }
}

function buildWritten(kind: "message" | "compose", spec: TaskSpec, ctx: BuildContext, which: number): ExamTask {
  const briefs = ctx.plan.writing[which] ?? [];
  const taken = new Set<string>();
  const variants = briefs.map((brief) => variantFor(brief, ctx, taken));
  /*
    A story and a personal letter share a topic, and so share their words. Asked
    once for each, the second would get the next four down, and a candidate who
    chose the letter would be asked for a different list for the same topic.
  */
  const shared = variants.filter((v) => v.genre === "story" || v.genre === "personal-letter");
  if (shared.length > 0) {
    const words = mustUseFor(ctx, (briefs.find((b) => b.genre === "story") ?? briefs[0]!).topic, wordsAsked("story", ctx.level), taken);
    for (const v of shared) v.mustUse = words;
  }
  for (const v of variants) for (const w of v.mustUse) ctx.spent.add(w.lexemeId);

  const anchor = ctx.words[0];
  const items: (MessageItem | ComposeItem)[] = variants.length === 0 ? [] : [{
    id: `${spec.id}-0`,
    lexemeId: anchor?.lexemeId ?? "",
    lemma: anchor?.lemma ?? "",
    translation: anchor?.translation ?? "",
    cardId: null,
    kind,
    variants,
    minWords: spec.minWords ?? 30,
    maxWords: spec.maxWords ?? null,
  }];
  return finish(spec, items, undefined, "a situation, the points to cover and the words to use");
}

// ── The spoken tasks ─────────────────────────────────────────────────────────

/**
 * How long to speak for, as the prompt says it. Its own English line rather
 * than a number in a template, because "about 2 minutes" after a verb of
 * speaking is a different form in Russian and Ukrainian from "2 minutes" said
 * alone, and both take the number's own plural.
 */
function aboutTime(seconds: number): string {
  return seconds === 60 ? "about a minute"
    : seconds === 90 ? "about a minute and a half"
      : seconds > 60 && seconds % 60 === 0 ? `about ${seconds / 60} minutes`
        : `about ${seconds} seconds`;
}

export function speakPrompt(card: SpeakCard, seconds: number, prepSeconds: number): Said {
  const { brief: B, about: ABOUT, ring: RING } = BRIEF_CONTEXT;
  const time: readonly [string, string] = [aboutTime(seconds), B];
  const prep: readonly [string, string] = [`${prepSeconds / 60} minutes`, B];
  switch (card.shape) {
    case "picture":
      return template("Describe the picture for {time}: what is in it, where you might see it and what might be going on. The examiner's questions come once you've spoken.", { time });
    case "idea-card":
      return template("Ask about {about} using the card, then answer the same questions about yourself. On the real day you ask another candidate; here you play both sides.", { about: [card.about, ABOUT] });
    case "agree":
      return line("Answer the examiner's questions and say why. Then read the situation, talk the choices over as if with a partner, and agree on one.");
    case "phone":
      return template("First you ring {call} and ask for everything on your card. Then somebody rings you, and you answer as {answerAs}, with the facts on the second card.", {
        call: [card.call, RING],
        answerAs: [card.answerAs, B],
      });
    case "talk":
      return template("You have {prep} to prepare and may make notes. Then speak for {time}, and answer the question after it.", { prep, time });
    case "debate":
      return line("Give your view on the examiner's questions. Then read the situation, argue it out using both sides of the card and arguments of your own, and end with a decision.");
    case "presentation":
      return template("Choose one of the two topics. You have {prep} to prepare and may make notes. Then speak for {time} and answer the questions after it.", { prep, time });
    case "discussion":
      return template("Discuss the question as if with a partner, for {time}. Cover the thoughts on the card, and keep it a conversation rather than a speech.", { time });
  }
}

export function cardFor(brief: SpokenBrief): SpeakCard {
  switch (brief.shape) {
    case "picture":
      return {
        shape: "picture",
        situation: brief.scene.situation,
        emoji: brief.scene.lemmas.map((l) => emojiFor(l)).filter((e): e is string => Boolean(e)),
        questions: [...PICTURE_QUESTIONS],
      };
    case "idea-card":
      return { shape: "idea-card", about: brief.card.about, ask: [...brief.card.ask] };
    case "agree":
      return {
        shape: "agree", questions: [...brief.brief.questions],
        situation: brief.brief.situation, alternatives: [...brief.brief.options],
      };
    case "phone":
      return {
        shape: "phone", call: brief.brief.call, find: [...brief.brief.find],
        answerAs: brief.brief.answerAs, facts: [...brief.brief.facts],
      };
    case "talk":
      return {
        shape: "talk", task: brief.brief.task, followUp: brief.brief.followUp,
        swap: brief.swap ? { task: brief.swap.task, followUp: brief.swap.followUp } : null,
      };
    case "debate":
      return {
        shape: "debate", questions: [...brief.brief.questions], situation: brief.brief.situation,
        sides: [
          { label: brief.brief.sideA.label, points: [...brief.brief.sideA.points] },
          { label: brief.brief.sideB.label, points: [...brief.brief.sideB.points] },
        ],
      };
    case "presentation":
      return { shape: "presentation", topics: [...brief.brief.choices], followUps: [...brief.brief.followUps] };
    case "discussion":
      return { shape: "discussion", question: brief.brief.question, thoughts: [...brief.brief.thoughts] };
  }
}

function buildSpeak(spec: TaskSpec, ctx: BuildContext, which: number): ExamTask {
  const brief = ctx.plan.speaking[which];
  if (!brief) return finish(spec, [], undefined, "a topic card");
  const card = cardFor(brief);
  /*
    The words on the card are on the card's topic, from the course. They are
    offered rather than marked, so they may repeat a word asked for elsewhere:
    a speaking card on travel that runs out of travel words because the
    reading part took them would offer `pillowcase`, which it once did.
  */
  const ideas = brief.shape === "picture"
    ? brief.scene.lemmas
      .map((lemma) => ctx.words.find((w) => w.lemma === lemma))
      .filter((w): w is PoolWord => Boolean(w))
      .map(idea)
    : topicWords(ctx, brief.topic, spokenText(brief)).slice(0, 6).map(idea);
  const topic = brief.shape === "picture" ? brief.scene.situation.toLowerCase() : topicByKey(brief.topic).phrase;
  const seconds = spec.seconds ?? 60;
  const prepSeconds = spec.prepSeconds ?? 0;
  const promptSaid = speakPrompt(card, seconds, prepSeconds);

  /*
    One item, marked out of the task's several marks by the learner themselves.
    ADR-018: there is no verified Estonian speech recognizer available here, so
    nothing scores a recording. The exam screen says that where it cannot be
    missed, because a self-marked part sitting silently inside a percentage
    would make the whole percentage a lie.
  */
  const items: SpeakItem[] = [{
    id: `${spec.id}-0`,
    lexemeId: "",
    lemma: "",
    translation: "",
    cardId: null,
    kind: "speak",
    shape: spec.shape ?? card.shape,
    topic,
    prompt: sayEnglish(promptSaid),
    promptSaid,
    seconds,
    prepSeconds,
    card,
    ideas,
  }];
  return finish(spec, items, undefined, "a topic card");
}

/** Wraps whatever a builder managed to make, with the shortfall stated. */
function finish(
  spec: TaskSpec,
  items: ExamItem[],
  choices: { id: string; label: string; gloss: string }[] | undefined,
  needed: string,
  fallbackFrom: TaskKind | null = null,
): ExamTask {
  const shortfall = Math.max(0, spec.items - items.length);
  // The written and spoken tasks are one item carrying many marks, so a
  // missing item costs all of them; every other task is one mark per item.
  const perItem = spec.raw / spec.items;
  return {
    spec,
    items,
    choices,
    fallbackFrom,
    shortfall,
    shortfallReason: shortfall > 0
      ? `There was only enough in the dictionary for ${items.length} of the ${spec.items} questions here. Each one needs ${needed}.`
      : null,
    rawAvailable: Math.round(items.length * perItem),
  };
}

// ── The paper ────────────────────────────────────────────────────────────────

/**
 * Builds one paper.
 *
 * Tasks are built in the order the parts are sat, and each one marks the words
 * it used as spent. That ordering matters: it means the reading part and the
 * writing part cannot ask about the same six nouns, which is what happens when
 * every builder helps itself to the front of the same sorted list.
 */
export function buildPaper(
  level: ExamLevel,
  pool: readonly PoolWord[],
  seed: string,
  wordOrder: OrderContext,
): Paper {
  const spec = specFor(level);
  const words = eligibleWords(pool, level);
  const random = rng(seedFrom(`${level}:${seed}`));
  const ctx: BuildContext = {
    level,
    words,
    sentences: sentencesFrom(words, LONGEST_SENTENCE[level]),
    random,
    spent: new Set<string>(),
    wordOrder,
    plan: planFor(level, seed),
  };

  let written = 0;
  let spoken = 0;
  const parts: ExamPart[] = spec.parts.map((partSpec) => ({
    spec: partSpec,
    tasks: partSpec.tasks.map((taskSpec) => {
      if (taskSpec.kind === "message" || taskSpec.kind === "compose") {
        return buildWritten(taskSpec.kind, taskSpec, ctx, written++);
      }
      if (taskSpec.kind === "speak") return buildSpeak(taskSpec, ctx, spoken++);
      return buildTask(taskSpec, ctx);
    }),
  }));

  return {
    level,
    spec,
    seed,
    format: PAPER_FORMAT,
    parts,
    thin: parts.some((p) => p.tasks.some((t) => t.shortfall > 0)),
    substituted: parts.some((p) => p.tasks.some((t) => t.fallbackFrom !== null)),
  };
}

/**
 * One task, in the shape the specification asks for or in its fallback.
 *
 * The primary shape is tried first and kept if it produced anything at all: a
 * task half filled with the real shape is closer to the paper than a full one
 * built out of word cards. Only a shape the dictionary cannot set *at all*
 * falls back, and the substitution is recorded rather than hidden.
 */
function buildTask(taskSpec: TaskSpec, ctx: BuildContext): ExamTask {
  const primary = buildOne(taskSpec.kind, taskSpec, ctx);
  if (primary.items.length > 0 || !taskSpec.fallback) return primary;

  // The fallback's wording, and the slot's own counts: how many, how many plays, how many to choose from.
  const { id, items, raw, plays, readSeconds, options: count } = taskSpec;
  const fallbackSpec: TaskSpec = { ...taskSpec, ...blueprintFor(taskSpec.fallback), id, items, raw, plays, readSeconds, options: count };
  const substitute = buildOne(taskSpec.fallback, fallbackSpec, ctx);
  if (substitute.items.length === 0) return primary;
  return { ...substitute, spec: fallbackSpec, fallbackFrom: taskSpec.kind };
}

function buildOne(kind: TaskKind, taskSpec: TaskSpec, ctx: BuildContext): ExamTask {
  switch (kind) {
    case "match-usage": return buildMatch(taskSpec, ctx);
    case "gap-choice": return buildGapChoice(taskSpec, ctx);
    case "gap-type": return buildGapChoice(taskSpec, ctx);
    case "gap-bank": return buildGapBank(taskSpec, ctx);
    case "order": return buildOrder(taskSpec, ctx);
    case "case-form": return buildCaseForm(taskSpec, ctx);
    case "government": return buildGovernment(taskSpec, ctx);
    case "dictation": return buildDictation(taskSpec, ctx);
    case "listen-choose": return buildListenChoose(taskSpec, ctx);
    case "listen-gap": return buildListenGap(taskSpec, ctx);
    case "listen-truefalse": return buildListenTrueFalse(taskSpec, ctx);
    case "gloss-choice": return buildGlossChoice(taskSpec, ctx);
    case "form-choice": return buildFormChoice(taskSpec, ctx);
    // Built by `buildPaper` itself, from the plan, and never reached here.
    case "message":
    case "compose":
    case "speak": return finish(taskSpec, [], undefined, "a brief");
  }
}

/** Every card the paper touches, so a submission can grade them in one batch. */
export function cardsInPaper(paper: Paper): string[] {
  const out = new Set<string>();
  for (const part of paper.parts) {
    for (const task of part.tasks) {
      for (const item of task.items) if (item.cardId) out.add(item.cardId);
    }
  }
  return [...out];
}

/** How much of the paper the dictionary could actually fill, as a percentage. */
export function fillRate(paper: Paper): number {
  let wanted = 0;
  let got = 0;
  for (const part of paper.parts) {
    for (const task of part.tasks) {
      wanted += task.spec.raw;
      got += task.rawAvailable;
    }
  }
  return wanted === 0 ? 0 : Math.round((got / wanted) * 100);
}

/** The parts of the paper, keyed, for a screen that renders one at a time. */
export function partOf(paper: Paper, skill: SkillKey): ExamPart | undefined {
  return paper.parts.find((p) => p.spec.skill === skill);
}
