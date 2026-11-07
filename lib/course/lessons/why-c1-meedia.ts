/**
 * THE QUESTIONS THAT DECIDE ONE THING'S ENDING, FOR THE C1 PART `c1-meedia`.
 *
 * The "Why this form?" tree (`HowItWorks.why`) the film lesson walks, in the
 * shape `why.ts` gives the shared one: each answer leads to the next question
 * or lands on a form in the word's table. A place named in a conversation is
 * either somewhere a thing happened, or the thing somebody points at with
 * `viitama`, which asks onto what. English only, with no Estonian of its own.
 */
import type { WhyStep } from "./types";

/** A place in a sentence (lesson 10): what somebody refers to, then where something happens. */
export const REFERRED_OR_WHERE_STEPS: readonly WhyStep[] = [
  {
    id: "refer",
    q: "Is it the thing somebody is referring to, the answer to 'referring to what?'",
    answers: [
      { a: "Yes, it's what they're referring to", lands: { case: "ALLATIVE", plural: false } },
      { a: "No", next: "where" },
    ],
  },
  {
    id: "where",
    q: "Does it say where something is or happens, the answer to 'where?'",
    answers: [
      { a: "Yes, it says where", lands: { case: "INESSIVE", plural: false } },
      { a: "No, it's what the sentence is about, the subject", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];
