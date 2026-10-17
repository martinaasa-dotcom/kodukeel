/**
 * THE CONVERSATIONS PLAYED INSIDE A LESSON, IN THE ORDER THE LESSONS REACH THEM.
 *
 * Kept off the catalogue on purpose: `SCENES` is what the situations page
 * lists for anybody to choose, and these belong to the lesson whose role-play
 * they are (`SceneSpec.lesson`), behind the same preview the lessons are until
 * A1 is whole (docs/43-lessons.md, decision L6). `sceneById` reads this list
 * after the catalogue, so a run, the route and the debrief treat one exactly
 * like any other scene.
 */
import type { SceneSpec } from "./types";
import A1_KOHVIK from "./specs/a1-kohvik";
import A1_TEE from "./specs/a1-tee";

export const LESSON_SCENES: readonly SceneSpec[] = [A1_KOHVIK, A1_TEE];

/** The conversation a lesson's role-play opens, if it has one. */
export function sceneForLesson(lessonId: string): SceneSpec | undefined {
  return LESSON_SCENES.find((scene) => scene.lesson === lessonId);
}
