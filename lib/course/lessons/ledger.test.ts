import { describe, expect, it } from "vitest";
import { EMPTY_LEDGER, estonianIn, lessonProblems, teach, uncovered } from "./ledger";
import type { LessonSpec } from "./types";

const lesson = (over: Partial<LessonSpec>): LessonSpec => ({
  id: "t-1", n: 1, level: "A1", part: "t", kind: "lesson", title: "t", goal: "t",
  cast: { Mari: "mari" },
  conversation: [{ who: "Mari", et: "Tere!", en: "Hello!" }],
  teaches: [{ kind: "phrase", et: "Tere!", en: "Hello!" }],
  how: { point: "p", watchOut: "w" },
  answers: [{ cue: "c", model: { et: "Tere!", en: "Hello!" } }],
  ...over,
});

describe("what counts as taught", () => {
  it("covers a word and a form by their spelling, whatever the case", () => {
    const l = teach(EMPTY_LEDGER, [{ kind: "word", et: "nimi", en: "name" }, { kind: "form", et: "on", of: "olema", en: "is" }], 1);
    expect(uncovered("Nimi on.", l)).toEqual([]);
    expect(uncovered("Nimi on minu.", l)).toEqual(["minu"]);
  });

  it("covers a phrase's words only where they stand together", () => {
    const l = teach(EMPTY_LEDGER, [{ kind: "phrase", et: "Ma ei saa aru.", en: "I don't understand." }], 1);
    expect(uncovered("Vabandust, ma ei saa aru!", l)).toEqual(["Vabandust"]);
    // `saa` on its own is not taught: it was only ever part of the phrase.
    expect(uncovered("Ma saa.", l)).toEqual(["Ma", "saa"]);
  });

  it("lets a name through and nothing else", () => {
    expect(uncovered("Tere, Mari!", teach(EMPTY_LEDGER, [{ kind: "phrase", et: "Tere!", en: "Hello!" }], 1))).toEqual([]);
    expect(uncovered("Tere, Malle!", teach(EMPTY_LEDGER, [{ kind: "phrase", et: "Tere!", en: "Hello!" }], 1))).toEqual(["Malle"]);
  });

  it("reads Estonian out of an English sentence by its braces", () => {
    expect(estonianIn("Say {Tere} back, or {Tere õhtust}.")).toEqual(["Tere", "Tere õhtust"]);
  });
});

describe("the check over a level", () => {
  it("passes a lesson that shows only what it teaches", () => {
    expect(lessonProblems([lesson({})])).toEqual([]);
  });

  it("fails a conversation line holding a word taught a lesson later", () => {
    const first = lesson({ conversation: [{ who: "Mari", et: "Tere! Kes see on?", en: "Hello! Who's this?" }] });
    const problems = lessonProblems([first]);
    expect(problems.join("\n")).toMatch(/line 1.*Kes, see, on/);
  });

  it("fails a word in braces in the rule, and in a model answer", () => {
    const problems = lessonProblems([
      lesson({ how: { point: "Say {aitäh}.", watchOut: "w" }, answers: [{ cue: "c", model: { et: "Aitäh!", en: "Thanks!" } }] }),
    ]);
    expect(problems.some((p) => p.includes("the point"))).toBe(true);
    expect(problems.some((p) => p.includes("question 1, model"))).toBe(true);
  });

  it("fails a check-in that teaches, and one with no role-play", () => {
    const problems = lessonProblems([lesson({}), lesson({ id: "t-2", n: 2, kind: "checkin" })]);
    expect(problems.some((p) => p.includes("teaches nothing new"))).toBe(true);
    expect(problems.some((p) => p.includes("role-play"))).toBe(true);
  });

  it("fails teaching a thing twice, a stray speaker and a broken number", () => {
    const problems = lessonProblems([
      lesson({}),
      lesson({ id: "t-2", n: 3, conversation: [{ who: "Jaan", et: "Tere!", en: "Hello!" }] }),
    ]);
    expect(problems.some((p) => p.includes("taught already"))).toBe(true);
    expect(problems.some((p) => p.includes("not in the cast"))).toBe(true);
    expect(problems.some((p) => p.includes("numbered 3 in place 2"))).toBe(true);
  });
});
