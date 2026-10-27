/**
 * HOW MUCH OF A WRITTEN TEXT IS READ AND KEPT, FOR THE SERVER AND THE SCREEN.
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
 * writing task asks for a hundred words, and a B1 sentence runs to five words
 * or more, so this reads the whole of any text a task asks for. A test holds
 * it to the longest `least` there is.
 */
export const MOST_READ = 24;
