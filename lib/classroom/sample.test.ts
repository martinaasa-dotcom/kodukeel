import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { caseByKey } from "@/lib/estonian/cases";
import { SAMPLE_CLASS } from "./sample";

describe("the sample class /teachers draws", () => {
  const entries = SAMPLE_CLASS.entries;

  it("names only real cases", () => {
    const keys = [
      ...entries.flatMap((e) => (e.weakestCase ? [e.weakestCase.grammCase] : [])),
      ...SAMPLE_CLASS.weakestCases.map((c) => c.grammCase),
    ];
    expect(keys.length).toBeGreaterThan(2);
    for (const key of keys) expect(caseByKey(key), key).toBeDefined();
  });

  it("has eight invented learners with unique sample ids", () => {
    expect(entries).toHaveLength(8);
    expect(new Set(entries.map((e) => e.ownerId)).size).toBe(entries.length);
    for (const e of entries) expect(e.ownerId.startsWith("sample-")).toBe(true);
  });

  it("adds up", () => {
    expect(SAMPLE_CLASS.totalReviewsThisWeek).toBe(entries.reduce((s, e) => s + e.reviewsThisWeek, 0));
    expect(SAMPLE_CLASS.activeThisWeek).toBe(entries.filter((e) => e.reviewsThisWeek > 0).length);
    expect(SAMPLE_CLASS.joined).toBe(entries.length);
  });

  it("is ordered as a real roster is, most reviews first", () => {
    const counts = entries.map((e) => e.reviewsThisWeek);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("shows the range a real week has", () => {
    expect(entries[0]!.streak).toBeGreaterThan(0);
    expect(entries.some((e) => e.daysSinceLastReview === 9)).toBe(true);
    expect(entries.some((e) => e.daysSinceLastReview === null)).toBe(true);
    expect(entries.filter((e) => e.weakestCase).length).toBe(2);
    for (const c of SAMPLE_CLASS.weakestCases) expect(c.accuracy).toBeGreaterThanOrEqual(50);
    for (const c of SAMPLE_CLASS.weakestCases) expect(c.accuracy).toBeLessThan(70);
  });

  it("uses no name the demo fixture gives a real-looking learner", () => {
    const fixture = readFileSync("scripts/demo-data.ts", "utf8");
    const demoNames = [...fixture.matchAll(/displayName:\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(demoNames.length).toBeGreaterThan(0);
    for (const e of entries) expect(demoNames).not.toContain(e.displayName);
  });
});
