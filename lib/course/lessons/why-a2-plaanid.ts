/**
 * THE QUESTIONS THAT DECIDE A PLACE WORD'S ENDING, FOR THE A2 PART `a2-plaanid`.
 *
 * The "Why this form?" tree (`HowItWorks.why`) the day in the forest walks, in
 * the shape `why.ts` gives the shared one: each answer leads to the next
 * question or lands on a form in the word's table. A place word is either what
 * the sentence is about, or the place somebody goes into, is in, or comes out
 * of. English only, with no Estonian of its own.
 */
import type { WhyStep } from "./types";

/** A place in a sentence (lesson 52): the subject, or into, in or out of it. */
export const PLACE_STEPS: readonly WhyStep[] = [
  {
    id: "role",
    q: "Is the place what the sentence is about, the thing that is somewhere? Or does the sentence say where somebody goes, or where somebody is?",
    answers: [
      { a: "It's what the sentence is about", lands: { case: "NOMINATIVE", plural: false } },
      { a: "It says where somebody goes or is", next: "where" },
    ],
  },
  {
    id: "where",
    q: "Is somebody going into it, already in it, or coming out of it?",
    answers: [
      { a: "Going into it", lands: { case: "ILLATIVE", plural: false } },
      { a: "Already in it", lands: { case: "INESSIVE", plural: false } },
      { a: "Coming out of it", lands: { case: "ELATIVE", plural: false } },
    ],
  },
];
