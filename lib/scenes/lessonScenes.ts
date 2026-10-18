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
import A1_TREPIL from "./specs/a1-trepil";
import A1_KURSUS from "./specs/a1-kursus";
import A1_PLAAN from "./specs/a1-plaan";
import A1_KOHVIK from "./specs/a1-kohvik";
import A1_TEE from "./specs/a1-tee";
import A1_MUTSIPOOD from "./specs/a1-mutsipood";
import A1_NADAL from "./specs/a1-nadal";
import A1_KUTSE from "./specs/a1-kutse";

export const LESSON_SCENES: readonly SceneSpec[] = [
  A1_TREPIL, A1_KURSUS, A1_PLAAN, A1_KOHVIK, A1_TEE, A1_MUTSIPOOD, A1_NADAL, A1_KUTSE,
];

/** The conversation a lesson's role-play opens, if it has one. */
export function sceneForLesson(lessonId: string): SceneSpec | undefined {
  return LESSON_SCENES.find((scene) => scene.lesson === lessonId);
}
