import { describe, expect, it } from "vitest";
import { PROGRAMMES, programmeById } from "@/lib/course";
import { LESSONS } from "@/lib/course/lessons";
import { ledgerThrough, lessonRank } from "@/lib/course/lessons/ledger";
import { CHECK_PASS, LEVEL_CHECK, PART_CHECK, markCheck } from "@/lib/course/lessons/practice";
import { blockedBy, checkAfter, checkPaper, courseChecks, passedFrom } from "./checks";

const checks = courseChecks(PROGRAMMES);
const lessonParts = PROGRAMMES.filter((p) => p.days.every((d) => d.lesson));

describe("the checks between the parts of the lessons", () => {
  it("closes every lesson part with one check, and the last of each level is the whole level", () => {
    expect(checks.map((c) => c.programmeId)).toEqual(lessonParts.map((p) => p.id));
    const levels = [...new Set(lessonParts.map((p) => p.level))];
    expect(levels).toEqual(["A1", "A2"]);
    const finals = checks.filter((c) => c.final);
    expect(finals).toHaveLength(levels.length);
    for (const level of levels) {
      const ofLevel = lessonParts.filter((p) => p.level === level);
      const final = finals.find((c) => c.programmeId === ofLevel[ofLevel.length - 1]!.id)!;
      expect(final, level).toBeDefined();
      expect(final.lessons.map((l) => l.id)).toEqual(LESSONS.filter((l) => l.level === level).map((l) => l.id));
      expect(final.size).toBe(LEVEL_CHECK);
    }
    for (const c of checks.filter((c) => !c.final)) expect(c.size).toBe(PART_CHECK);
  });

  it("asks a full paper on every check, the same paper for one attempt and a different one for the next", () => {
    for (const check of checks) {
      const paper = checkPaper(check, 1);
      expect(paper.length, check.id).toBe(check.size.recognise + check.size.produce);
      expect(checkPaper(check, 1)).toEqual(paper);
      expect(checkPaper(check, 2), check.id).not.toEqual(paper);
    }
  });

  it("asks only about what the part's own lessons taught", () => {
    let asked = 0;
    for (const check of checks) {
      const last = check.lessons[check.lessons.length - 1]!;
      const covered = new Set(check.lessons.map(lessonRank));
      const ledger = ledgerThrough(LESSONS, last.id)!;
      const taught = new Set(ledger.items.filter((d) => covered.has(d.lesson)).map((d) => d.item.et));
      for (const item of checkPaper(check, 1)) {
        asked += 1;
        expect(taught.has(item.kind === "type" ? item.answer : item.et), `${check.id}: ${JSON.stringify(item)}`).toBe(true);
      }
    }
    expect(asked).toBeGreaterThan(checks.length * 10);
  });

  it("passes at four in five, a nearly counting half", () => {
    const paper = checkPaper(checks[0]!, 1);
    const right = paper.map((i) => (i.kind === "type" ? i.answer : i.answer));
    expect(markCheck(paper, right).passed).toBe(true);
    expect(markCheck(paper, paper.map(() => null)).passed).toBe(false);
    const needed = Math.ceil(paper.length * CHECK_PASS);
    const some = right.map((r, i) => (i < needed ? r : null));
    expect(markCheck(paper, some).passed).toBe(true);
    const fewer = right.map((r, i) => (i < needed - 1 ? r : null));
    expect(markCheck(paper, fewer).passed).toBe(false);
  });

  it("blocks a move up from a lesson part past a check not passed, and nothing else", () => {
    const [first, second, third] = lessonParts;
    expect(blockedBy(PROGRAMMES, first, second!, new Set())?.id).toBe(`check-${first!.id}`);
    expect(blockedBy(PROGRAMMES, first, second!, new Set([`check-${first!.id}`]))).toBeNull();
    // Skipping two parts needs both checks.
    expect(blockedBy(PROGRAMMES, first, third!, new Set([`check-${first!.id}`]))?.id).toBe(`check-${second!.id}`);
    // Back is open, and so is a first choice.
    expect(blockedBy(PROGRAMMES, third, first!, new Set())).toBeNull();
    expect(blockedBy(PROGRAMMES, null, third!, new Set())).toBeNull();
    // Somebody placed past the lessons is not asked to pass their checks.
    const a2 = PROGRAMMES.find((p) => p.level === "A2")!;
    const b1 = PROGRAMMES.find((p) => p.level === "B1")!;
    const b1next = PROGRAMMES[PROGRAMMES.indexOf(b1) + 1]!;
    expect(blockedBy(PROGRAMMES, b1, b1next, new Set())).toBeNull();
    // And B1 waits on A2's last check, the whole of A2, as A2 waits on A1's.
    const a2checks = checks.filter((c) => PROGRAMMES.find((p) => p.id === c.programmeId)?.level === "A2");
    expect(blockedBy(PROGRAMMES, a2, b1, new Set(a2checks.filter((c) => !c.final).map((c) => c.id)))?.final).toBe(true);
    expect(blockedBy(PROGRAMMES, a2, b1, new Set(a2checks.map((c) => c.id)))).toBeNull();
    // A2 waits on every A1 check, the last of them the whole level.
    const all = new Set(checks.map((c) => c.id));
    expect(blockedBy(PROGRAMMES, first, a2, all)).toBeNull();
    const notFinal = new Set(checks.filter((c) => !c.final).map((c) => c.id));
    expect(blockedBy(PROGRAMMES, first, a2, notFinal)?.final).toBe(true);
  });

  it("reads the stored passes and nothing else", () => {
    expect([...passedFrom("check-a1.1 check-a1.2 junk ")]).toEqual(["check-a1.1", "check-a1.2"]);
    expect(passedFrom(null).size).toBe(0);
    expect(checkAfter(PROGRAMMES, programmeById("a1.1")!.id)?.id).toBe("check-a1.1");
  });
});
