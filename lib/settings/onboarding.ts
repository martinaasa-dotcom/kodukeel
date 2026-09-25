/*
  THE THREE ANSWERS FIRST RUN SENDS THAT DECIDE WHAT GETS BUILT.

  `completeOnboarding` is a `"use server"` export, so its arguments are JSON
  off the wire whatever the types say. It wrote the level straight into two
  settings and the name of a part, stored `String(NaN)` as the daily goal for
  a goal that was not a number, and threw on `unitIds.slice` for a list that
  was not an array, which the framework answers with a 500. The wizard never
  sends any of that; a forged call does, and it lands in the learner's own
  settings. Pure, so it is tested rather than argued about.
*/
import { MAX_STARTER_UNITS } from "@/lib/collections/starter";
import { LEVELS, type Level } from "@/lib/collections/syllabus/types";

export type OnboardingInput =
  | { ok: true; level: Level; dailyGoal: number; unitIds: string[] }
  | { ok: false; error: string };

export function readOnboardingInput(raw: {
  cefr?: unknown; dailyGoal?: unknown; unitIds?: unknown;
}): OnboardingInput {
  const level = typeof raw.cefr === "string" ? raw.cefr.trim().toUpperCase() : "";
  if (!(LEVELS as readonly string[]).includes(level)) {
    return { ok: false, error: "That is not a level." };
  }
  const goal = typeof raw.dailyGoal === "number" ? raw.dailyGoal : Number.NaN;
  if (!Number.isFinite(goal)) return { ok: false, error: "That is not a daily goal." };
  const unitIds = Array.isArray(raw.unitIds)
    ? raw.unitIds.filter((id): id is string => typeof id === "string").slice(0, MAX_STARTER_UNITS)
    : [];
  return {
    ok: true,
    level: level as Level,
    dailyGoal: Math.min(200, Math.max(5, Math.round(goal))),
    unitIds,
  };
}
