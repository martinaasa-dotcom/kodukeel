/**
 * THE LEVELS TAUGHT AS LESSONS, AS A LIST AND NOTHING ELSE.
 *
 * `isLessonLevel` in `lib/course/lessons` answers the same question off the
 * lessons themselves, which is the source of truth and imports every lesson
 * the course has. A screen that only needs the answer (the command palette,
 * deciding which units to offer) cannot afford that bundle, so it reads this,
 * and `lessonLevels.test.ts` holds the two to one answer: moving B1 to lessons
 * is a line here as well as its data, and the test says so if it is missed.
 */
export const LESSON_LEVEL_LIST: readonly string[] = ["A1", "A2", "B1", "B2"];

export function isLessonLevelName(level: string): boolean {
  return LESSON_LEVEL_LIST.includes(level);
}
