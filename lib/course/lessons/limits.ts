import { levelIndex, type Level } from "@/lib/collections/syllabus/types";

/**
 * THE FIGURES AND RULES A LESSON SCREEN SHARES WITH THE SERVER: how much of a
 * written text is read and kept, and where the longer Say it starts.
 *
 * A leaf on purpose: the writing step's screen shows both figures, and
 * `own.ts`, where they are used, reaches the lesson heads and through them the
 * whole course and the harvest. A client file imports these from here and
 * never from `own.ts` (`scripts/check-bundle-data.mjs`, and an invariant).
 */

/** The most sentences one draft keeps, so one evening cannot flood a deck. */
export const MOST_KEPT = 8;

/**
 * The most sentences of a draft the dictionary reads one by one. The longest
 * writing task asks for two hundred and sixty words (C1's book review), and a
 * sentence at B1 and up runs to five words or more, so this reads the whole
 * of any text a task asks for. A test holds it to the longest `least` there is.
 */
export const MOST_READ = 52;

/**
 * Whether a lesson's Say it is the longer step B1 brings (docs/43-lessons.md
 * §11.2): the key lines faded along and then alone, and the story to retell
 * or the answer said faster. Named once, so the step and the line explaining
 * it cannot disagree about where it starts.
 */
export function saysItLonger(level: Level): boolean {
  return levelIndex(level) >= levelIndex("B1");
}
