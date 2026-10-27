/*
  A LESSON A PHONE IS HANDED IS THE LESSON THE WEB IS HANDED.

  Two halves. At compile time, the contract's lesson schemas and the lessons
  work's own types (`lib/course/lessons/types.ts`, the practice items and the
  check's result) are held to each other in both directions, and so are the
  view the route answers with and the props `LessonRunner` and `CheckRunner`
  take: a change to a lesson's shape fails `tsc` here rather than a native app
  in a learner's hand. At run time, `lessonPlan` is compared, lesson by lesson
  over the whole course, with the page's own computation as it stood before it
  moved, so the move is shown to have changed nothing a screen receives.
*/
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import type { LessonRunner } from "@/app/(app)/course/lessons/[id]/LessonRunner";
import type { CheckRunner } from "@/app/(app)/course/check/[id]/CheckRunner";
import type {
  CheckResponse, CheckResultSchema, LessonResponse, LessonSpecSchema, PracticeItemSchema,
} from "@/lib/api/contract";
import { PROGRAMMES, lessonDayFor } from "@/lib/course";
import { checkAfter } from "@/lib/course/checks";
import {
  LESSONS, ledgersBefore, practiceFor, reviewFor, type CheckResult, type LessonSpec, type PracticeItem,
} from "@/lib/course/lessons";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { lessonPlan } from "./lessonPlan";
import type { LessonView } from "./lessonView";

/** True only where each type is assignable to the other. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const specAgrees: Same<z.infer<typeof LessonSpecSchema>, LessonSpec> = true;
const itemAgrees: Same<z.infer<typeof PracticeItemSchema>, PracticeItem> = true;
const resultAgrees: Same<z.infer<typeof CheckResultSchema>, CheckResult> = true;
const viewAgrees: Same<Omit<z.infer<typeof LessonResponse>, "locale" | "translations" | "nativePart">, LessonView> = true;
const runnerAgrees: Same<LessonView, Required<Omit<ComponentProps<typeof LessonRunner>, "conversation">>> = true;
const paperAgrees: Same<z.infer<typeof CheckResponse>["items"], ComponentProps<typeof CheckRunner>["items"]> = true;

describe("the v1 lesson contract", () => {
  it("names the lesson types, the view and the runners' props exactly", () => {
    expect([specAgrees, itemAgrees, resultAgrees, viewAgrees, runnerAgrees, paperAgrees]).toEqual([true, true, true, true, true, true]);
  });

  it("builds every lesson's plan exactly as the lesson page built it", () => {
    let compared = 0;
    // Built once: it walks every lesson, and asking it per lesson is the whole course squared.
    const ledgers = ledgersBefore(LESSONS);
    for (const lesson of LESSONS) {
      // The page's own lines, as they stood before they moved into `lessonPlan`.
      const before = ledgers.get(lesson.id)!;
      const after = LESSONS[LESSONS.indexOf(lesson) + 1];
      const next = after && after.level === lesson.level ? after : null;
      const ofLevel = LESSONS.filter((l) => l.level === lesson.level);
      const placed = lessonDayFor(lesson.id);
      const check = placed && placed.programme.days[placed.programme.days.length - 1]?.lesson === lesson.id
        ? checkAfter(PROGRAMMES, placed.programme.id) ?? null
        : null;
      const plan = lessonPlan(lesson);
      expect(plan.lesson).toBe(lesson);
      const history = LESSONS.slice(0, LESSONS.indexOf(lesson));
      expect(plan.practice).toEqual(practiceFor(lesson, before, history));
      expect(plan.review).toEqual(reviewFor(lesson, before, history));
      expect(plan.after).toEqual(next ? { id: next.id, title: next.title, crossesPart: next.part !== lesson.part } : null);
      expect(plan.scene).toBe(sceneForLesson(lesson.id)?.id ?? null);
      expect(plan.place).toEqual({ at: ofLevel.indexOf(lesson) + 1, of: ofLevel.length });
      expect(plan.closes?.id ?? null).toBe(check?.id ?? null);
      compared += 1;
    }
    expect(compared).toBe(LESSONS.length);
    expect(compared).toBeGreaterThan(40);
    // A whole course of plans, three levels of it, takes longer than the default twenty seconds under load.
  }, 120_000);
});
