import { describe, expect, it } from "vitest";
import { PROGRAMMES, programmeAfter, programmeById } from "@/lib/course";
import { LESSONS, LESSON_LEVELS } from "@/lib/course/lessons";
import { ledgerThrough, lessonRank } from "@/lib/course/lessons/ledger";
import { CHECK_PASS, LEVEL_CHECK, PART_CHECK, checkLength, itemEstonian, markCheck } from "@/lib/course/lessons/practice";
import { namesOf, uncovered } from "@/lib/course/lessons/ledger";
import { blockedBy, checkAfter, checkPaper, courseChecks, passedFrom, whereAPassLeads } from "./checks";

const checks = courseChecks(PROGRAMMES);
const lessonParts = PROGRAMMES.filter((p) => p.days.every((d) => d.lesson));

describe("the checks between the parts of the lessons", () => {
  it("closes every lesson part with one check, and the last of each level is the whole level", () => {
    expect(checks.map((c) => c.programmeId)).toEqual(lessonParts.map((p) => p.id));
    const levels = [...new Set(lessonParts.map((p) => p.level))];
    expect(levels).toEqual([...LESSON_LEVELS]);
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
  }, 120_000);

  it("asks a full paper on every check, the same paper for one attempt and a different one for the next", () => {
    for (const check of checks) {
      const paper = checkPaper(check, 1);
      expect(paper.length, check.id).toBe(checkLength(check.size));
      expect(checkPaper(check, 1)).toEqual(paper);
      expect(checkPaper(check, 2), check.id).not.toEqual(paper);
    }
  }, 120_000);

  it("never asks a match, which the check's marked list has no row for", () => {
    let asked = 0;
    for (const check of checks) {
      for (const item of checkPaper(check, 1)) {
        asked += 1;
        expect(item.kind, check.id).not.toBe("match");
      }
    }
    expect(asked).toBeGreaterThan(100);
  }, 120_000);

  it("asks only about what the part's own lessons taught", () => {
    let asked = 0;
    for (const check of checks) {
      const last = check.lessons[check.lessons.length - 1]!;
      const covered = new Set(check.lessons.map(lessonRank));
      const ledger = ledgerThrough(LESSONS, last.id)!;
      const taught = new Set(ledger.items.filter((d) => covered.has(d.lesson)).map((d) => d.item.et));
      // A line is quoted with the names its own lesson's cast allows: Kadri is a colleague from B1 on.
      const names = new Set(check.lessons.flatMap((l) => [...namesOf(l)]));
      for (const item of checkPaper(check, 1)) {
        asked += 1;
        if (item.kind === "gap") {
          // A gap is a line of the part's own conversations, every word of it taught by the part's end.
          for (const et of itemEstonian(item)) expect(uncovered(et, ledger, names), `${check.id}: ${et}`).toEqual([]);
          expect(check.lessons.some((l) => l.conversation.some((line) => line.et?.includes(`${item.before}${item.answer}${item.after}`)))).toBe(true);
          continue;
        }
        expect(item.kind).not.toBe("match");
        if (item.kind === "match" || item.kind === "reply" || item.kind === "rework" || item.kind === "fix" || item.kind === "room") continue;
        expect(taught.has(item.kind === "type" ? item.answer : item.et), `${check.id}: ${JSON.stringify(item)}`).toBe(true);
      }
    }
    expect(asked).toBeGreaterThan(checks.length * 10);
  }, 120_000);

  it("never prints an answer a typed question on the same paper asks for", () => {
    let papers = 0;
    for (const check of checks) {
      for (const attempt of [1, 2, 3, 4, 5]) {
        const paper = checkPaper(check, attempt);
        const shown = paper.flatMap((item) => item.kind === "hear" || item.kind === "pick" ? [item.et.toLocaleLowerCase("et")] : []);
        for (const item of paper) {
          if (item.kind === "type") expect(shown, `${check.id}/${attempt}: ${item.answer}`).not.toContain(item.answer.toLocaleLowerCase("et"));
        }
        papers++;
      }
    }
    expect(papers).toBe(checks.length * 5);
  }, 120_000);

  it("passes at four in five, a nearly counting half", () => {
    const paper = checkPaper(checks[0]!, 1);
    const right = paper.map((i) => (i.kind === "match" ? null : i.answer));
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
    // C1 is lessons too since it moved, so nobody is above the lessons: a move up inside C1 waits on its check.
    const a2 = PROGRAMMES.find((p) => p.level === "A2")!;
    const b1 = PROGRAMMES.find((p) => p.level === "B1")!;
    const c1 = PROGRAMMES.find((p) => p.level === "C1")!;
    const c1next = PROGRAMMES[PROGRAMMES.indexOf(c1) + 1]!;
    expect(blockedBy(PROGRAMMES, c1, c1next, new Set())?.id).toBe(`check-${c1.id}`);
    expect(blockedBy(PROGRAMMES, c1, c1next, new Set([`check-${c1.id}`]))).toBeNull();
    // And B1 waits on A2's last check, the whole of A2, as A2 waits on A1's.
    const a2checks = checks.filter((c) => PROGRAMMES.find((p) => p.id === c.programmeId)?.level === "A2");
    expect(blockedBy(PROGRAMMES, a2, b1, new Set(a2checks.filter((c) => !c.final).map((c) => c.id)))?.final).toBe(true);
    expect(blockedBy(PROGRAMMES, a2, b1, new Set(a2checks.map((c) => c.id)))).toBeNull();
    // A2 waits on every A1 check, the last of them the whole level.
    const all = new Set(checks.map((c) => c.id));
    expect(blockedBy(PROGRAMMES, first, a2, all)).toBeNull();
    const notFinal = new Set(checks.filter((c) => !c.final).map((c) => c.id));
    expect(blockedBy(PROGRAMMES, first, a2, notFinal)?.final).toBe(true);
  }, 120_000);

  it("reads the stored passes and nothing else", () => {
    expect([...passedFrom("check-a1.1 check-a1.2 junk ")]).toEqual(["check-a1.1", "check-a1.2"]);
    expect(passedFrom(null).size).toBe(0);
    expect(checkAfter(PROGRAMMES, programmeById("a1.1")!.id)?.id).toBe("check-a1.1");
  }, 120_000);
});

describe("where a pass leads, said once for the check page and the app", () => {
  it("names a part by its title, a new level by its level, and says what a finished level was", () => {
    let parts = 0;
    let finals = 0;
    for (const check of checks) {
      const part = programmeById(check.programmeId)!;
      const next = programmeAfter(part) ?? null;
      const { nextLabel, levelDone } = whereAPassLeads(check, part, next);
      if (!next) {
        expect(nextLabel).toBeNull();
      } else if (next.level !== part.level) {
        expect(nextLabel).toBe(next.level);
      } else {
        expect(nextLabel).toBe(next.title);
        expect(nextLabel).not.toBe(next.id.toUpperCase());
        parts += 1;
      }
      expect(levelDone === null).toBe(!check.final);
      if (levelDone) {
        finals += 1;
        expect(levelDone.level).toBe(part.level);
        expect(levelDone.lessons).toBe(LESSONS.filter((l) => l.level === part.level).length);
        expect(levelDone.parts.length).toBeGreaterThan(1);
        expect(levelDone.arrival.length).toBeGreaterThan(10);
        expect(levelDone.next?.level ?? null).toBe(next?.level ?? null);
      }
    }
    expect(parts).toBeGreaterThan(5);
    expect(finals).toBe(LESSON_LEVELS.size);
  }, 120_000);
});
