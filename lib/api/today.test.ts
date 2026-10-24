import { describe, expect, it } from "vitest";

import { TodayResponse } from "./contract";
import { todayFrom, type TodayFacts } from "./today";

const base: TodayFacts = {
  following: true, finished: false, check: null, blocked: false, nextPart: "a1.2",
  lesson: "a1-03", finishedToday: false, webHref: "/course",
};

describe("todayFrom", () => {
  it("says nothing is planned for a learner off the course", () => {
    expect(todayFrom({ ...base, following: false })).toEqual({ kind: "nothing", reason: "off" });
  });

  it("is today's lesson, and says when it is already done", () => {
    expect(todayFrom(base)).toEqual({ kind: "lesson", lessonId: "a1-03", finished: false });
    expect(todayFrom({ ...base, finishedToday: true })).toEqual({ kind: "lesson", lessonId: "a1-03", finished: true });
  });

  it("is the web for an evening that is a module", () => {
    expect(todayFrom({ ...base, lesson: null })).toEqual({ kind: "web", href: "/course" });
  });

  it("is the check once the part is done, open or shut by moveBlockedFor's answer", () => {
    const done = { ...base, finished: true, check: { id: "check-a1.1", final: false } };
    expect(todayFrom({ ...done, blocked: true })).toEqual({ kind: "check", checkId: "check-a1.1", final: false, passed: false, next: "a1.2" });
    expect(todayFrom({ ...done, blocked: false })).toMatchObject({ kind: "check", passed: true });
  });

  it("hands a finished part with no check to the web, and the last part to nothing", () => {
    expect(todayFrom({ ...base, finished: true })).toEqual({ kind: "web", href: "/course" });
    expect(todayFrom({ ...base, finished: true, nextPart: null })).toEqual({ kind: "nothing", reason: "finished" });
  });

  it("answers in the contract's shape every time", () => {
    for (const facts of [base, { ...base, following: false }, { ...base, lesson: null }, { ...base, finished: true, check: { id: "c", final: true } }]) {
      expect(TodayResponse.safeParse(todayFrom(facts)).success).toBe(true);
    }
  });
});
