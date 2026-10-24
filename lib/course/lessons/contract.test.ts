import { describe, expect, it } from "vitest";
import { tr } from "@/lib/copy/locale";
import { LEVEL_INFO } from "@/lib/collections/syllabus";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { LESSONS, LESSON_LEVELS, LESSON_PARTS } from "./index";
import { lessonProblems } from "./ledger";
import { lessonEnglish, levelContractProblems } from "./contract";

/**
 * THE LEVEL CONTRACT, ASKED OF EVERY LEVEL THAT IS LESSONS. Written once A1
 * and A2 met it, so that B1, B2 and C1 meet it the day they are lessons too.
 */
describe("every level of lessons", () => {
  it("is A1 and A2 today, and the rules below are asked of whatever it becomes", () => {
    expect([...LESSON_LEVELS]).toEqual(["A1", "A2"]);
  });

  it("never shows a word before it is taught, across the levels as one course", () => {
    expect(lessonProblems(LESSONS)).toEqual([]);
  });

  it("keeps the shape: parts that end on their own evening, numbered lessons, a sane evening", () => {
    expect(levelContractProblems(LESSONS, LESSON_PARTS)).toEqual([]);
  });

  it("has a role-play scene for every lesson that ends in one", () => {
    const missing = LESSONS.filter((l) => l.roleplay && !sceneForLesson(l.id)).map((l) => l.id);
    expect(missing).toEqual([]);
  });

  it("says what the level is for, what it opens with, and where it leaves somebody", () => {
    for (const level of LESSON_LEVELS) {
      const info = LEVEL_INFO[level as keyof typeof LEVEL_INFO];
      expect(info, level).toBeDefined();
      for (const field of [info.titleEn, info.summary, info.arrival]) expect(field.trim().length, level).toBeGreaterThan(10);
    }
  });

  it("is in Russian and Ukrainian wherever it is in English", () => {
    const missing: string[] = [];
    const lines = [...LESSONS.flatMap(lessonEnglish), ...LESSON_PARTS.flatMap((p) => [p.title, p.about])];
    // A number, a clock time and a bare ending are the same in every language.
    // So is a line that is all Estonian, braced, or a form's name in brackets.
    const sayable = (line: string) =>
      !/^[-\d:.,\s]*[a-zõäöü]*$/.test(line) && /[A-Za-z]{2,}/.test(line.replace(/\{[^{}]*\}|\[[^[\]]*\]|\([^()]*\)|€[\d.]+/g, ""));
    for (const line of new Set(lines.filter(sayable))) {
      for (const locale of ["ru", "uk"] as const) if (tr(locale, line) === line) missing.push(`${locale}: ${line}`);
    }
    expect(missing).toEqual([]);
  });
});

describe("the contract itself", () => {
  const lesson = LESSONS.find((l) => l.kind === "lesson")!;
  const end = LESSONS.find((l) => l.kind === "partEnd")!;
  const part = { id: "t", level: "A1" as const, title: "Test", about: "A test part." };
  const at = (n: number, kind: typeof lesson.kind) => ({ ...(kind === "lesson" ? lesson : end), id: `t-${n}`, n, part: "t", level: "A1" as const, kind });

  it("refuses a part that ends on an ordinary lesson or a check-in", () => {
    const lessons = [1, 2, 3, 4].map((n) => at(n, "lesson"));
    expect(levelContractProblems(lessons, [part]).join(" ")).toMatch(/ends on t-4, a lesson/);
    expect(levelContractProblems([...lessons.slice(0, 3), at(4, "checkin")], [part]).join(" ")).toMatch(/a checkin/);
    expect(levelContractProblems([...lessons.slice(0, 3), at(4, "partEnd")], [part])).toEqual([]);
  });

  it("refuses a gap in the numbering and a part too small to be one", () => {
    expect(levelContractProblems([at(1, "lesson"), at(3, "lesson"), at(4, "lesson"), at(5, "partEnd")], [part]).join(" ")).toMatch(/numbered 3/);
    expect(levelContractProblems([at(1, "lesson"), at(2, "partEnd")], [part]).join(" ")).toMatch(/2 core lessons/);
  });

  it("refuses a part whose line only repeats its title", () => {
    const lessons = [at(1, "lesson"), at(2, "lesson"), at(3, "lesson"), at(4, "partEnd")];
    expect(levelContractProblems(lessons, [{ ...part, about: "Test" }]).join(" ")).toMatch(/repeats its title/);
  });
});
