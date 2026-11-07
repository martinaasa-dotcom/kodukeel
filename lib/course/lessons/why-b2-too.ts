/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE B2 PART `b2-too`.
 *
 * A "Why this form?" tree (`HowItWorks.why`) in the shape of the shared ones
 * in `why.ts`: each answer leads to the next question or lands on a form in
 * the word's table. English only, with the Estonian it names in braces taught
 * by the lesson that asks it.
 */
import type { WhyStep } from "./types";
import { PLURAL_OBJECT_STEPS } from "./why";

/**
 * Whose, or what for (lesson 28): a noun that says whose another one is, or
 * one that {eest} follows, takes the {omastav}; the one doing something keeps
 * its plain form; anything else walks the object questions.
 */
export const BELONGS_OR_OBJECT_STEPS: readonly WhyStep[] = [
  {
    id: "belongs",
    q: "Does a word come after it that it belongs with: another noun it says whose, or {eest}, for?",
    answers: [
      { a: "Yes, it says whose, or {eest} follows it", next: "belongs-many" },
      { a: "No", next: "subject" },
    ],
  },
  {
    id: "belongs-many",
    q: "One, or more than one?",
    answers: [
      { a: "One", lands: { case: "GENITIVE", plural: false } },
      { a: "More than one", lands: { case: "GENITIVE", plural: true } },
    ],
  },
  {
    id: "subject",
    q: "Is it the one doing something, what the sentence is about?",
    answers: [
      { a: "Yes, it does something", next: "subject-many" },
      { a: "No, somebody does something to it", next: "number" },
    ],
  },
  {
    id: "subject-many",
    q: "One, or more than one?",
    answers: [
      { a: "One", lands: { case: "NOMINATIVE", plural: false } },
      { a: "More than one", lands: { case: "NOMINATIVE", plural: true } },
    ],
  },
  ...PLURAL_OBJECT_STEPS,
];
