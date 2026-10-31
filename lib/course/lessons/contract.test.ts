import { describe, expect, it } from "vitest";
import { tr } from "@/lib/copy/locale";
import { LEVEL_INFO } from "@/lib/collections/syllabus";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { LESSONS, LESSON_LEVELS, LESSON_PARTS } from "./index";
import { lessonProblems } from "./ledger";
import { b2LevelProblems, c1LevelProblems, lessonEnglish, levelContractProblems, untranslated } from "./contract";

/**
 * THE LEVEL CONTRACT, ASKED OF EVERY LEVEL THAT IS LESSONS. Written once A1
 * and A2 met it, so that B1, B2 and C1 met it the day each became lessons.
 */
describe("every level of lessons", () => {
  it("is A1, A2, B1, B2 and C1, every level, and the rules below are asked of all of them", () => {
    expect([...LESSON_LEVELS]).toEqual(["A1", "A2", "B1", "B2", "C1"]);
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
    // At C1 a retell gets harder by how it is told, so a shorter story is no fall; fewer words to write still is.
    const asC1 = (ls: typeof a) => ls.map((l) => ({ ...l, level: "C1" as const }));
    const c1 = levelContractProblems([...asC1(a), ...asC1(b)], [{ ...part, level: "C1" }, { ...second, level: "C1" }]).join(" ");
    expect(c1).not.toMatch(/longest retell/);
    expect(c1).toMatch(/asks 40 words at most, under the 60/);
  });

  it("refuses a partEnd before the part's last lesson, a lesson of another level, and a part with no title or line", () => {
    const lessons = four();
    expect(levelContractProblems([lessons[0]!, { ...lessons[1]!, kind: "partEnd" }, ...lessons.slice(2)], [part]).join(" ")).toMatch(/t-2 is a partEnd before the part's last lesson/);
    expect(levelContractProblems([{ ...lessons[0]!, level: "A2" }, ...lessons.slice(1)], [part]).join(" ")).toMatch(/holds a lesson of another level/);
    expect(levelContractProblems(lessons, [{ ...part, title: " " }]).join(" ")).toMatch(/needs a title and a line/);
    expect(levelContractProblems(lessons, [{ ...part, about: "" }]).join(" ")).toMatch(/needs a title and a line/);
  });

  it("refuses a closing conversation every turn of which was rehearsed in the part", () => {
    const lessons = four();
    const said = lessons[0]!.conversation.filter((c) => c.et).slice(0, 3);
    expect(said.length).toBe(3);
    const gist = [{ q: "q", options: ["True", "False"], answer: 0 }];
    const recited = { ...lessons[3]!, listenFor: gist, roleplay: { scene: "s", turns: said.map((c) => ({ cue: "c", model: { et: c.et!, en: "" } })) } };
    expect(levelContractProblems([...lessons.slice(0, 3), recited], [part]).join(" ")).toMatch(/carries no turn the learner never rehearsed/);
    const fresh = { ...recited, roleplay: { ...recited.roleplay, turns: [...recited.roleplay.turns.slice(0, 2), { cue: "c", model: { et: "Seda lauset pole keegi enne öelnud.", en: "" } }] } };
    expect(levelContractProblems([...lessons.slice(0, 3), fresh], [part]).join(" ")).not.toMatch(/never rehearsed/);
  });

  it("refuses a question on what was heard with fewer than four answers, unless it is true or false", () => {
    const lessons = four();
    const gist = (options: string[]) => ({ ...lessons[0]!, listenFor: [{ q: "q", options, answer: 0 }] });
    expect(levelContractProblems([gist(["A", "B", "C"]), ...lessons.slice(1)], [part]).join(" ")).toMatch(/3 options/);
    expect(levelContractProblems([gist(["True", "False"]), ...lessons.slice(1)], [part]).join(" ")).not.toMatch(/options/);
  });
});

/**
 * B2'S OWN RULES (`b2LevelProblems`), asked both ways on parts made here: no B2
 * part is written yet, and a rule nothing fires on is a rule nobody knows the
 * state of.
 */
describe("the B2 contract", () => {
  const writing = LESSONS.find((l) => l.level === "B1" && l.write)!;
  const plain = LESSONS.find((l) => l.level === "B1" && l.kind === "lesson" && !l.write && (l.reworks?.length ?? 0) > 0)!;
  const rework = plain.reworks![0]!;
  const parts = [1, 2, 3].map((n) => ({ id: `b${n}`, level: "B2" as const, title: `Part ${n}`, about: "A test part." }));
  const partOf = (n: number, extra: Partial<typeof plain> = {}) => [
    { ...writing, id: `b${n}-w`, part: `b${n}`, level: "B2" as const },
    { ...plain, id: `b${n}-p`, part: `b${n}`, level: "B2" as const, ...extra },
  ];
  const level = (third: Partial<typeof plain>) => [
    ...partOf(1, { patterns: ["spoken"] }),
    ...partOf(2, { patterns: ["quotative"] }),
    ...partOf(3, third),
  ];

  it("passes a third part whose rework asks for a pattern an earlier B2 part explained", () => {
    const ok = level({ patterns: [], reworks: [{ ...rework, pattern: "quotative" }] });
    expect(b2LevelProblems(ok, parts)).toEqual([]);
  });

  it("refuses a third part that recycles nothing, and names what it could have", () => {
    const off = level({ patterns: [], reworks: [{ ...rework, pattern: "object" }] });
    expect(b2LevelProblems(off, parts).join(" ")).toMatch(/B2 b3: no rework asks for a pattern an earlier B2 part explained \(spoken, quotative\)/);
  });

  it("refuses a part that writes no text, or two", () => {
    const none = level({ reworks: [{ ...rework, pattern: "spoken" }] }).filter((l) => l.id !== "b2-w");
    expect(b2LevelProblems(none, parts).join(" ")).toMatch(/B2 b2: writes 0 real texts/);
    const two = level({ reworks: [{ ...rework, pattern: "spoken" }], write: writing.write });
    expect(b2LevelProblems(two, parts).join(" ")).toMatch(/B2 b3: writes 2 real texts/);
  });

  it("asks nothing of a level that is not B2", () => {
    expect(b2LevelProblems(LESSONS, LESSON_PARTS)).toEqual([]);
  });
});

/**
 * C1'S OWN RULES (`c1LevelProblems`), asked both ways on parts made here: no C1
 * part is written yet, and a rule nothing fires on is a rule nobody knows the
 * state of. Parts are four to ten lessons, as the level contract allows: two
 * are made here, since nothing in these rules counts lessons.
 */
describe("the C1 contract", () => {
  const writing = LESSONS.find((l) => l.level === "B2" && l.write)!;
  const plain = LESSONS.find((l) => l.level === "B2" && l.kind === "lesson" && !l.write && (l.reworks?.length ?? 0) > 0)!;
  const rework = plain.reworks![0]!;
  const read = { genre: "a text", lines: [{ et: "Tere.", en: "Hello." }], questions: [{ kind: "short" as const, q: { et: "Tere?", en: "Hello?" }, accept: ["tere"] }] };
  const parts = [1, 2, 3].map((n) => ({ id: `c${n}`, level: "C1" as const, title: `Part ${n}`, about: "A test part." }));
  const partOf = (n: number, extra: Partial<typeof plain> = {}) => [
    { ...writing, id: `c${n}-w`, part: `c${n}`, level: "C1" as const, read, reworks: [{ ...rework, pattern: "hedging" as const }] },
    { ...plain, id: `c${n}-p`, part: `c${n}`, level: "C1" as const, read, ...extra },
  ];
  const level = (second: Partial<typeof plain>, third: Partial<typeof plain> = { patterns: [], reworks: [{ ...rework, pattern: "jussive" }] }) => [
    ...partOf(1, { patterns: ["jussive"], reworks: [] }),
    ...partOf(2, second),
    ...partOf(3, third),
  ];

  it("passes a second part whose rework recycles a C1 pattern of an earlier part, with a B2 one in every part", () => {
    expect(c1LevelProblems(level({ patterns: ["stance"], reworks: [{ ...rework, pattern: "jussive" }] }), parts)).toEqual([]);
  });

  it("refuses a second part that recycles no earlier C1 pattern, and names what it could have", () => {
    const off = level({ patterns: [], reworks: [{ ...rework, pattern: "quotative" }] });
    expect(c1LevelProblems(off, parts).join(" ")).toMatch(/C1 c2: no rework asks for a C1 pattern an earlier C1 part explained \(jussive\)/);
  });

  it("refuses a part that recycles no B2 pattern", () => {
    const off = level({ patterns: ["stance"], reworks: [{ ...rework, pattern: "jussive" }] }).map((l) => (l.id === "c3-w" ? { ...l, reworks: [] } : l));
    expect(c1LevelProblems(off, parts).join(" ")).toMatch(/C1 c3: no rework asks for a B2 pattern/);
  });

  it("refuses a part that writes no text, or two", () => {
    const ok = level({ patterns: ["stance"], reworks: [{ ...rework, pattern: "jussive" }] });
    expect(c1LevelProblems(ok.filter((l) => l.id !== "c2-w").map((l) => (l.id === "c2-p" ? { ...l, reworks: [{ ...rework, pattern: "hedging" as const }, { ...rework, pattern: "jussive" as const }] } : l)), parts).join(" "))
      .toMatch(/C1 c2: writes 0 real texts/);
    expect(c1LevelProblems(ok.map((l) => (l.id === "c3-p" ? { ...l, write: writing.write } : l)), parts).join(" ")).toMatch(/C1 c3: writes 2 real texts/);
  });

  it("refuses a lesson with no text to read but a part's last, and from the third part a text asked nothing", () => {
    const ok = level({ patterns: ["stance"], reworks: [{ ...rework, pattern: "jussive" }] });
    expect(c1LevelProblems(ok.map((l) => (l.id === "c1-p" ? { ...l, read: undefined } : l)), parts).join(" ")).toMatch(/c1-p: carries no text to read/);
    const asked = (id: string) => ok.map((l) => (l.id === id ? { ...l, read: { ...read, questions: [] } } : l));
    expect(c1LevelProblems(asked("c2-p"), parts)).toEqual([]);
    expect(c1LevelProblems(asked("c3-p"), parts).join(" ")).toMatch(/c3-p: its text is asked nothing/);
  });

  it("asks nothing of a level that is not C1", () => {
    expect(c1LevelProblems(LESSONS, LESSON_PARTS)).toEqual([]);
  });
});
