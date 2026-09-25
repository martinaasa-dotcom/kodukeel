import { describe, expect, it } from "vitest";

import { MAX_STARTER_UNITS } from "@/lib/collections/starter";

import { readOnboardingInput } from "./onboarding";

describe("what first run may build from", () => {
  it("takes what the wizard sends", () => {
    expect(readOnboardingInput({ cefr: "B1", dailyGoal: 15, unitIds: ["kodu", "pere"] }))
      .toEqual({ ok: true, level: "B1", dailyGoal: 15, unitIds: ["kodu", "pere"] });
  });

  it("refuses a level that is not one", () => {
    for (const cefr of ["Z9", "", "pre-A1", 42, null, undefined, { a: 1 }]) {
      expect(readOnboardingInput({ cefr, dailyGoal: 15, unitIds: [] }).ok).toBe(false);
    }
  });

  it("refuses a daily goal that is not a number, rather than storing NaN", () => {
    for (const dailyGoal of ["15", Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
      expect(readOnboardingInput({ cefr: "A1", dailyGoal, unitIds: [] }).ok).toBe(false);
    }
  });

  it("holds a daily goal inside the range Settings offers", () => {
    const low = readOnboardingInput({ cefr: "A1", dailyGoal: -3, unitIds: [] });
    const high = readOnboardingInput({ cefr: "A1", dailyGoal: 9000, unitIds: [] });
    expect(low.ok && low.dailyGoal).toBe(5);
    expect(high.ok && high.dailyGoal).toBe(200);
  });

  it("reads a unit list that is not a list as none, and keeps only strings", () => {
    for (const unitIds of ["kodu", 7, null, undefined, { 0: "kodu" }]) {
      const read = readOnboardingInput({ cefr: "A1", dailyGoal: 15, unitIds });
      expect(read.ok && read.unitIds).toEqual([]);
    }
    const mixed = readOnboardingInput({ cefr: "A1", dailyGoal: 15, unitIds: ["kodu", 3, null, "pere"] });
    expect(mixed.ok && mixed.unitIds).toEqual(["kodu", "pere"]);
  });

  it("builds no more units than the starter deck holds", () => {
    const many = Array.from({ length: MAX_STARTER_UNITS + 5 }, (_, i) => `u${i}`);
    const read = readOnboardingInput({ cefr: "A1", dailyGoal: 15, unitIds: many });
    expect(read.ok && read.unitIds.length).toBe(MAX_STARTER_UNITS);
  });
});
