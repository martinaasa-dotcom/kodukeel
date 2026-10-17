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

import type { LessonSpec, Taught } from "./types";

/**
 * People's names a lesson may use without teaching them. Names are not
 * Estonian vocabulary, and every one here is a name an Estonian conversation
 * plausibly has in it. A lesson's cast is allowed on top of these.
 */
export const NAMES: ReadonlySet<string> = new Set(["Mari", "Tom", "Jaan", "Anna", "Peeter", "Kati", "Liis"]);

/**
 * Places, spelled with the capital a place takes. The forms list holds no
 * capitalised word, so `Eestis` is not in it however often it is said; these
 * are the spellings the forms check lets through on that ground and no other.
 * The ledger is not loosened by it: a place is still taught before it is
 * shown, like any word.
 */
export const PLACE_SPELLINGS: ReadonlySet<string> = new Set(["Eestis", "Eestist", "Ameerikast", "Ukrainast"]);

export interface Ledger {
  /** Every single spelling taught, lower-cased. */
  readonly spellings: ReadonlySet<string>;
  /** Every phrase taught, as its words lower-cased, so its words are covered only together. */
  readonly phrases: readonly (readonly string[])[];
  /** Everything taught, in the order it was taught, with the lesson that taught it. */
  readonly items: readonly { readonly item: Taught; readonly lesson: number }[];
}

export const EMPTY_LEDGER: Ledger = { spellings: new Set(), phrases: [], items: [] };

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

/** The ledger with a lesson's items added. */
export function teach(ledger: Ledger, items: readonly Taught[], lesson: number): Ledger {
  const spellings = new Set(ledger.spellings);
  const phrases = [...ledger.phrases];
  for (const item of items) {
    const words = wordsOf(item.et).map((w) => w.low);
    if (item.kind === "phrase" && words.length > 1) phrases.push(words);
    else for (const w of words) spellings.add(w);
  }
  return { spellings, phrases, items: [...ledger.items, ...items.map((item) => ({ item, lesson }))] };
}

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
export function estonianOf(lesson: LessonSpec): { where: string; et: string }[] {
  const out: { where: string; et: string }[] = [];
  const english = (where: string, text: string | undefined) => {
    for (const et of estonianIn(text ?? "")) out.push({ where, et });
  };
  lesson.conversation.forEach((line, i) => {
    if (line.et) out.push({ where: `line ${i + 1}`, et: line.et });
    english(`line ${i + 1} English`, line.en);
    english(`line ${i + 1} stage`, line.stage);
  });
  for (const t of lesson.teaches) english(`the meaning of ${t.et}`, t.en);
  const how = lesson.how;
  english("the point", how.point);
  how.notes?.forEach((n, i) => english(`note ${i + 1}`, n));
  english("watch out", how.watchOut);
  how.table?.head.forEach((h) => english("the table's head", h));
  how.table?.rows.forEach((row, r) =>
    row.forEach((cell) => ("et" in cell ? out.push({ where: `table row ${r + 1}`, et: cell.et }) : english(`table row ${r + 1}`, cell.en))),
  );
  const prompts = (label: string, list: LessonSpec["answers"]) =>
    list.forEach((p, i) => {
      if (p.ask) out.push({ where: `${label} ${i + 1}, asked`, et: p.ask.et });
      english(`${label} ${i + 1}, cue`, p.cue);
      out.push({ where: `${label} ${i + 1}, model`, et: p.model.et });
    });
  prompts("question", lesson.answers);
  if (lesson.roleplay) {
    english("the role-play's scene", lesson.roleplay.scene);
    prompts("role-play turn", lesson.roleplay.turns);
  }
  return out;
}

/** The ledger as it stands when each lesson starts, by lesson id. */
export function ledgersBefore(lessons: readonly LessonSpec[]): Map<string, Ledger> {
  const out = new Map<string, Ledger>();
  let ledger = EMPTY_LEDGER;
  for (const lesson of lessons) {
    out.set(lesson.id, ledger);
    ledger = teach(ledger, lesson.teaches, lesson.n);
  }
  return out;
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
  lessons.forEach((lesson, index) => {
    const at = `Lesson ${lesson.n} (${lesson.id})`;
    if (ids.has(lesson.id)) problems.push(`${at}: the id is used twice`);
    ids.add(lesson.id);
    if (lesson.n !== index + 1) problems.push(`${at}: numbered ${lesson.n} in place ${index + 1}`);
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
    for (const item of lesson.teaches) {
      if (item.kind !== "phrase" && wordsOf(item.et).length !== 1) problems.push(`${at}: the ${item.kind} "${item.et}" is more than one word`);
      if (ledger.items.some((done) => done.item.et.toLocaleLowerCase("et") === item.et.toLocaleLowerCase("et"))) {
        problems.push(`${at}: "${item.et}" was taught already`);
      }
    }
    const tonight = teach(ledger, lesson.teaches, lesson.n);
    const names = namesOf(lesson);
    for (const { where, et } of estonianOf(lesson)) {
      const missing = uncovered(et, tonight, names);
      if (missing.length > 0) problems.push(`${at}, ${where}: "${et}" uses ${missing.join(", ")}, not taught by now`);
    }
    ledger = tonight;
  });
  return problems;
}
