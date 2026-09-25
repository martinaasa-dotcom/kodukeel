import { describe, expect, it } from "vitest";
import { classWeakestCases, MIN_CLASS_CASE_STUDENTS } from "./classCases";

const answers = (ownerId: string, targetCase: string, n: number, rating = 1) =>
  Array.from({ length: n }, () => ({ ownerId, targetCase, rating }));

describe("classWeakestCases", () => {
  it("names no case that one student's answers alone put there", () => {
    expect(classWeakestCases(answers("kadri", "osastav", 20))).toEqual([]);
  });

  it("names no case two students are behind, since the teacher can tell which", () => {
    expect(classWeakestCases([...answers("kadri", "osastav", 12), ...answers("mari", "osastav", 1)])).toEqual([]);
  });

  it("names a case once enough students practised it", () => {
    const reviews = ["a", "b", "c"].flatMap((id) => answers(id, "osastav", 4));
    expect(MIN_CLASS_CASE_STUDENTS).toBe(3);
    expect(classWeakestCases(reviews).map((c) => c.grammCase)).toEqual(["osastav"]);
  });

  it("still needs enough answers, whatever the head count", () => {
    const reviews = ["a", "b", "c"].flatMap((id) => answers(id, "osastav", 2));
    expect(classWeakestCases(reviews)).toEqual([]);
  });
});
