import { lessonById, type LessonSpec } from "@/lib/course/lessons";
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
  const { closes, ...plan } = lessonPlan(lesson);
  const [nameSetting, queue, passed] = await Promise.all([
    readSetting(ownerId, SETTING_KEYS.displayName),
    reviewQueue(ownerId, null, now),
    closes ? checksPassedFor(ownerId) : Promise.resolve(new Set<string>()),
  ]);
  return {
    ...plan,
    name: sayableName(nameSetting),
    due: queue.due.length,
    check: closes ? { id: closes.id, final: closes.final, passed: passed.has(closes.id) } : null,
  };
}
