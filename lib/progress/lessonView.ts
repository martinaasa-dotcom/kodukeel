import { lessonById, lessonLabel, LESSON_PARTS, LESSONS, type LessonSpec } from "@/lib/course/lessons";
import { lessonListStates } from "@/lib/progress/course";
import type { PracticeItem } from "@/lib/course/lessons/practice";
import { sayableName } from "@/lib/course/lessons/ownAnswer";
import { lessonPlan } from "@/lib/progress/lessonPlan";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { checksPassedFor } from "@/lib/progress/checks";
import { reviewQueue } from "@/lib/progress/dailyQueue";

/**
 * WHAT ONE LESSON'S SCREEN IS HANDED, BUILT ONCE FOR BOTH DOORS.
 *
 * The lesson page hands this to `LessonRunner` and `GET /api/v1/lessons/{id}`
 * answers with it (ADR-029, D2), so a phone and a browser opening one lesson
 * are asked the same questions in the same order. Moved out of the page and
 * otherwise unchanged: the page keeps its markup and the one thing only a
 * browser has, the way back from the lesson's own conversation.
 */
export interface LessonView {
  lesson: LessonSpec;
  practice: readonly PracticeItem[];
  review: readonly PracticeItem[];
  next: { id: string; title: string } | null;
  scene: string | null;
  place: { at: number; of: number };
  name: string | null;
  due: number;
  check: { id: string; final: boolean; passed: boolean } | null;
  /** The part this lesson is in, lesson by lesson, for "4 of 8" and the track on the finish. */
  part: { title: string; lessons: readonly { id: string; label: string; title: string; done: boolean }[] };
}

/**
 * One lesson's view for a learner, or null where there is no such lesson.
 *
 * Besides the plan, the three facts about the learner the finished screen
 * reads: their own name, so a model answer about them says it rather than
 * Tom's; the cards now due, since a lesson is learned by reviewing it
 * afterwards and a learner reported going through all 49 without ever opening
 * Review; and whether the check that closes the part is passed.
 */
export async function lessonView(ownerId: string, lessonId: string, now: Date = new Date()): Promise<LessonView | null> {
  const lesson = lessonById(lessonId);
  if (!lesson) return null;
  const { closes, after, ...plan } = lessonPlan(lesson);
  const [nameSetting, queue, passed, states] = await Promise.all([
    readSetting(ownerId, SETTING_KEYS.displayName),
    reviewQueue(ownerId, null, now),
    closes ? checksPassedFor(ownerId) : Promise.resolve(new Set<string>()),
    lessonListStates(ownerId),
  ]);
  /*
    THE PART THIS LESSON IS IN, lesson by lesson, so the screen can say "4 of
    8 in First words" and the finish can light the one just done. A lesson
    opened from the list ahead of the course reads the same; what it records
    is `finishLesson`'s decision.
  */
  const partSpec = LESSON_PARTS.find((p) => p.id === lesson.part)!;
  const part = {
    title: partSpec.title,
    lessons: LESSONS.filter((l) => l.part === lesson.part).map((l) => ({
      id: l.id, label: lessonLabel(l), title: l.title, done: states.get(l.id) === "done",
    })),
  };
  /* Across a part's end the way on is its check, so "Next:" stops there until it is passed. */
  const pastTheCheck = !closes || passed.has(closes.id);
  return {
    ...plan,
    next: after && (!after.crossesPart || pastTheCheck) ? { id: after.id, title: after.title } : null,
    part,
    name: sayableName(nameSetting),
    due: queue.due.length,
    check: closes ? { id: closes.id, final: closes.final, passed: passed.has(closes.id) } : null,
  };
}
