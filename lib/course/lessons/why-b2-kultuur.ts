/**
 * THE QUESTIONS THAT DECIDE ONE THING'S ENDING, FOR THE B2 PART `b2-kultuur`.
 *
 * The "Why this form?" tree (`HowItWorks.why`) the history lesson walks, in the
 * shape `why.ts` gives the shared one: each answer leads to the next question
 * or lands on a form in the word's table. History on the radio is full of
 * things that were done with nobody named (`taastati`, was restored), and a
 * whole thing done with nobody named keeps its plain form, the way it does
 * after a command. So after a no, the question is who the sentence names.
 * English only, with no Estonian of its own.
 */
import type { WhyStep } from "./types";

/** One thing in a sentence (lesson 40): the subject, a no, then who is named, then done or not. */
export const NAMED_OR_NOT_STEPS: readonly WhyStep[] = [
  {
    id: "role",
    q: "Is it what the sentence is about, the thing that is somewhere or is some way? Or is something being done to it?",
    answers: [
      { a: "It's the subject, what the sentence is about", lands: { case: "NOMINATIVE", plural: false } },
      { a: "Something is being done to it", next: "no" },
    ],
  },
  {
    id: "no",
    q: "Is it a no: didn't, can't, won't?",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "named" },
    ],
  },
  {
    id: "named",
    q: "Does the sentence name who did it? Or is nobody named, as in a command or with a verb ending in -ti or -takse?",
    answers: [
      { a: "Yes, it says who did it", next: "done" },
      { a: "Nobody is named", next: "done-nobody" },
    ],
  },
  {
    id: "done",
    q: "Was the job done to the whole thing?",
    answers: [
      { a: "Yes, the whole thing, done", lands: { case: "GENITIVE", plural: false } },
      { a: "No, it's still going on, or only some of it", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
  {
    id: "done-nobody",
    q: "Was the job done to the whole thing?",
    answers: [
      { a: "Yes, the whole thing, done", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No, it's still going on, or only some of it", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
