import { describe, expect, it } from "vitest";
import { PROGRAMMES, programmeById } from "@/lib/course";
import { LESSONS } from "@/lib/course/lessons";
import { ledgerThrough } from "@/lib/course/lessons/ledger";
import { CHECK_PASS, LEVEL_CHECK, PART_CHECK, markCheck } from "@/lib/course/lessons/practice";
import { blockedBy, checkAfter, checkPaper, courseChecks, passedFrom } from "./checks";

const checks = courseChecks(PROGRAMMES);
const lessonParts = PROGRAMMES.filter((p) => p.days.every((d) => d.lesson));

describe("the checks between the parts of A1", () => {
  it("closes every lesson part with one check, and the last one is the whole level", () => {
    expect(checks.map((c) => c.programmeId)).toEqual(lessonParts.map((p) => p.id));
    const finals = checks.filter((c) => c.final);
    expect(finals).toHaveLength(1);
    const final = finals[0]!;
    expect(final.programmeId).toBe(lessonParts[lessonParts.length - 1]!.id);
    expect(final.lessons.map((l) => l.id)).toEqual(LESSONS.filter((l) => l.level === "A1").map((l) => l.id));
    expect(final.size).toBe(LEVEL_CHECK);
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
      const covered = new Set(check.lessons.map((l) => l.n));
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
    // Somebody placed past A1 is not asked to pass A1's checks.
    const a2 = PROGRAMMES.find((p) => p.level === "A2")!;
    const a2next = PROGRAMMES[PROGRAMMES.indexOf(a2) + 1]!;
    expect(blockedBy(PROGRAMMES, a2, a2next, new Set())).toBeNull();
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
