import type { Area } from "../area";

/**
 * THE B1 PART `b1-rektsioon`'S OWN ENGLISH, IN RUSSIAN AND UKRAINIAN.
 *
 * Every line the part's lessons draw through `LessonText` that no other area
 * translates already, machine translated on the A1 and A2 terms
 * (`lessonText.ts`): not yet read by somebody fluent, Estonian kept in braces
 * exactly as the lesson writes it, no line about the other language's
 * country. A line another area already translates is left there, since two
 * areas translating one English line differently fail `locale.test.ts`.
 */
export const LESSON_TEXT_B1_REKTSIOON: Area = {
  ru: {},
  uk: {},
};
