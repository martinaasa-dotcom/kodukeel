import { LEVELS, type Level } from "./syllabus/types";
import { sentenceTiles } from "@/lib/estonian/cloze";

/**
 * Which CEFR bands are worth putting in front of somebody at a given level.
 *
 * One table, read by everything that shows a learner a word chosen for them:
 * the dictionary's suggestion row, the new cards a review session introduces,
 * and the minimal pairs round. It was one table already and it lived inside
 * `lib/dict/suggest.ts`, where exactly one of those three could see it, so the
 * other two did not band their words at all. The pairs round drew
 * `ORDER BY cefr ASC` over the whole dictionary, which is a C1 speaker being
 * offered A1 pairs for as long as they keep opening it.
 *
 * The window is one band either side rather than "at or below". Below is where
 * the words somebody already knows are, and a round made only of those is
 * revision dressed as practice; one band up is where the next thing they need
 * is, and a learner who never meets it never moves. A1 has nothing under it
 * and the top reaches C2, which the course does not go to and the dictionary
 * does grade, so a C1 learner is the one person those seventy odd words are
 * any use to.
 *
 * Pure, and in `lib/collections/` with the syllabus it is keyed on, so a page
 * with a database in it and a unit test can both read the same answer.
 */
export const BANDS_AROUND: Record<Level, readonly string[]> = {
  A1: ["A1", "A2"],
  A2: ["A1", "A2", "B1"],
  B1: ["A2", "B1", "B2"],
  B2: ["B1", "B2", "C1"],
  C1: ["B2", "C1", "C2"],
};

/** The CEFR tags worth showing at this level. */
export function bandsAround(level: Level): readonly string[] {
  return BANDS_AROUND[level];
}

/**
 * True when a word carrying this CEFR tag is around the learner's level.
 *
 * An untagged word is **not** filtered out, and that is the load-bearing half.
 * A learner's own deck is full of words they typed in, photographed off their
 * homework or pasted from a class handout, and none of those carries a band.
 * Reading a missing tag as "not your level" would quietly stop review from
 * ever introducing a word the learner added themselves, which is the opposite
 * of what a level is for.
 */
export function isAround(cefr: string | null | undefined, level: Level): boolean {
  if (!cefr) return true;
  return bandsAround(level).includes(cefr);
}

/**
 * The ones around the learner's level first, and nothing dropped.
 *
 * Ordering rather than filtering is the whole of why a level is safe to apply
 * to somebody's own deck. A word two bands above them is not hidden, it waits
 * behind the ones that are not, and it arrives the moment those run out. So a
 * learner who set their level low still meets everything they put in their
 * deck, and one who set it high is never handed an empty session.
 *
 * Stable within each half, because the caller's order is already an answer to
 * a different question: review hands this cards in the order they were added,
 * and `inTeachingOrder` reads that afterwards to settle which card of a word
 * teaches first.
 */
export function aroundFirst<T>(items: readonly T[], level: Level, cefrOf: (item: T) => string | null | undefined): T[] {
  const near: T[] = [];
  const far: T[] = [];
  for (const item of items) (isAround(cefrOf(item), level) ? near : far).push(item);
  return [...near, ...far];
}

/**
 * The order in which a band is worth *teaching*, which is not the order it is
 * worth *showing*.
 *
 * `aroundFirst` answers "is this word anywhere near them", which is the right
 * question for a suggestion row, a pairs round and a review queue: all of those
 * order a pool the learner already owns and must never drop from it. Learn asks
 * a narrower question. It picks the next five words somebody will be taught
 * from scratch, and a word one band below is one they very likely met in the
 * class they are sitting in, so putting it at the front of that queue spends
 * the session on revision. A word one band above is where the next thing they
 * need is.
 *
 * So: at level, then the band above, then their own untagged words, then below,
 * then anything further off. Untagged sits third rather than first because a
 * deck can hold hundreds of words off a photographed handout and none of them
 * carries a band, and letting those lead would quietly stop the course from
 * ever teaching anything. It sits above "below" because the learner went to
 * the trouble of putting them there.
 *
 * Ordering and never filtering, for the reason `aroundFirst` gives at length:
 * a learner whose whole deck is two bands off still gets taught something.
 */
export function challengeRank(cefr: string | null | undefined, level: Level): number {
  const window = bandsAround(level);
  if (!cefr) return 2;
  if (cefr === level) return 0;
  const at = window.indexOf(cefr);
  if (at === -1) return 4;
  // The window is ordered low to high around the level, so anything after the
  // learner's own band in it is the band above.
  return at > window.indexOf(level) ? 1 : 3;
}

/** The ones worth teaching next first, and nothing dropped. */
export function challengeFirst<T>(
  items: readonly T[], level: Level, cefrOf: (item: T) => string | null | undefined,
): T[] {
  return [...items]
    .map((item, index) => ({ item, index, rank: challengeRank(cefrOf(item), level) }))
    // Index breaks the tie, because a comparator that returns 0 for two
    // different rows hands the order to whatever built the array.
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}

/**
 * The bands the dictionary grades to, low to high.
 *
 * One further than the course, which stops at C1: the Wiktionary expansion
 * carries C2 entries and the dictionary is right to keep the distinction, so
 * anything ranking a band has to know the whole ladder rather than the part
 * the syllabus uses.
 */
/**
 * The first band at which a learner is asked to put a sentence back in order.
 *
 * Ordering words is a question about syntax, and at A1 there is no syntax yet
 * to ask about: the first units teach words said alone, and the exercise
 * degenerates into shuffling tiles until the button goes green. It is also the
 * one exercise where every word of a sentence has to be handled rather than
 * read past, so it is the one an unfamiliar word costs most, and an attested
 * usage is written to illustrate a headword rather than to be a beginner's
 * first reading.
 *
 * It lives here rather than beside either of the two exercises that ask it,
 * because there are two: the unit lesson's `build` step and the Sentences
 * round. A constant in one of them is a constant the other disagrees with, and
 * the round is the one a learner reaches from Practice with a deck of thirteen
 * words in it.
 */
export const BUILD_FROM: Level = "A2";

/** Whether a learner at this band is asked to order words at all. */
export function maySortWords(level: Level): boolean {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(BUILD_FROM);
}

/**
 * The bands every Estonian sentence is held to words the course has taught.
 *
 * The same boundary as `BUILD_FROM` today and a different question, so a
 * different predicate: one decides whether an exercise is asked at all, the
 * other decides which sentences it may be built from. A beginner three weeks
 * in has thirteen words and no reading to grow; a B1 learner meeting an
 * unfamiliar word inside a sentence is how reading grows.
 */
export function onlyTaughtWords(level: Level): boolean {
  return !maySortWords(level);
}

/**
 * Whether this sentence is one a learner at this band may be shown.
 *
 * TWO READERS, AND THE LIST IS CLOSED. The unit lesson's `build` and `gap`
 * steps, and the Learn ladder's gap rung. Both are things the planned module
 * puts in front of a beginner who did not choose them, which is the whole of
 * what the rule covers.
 *
 * What is deliberately NOT here is as load-bearing as what is. The
 * spaced-repetition deck's gap-fill and case cards are outside it by a decision
 * with a number under it: at A1 the rule takes gap-fill cards from 786 to 51
 * and case cards from 111 to nought, and a card names the word, names the
 * question and asks for one form of a word the learner has been taught, which
 * they can answer without reading past the blank. Dictation, the picture round
 * and the grammar page a day reads are outside it too, and are named as
 * residuals in `CLAUDE.md` rather than quietly gated. A third reader fails the
 * invariant until somebody decides which side of that line it is on, in the
 * shape `lib/legal/exportCoverage.ts` takes for its exemptions, because the
 * cost of getting this wrong is a beginner's case drilling deleted in silence.
 *
 * A null set is "the course could not say", which fails closed at the bands
 * that are held to it rather than letting every sentence through.
 */
export function readableFor(
  level: Level, taught: ReadonlySet<string> | null,
): (sentence: string) => boolean {
  if (!onlyTaughtWords(level)) return () => true;
  if (taught === null) return () => false;
  return (sentence) => sentenceTiles(sentence).every((w) => taught.has(w.toLowerCase()));
}

export const BAND_ORDER: readonly string[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * How far up the ladder a band sits. An untagged word sits at the bottom.
 *
 * Zero for a word with no band rather than null, because every caller of this
 * is comparing two of them and a comparison against nothing is a branch each
 * of them would have to write. What a missing band means is decided where it
 * matters, by `isAround`, which reads it as "near enough" and says why.
 */
export function rankBand(cefr: string | null | undefined): number {
  if (!cefr) return 0;
  const at = BAND_ORDER.indexOf(cefr);
  return at === -1 ? 0 : at;
}

/**
 * One band up, for a word a deployment has found harder than its tag says.
 *
 * C2 is the top and stays there, and an untagged word stays untagged: raising
 * a word that never carried a claim about its difficulty would be inventing
 * one. Never more than a step at a time, because the word then has to earn
 * the next one from the learners who meet it where it now sits
 * (`lib/srs/defer.ts`).
 */
export function raiseBand(cefr: string | null): string | null {
  if (!cefr) return null;
  const at = BAND_ORDER.indexOf(cefr);
  if (at === -1 || at === BAND_ORDER.length - 1) return cefr;
  return BAND_ORDER[at + 1]!;
}
