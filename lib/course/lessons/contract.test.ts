import { describe, expect, it } from "vitest";
import { tr } from "@/lib/copy/locale";
import { LEVEL_INFO } from "@/lib/collections/syllabus";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { LESSONS, LESSON_LEVELS, LESSON_PARTS } from "./index";
import { lessonProblems } from "./ledger";
import { lessonEnglish, levelContractProblems, untranslated } from "./contract";

/**
 * THE LEVEL CONTRACT, ASKED OF EVERY LEVEL THAT IS LESSONS. Written once A1
 * and A2 met it, so that B1, B2 and C1 meet it the day they are lessons too.
 */
describe("every level of lessons", () => {
  it("is A1, A2 and B1 today, and the rules below are asked of whatever it becomes", () => {
    expect([...LESSON_LEVELS]).toEqual(["A1", "A2", "B1"]);
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
    const lines = [...LESSONS.flatMap(lessonEnglish), ...LESSON_PARTS.flatMap((p) => [p.title, p.about])];
    expect(untranslated(lines, tr)).toEqual([]);
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

  it("refuses two speakers in one voice, and a person who changes voice within a level", () => {
    const lessons = [1, 2, 3].map((n) => at(n, "lesson")).concat(at(4, "partEnd"));
    expect(levelContractProblems(lessons, [part])).toEqual([]);
    const speakers = [...new Set(lesson.conversation.filter((l) => l.et).map((l) => l.who))];
    expect(speakers.length).toBeGreaterThanOrEqual(2);
    const [a, b] = speakers as [string, string];
    const sameVoice = { ...lessons[1]!, cast: { ...lesson.cast, [b]: lesson.cast[a]! } };
    expect(levelContractProblems([lessons[0]!, sameVoice, lessons[2]!, lessons[3]!], [part]).join(" ")).toMatch(/speak in one voice/);
    const otherVoice = { ...lessons[1]!, cast: { ...lesson.cast, [a]: lesson.cast[a] === "albert" ? "indrek" : "albert" } };
    expect(levelContractProblems([lessons[0]!, otherVoice, lessons[2]!, lessons[3]!], [part]).join(" ")).toMatch(new RegExp(`${a} speaks in`));
  });

  it("refuses a gap in the numbering and a part too small to be one", () => {
    expect(levelContractProblems([at(1, "lesson"), at(3, "lesson"), at(4, "lesson"), at(5, "partEnd")], [part]).join(" ")).toMatch(/numbered 3/);
    expect(levelContractProblems([at(1, "lesson"), at(2, "partEnd")], [part]).join(" ")).toMatch(/2 core lessons/);
  });

  it("refuses a part whose line opens by repeating its title", () => {
    const lessons = [at(1, "lesson"), at(2, "lesson"), at(3, "lesson"), at(4, "partEnd")];
    expect(levelContractProblems(lessons, [{ ...part, about: "Test: a part." }]).join(" ")).toMatch(/repeating its title/);
  });

  const four = () => [at(1, "lesson"), at(2, "lesson"), at(3, "lesson"), at(4, "partEnd")];

  it("refuses an evening that teaches too much, a lesson in no part, and a role-play too short to be one", () => {
    const lessons = four();
    const heavy = { ...lessons[0]!, teaches: Array.from({ length: 30 }, (_, i) => ({ kind: "word" as const, et: `sõna${i}`, en: `word ${i}` })) };
    expect(levelContractProblems([heavy, ...lessons.slice(1)], [part]).join(" ")).toMatch(/more than \d+ in an evening/);
    expect(levelContractProblems([{ ...lessons[0]!, part: "nowhere" }, ...lessons.slice(1)], [part]).join(" ")).toMatch(/belongs to no part/);
    const short = { ...lessons[3]!, roleplay: { scene: "s", turns: [{ cue: "c", model: { et: "Jah.", en: "Yes." } }] } };
    expect(levelContractProblems([...lessons.slice(0, 3), short], [part]).join(" ")).toMatch(/is not a conversation/);
  });

  it("refuses a closing conversation carrying a retell, and a point explained twice", () => {
    const lessons = four();
    const retell = { ...lessons[3]!, roleplay: { scene: "s", turns: [1, 2, 3].map((n) => ({ cue: "c", model: { et: `Lause ${n}.`, en: "" } })) }, retell: { who: "Tom", story: [], points: [] } };
    expect(levelContractProblems([...lessons.slice(0, 3), retell], [part]).join(" ")).toMatch(/carries a retell/);
    const twice = [{ ...lessons[0]!, patterns: ["present" as const] }, { ...lessons[1]!, patterns: ["present" as const] }, ...lessons.slice(2)];
    expect(levelContractProblems(twice, [part]).join(" ")).toMatch(/explains present, which/);
  });

  it("refuses a ramp that falls: a shorter longest retell or fewer words to write than a part before", () => {
    const second = { ...part, id: "u", title: "Second", about: "Another test part." };
    const inPart = (lessons: ReturnType<typeof four>, id: string) => lessons.map((l, i) => ({ ...l, id: `${id}-${i}`, part: id, n: l.n + (id === "u" ? 4 : 0) }));
    const story = (n: number) => ({ who: "Tom", story: Array.from({ length: n }, () => ({ et: "Lause.", en: "" })), points: [] });
    const task = LESSONS.find((l) => l.write)!.write!;
    const a = inPart(four(), "t"); a[0] = { ...a[0]!, retell: story(6), write: { ...task, least: 60 } };
    const b = inPart(four(), "u"); b[0] = { ...b[0]!, retell: story(4), write: { ...task, least: 40 } };
    const problems = levelContractProblems([...a, ...b], [part, second]).join(" ");
    expect(problems).toMatch(/longest retell is 4 sentences, under the 6/);
    expect(problems).toMatch(/asks 40 words at most, under the 60/);
  });

  it("refuses a question on what was heard with fewer than four answers, unless it is true or false", () => {
    const lessons = four();
    const gist = (options: string[]) => ({ ...lessons[0]!, listenFor: [{ q: "q", options, answer: 0 }] });
    expect(levelContractProblems([gist(["A", "B", "C"]), ...lessons.slice(1)], [part]).join(" ")).toMatch(/3 options/);
    expect(levelContractProblems([gist(["True", "False"]), ...lessons.slice(1)], [part]).join(" ")).not.toMatch(/options/);
  });
});
