/**
 * WHAT THE APP SAYS THE FIRST TIME IT ASKS SOMEBODY TO WRITE A WORD.
 *
 * A learner reached the gap rung of the Learn ladder on a word they had met
 * ninety seconds earlier, was shown an empty box and a Check button, and had no
 * way of knowing whether being unable to fill it was a failure or the ordinary
 * state of somebody three weeks into Estonian. It is the ordinary state, and
 * nothing on the screen said so.
 *
 * That silence is not neutral. A blank box with a button under it reads as a
 * test, a test read as a test is a thing you can fail, and the thing people do
 * with a test they expect to fail is not take it. What the app actually wants
 * is the opposite: attempting retrieval and missing is worth more than not
 * attempting it, which is the finding this app already cites on the first
 * meeting screen (Karpicke and Roediger, about 80 percent recalled a week later
 * against 35 for learners who only restudied, and the whole difference was
 * whether retrieval happened at all). So the app says it.
 *
 * ONCE, AND ONLY WHERE IT IS TRUE. A line under every box for ever is the fault
 * CLAUDE.md records about "Any underlined word opens its meaning": advice
 * nobody asked for, printed again on every card for the rest of the course,
 * until it stops being read and takes the screen's other sentences with it.
 * This is offered on a learner's *first* production of a word and on no other
 * ask, so a word carries it once in its life and a screen carries it only while
 * something on it is genuinely new.
 *
 * THE SAME LINE AT EVERY LEVEL, which is a decision rather than an omission.
 * The request that prompted it named A1, and A1 is where nearly every ask is a
 * first production, so that is where it will nearly always be seen. It is not
 * gated on the band, because a B1 learner meeting a word for the first time is
 * standing in exactly the same place, and a reassurance withdrawn once somebody
 * is judged good enough not to need it is a reassurance that was never about
 * them.
 *
 * Pure: no React, no Prisma, no Estonian.
 */

/**
 * Whether this is the first time the learner has been asked to produce a word.
 *
 * `produced` is how many times the round can say they have written this one
 * before. It is a count rather than a flag because every caller has one to
 * hand and none of them has a flag: the Learn ladder knows which rung the word
 * is on, the review session knows the card's own `reps`.
 *
 * `typed` is the other half and is required, so a caller that has not thought
 * about it does not compile. Picking a meaning out of four is not producing a
 * word, and a line about how hard producing one is, printed over four options,
 * is the app being encouraging about the wrong thing.
 */
export function isFirstProduction({ produced, typed }: { produced: number; typed: boolean }): boolean {
  return typed && produced <= 0;
}

/**
 * The line itself.
 *
 * Under the caption ceiling `lib/copy/readerCopy.test.ts` holds every small
 * caption to, and deliberately well under it: it sits over a box somebody is
 * about to type into, and a sentence they have to finish reading before they
 * can start is a sentence in the way.
 *
 * "A miss teaches you more than a skip" is the claim above, said in the fewest
 * words that are true. It is not "you will get it wrong and that is fine",
 * which is the app expecting them to fail, and it is not praise, which is the
 * app being pleased with somebody who has not done anything yet.
 */
export const FIRST_TRY_NOTE = "It is fine not to know this one yet. Have a go: a miss teaches you more than a skip.";
