/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR B2'S HEALTH PART.
 *
 * Two "Why this form?" trees the part's lessons walk (`HowItWorks.why`), in
 * the shape of the shared ones in `why.ts`: every answer lands on a form, and
 * the question is one a learner can answer from the sentence. English only,
 * with the Estonian they name in braces taught by the lesson that asks them.
 */
import type { WhyStep } from "./types";

/**
 * How long (lesson 19): a number on its own takes the singular {osastav};
 * {üle}, more than, in front of it takes the {omastav}, number and all.
 */
export const HOW_LONG_STEPS: readonly WhyStep[] = [
  {
    id: "more-than",
    q: "Is {üle}, more than, in front of the number?",
    answers: [
      { a: "Yes, {üle} and then the number", lands: { case: "GENITIVE", plural: false } },
      { a: "No, only the number", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];

/**
 * Who did it (lesson 21): with a verb of its own it's the subject, in the
 * plain form; in front of a -tud word it's the doer, in the {omastav}.
 */
export const DOER_STEPS: readonly WhyStep[] = [
  {
    id: "after",
    q: "Does it have a verb of its own, or does it stand in front of a -tud word?",
    answers: [
      { a: "A verb of its own, like {kirjutas}, wrote", lands: { case: "NOMINATIVE", plural: false } },
      { a: "In front of a -tud word, like {kirjutatud} or {soovitatud}", lands: { case: "GENITIVE", plural: false } },
    ],
  },
];
