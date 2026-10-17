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
    expect(problems.some((p) => p.includes("numbered 3 where the core lessons are at 2"))).toBe(true);
  });

  it("letters a vocabulary lesson after the core lesson before it, and keeps the core numbers", () => {
    const hi = { kind: "phrase", et: "Tere!", en: "Hello!" } as const;
    const bye = { kind: "phrase", et: "Head aega!", en: "Goodbye!" } as const;
    const ok = [
      lesson({}),
      lesson({ id: "t-1a", n: 1, extra: "a", teaches: [bye], conversation: [{ who: "Mari", et: "Head aega!", en: "Goodbye!" }], answers: [{ cue: "c", model: { et: "Head aega!", en: "Goodbye!" } }] }),
      lesson({ id: "t-2", n: 2, teaches: [], kind: "checkin", roleplay: { scene: "s", turns: [] } }),
    ];
    expect(lessonProblems(ok)).toEqual([]);
    const skipped = lessonProblems([lesson({ teaches: [hi] }), lesson({ id: "t-1b", n: 1, extra: "b", teaches: [bye] })]);
    expect(skipped.some((p) => p.includes("lettered 1b where 1a comes next"))).toBe(true);
    const first = lessonProblems([lesson({ id: "t-0a", n: 0, extra: "a" })]);
    expect(first.some((p) => p.includes("lettered 0a"))).toBe(true);
  });

  it("covers a verb's persons once the present has been explained, and its no once that has", () => {
    const go = { kind: "verb", et: "minema", first: "lähen", en: "to go", firstEn: "I go" } as const;
    const plain = teach(EMPTY_LEDGER, [go], 1);
    expect(uncovered("Ma lähen", plain)).toEqual(["Ma"]);
    expect(uncovered("lähed", plain)).toEqual(["lähed"]);
    const present = teach(plain, [], 2, ["present"]);
    expect(uncovered("lähed läheb lähevad", present)).toEqual([]);
    expect(uncovered("lähe", present)).toEqual(["lähe"]);
    expect(uncovered("lähe", teach(present, [], 3, ["negative"]))).toEqual([]);
    // A verb taught after the pattern gets its persons straight away.
    const later = teach(present, [{ kind: "verb", et: "tulema", first: "tulen", en: "to come", firstEn: "I come" }], 4);
    expect(uncovered("tuled tulevad", later)).toEqual([]);
  });

  it("covers a verb's command to one person once that has been explained, and never minema's", () => {
    const verbs = [
      { kind: "verb", et: "ootama", first: "ootan", en: "to wait", firstEn: "I wait" },
      { kind: "verb", et: "minema", first: "lähen", en: "to go", firstEn: "I go" },
    ] as const;
    const before = teach(EMPTY_LEDGER, verbs, 1);
    expect(uncovered("oota", before)).toEqual(["oota"]);
    const after = teach(before, [], 2, ["imperative"]);
    expect(uncovered("oota", after)).toEqual([]);
    expect(uncovered("mine lähe", after)).toEqual(["mine", "lähe"]);
  });
});
