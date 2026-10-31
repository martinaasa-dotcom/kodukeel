import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_PARTS, type LessonSpec, type NotesTalk, type ReadText } from "./index";
import { PREVIEW_LESSONS, PREVIEW_PARTS } from "./preview";
import { C1_LESSONS, C1_LESSON_PARTS } from "./c1";
import {
  C1_NOTES, C1_ON_THE_SPOT, C1_PART_ORDER, C1_RACE, C1_READ, C1_TOPIC_PREPARE,
  c1Band, c1PartAt, c1PatternsAboveMissing, c1RampProblems,
} from "./rampC1";
import { C1_PATTERNS } from "./types";

/**
 * C1'S RAMP (docs/43-lessons.md §15.6, `rampC1.ts`), over every C1 part there
 * is, the course's and the preview's, in teaching order. With no C1 part yet
 * this asks nothing of the data, which is the state before the parts are
 * written; the rules themselves are asked both ways on parts made here, so a
 * rule that stops firing fails today rather than the day a part breaks it.
 */
const once = <T extends { id: string }>(list: readonly T[]) => [...new Map(list.map((x) => [x.id, x])).values()];

describe("C1's part order", () => {
  it("names the eight parts of the cast page, once each, without marks, and every C1 pattern once", () => {
    expect(C1_PART_ORDER.map((p) => p.id)).toEqual(["c1-isiksus", "c1-meedia", "c1-kodu", "c1-kool", "c1-juht", "c1-uhiskond", "c1-maa", "c1-mote"]);
    for (const p of C1_PART_ORDER) expect(p.id, p.id).toMatch(/^c1-[a-z]+$/);
    expect(C1_PART_ORDER.flatMap((p) => p.patterns).sort()).toEqual([...C1_PATTERNS].sort());
  });

  it("places a part by the order, and credits the patterns of the parts above it not written yet", () => {
    expect(c1PartAt("c1-kool", 1)).toBe(4);
    expect(c1PartAt("t9", 9)).toBe(9);
    expect([...c1PatternsAboveMissing("c1-kodu", new Set(["c1-isiksus"]))]).toEqual(["presentParticiple"]);
    expect(c1PatternsAboveMissing("c1-isiksus", new Set()).size).toBe(0);
  });
});

describe("C1's ramp", () => {
  const c1Parts = once([...LESSON_PARTS, ...C1_LESSON_PARTS, ...PREVIEW_PARTS]).filter((p) => p.level === "C1");
  const c1Lessons = once([...LESSONS, ...C1_LESSONS, ...PREVIEW_LESSONS]).filter((l) => l.level === "C1");

  it("holds every C1 part written so far", () => {
    expect(c1RampProblems(c1Lessons, c1Parts)).toEqual([]);
  });

  it("leaves A1 to B2 alone", () => {
    expect(c1RampProblems(LESSONS, LESSON_PARTS)).toEqual([]);
  });

  /*
    Eight parts of three lessons each, made from a B2 lesson heard first with a
    retell, a B2 lesson with a race and a B2 part's end, each set to what its
    band asks: the room, the story heard once, the one go and its preparation,
    a talk where the band has one, and a text of the band's length asked in the
    band's shape.
  */
  const heard = LESSONS.find((l) => l.level === "B2" && l.listenFor && l.retell && !l.faster)!;
  const raced = LESSONS.find((l) => l.level === "B2" && l.faster && !l.retell)!;
  const end = LESSONS.find((l) => l.level === "B2" && l.kind === "partEnd")!;
  const parts = Array.from({ length: 8 }, (_, i) => ({ id: `t${i + 1}`, level: "C1" as const, title: `Part ${i + 1}`, about: "A test part." }));
  const words = (n: number) => Array.from({ length: Math.ceil(n / 3) }, (_, i) => ({ et: "Maja on suur.", en: "The house is big.", section: i < 2 ? 1 : 2 }));
  const readFor = (band: 1 | 2 | 3 | 4): ReadText => {
    const lines = words(C1_READ[band].words);
    const asks = C1_READ[band].asks;
    return {
      genre: "a text",
      lines,
      questions: asks === "match" ? [{ kind: "match", statements: [{ et: "Maja on suur.", en: "x", section: 1 }, { et: "Maja on suur.", en: "y", section: 2 }] }]
        : asks === "gap" ? [{ kind: "gap", line: 0, options: [{ et: "Maja on suur.", en: "a" }, { et: "Maja on väike.", en: "b" }, { et: "Maja on vana.", en: "c" }], answer: 0 }]
          : asks === "short" ? [{ kind: "short", q: { et: "Mis on suur?", en: "What is big?" }, accept: ["maja"] }]
            : undefined,
    };
  };
  const talk = (n: number, hearings: 1 | 2): NotesTalk => ({
    title: { et: "Maja", en: "The house" }, speaker: "Mari", hearings,
    lines: words(n).map(({ et, en }) => ({ et, en })),
    questions: [{ kind: "short", q: { et: "Mis on suur?", en: "What is big?" }, accept: ["maja"] }],
    keyIdeas: [{ en: "The house is big." }],
  });
  const room = (band: number) => (band === 3 ? "half" as const : "phone" as const);
  const raceFor = (at: number) => {
    const band = c1Band(at);
    // Part 7 races on the spot and part 8 sits the exam's presentation, which is the band's two kinds.
    const prepare = band === 4 ? (at === 7 ? C1_ON_THE_SPOT : C1_TOPIC_PREPARE) : C1_RACE[band].prepare[0]!;
    return {
      ...raced.faster!, seconds: [C1_RACE[band].go], prepare,
      topics: prepare === C1_TOPIC_PREPARE ? [{ en: "Your town" }, { en: "Your work" }] : undefined,
    };
  };
  const notesFor = (at: number): NotesTalk | undefined =>
    at === 2 ? talk(C1_NOTES[1]!.words, 2)
      : at === 3 ? talk(C1_NOTES[2]!.words, 1)
        : at === 5 ? talk(C1_NOTES[3]!.words, 1)
          : at === 7 ? talk(C1_NOTES[4]!.words, 1) : undefined;
  const lessonsFor = (at: number): LessonSpec[] => {
    const band = c1Band(at);
    const base = { level: "C1" as const, part: `t${at}`, read: readFor(band), hearing: room(band) };
    return [
      { ...heard, ...base, id: `t${at}-a`, retell: { ...heard.retell!, hearings: 1 as const }, notes: notesFor(at), cast: { ...heard.cast, Mari: "mari" } },
      { ...raced, ...base, id: `t${at}-b`, faster: raceFor(at) },
      { ...end, ...base, id: `t${at}-c`, read: undefined },
    ];
  };
  const good = parts.flatMap((_, i) => lessonsFor(i + 1));

  it("passes a level built to the table", () => {
    expect(c1RampProblems(good, parts)).toEqual([]);
  });

  const broken = (n: number, change: (l: LessonSpec) => LessonSpec, ps = parts) =>
    c1RampProblems(good.map((l) => (l.part === `t${n}` ? change(l) : l)), ps).join(" ");

  it("refuses a conversation heard first in a quiet room, anywhere, and a room other than joined halfway or sped up in parts 5 and 6", () => {
    expect(broken(1, (l) => ({ ...l, hearing: undefined }))).toMatch(/part 1 t1, t1-a: heard in a quiet room/);
    expect(broken(5, (l) => ({ ...l, hearing: "cafe" }))).toMatch(/part 5 t5, t5-a: heard cafe/);
    expect(broken(6, (l) => ({ ...l, hearing: "quick" }))).toBe("");
  });

  it("refuses a story heard twice", () => {
    expect(broken(3, (l) => (l.retell ? { ...l, retell: { ...l.retell, hearings: undefined } } : l))).toMatch(/at C1 it is heard once/);
  });

  it("refuses the race off the table: the go, the preparation, and topics without the exam's three minutes", () => {
    expect(broken(1, (l) => (l.faster ? { ...l, faster: { ...l.faster, seconds: [90] } } : l))).toMatch(/runs 90 seconds, where part 1 runs one go of 60/);
    expect(broken(3, (l) => (l.faster ? { ...l, faster: { ...l.faster, prepare: 60 } } : l))).toMatch(/prepares for 60 seconds, where part 3 prepares for 120/);
    expect(broken(5, (l) => (l.faster ? { ...l, faster: { ...l.faster, topics: undefined } } : l))).toMatch(/no choice of two topics/);
    expect(broken(2, (l) => (l.faster ? { ...l, faster: { ...l.faster, topics: [{ en: "a" }, { en: "b" }] } } : l))).toMatch(/offers topics, which only the exam's presentation/);
  });

  it("asks a race on the spot somewhere in parts 7 and 8, once both are written", () => {
    const allExam = (l: LessonSpec) => (l.faster ? { ...l, faster: { ...l.faster, prepare: C1_TOPIC_PREPARE, topics: [{ en: "a" }, { en: "b" }] } } : l);
    expect(broken(7, allExam)).toMatch(/C1 parts 7 and 8, t7, t8: no race on the spot/);
    // With part 8 not written, part 7 is not refused for it.
    expect(broken(7, allExam, parts.slice(0, 7))).toBe("");
  });

  it("asks a talk of the table's length, heard as often as the table says, by part and by band", () => {
    expect(broken(2, (l) => ({ ...l, notes: undefined }))).toMatch(/C1 part 2 t2: has no talk taken down as notes of 300 words or more, heard twice/);
    expect(broken(7, (l) => (l.notes ? { ...l, notes: talk(500, 1) } : l))).toMatch(/part 7 t7: has no talk taken down as notes of 1100 words/);
    expect(broken(3, (l) => ({ ...l, notes: undefined }))).toMatch(/C1 parts 3 and 4, t3, t4: no talk taken down as notes of 350 words/);
    expect(broken(5, (l) => (l.notes ? { ...l, notes: talk(600, 2) } : l))).toMatch(/t5-a: its talk is heard twice/);
    // A band whose second part is not written yet is not refused for a talk it may still hold.
    expect(broken(3, (l) => ({ ...l, notes: undefined }), parts.slice(0, 3))).toBe("");
  });

  it("asks a text of the table's length, in the band's shape", () => {
    expect(broken(1, (l) => (l.read ? { ...l, read: { ...l.read, lines: l.read.lines.slice(0, 3) } } : l))).toMatch(/runs to 9 words, where part 1 reads 195/);
    expect(broken(4, (l) => (l.read ? { ...l, read: { ...l.read, questions: [] } } : l))).toMatch(/asked no match question/);
    expect(broken(8, (l) => (l.read ? { ...l, read: readFor(3) } : l))).toMatch(/asked no short question/);
  });
});
