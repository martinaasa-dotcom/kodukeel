/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE B1 PART `b1-kodu`.
 *
 * Two "Why this form?" trees (`HowItWorks.why`) the renting lessons walk, in
 * the shape `why.ts` gives the shared one: each answer leads to the next
 * question or lands on a form in the word's table. English only, with no
 * Estonian beyond the small words a learner looks for in the sentence.
 */
import type { WhyStep } from "./types";

/**
 * A describing word in front of a noun (lesson 23): on its own after "is" it
 * keeps its plain form; in front of a noun it takes the noun's case, except
 * with -ga, -na, -ni and -ta, where it stays on its stem.
 */
export const DESCRIBING_WORD_STEPS: readonly WhyStep[] = [
  {
    id: "alone",
    q: "Is the describing word on its own after \"is\", or in front of a noun?",
    answers: [
      { a: "On its own, after \"is\"", lands: { case: "NOMINATIVE", plural: false } },
      { a: "In front of a noun", next: "ending" },
    ],
  },
  {
    id: "ending",
    q: "What ending does the noun after it have?",
    answers: [
      { a: "None, it's in its plain form", lands: { case: "NOMINATIVE", plural: false } },
      { a: "-s, for being in something", lands: { case: "INESSIVE", plural: false } },
      { a: "-ga, -na, -ni or -ta", lands: { case: "GENITIVE", plural: false } },
    ],
  },
];

/**
 * One thing a verb does something to (lesson 25): a no first, then whether
 * anybody is named as doing it, then whether the whole job gets done.
 */
export const ONE_OBJECT_STEPS: readonly WhyStep[] = [
  {
    id: "no",
    q: "Is it a no? Look for {ei} or {pole}.",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "who" },
    ],
  },
  {
    id: "who",
    q: "Is it a command, or a job that has to be done with {tuleb}, so nobody is named as the one doing it?",
    answers: [
      { a: "Yes, a command or a must", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No, the sentence says who does it", next: "done" },
    ],
  },
  {
    id: "done",
    q: "Does the job get done to the whole thing, now or later?",
    answers: [
      { a: "Yes, all of it, done", lands: { case: "GENITIVE", plural: false } },
      { a: "No, still going, or only some of it", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
