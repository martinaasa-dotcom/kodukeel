import { describe, expect, it } from "vitest";
import { CASES } from "@/lib/estonian/cases";
import { grammarTopic } from "@/lib/estonian/grammar";
import { LESSONS, LESSON_PARTS, isLessonLevel } from "./lessons";
import { LESSON_PAGES, PATTERN_PAGE, lessonMinutes, lessonProgrammes, lessonWords, notesMinutes } from "./lessonCourse";
import { C1_PATTERNS } from "./lessons/types";
import { LESSON_STEP, PROGRAMMES, grammarThrough, lessonDayFor, taughtThrough, unitsThrough } from "./index";
import { scopeSoFar } from "./scope";

/*
  A1, A2, B1 AND B2 ARE THE LESSONS (docs/43-lessons.md). Each lesson is one evening
  of the course, with one step, the lesson, and finishing it is the evening.
*/
const PARTS = lessonProgrammes();
const A1 = PROGRAMMES.filter((p) => p.level === "A1");
// The lesson levels as the build reads them (`isLessonLevel`), so a fourth level of lessons is in every test below by arriving.
const LESSON_LEVELS = PROGRAMMES.filter((p) => isLessonLevel(p.level));

describe("A1, A2, B1 and B2 as lessons", () => {
  it("is every lesson, once, in teaching order, one evening each", () => {
    expect(LESSON_LEVELS.map((p) => p.id)).toEqual(PARTS.map((p) => p.id));
    expect(LESSON_LEVELS.length).toBe(LESSON_PARTS.length);
    expect(LESSON_LEVELS.flatMap((p) => p.days.map((d) => d.lesson))).toEqual(LESSONS.map((l) => l.id));
    // Each level's parts are counted from one: a1.1 to a1.8, a2.1 to a2.8, b1.1 to b1.7, then b2.1 to b2.8.
    for (const level of [...new Set(PARTS.map((p) => p.level))]) {
      const prefix = level.toLowerCase();
      expect(PARTS.filter((p) => p.level === level).map((p) => p.id)).toEqual(
        Array.from({ length: PARTS.filter((p) => p.level === level).length }, (_, i) => `${prefix}.${i + 1}`),
      );
    }
    for (const programme of LESSON_LEVELS) {
      programme.days.forEach((d, at) => {
        expect(d.index, d.id).toBe(at + 1);
        expect(d.id, d.id).toBe(d.lesson);
      });
    }
  });

  it("gives a lesson evening one step, the lesson, which the learner finishes", () => {
    for (const d of LESSON_LEVELS.flatMap((p) => p.days)) {
      expect(d.steps, d.id).toHaveLength(1);
      const step = d.steps[0]!;
      expect(step.id).toBe(LESSON_STEP);
      expect(step.kind).toBe("lesson");
      expect(step.href).toBe(`/course/lessons/${d.lesson}`);
      expect(step.derived).toBe(false);
      expect(d.minutes).toBe(lessonMinutes(LESSONS.find((l) => l.id === d.lesson)!));
      expect(d.practice).toEqual([]);
    }
  });

  it("finds the part and the evening a lesson is", () => {
    for (const lesson of LESSONS) {
      const found = lessonDayFor(lesson.id);
      expect(found?.day.lesson, lesson.id).toBe(lesson.id);
      expect(found?.programme.days).toContain(found?.day);
    }
    expect(lessonDayFor("no-such-lesson")).toBeUndefined();
  });

  it("names what a lesson taught as the dictionary heads it", () => {
    const first = LESSONS[0]!;
    const words = lessonWords(first);
    // A one-word phrase said as `Tere!` is the word `tere`; a longer one keeps its mark.
    expect(words).toContain("tere");
    expect(words).not.toContain("Tere!");
    expect(words.some((w) => w.includes(" ") && /[!?.]$/.test(w))).toBe(true);
    // A form is the word it is a form of, and every word is named once.
    const withForms = LESSONS.find((l) => l.teaches.some((t) => t.kind === "form"))!;
    for (const t of withForms.teaches) if (t.kind === "form") expect(lessonWords(withForms)).toContain(t.of);
    for (const lesson of LESSONS) {
      const all = lessonWords(lesson);
      expect(new Set(all).size, lesson.id).toBe(all.length);
    }
  });

  it("names the pages a lesson explains, and every one is a page the reference has", () => {
    for (const id of Object.keys(LESSON_PAGES)) expect(LESSONS.some((l) => l.id === id), id).toBe(true);
    for (const { cases, topics } of Object.values(LESSON_PAGES)) {
      for (const key of cases ?? []) expect(CASES.some((c) => c.key === key), key).toBe(true);
      for (const topic of topics ?? []) expect(grammarTopic(topic), topic).toBeTruthy();
    }
    for (const topic of Object.values(PATTERN_PAGE)) expect(grammarTopic(topic), topic).toBeTruthy();
    // The first evening explains no ending; by the end of A1 the partitive and -s have been.
    const last = A1.at(-1)!;
    const end = grammarThrough(last, last.days.length);
    expect(grammarThrough(A1[0]!, 1).cases).toEqual([]);
    expect(end.cases).toEqual(expect.arrayContaining(["PARTITIVE", "INESSIVE", "COMITATIVE"]));
    expect(end.topics).toEqual(expect.arrayContaining(["present-tense", "negation", "imperative", "imperfect"]));
    // And by the end of A2 every place ending, the stem they go on, the would form and the rest.
    const a2last = LESSON_LEVELS.filter((p) => p.level === "A2").at(-1)!;
    const a2end = grammarThrough(a2last, a2last.days.length);
    expect(a2end.cases).toEqual(expect.arrayContaining([
      "GENITIVE", "INESSIVE", "ILLATIVE", "ELATIVE", "ADESSIVE", "ALLATIVE", "ABLATIVE",
      "TRANSLATIVE", "TERMINATIVE", "ESSIVE", "ABESSIVE", "COMITATIVE",
    ]));
    expect(a2end.topics).toEqual(expect.arrayContaining(["conditional", "perfect", "comparative", "superlative"]));
  });

  /*
    A lesson teaches its whole evening before it asks anything, so a finished
    lesson counts whole for a screen the module did not open, and an
    unfinished one counts for nothing.
  */
  it("counts a lesson's words as taught once the lesson is finished, and not before", () => {
    const programme = A1[1]!;
    const day = programme.days[2]!;
    const before = scopeSoFar(programme, day, new Set(), []);
    const after = scopeSoFar(programme, day, new Set([LESSON_STEP]), []);
    for (const w of day.words) expect(after.lemmas, w).toContain(w);
    const fresh = day.words.filter((w) => !taughtThrough(programme, day.index - 1).includes(w));
    expect(fresh.length).toBeGreaterThan(0);
    for (const w of fresh) expect(before.lemmas, w).not.toContain(w);
  });

  it("opens no catalog unit inside a level's lessons, and every unit of it once they are behind a learner", () => {
    const a1last = A1.at(-1)!;
    expect(unitsThrough(a1last, a1last.days.length)).toEqual([]);
    const a2 = PROGRAMMES.filter((p) => p.level === "A2");
    const a2first = a2[0]!;
    const a1units = unitsThrough(a2first, 1);
    expect(a1units.length).toBeGreaterThan(20);
    // Inside A2's lessons, A2's own units are not opened yet.
    const a2last = a2.at(-1)!;
    expect(unitsThrough(a2last, a2last.days.length)).toEqual(a1units);
    const b1 = PROGRAMMES.find((p) => p.level === "B1")!;
    expect(unitsThrough(b1, 1)).toEqual(expect.arrayContaining(["korraldused", "minevik", "restoranis"]));
  });

  it("hands C1 what the lessons taught, so its first evening marks those words as met before", () => {
    const lessonWordsAll = new Set(LESSON_LEVELS.flatMap((p) => p.days.flatMap((d) => d.words)));
    const c1 = PROGRAMMES.filter((p) => p.level === "C1").flatMap((p) => p.days);
    const again = c1.flatMap((d) => d.again ?? []);
    expect(again.length).toBeGreaterThan(0);
    expect(again.some((w) => lessonWordsAll.has(w))).toBe(true);
    // And taughtThrough on C1's first evening credits every lesson's words.
    const first = PROGRAMMES.find((p) => p.level === "C1")!;
    const taught = new Set(taughtThrough(first, 1));
    for (const w of lessonWordsAll) expect(taught.has(w), w).toBe(true);
  });
});

/*
  C1'S PATTERNS COUNT THEIR PAGES AS READ, AND ITS NEW STEPS COUNT THEIR
  MINUTES (docs/43-lessons.md §15.5, §15.12), on a lesson made here since no C1
  lesson is written yet.
*/
describe("C1's additions to an evening", () => {
  it("names a grammar page for every C1 pattern", () => {
    for (const p of C1_PATTERNS) {
      const page = PATTERN_PAGE[p];
      expect(page, p).toBeTruthy();
      expect(grammarTopic(page!), p).toBeTruthy();
    }
    expect(PATTERN_PAGE.connective).toBe("connectives");
  });

  it("counts a talk at about 130 words a minute, times its hearings, and three for its questions", () => {
    const base = LESSONS.find((l) => l.level === "B2" && l.kind === "lesson" && !l.read?.questions)!;
    const line = { et: Array.from({ length: 13 }, () => "sõna").join(" "), en: "words" };
    const talk = (lines: number, hearings: 1 | 2) => ({
      title: { et: "Jutt", en: "A talk" }, speaker: "Mari", hearings,
      lines: Array.from({ length: lines }, () => line), questions: [], keyIdeas: [],
    });
    // 1,300 words heard once is ten minutes and three; twice is twenty and three.
    expect(notesMinutes(talk(100, 1))).toBe(13);
    expect(notesMinutes(talk(100, 2))).toBe(23);
    expect(lessonMinutes({ ...base, notes: talk(100, 1) })).toBe(lessonMinutes(base) + 13);
    // A text's questions are three more, which room one.
    const read = { genre: "x", lines: [{ et: "Tere.", en: "Hello." }] };
    const withRead = { ...base, read };
    expect(lessonMinutes({ ...withRead, read: { ...read, questions: [{ kind: "short" as const, q: { et: "Tere?", en: "Hi?" }, accept: ["tere"] }] } })).toBe(lessonMinutes(withRead) + 3);
    const rooms = [{ versions: [], ask: "work" as const }];
    expect(lessonMinutes({ ...base, rooms })).toBe(lessonMinutes(base) + 1);
  });
});
