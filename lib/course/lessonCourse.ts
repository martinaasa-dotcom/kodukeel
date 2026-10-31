/**
 * A1 TO B2 AS LESSONS: EACH LESSON ONE EVENING OF THE PLANNED COURSE.
 *
 * The old A1 cut each unit's word list into fives in the order the words were
 * typed, and an evening was those five words met, a reading, two rounds and a
 * review (docs/43-lessons.md §0). A1, A2, B1 and B2 are the lessons now: an evening
 * is one lesson, and a lesson is its own six steps on its own screen, so the
 * evening has one step, the lesson, and finishing the lesson is finishing the
 * evening. Each part of the lessons is a part of the course, so the module
 * screen, Today, the rail and everything that reads what the course has
 * taught (`taughtThrough`, `grammarThrough`) read the lessons through the
 * same `Programme` shape as C1.
 *
 * What an evening has taught is the lesson's own list, as the dictionary heads
 * it (`lessonWords`).
 * The pages it has explained are its patterns and the cases its rule is
 * about, which is what a round may ask afterwards.
 *
 * Pure: no React, no Prisma, no clock.
 */

import { HARVESTED } from "@/prisma/data/harvested";
import { pastPersons } from "@/lib/estonian/conjugate";
import { LESSONS, LESSON_PARTS, casesOfPattern, type LessonSpec, type PartOfLessons, type PatternId } from "./lessons";
import { lessonHeads } from "./lessonHeads";
import { lessonLabel } from "./lessons/label";
import { wordCount } from "./lessons/read";
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

/**
 * The reference topic each verb pattern a lesson explains is, by id. A case
 * pattern is a case page instead (`casesOfPattern`), since every ending has a
 * page of its own.
 */
export const PATTERN_PAGE: Readonly<Partial<Record<PatternId, string>>> = {
  present: "present-tense",
  negative: "negation",
  imperative: "imperative",
  past: "imperfect",
  conditional: "conditional",
  // B1's rules about choosing (`BPatternId`), each read off the grammar page that explains it.
  object: "object",
  government: "government",
  impersonal: "impersonal",
  pluperfect: "pluperfect",
  relative: "relative-clause",
  particleVerb: "particle-verbs",
  participle: "participles",
  conditionalPast: "conditional",
  subordinate: "subordination",
  agreement: "adjective-agreement",
  derivation: "derivation",
  /*
    B2's (docs/43-lessons.md §13). The supine's cases (-mas, -mast, -maks,
    -mata) are the -ma word's own, so they count as the page on the two
    infinitives read; the spoken register is the page on reading the room.
  */
  quotative: "quotative",
  converb: "converb",
  supine: "infinitives",
  nominal: "nominalisation",
  hedging: "hedging",
  concession: "concession",
  spoken: "register",
  /*
    C1's (docs/43-lessons.md §15.3). The command and the wish are the
    imperative's own page, the stance words are hedging's, the present
    participles are the participles', and an argued text is built on the page
    about granting a point. The formal links built from verbs have a page of
    their own (`connectives`); a C1 lesson may also name `punctuation` through
    `LESSON_PAGES`.
  */
  jussive: "imperative",
  stance: "hedging",
  presentParticiple: "participles",
  connective: "connectives",
  cohesion: "cohesion",
  emphasis: "emphasis",
  argument: "concession",
  literary: "variation",
  collocation: "collocation",
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
  /*
    A2: the omastav as the stem every ending goes on, and the change in the
    stem a word may make on the way; the -nud form and have-done; the would
    form's politeness; and more and the most. The whole object of lesson 18
    is shown on its own sentences and its page waits for B1, which is where
    the object rule is read as a rule.
  */
  "a2-01-whose": { cases: ["GENITIVE"] },
  "a2-02-which": { topics: ["gradation"] },
  "a2-17-didnt": { topics: ["past-participle"] },
  "a2-19-been-there": { topics: ["perfect"] },
  "a2-26-advice": { topics: ["infinitives"] },
  "a2-29-until": { topics: ["time-expressions"] },
  "a2-32-far": { topics: ["numerals"] },
  "a2-35-would": { topics: ["politeness"] },
  "a2-38-compare": { topics: ["comparative"] },
  "a2-39-best": { topics: ["superlative"] },
  "a2-49-will": { topics: ["future"] },
  /*
    B1: finishing a thing against being on it, which is what the object rule
    turns on (the object page is the pattern's), and -na against -ks in use.
  */
  "b1-01-done": { topics: ["aspect"] },
  "b1-16-as": { cases: ["ESSIVE", "TRANSLATIVE"] },
  /*
    B2: a question and a request passed on (`ta küsis, kas`, `ta palus, et`),
    which the quotative's pattern does not name and the page on reported
    speech explains; b2-kaudne's lesson on passing on a question reads it.
  */
  "b2-09-asked": { topics: ["reported-speech"] },
};

/**
 * What a lesson taught, as the dictionary heads it: a headword where the
 * dictionary has one (`ma` is `mina`), and the lesson's own entry where it
 * does not (`Tere päevast!`), which the seed writes. See `lessonHeads.ts`.
 */
export function lessonWords(lesson: LessonSpec): string[] {
  return lessonHeads(lesson);
}

/**
 * HOW LONG THIS LESSON TAKES, WHICH AT B1 IS AS LONG AS ITS GOAL NEEDS
 * (docs/43-lessons.md B-L2). An A1 or A2 lesson is the six steps, eighteen
 * minutes. A B1 lesson adds its longer talk (a story retold, an answer said
 * three times) and its writing evening adds the text, so the evening says so
 * rather than claiming eighteen minutes for forty.
 */
export function lessonMinutes(lesson: LessonSpec): number {
  return LESSON_MINUTES
    + (lesson.listenFor ? 2 : 0)
    + (lesson.retell ? 5 : 0)
    + (lesson.faster ? 4 + Math.round((lesson.faster.prepare ?? 0) / 60) : 0)
    + (lesson.write ? 15 : 0)
    // B2: a real text read in the Listen step, and words worked out in Practice.
    + (lesson.read ? 2 : 0)
    + (lesson.workOut && lesson.workOut.length > 0 ? 1 : 0)
    // C1: the text's questions, a talk taken down as notes, and which room.
    + (lesson.read?.questions && lesson.read.questions.length > 0 ? 3 : 0)
    + (lesson.notes ? notesMinutes(lesson.notes) : 0)
    + (lesson.rooms && lesson.rooms.length > 0 ? 1 : 0);
}

/** About how fast a talk is spoken, in words a minute: what a talk taken down as notes is counted in. */
export const TALK_WORDS_PER_MINUTE = 130;

/**
 * How long a talk taken down as notes takes (C1): its words at about
 * `TALK_WORDS_PER_MINUTE`, times how often it is heard, and three minutes for
 * the questions and setting the notes beside the key ideas.
 */
export function notesMinutes(notes: NonNullable<LessonSpec["notes"]>): number {
  return Math.round((wordCount(notes.lines) / TALK_WORDS_PER_MINUTE) * notes.hearings) + 3;
}

/** Each harvested verb's stored simple past, the I form and the third person, for telling a taught past apart. */
const PASTS_OF: ReadonlyMap<string, { readonly first: string; readonly third: readonly string[] }> = (() => {
  const out = new Map<string, { first: string; third: string[] }>();
  for (const w of HARVESTED) {
    if (w.pos !== "VERB" || !w.parts.PAST_1SG || out.has(w.lemma)) continue;
    out.set(w.lemma, { first: w.parts.PAST_1SG, third: w.extraForms.filter((f) => f.code.startsWith("IndIpfSg3")).map((f) => f.value) });
  }
  return out;
})();

/**
 * THE PARTS OF A VERB'S PAST A LESSON SHOWED BY NAME.
 *
 * A past is learned verb by verb (`lugesin` but `tahtis`), so it is asked
 * inside the module only once an evening has shown it (`slotWithin`). Only the past:
 * a forms step still shows the verb later, for its polite imperative, which no lesson teaches. A lesson shows one
 * where it teaches a form that is that verb's stored past, whether or not
 * the lesson marked it `past`: A1's yesterday lesson teaches `olin`, `tegin`
 * and `käisin` before the past is a pattern, and those are as shown as any.
 *
 * And it shows the slot it taught, never the whole tense. The I form opens
 * the four persons `pastPersons` builds off it, which are one ending each on
 * the same stem. The third person is stored per verb (`tahtsin` but `tahtis`,
 * `jätsin` but `jättis`) and no rule reaches it, so it is shown only by a
 * lesson that taught that very spelling: a lesson that taught `tahtsin` and
 * never `tahtis` has shown the first and not the third, and the module may
 * ask the third only once a forms step has drawn the verb's table. Read off
 * the harvest's own stored forms, so nothing about Estonian is decided here.
 */
export function lessonPastSlots(lesson: LessonSpec): { first: string[]; third: string[] } {
  const first: string[] = [];
  const third: string[] = [];
  const add = (list: string[], verb: string) => { if (!list.includes(verb)) list.push(verb); };
  for (const t of lesson.teaches) {
    if (t.kind !== "form") continue;
    const stored = PASTS_OF.get(t.of);
    if (!stored) continue;
    const family = new Set([stored.first, ...pastPersons(stored.first).map((p) => p.value)]);
    if (family.has(t.et)) add(first, t.of);
    else if (stored.third.includes(t.et)) add(third, t.of);
    else if (t.past) add(first, t.of);
  }
  return { first, third };
}

/** Every verb whose past a lesson showed in any slot (`lessonPastSlots`), in the order it taught them. */
export function lessonPasts(lesson: LessonSpec): string[] {
  const { first, third } = lessonPastSlots(lesson);
  return [...new Set([...first, ...third])];
}

/** Braces mark Estonian inside English for a screen; a sentence printed plain drops them. */
const plain = (text: string) => text.replace(/[{}]/g, "");

/** One lesson as an evening of the course. */
export function lessonDay(lesson: LessonSpec, index: number, partTitle: string): CourseDay {
  const pages = LESSON_PAGES[lesson.id] ?? {};
  const topics = [...new Set([
    ...(lesson.patterns ?? []).flatMap((p) => (PATTERN_PAGE[p] ? [PATTERN_PAGE[p]] : [])),
    ...(pages.topics ?? []),
  ])];
  const cases = [...new Set([...(lesson.patterns ?? []).flatMap(casesOfPattern), ...(pages.cases ?? [])])];
  // A lesson day draws no forms step (its one step is the lesson); the lists are the past slots it has shown, for `pastsThrough` and `thirdPastsThrough`.
  const { first: pasts, third: pastsThird } = lessonPastSlots(lesson);
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
    ...(cases.length > 0 ? { cases } : {}),
    ...(topics.length > 0 ? { topics } : {}),
    ...(pasts.length > 0 ? { pasts } : {}),
    ...(pastsThird.length > 0 ? { pastsThird } : {}),
    index,
    part: { n: 1, of: 1 },
    steps: [{
      id: LESSON_STEP,
      kind: "lesson",
      title: `Lesson ${lessonLabel(lesson)}: ${lesson.title}`,
      why: "Hear it, meet the words, see how it works, then try it yourself.",
      href: `/course/lessons/${lesson.id}`,
      minutes: lessonMinutes(lesson),
      derived: false,
    }],
    minutes: lessonMinutes(lesson),
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
  return LESSON_PARTS.map((part) => {
    const lessons = LESSONS.filter((l) => l.part === part.id);
    return {
      id: lessonPartId(part),
      title: plain(part.title),
      subtitle: plain(part.about),
      level: part.level,
      blurb: plain(part.about),
      days: lessons.map((lesson, i) => lessonDay(lesson, i + 1, part.title)),
    };
  });
}

/**
 * A lesson part's id as the course spells it: `a1.3` for the third part of
 * A1's lessons, counted within its own level, so A2's first part is `a2.1`.
 */
export function lessonPartId(part: PartOfLessons): string {
  const ofLevel = LESSON_PARTS.filter((p) => p.level === part.level);
  return `${part.level.toLowerCase()}.${ofLevel.indexOf(part) + 1}`;
}

/** Where a lesson stands for one learner, for the list of lessons. */
export type LessonState = "done" | "current" | "ahead";

/**
 * WHICH LESSONS ARE DONE, AND WHICH ONE IS NEXT.
 *
 * A lesson is one evening with one step, so a tick on its evening is the
 * lesson finished, and every evening before the furthest ticked one in its part
 * is done too, since walking past an evening is what finishing it means
 * (`dayReached`). The current lesson is the first one not done in the part the
 * learner is following, and there is none where they follow no lesson part
 * (somebody placed at A2 has not done A1's lessons, and the list says so by
 * marking nothing rather than pretending).
 *
 * `ticked` holds, per part id, the evening ids carrying any tick.
 */
export function lessonStates(
  programmes: readonly Programme[],
  ticked: ReadonlyMap<string, ReadonlySet<string>>,
  following: string | null,
): Map<string, LessonState> {
  const states = new Map<string, LessonState>();
  for (const programme of programmes) {
    const marks = ticked.get(programme.id) ?? new Set<string>();
    const furthest = programme.days.reduce((at, d) => (marks.has(d.id) ? d.index : at), 0);
    for (const day of programme.days) {
      if (!day.lesson) continue;
      states.set(day.lesson, day.index <= furthest ? "done" : "ahead");
    }
    if (programme.id === following) {
      const next = programme.days.find((d) => d.lesson && states.get(d.lesson) !== "done");
      if (next?.lesson) states.set(next.lesson, "current");
    }
  }
  return states;
}
