import { describe, expect, it } from "vitest";
import { buildReport } from "./report";
import type { ExamResult, PartResult } from "./score";
import { bandFor } from "./spec";
import type { SkillKey } from "./types";

function part(skill: SkillKey, points: number, max = 25, rawAvailable = 20): PartResult {
  return {
    skill,
    label: skill[0]!.toUpperCase() + skill.slice(1),
    tasks: [
      { taskId: `${skill}-1`, title: "First task", marks: [], raw: points / 2, rawAvailable: rawAvailable / 2, shortfall: 0 },
      { taskId: `${skill}-2`, title: "Second task", marks: [], raw: points / 2, rawAvailable: rawAvailable / 2, shortfall: 0 },
    ],
    raw: points,
    rawAvailable,
    points,
    maxPoints: max,
    pct: Math.round((points / max) * 100),
  };
}

function result(over: Partial<ExamResult> = {}): ExamResult {
  const parts = over.parts ?? [
    part("writing", 20), part("listening", 10), part("reading", 22), part("speaking", 18),
  ];
  const points = parts.reduce((sum, p) => sum + p.points, 0);
  const maxPoints = parts.reduce((sum, p) => sum + p.maxPoints, 0);
  const pct = Math.floor((points / maxPoints) * 100);
  return {
    level: "B1",
    parts,
    points,
    maxPoints,
    pct,
    passed: pct >= 60,
    band: bandFor(pct),
    zeroPart: null,
    absentParts: [],
    waitBeforeResit: pct < 45,
    thin: false,
    ...over,
  };
}

describe("the result report", () => {
  it("leads with the score and what it means", () => {
    const report = buildReport(result());
    expect(report.headline).toContain("70");
    expect(report.consequence).toBeTruthy();
  });

  it("names the weakest part first, because that is the one to work on", () => {
    const report = buildReport(result());
    expect(report.gaps[0]?.id).toBe("part-listening");
  });

  it("gives every gap somewhere to go", () => {
    for (const gap of buildReport(result()).gaps) {
      expect(gap.href).toBeTruthy();
      expect(gap.cta).toBeTruthy();
    }
  });

  it("says a zero in one part failed the paper, whatever the total was", () => {
    const report = buildReport(result({
      parts: [part("writing", 25), part("listening", 25), part("reading", 25), part("speaking", 0)],
      zeroPart: "speaking",
      passed: false,
      pct: 75,
    }));
    expect(report.headline).toContain("zero in one part");
    // The total would pass, so there is no shortfall to state, and the part is
    // what to work on. It used to read "You are -15 points of percentage short".
    expect(report.consequence).not.toMatch(/-\d/);
    expect(report.consequence).not.toContain("short");
    expect(report.consequence.toLowerCase()).toContain("speaking");
  });

  it("names the zero part under a total that also fell short, rather than counting points alone", () => {
    const report = buildReport(result({
      parts: [part("writing", 20), part("listening", 20), part("reading", 10), part("speaking", 0)],
      zeroPart: "speaking",
      passed: false,
      pct: 50,
      waitBeforeResit: false,
    }));
    expect(report.consequence).toContain("10 points");
    expect(report.consequence.toLowerCase()).toContain("speaking");
  });

  it("warns about the six month wait only when a real result would earn one", () => {
    expect(buildReport(result({ pct: 30, passed: false, waitBeforeResit: true })).consequence)
      .toContain("six months");
    expect(buildReport(result({ pct: 55, passed: false, waitBeforeResit: false })).consequence)
      .not.toContain("six months");
  });

  it("congratulates a pass without hedging", () => {
    const report = buildReport(result({ pct: 82, passed: true }));
    expect(report.headline).toContain("pass");
    expect(report.consequence).toContain("certificate");
  });

  it("explains a part nothing could be set for, rather than counting it against anybody", () => {
    const report = buildReport(result({
      parts: [
        part("writing", 20), part("listening", 0, 25, 0),
        part("reading", 22), part("speaking", 18),
      ],
      absentParts: ["listening"],
    }));
    const absent = report.gaps.find((g) => g.id === "absent");
    expect(absent).toBeTruthy();
    expect(report.gaps.some((g) => g.id === "part-listening")).toBe(false);
  });

  it("counts a word that went wrong more than once", () => {
    const marks = [
      { itemId: "a", scored: 0, available: 1, correct: false, expected: "toas", given: "toa", note: "", cardId: null, lexemeId: "L1", lemma: "tuba", recalled: false, language: "et" as const },
      { itemId: "b", scored: 0, available: 1, correct: false, expected: "toast", given: "", note: "", cardId: null, lexemeId: "L1", lemma: "tuba", recalled: false, language: "et" as const },
      { itemId: "c", scored: 0, available: 1, correct: false, expected: "majas", given: "maja", note: "", cardId: null, lexemeId: "L2", lemma: "maja", recalled: false, language: "et" as const },
    ];
    const parts = [part("writing", 10), part("listening", 10), part("reading", 10), part("speaking", 10)];
    parts[0]!.tasks[0]!.marks = marks;
    const report = buildReport(result({ parts }));
    expect(report.repeatOffenders).toEqual([{ lemma: "tuba", lexemeId: "L1", times: 2 }]);
    expect(report.missed).toHaveLength(3);
  });

  /*
    RIGHT, AND STILL WORTH A LINE. `missed` is every mark that was wrong, and
    it was the only list of marks the result screen had, so a note the marker
    writes on a *correct* answer was computed on every paper and drawn on none
    of it. Two answers write one: a dictation that forgives a dropped
    diacritic and names the letter anyway, and a word order the writer did not
    choose. Keyed on the note rather than on the item type, so a third kind
    that grows one arrives on the screen without being wired up.
  */
  it("keeps a right answer that has something to say, and leaves the silent ones out", () => {
    const marks = [
      { itemId: "slip", scored: 1, available: 1, correct: true, expected: "õde", given: "ode", note: "You dropped the õ.", cardId: null, lexemeId: "L1", lemma: "õde", recalled: true, language: "et" as const },
      { itemId: "variant", scored: 1, available: 1, correct: true, expected: "Muidugi tuleb ette näpukaid", given: "Muidugi tuleb näpukaid ette", note: "That works. The writer put ette earlier.", cardId: null, lexemeId: "L2", lemma: "näpukas", recalled: true, language: "et" as const },
      { itemId: "plain", scored: 1, available: 1, correct: true, expected: "toas", given: "toas", note: "", cardId: null, lexemeId: "L3", lemma: "tuba", recalled: true, language: "et" as const },
      { itemId: "wrong", scored: 0, available: 1, correct: false, expected: "majas", given: "maja", note: "One letter out.", cardId: null, lexemeId: "L4", lemma: "maja", recalled: false, language: "et" as const },
    ];
    const parts = [part("writing", 10), part("listening", 10), part("reading", 10), part("speaking", 10)];
    parts[0]!.tasks[0]!.marks = marks;
    const report = buildReport(result({ parts }));
    expect(report.accepted.map((m) => m.itemId)).toEqual(["slip", "variant"]);
    expect(report.missed.map((m) => m.itemId)).toEqual(["wrong"]);
  });

  it("says a whole clean paper is clean", () => {
    const perfect = result({
      parts: [part("writing", 25), part("listening", 25), part("reading", 25), part("speaking", 25)],
    });
    const report = buildReport(perfect);
    expect(report.gaps).toEqual([]);
    expect(report.strengths).toHaveLength(4);
    expect(report.missed).toEqual([]);
    expect(report.accepted).toEqual([]);
  });
});
