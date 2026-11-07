/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE B2 PART `b2-riik`.
 *
 * Two "Why this form?" trees (`HowItWorks.why`) for the evenings of paper and
 * the state, in the shape `why.ts` gives the shared one: each answer leads to
 * the next question or lands on a form in the word's table. Both end in the
 * same questions about an object, which is where an office's sentences differ
 * from a friend's: an office names nobody, and then a whole thing done keeps
 * its plain form. English only, with no Estonian beyond the small words a
 * learner looks for in the sentence.
 */
import type { WhyStep } from "./types";

/**
 * Something a verb does something to: a no first, then whether anybody is
 * named as doing it, then whether the whole of it gets done.
 */
const OBJECT_STEPS: readonly WhyStep[] = [
  {
    id: "no",
    q: "Is the verb that does something to it a no? Look for {ei} or {pole} in front of that verb.",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "nobody" },
    ],
  },
  {
    id: "nobody",
    q: "Is nobody named as the one doing it? Look for a verb ending in -takse or -ti, or a request with {Palun} and a -da verb.",
    answers: [
      { a: "Nobody is named", next: "done-nobody" },
      { a: "Somebody is named", next: "done" },
    ],
  },
  {
    id: "done-nobody",
    q: "Does the job get done to the whole thing, now or later?",
    answers: [
      { a: "Yes, all of it, done", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No, still going, or only some of it", lands: { case: "PARTITIVE", plural: false } },
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

/**
 * A word an office writes about (lessons 31 and 32): in front of a -mine word,
 * what happens to it, an amount of it, or something a verb does to it.
 */
export const OFFICE_NOUN_STEPS: readonly WhyStep[] = [
  {
    id: "role",
    q: "What is the word doing in the sentence?",
    answers: [
      { a: "A word ending in -mine comes straight after it, naming what is done to it", lands: { case: "GENITIVE", plural: false } },
      { a: "It's what the question is about: what happens to it, after {mis saab}", lands: { case: "ELATIVE", plural: false } },
      { a: "A verb does something to it: pays it, gets it", next: "amount" },
    ],
  },
  {
    id: "amount",
    q: "Is there an amount word in front of it, like {palju} or {liiga palju}?",
    answers: [
      { a: "Yes, an amount word", lands: { case: "PARTITIVE", plural: false } },
      { a: "No amount word", next: "no" },
    ],
  },
  ...OBJECT_STEPS,
];

/**
 * A paper an office sends (lessons 35 and 36): after {seoses}, what is written
 * in it, or something a verb does to it.
 */
export const PAPER_STEPS: readonly WhyStep[] = [
  {
    id: "seoses",
    q: "Does {seoses}, in connection with, come right before it?",
    answers: [
      { a: "Yes, {seoses}", lands: { case: "COMITATIVE", plural: false } },
      { a: "No, not {seoses}", next: "in" },
    ],
  },
  {
    id: "in",
    q: "Is it the place where something is: what the paper says, or what is wrong in it?",
    answers: [
      { a: "Yes, something is in it", lands: { case: "INESSIVE", plural: false } },
      { a: "No, something is done to it", next: "no" },
    ],
  },
  ...OBJECT_STEPS,
];
