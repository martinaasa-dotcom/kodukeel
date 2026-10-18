/**
 * A1 AS LESSONS: EACH LESSON ONE EVENING OF THE PLANNED COURSE.
 *
 * The old A1 cut each unit's word list into fives in the order the words were
 * typed, and an evening was those five words met, a reading, two rounds and a
 * review (docs/43-lessons.md §0). A1 is the lessons now (phase P3): an evening
 * is one lesson, and a lesson is its own six steps on its own screen, so the
 * evening has one step, the lesson, and finishing the lesson is finishing the
 * evening. Each part of the lessons is a part of the course, so the module
 * screen, Today, the rail and everything that reads what the course has
 * taught (`taughtThrough`, `grammarThrough`) read the lessons through the
 * same `Programme` shape as A2 to C1.
 *
 * What an evening has taught is the lesson's own list, as the dictionary heads
 * it (`lessonWords`).
 * The pages it has explained are its patterns and the cases its rule is
 * about, which is what a round may ask afterwards.
 *
 * Pure: no React, no Prisma, no clock.
 */

import { LESSONS, LESSON_PARTS, type LessonSpec, type PatternId } from "./lessons";
import { lessonHeads } from "./lessonHeads";
import { lessonLabel } from "./lessons/label";
import { LESSON_STEP, type CourseDay, type Programme } from "./types";

/**
 * How long a lesson takes, which is what its evening claims: listen 2, words
 * 3, how it works 2, practice 5, say it 4, review 2 (docs/43-lessons.md §1).
 */
export const LESSON_MINUTES = 18;

/**
 * The six steps of every lesson, in English, for a screen that describes one
 * without running it (the landing page's first evening). The minutes add up to
 * `LESSON_MINUTES`, asserted.
 */
export const LESSON_SHAPE: readonly { title: string; minutes: number; why: string }[] = [
  { title: "Listen", minutes: 2, why: "A short conversation in two voices, with the English under each line." },
  { title: "Words", minutes: 3, why: "Every new word from it in one table, with a speaker beside each. Nothing is asked yet." },
  { title: "How it works", minutes: 2, why: "The one idea of the evening, shown on the lines you just heard." },
  { title: "Practice", minutes: 5, why: "Pick, match and listen first, then type it yourself." },
  { title: "Say it", minutes: 4, why: "Answer questions about yourself out loud, or type them if you'd rather." },
  { title: "Review", minutes: 2, why: "Words from earlier lessons come back, so they stay." },
];

/** The reference page each pattern a lesson explains is, by topic id. */
export const PATTERN_PAGE: Readonly<Record<PatternId, string>> = {
  present: "present-tense",
  negative: "negation",
  imperative: "imperative",
};

/**
 * THE PAGES A LESSON EXPLAINS THAT ITS PATTERNS DO NOT NAME.
 *
 * A pattern is a rule the ledger builds forms off (`present` builds the six
 * persons); a case is an ending a lesson's rule is about, taught on the
 * words it shows, and the past is learned verb by verb with no rule to build
 * it. Both are what a round may ask once the lesson is done, so they are
 * written down here, keyed on the lesson, and `lessonCourse.test.ts` holds
 * every key to a lesson that exists.
 */
export const LESSON_PAGES: Readonly<Record<string, { cases?: readonly string[]; topics?: readonly string[] }>> = {
  "a1-10-from": { cases: ["ELATIVE", "ABLATIVE"] },
  "a1-15-have": { cases: ["ADESSIVE"] },
  "a1-25-some": { cases: ["PARTITIVE"] },
  "a1-28-like": { cases: ["ALLATIVE"] },
  "a1-31-where-to": { cases: ["INESSIVE", "ILLATIVE", "ELATIVE"] },
  "a1-32-in": { cases: ["INESSIVE"] },
  "a1-34-bus": { cases: ["COMITATIVE"] },
  "a1-42-yesterday": { topics: ["imperfect"] },
};

/**
 * What a lesson taught, as the dictionary heads it: a headword where the
 * dictionary has one (`ma` is `mina`), and the lesson's own entry where it
 * does not (`Tere päevast!`), which the seed writes. See `lessonHeads.ts`.
 */
export function lessonWords(lesson: LessonSpec): string[] {
  return lessonHeads(lesson);
}

/** Braces mark Estonian inside English for a screen; a sentence printed plain drops them. */
const plain = (text: string) => text.replace(/[{}]/g, "");

/** One lesson as an evening of the course. */
export function lessonDay(lesson: LessonSpec, index: number, partTitle: string): CourseDay {
  const pages = LESSON_PAGES[lesson.id] ?? {};
  const topics = [...(lesson.patterns ?? []).map((p) => PATTERN_PAGE[p]), ...(pages.topics ?? [])];
  return {
    id: lesson.id,
    title: plain(partTitle),
    subtitle: lesson.title,
    canDo: plain(lesson.goal),
    unitId: "",
    level: lesson.level,
    words: lessonWords(lesson),
    practice: [],
    lesson: lesson.id,
    ...(pages.cases ? { cases: pages.cases } : {}),
    ...(topics.length > 0 ? { topics } : {}),
    index,
    part: { n: 1, of: 1 },
    steps: [{
      id: LESSON_STEP,
      kind: "lesson",
      title: `Lesson ${lessonLabel(lesson)}: ${lesson.title}`,
      why: "Hear it, meet the words, see how it works, then try it yourself.",
      href: `/course/lessons/${lesson.id}`,
      minutes: LESSON_MINUTES,
      derived: false,
    }],
    minutes: LESSON_MINUTES,
  };
}

/**
 * Every part of the lessons as a part of the course, in teaching order.
 *
 * The part's id is the course's own spelling (`a1.1`), since a learner reads
 * it on the module screen; the lessons' own part id (`a1-tere`) stays what the
 * lesson files name.
 */
export function lessonProgrammes(): Programme[] {
  return LESSON_PARTS.map((part, n) => {
    const lessons = LESSONS.filter((l) => l.part === part.id);
    return {
      id: `${part.level.toLowerCase()}.${n + 1}`,
      title: plain(part.title),
      subtitle: plain(part.about),
      level: part.level,
      blurb: plain(part.about),
      days: lessons.map((lesson, i) => lessonDay(lesson, i + 1, part.title)),
    };
  });
}
