import { ledgersBefore, LESSONS as COURSE_LESSONS, practiceFor, reviewFor, type LessonSpec } from "@/lib/course/lessons";
import { PREVIEW_LESSONS } from "@/lib/course/lessons/preview";

/** The course and, after it, the lessons in preview, which the ledger walks in that order. */
const LESSONS: readonly LessonSpec[] = [...COURSE_LESSONS, ...PREVIEW_LESSONS];
import { PROGRAMMES, lessonDayFor } from "@/lib/course";
import { checkAfter, type CourseCheck } from "@/lib/course/checks";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { sceneById } from "@/lib/scenes/catalogue";
import { situationFor } from "@/lib/course/lessonSituations";
import type { LessonView } from "@/lib/progress/lessonView";

/*
  The half of `lessonView` that touches no database, kept apart so a unit test
  can build every lesson's plan without one (`lessonPlan.test.ts`).
*/

/*
  The ledger before every lesson, walked once a process. It is the same for
  every learner and every request, and walking 170 lessons was about 130 ms of
  a lesson page that renders on every visit. Ledgers are values (`teach`
  returns a new one), so a held map cannot be changed by whoever reads it.
*/
let BEFORE: Map<string, ReturnType<typeof ledgersBefore> extends Map<string, infer L> ? L : never> | null = null;
function ledgerBefore(id: string) {
  return (BEFORE ??= ledgersBefore(LESSONS)).get(id)!;
}

/** The half of a lesson's view that is the same for every learner, which is all of it but three fields. */
export type LessonPlan = Omit<LessonView, "name" | "due" | "check" | "part" | "next" | "partAt" | "timeMultiplier"> & {
  closes: CourseCheck | null;
  /** The next lesson, and whether it opens another part, which waits behind this part's check. */
  after: { id: string; title: string; crossesPart: boolean } | null;
};

/**
 * What a lesson asks, built from what the lessons before it taught, and where
 * it stands in its level. Pure, so it is unit tested lesson by lesson.
 */
export function lessonPlan(
  lesson: LessonSpec,
  /** The pairs of forms the learner mixes up, commonest first, which put their own slips first. */
  confusions: readonly (readonly [string, string])[] = [],
): LessonPlan {
  const before = ledgerBefore(lesson.id);
  // The one after it in teaching order, which after lesson 26 may be 26a; never into another level.
  const after = LESSONS[LESSONS.indexOf(lesson) + 1];
  const next = after && after.level === lesson.level ? after : null;
  const ofLevel = LESSONS.filter((l) => l.level === lesson.level);
  /*
    On the last lesson of a part, the check that closes it
    (`lib/course/checks.ts`), which the finished screen points at.
  */
  const placed = lessonDayFor(lesson.id);
  const closes = placed && placed.programme.days[placed.programme.days.length - 1]?.lesson === lesson.id
    ? checkAfter(PROGRAMMES, placed.programme.id) ?? null
    : null;
  const history = LESSONS.slice(0, LESSONS.indexOf(lesson));
  return {
    lesson,
    practice: practiceFor(lesson, before, history, confusions),
    review: reviewFor(lesson, before, history),
    after: next ? { id: next.id, title: next.title, crossesPart: next.part !== lesson.part } : null,
    scene: sceneForLesson(lesson.id)?.id ?? null,
    situation: situationOf(lesson.id),
    place: { at: ofLevel.indexOf(lesson) + 1, of: ofLevel.length },
    closes,
  };
}


/** The catalog conversation a lesson points at, with its title, or null (`lessonSituations.ts`). */
function situationOf(lessonId: string): { id: string; title: string } | null {
  const id = situationFor(lessonId);
  const spec = id ? sceneById(id) : undefined;
  return spec ? { id: spec.id, title: spec.title } : null;
}
