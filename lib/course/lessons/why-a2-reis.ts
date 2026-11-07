/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR A2'S TRAVEL PART.
 *
 * Three "Why this form?" trees the part's lessons walk (`HowItWorks.why`), in
 * the shape of the shared ones in `why.ts`: every answer leads to the next
 * question or lands on a form, and the questions are ones a learner can answer
 * from the sentence. English only, with no Estonian of their own.
 */
import type { WhyStep } from "./types";

/**
 * A day of the week (lesson 29): the end of a stretch takes -ni, the start
 * takes -st, the day something happens on takes -l, and a day the sentence
 * only names stays as it is.
 */
export const DAY_STEPS: readonly WhyStep[] = [
  {
    id: "end",
    q: "Does it say when something stops: until then?",
    answers: [
      { a: "Yes, until then", lands: { case: "TERMINATIVE", plural: false } },
      { a: "No", next: "start" },
    ],
  },
  {
    id: "start",
    q: "Does it say when something starts: from then?",
    answers: [
      { a: "Yes, from then", lands: { case: "ELATIVE", plural: false } },
      { a: "No", next: "on" },
    ],
  },
  {
    id: "on",
    q: "Is it the day something happens on?",
    answers: [
      { a: "Yes, it happens on that day", lands: { case: "ADESSIVE", plural: false } },
      { a: "No, the sentence only names the day", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/**
 * A place you can be inside (lesson 30): being in it takes -s, going into it
 * takes -sse, and a place the sentence is about stays as it is.
 */
export const INSIDE_STEPS: readonly WhyStep[] = [
  {
    id: "in",
    q: "Is it the place where something is, inside it?",
    answers: [
      { a: "Yes, something is in it", lands: { case: "INESSIVE", plural: false } },
      { a: "No", next: "into" },
    ],
  },
  {
    id: "into",
    q: "Is somebody going into it?",
    answers: [
      { a: "Yes, into it", lands: { case: "ILLATIVE", plural: false } },
      { a: "No, the sentence is about the place itself", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/**
 * Is there one at all (lesson 34): asking whether there is any, or saying
 * there is none, puts the thing in the osastav; a particular one the sentence
 * is about stays as it is.
 */
export const ANY_AT_ALL_STEPS: readonly WhyStep[] = [
  {
    id: "any",
    q: "Does the sentence ask whether there is one at all, or say there isn't?",
    answers: [
      { a: "Yes, is there any, or there's none", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a particular one, and the sentence is about it", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];
