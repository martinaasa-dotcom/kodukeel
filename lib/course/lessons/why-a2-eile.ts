/**
 * THE QUESTIONS THAT DECIDE THE OBJECT'S CASE, THE FIRST TIME A2 MEETS THEM.
 *
 * `a2-eile` lesson 18 is where a learner first hears that the thing a verb
 * does something to changes its ending to say how much of it is meant. B1's
 * part on the object (`why-objekt.ts`) takes that further, with plurals,
 * commands and verbs that never finish; this is the first version of the
 * same walk, singular only, in the order the questions decide: a no wins
 * over everything, then a number from two up, then stuff you can't count,
 * and only then whether the job got done with the whole thing. English only,
 * with no Estonian of its own beyond {üks}, which A1 teaches.
 */
import type { WhyStep } from "./types";

export const A2_OBJECT_STEPS: readonly WhyStep[] = [
  {
    id: "no",
    q: "Is it a no: not, didn't, don't, there isn't?",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "number" },
    ],
  },
  {
    id: "number",
    q: "Is there a number in front of it?",
    answers: [
      { a: "Yes, two or more", lands: { case: "PARTITIVE", plural: false } },
      { a: "Only {üks}, one", next: "count" },
      { a: "No number", next: "count" },
    ],
  },
  {
    id: "count",
    q: "Is it a thing you can count, like a book, or stuff you can't, like milk or coffee?",
    answers: [
      { a: "Stuff you can't count", lands: { case: "PARTITIVE", plural: false } },
      { a: "A thing you can count", next: "done" },
    ],
  },
  {
    id: "done",
    q: "Is the job done with the whole thing: bought, eaten up, read to the end?",
    answers: [
      { a: "Yes, done with all of it", lands: { case: "GENITIVE", plural: false } },
      { a: "No, still going on", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
