import { describe, expect, it } from "vitest";
import {
  BANDS, BREAK_MINUTES, EXAM_LEVELS, LISTEN_PLAYS, OFFICIAL_LEVELS, PASS_PCT,
  READ_QUESTIONS_SECONDS, bandFor, isExamLevel, speakingCriteria, specFor, tasksOf,
  writtenMinutes, type ExamLevel,
} from "./spec";
import { SKILLS } from "./types";

/*
  These assert the *published* examination, not this app's taste. Every number
  here was read off the Education and Youth Board's own specifications and is
  cited in docs/16-exam.md. A change to one of them is a change to a claim the
  product makes about a real examination somebody may be about to book, so it
  should have to argue with a test first.
*/

describe("the levels the state examines", () => {
  it("is A2, B1, B2 and C1, and nothing else", () => {
    expect([...OFFICIAL_LEVELS]).toEqual(["A2", "B1", "B2", "C1"]);
  });

  it("marks A1 as not official, because no such paper exists", () => {
    expect(specFor("A1").official).toBe(false);
  });

  it("recognizes a level string and rejects anything else", () => {
    expect(isExamLevel("B2")).toBe(true);
    expect(isExamLevel("D1")).toBe(false);
    expect(isExamLevel("b2")).toBe(false);
  });
});

describe("the conditions the parts are sat under", () => {
  it("plays each listening recording twice, which is what the specifications set", () => {
    // A2, B1 and C1 all say each listening text is heard twice. Raising this is
    // making the paper easier than the one it claims to imitate; lowering it is
    // making it harder than any paper the state sets.
    expect(LISTEN_PLAYS).toBe(2);
  });

  it("gives a pause to read the questions before a listening task", () => {
    expect(READ_QUESTIONS_SECONDS).toBeGreaterThan(0);
  });

  it("puts a break between the written half and the spoken part", () => {
    // The Board publishes "a short break" and no number, so the figure is ours
    // and the screen says so. What is not ours is that there is one.
    expect(BREAK_MINUTES).toBeGreaterThan(0);
  });
});

describe("the writing part, which is two pieces of writing", () => {
  it("opens with the short message and follows with the longer text, as the real paper does", () => {
    for (const level of EXAM_LEVELS) {
      const writing = specFor(level).parts.find((p) => p.skill === "writing");
      expect(writing?.tasks.map((t) => t.kind).slice(0, 2)).toEqual(["message", "compose"]);
    }
  });

  it("names the two official writing tasks it stands in for", () => {
    const writing = specFor("B1").parts.find((p) => p.skill === "writing");
    const stands = writing?.tasks.map((t) => t.standsFor).join(" ") ?? "";
    expect(stands).toContain("teate koostamine");
    expect(stands).toContain("isiklik kiri");
  });

  it("says out loud that the two accuracy drills are not tasks the real paper sets", () => {
    /*
      They stand in for a criterion an examiner marks inside the two texts,
      which this app may not mark, because marking Estonian prose means a model
      deciding whether an ending is right. Standing in for it is defensible.
      Letting somebody think the paper sets it is not.
    */
    const writing = specFor("B1").parts.find((p) => p.skill === "writing");
    const drills = writing?.tasks.filter((t) => t.kind === "case-form" || t.kind === "government");
    expect(drills).toHaveLength(2);
    for (const drill of drills ?? []) {
      expect(drill.standsFor).toMatch(/not a task the real paper sets/);
    }
  });

  it("tells the learner the clock belongs to the two texts, not to the drills", () => {
    /*
      The real writing part is two pieces of writing and its published minutes
      are for those two, so four tasks under that clock is a distortion however
      well the tasks themselves are labeled. It is a small one, since the texts
      set here are shorter than the real ones and the drills fill the slack
      rather than eating the letter, and a distortion this app does not declare
      is the only kind it is not allowed.
    */
    const writing = specFor("B1").parts.find((p) => p.skill === "writing");
    const drills = (writing?.tasks ?? [])
      .filter((t) => t.kind === "case-form" || t.kind === "government");
    expect(drills).toHaveLength(2);
    for (const drill of drills) {
      expect(drill.instruction).toMatch(/clock|last/i);
    }
  });

  it("lets the two texts carry more of the part than the drills do", () => {
    for (const level of EXAM_LEVELS) {
      const writing = specFor(level).parts.find((p) => p.skill === "writing");
      const texts = (writing?.tasks ?? [])
        .filter((t) => t.kind === "message" || t.kind === "compose")
        .reduce((sum, t) => sum + t.raw, 0);
      const drills = (writing?.tasks ?? [])
        .filter((t) => t.kind === "case-form" || t.kind === "government")
        .reduce((sum, t) => sum + t.raw, 0);
      expect(texts).toBeGreaterThan(drills);
    }
  });

  it("asks for a shorter first text than second at every level", () => {
    for (const level of EXAM_LEVELS) {
      const [first] = tasksOf(specFor(level), "message");
      const [second] = tasksOf(specFor(level), "compose");
      expect(first?.minWords).toBeGreaterThan(0);
      expect(first!.minWords!).toBeLessThan(second!.minWords!);
    }
  });

  it("sets the genres each level's paper names", () => {
    const genres = (level: ExamLevel) =>
      [...tasksOf(specFor(level), "message"), ...tasksOf(specFor(level), "compose")].map((t) => t.genres);
    expect(genres("A2")).toEqual([["card"], ["note", "description"]]);
    expect(genres("B1")).toEqual([["note"], ["story", "personal-letter"]]);
    expect(genres("B2")).toEqual([["letter-semiformal", "letter-informal"], ["data-comment", "argument"]]);
    expect(genres("C1")).toEqual([["data-summary"], ["opinion"]]);
  });

  it("caps the C1 opinion text at 260 words, which the real paper means", () => {
    const [opinion] = tasksOf(specFor("C1"), "compose");
    expect(opinion?.minWords).toBe(220);
    expect(opinion?.maxWords).toBe(260);
  });
});

describe("the shape of each paper", () => {
  it("has four parts everywhere, in the order they are sat", () => {
    for (const level of EXAM_LEVELS) {
      expect(specFor(level).parts.map((p) => p.skill)).toEqual([...SKILLS]);
    }
  });

  it("gives A2 eighty points, twenty for each part", () => {
    const spec = specFor("A2");
    expect(spec.totalPoints).toBe(80);
    expect(spec.parts.every((p) => p.points === 20)).toBe(true);
  });

  it("gives B1, B2 and C1 a hundred points, twenty five for each part", () => {
    for (const level of ["B1", "B2", "C1"] as const) {
      const spec = specFor(level);
      expect(spec.totalPoints).toBe(100);
      expect(spec.parts.every((p) => p.points === 25)).toBe(true);
    }
  });

  it("keeps the published minutes for each part", () => {
    const minutes = (level: Parameters<typeof specFor>[0]) =>
      Object.fromEntries(specFor(level).parts.map((p) => [p.skill, p.minutes]));

    expect(minutes("A2")).toEqual({ writing: 30, listening: 30, reading: 50, speaking: 15 });
    expect(minutes("B1")).toEqual({ writing: 35, listening: 35, reading: 50, speaking: 15 });
    expect(minutes("B2")).toEqual({ writing: 80, listening: 40, reading: 70, speaking: 20 });
    expect(minutes("C1")).toEqual({ writing: 90, listening: 45, reading: 60, speaking: 20 });
  });

  it("adds up the written half, which is what somebody plans an evening around", () => {
    // B2 is three hours and ten minutes of written paper.
    expect(writtenMinutes(specFor("B2"))).toBe(190);
  });

  it("asks for a longer text at every step up", () => {
    const lengths = EXAM_LEVELS.map((l) => tasksOf(specFor(l), "compose")[0]!.minWords!);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]!).toBeGreaterThan(lengths[i - 1]!);
    }
  });

  it("sets the real paper's question counts where the shape exists", () => {
    // B1 reading is 9, 6, 10 and 8 questions, 33 in all, and so is this.
    const reading = specFor("B1").parts.find((p) => p.skill === "reading")!;
    expect(reading.tasks.map((t) => t.items)).toEqual([9, 6, 10, 8]);
    const listening = specFor("B1").parts.find((p) => p.skill === "listening")!;
    expect(listening.tasks.map((t) => t.items)).toEqual([7, 6, 8, 9]);
  });

  it("offers three options where the real paper does, and four on the B2 gapped text", () => {
    for (const level of EXAM_LEVELS) {
      for (const task of [...tasksOf(specFor(level), "gap-choice"), ...tasksOf(specFor(level), "listen-choose")]) {
        expect(task.options).toBe(level === "B2" && task.kind === "gap-choice" ? 4 : 3);
      }
    }
  });

  it("puts as many spares in a word bank as the level's paper does", () => {
    // B1 says only that there are more options than gaps; B2 says one fits nowhere.
    const spares = (level: ExamLevel) => tasksOf(specFor(level), "gap-bank").map((t) => t.spares);
    expect(spares("B1")).toEqual([2]);
    expect(spares("B2")).toEqual([1]);
    expect(tasksOf(specFor("B2"), "gap-bank")[0]!.instruction).toMatch(/one is left over/);
  });

  it("plays the B2 short clips and the C1 conversation once, and everything else twice", () => {
    const once = (level: ExamLevel) =>
      specFor(level).parts.flatMap((p) => p.tasks).filter((t) => t.plays === 1).map((t) => t.id);
    expect(once("A2")).toEqual([]);
    expect(once("B1")).toEqual([]);
    expect(once("B2")).toEqual(["l1"]);
    expect(once("C1")).toEqual(["l2"]);
  });

  it("gives the B2 and C1 talks the preparation time the real paper gives", () => {
    expect(tasksOf(specFor("B2"), "speak")[0]?.prepSeconds).toBe(120);
    expect(tasksOf(specFor("C1"), "speak")[0]?.prepSeconds).toBe(180);
  });

  it("says what the real part sets that this one cannot, where it cannot", () => {
    expect(specFor("C1").parts.find((p) => p.skill === "listening")?.notSet).toMatch(/lecture/);
    expect(specFor("B1").parts.find((p) => p.skill === "reading")?.notSet).toMatch(/article/);
  });

  it("makes every task worth at least one mark", () => {
    for (const level of EXAM_LEVELS) {
      for (const part of specFor(level).parts) {
        for (const task of part.tasks) {
          expect(task.items).toBeGreaterThan(0);
          expect(task.raw).toBeGreaterThan(0);
        }
      }
    }
  });

  it("says what every task is standing in for", () => {
    for (const level of EXAM_LEVELS) {
      for (const part of specFor(level).parts) {
        for (const task of part.tasks) {
          expect(task.standsFor.length).toBeGreaterThan(8);
        }
      }
    }
  });
});

describe("the pass mark and the bands", () => {
  it("is sixty percent", () => {
    expect(PASS_PCT).toBe(60);
  });

  it("reports the same verbal assessment a real result carries", () => {
    expect(bandFor(100).label).toBe("very good");
    expect(bandFor(91).label).toBe("very good");
    expect(bandFor(90).label).toBe("good");
    expect(bandFor(76).label).toBe("good");
    expect(bandFor(75).label).toBe("satisfactory");
    expect(bandFor(60).label).toBe("satisfactory");
    expect(bandFor(59).label).toBe("poor");
    expect(bandFor(50).label).toBe("poor");
    expect(bandFor(49).label).toBe("not up to the level");
    expect(bandFor(0).label).toBe("not up to the level");
  });

  it("has a band for every score, so no result is unlabelled", () => {
    for (let pct = 0; pct <= 100; pct++) {
      expect(BANDS).toContain(bandFor(pct));
    }
  });
});

describe("the self-marked spoken part", () => {
  it("hands back one criterion per mark", () => {
    expect(speakingCriteria("picture", 4)).toHaveLength(4);
    expect(speakingCriteria("presentation", 8)).toHaveLength(8);
  });

  it("never returns none, however small the ask", () => {
    expect(speakingCriteria("phone", 0).length).toBeGreaterThan(0);
    expect(speakingCriteria("phone", -3).length).toBeGreaterThan(0);
  });

  it("has a criterion for every mark of every spoken task, on that task's own list", () => {
    for (const level of EXAM_LEVELS) {
      for (const task of tasksOf(specFor(level), "speak")) {
        expect(speakingCriteria(task.shape!, task.raw)).toHaveLength(task.raw);
      }
    }
  });

  it("sets each level's own spoken tasks", () => {
    const shapes = (level: ExamLevel) => tasksOf(specFor(level), "speak").map((t) => t.shape);
    expect(shapes("A2")).toEqual(["picture", "idea-card"]);
    expect(shapes("B1")).toEqual(["agree", "phone"]);
    expect(shapes("B2")).toEqual(["talk", "debate"]);
    expect(shapes("C1")).toEqual(["presentation", "discussion"]);
  });
});
