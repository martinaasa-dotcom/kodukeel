/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR B1'S WORK AND MONEY PART.
 *
 * Two "Why this form?" trees the part's lessons walk (`HowItWorks.why`), in the
 * shape of the shared ones in `why.ts`: every answer leads to the next question
 * or lands on a form, and the questions are ones a learner can answer from the
 * sentence. English only, with the Estonian they name in braces taught by the
 * lesson that asks them.
 */
import type { WhyStep } from "./types";
import { PLURAL_OBJECT_STEPS } from "./why";

/**
 * A job or a role (lesson 16): said with {olema} it's the plain form, moving
 * into it is -ks, and having it, working or starting as it, is -na.
 */
export const ROLE_STEPS: readonly WhyStep[] = [
  {
    id: "is",
    q: "Is it joined to the person with is or am, like he is a developer?",
    answers: [
      { a: "Yes, with is or am", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No", next: "change" },
    ],
  },
  {
    id: "change",
    q: "Is somebody moving into it: becoming it, wanting to become it, or being chosen for it?",
    answers: [
      { a: "Yes, they're becoming it", lands: { case: "TRANSLATIVE", plural: false } },
      { a: "No, it's a role they have: working as it, or starting as it", lands: { case: "ESSIVE", plural: false } },
    ],
  },
];

/**
 * Before and after (lesson 18): {enne} and {pärast} in front take the
 * {osastav}; a word that names what something is takes the plain form; and a
 * thing somebody does something to walks the object questions.
 */
export const BEFORE_AFTER_STEPS: readonly WhyStep[] = [
  {
    id: "before-after",
    q: "Is {enne} or {pärast}, before or after, right in front of it?",
    answers: [
      { a: "Yes, before or after", next: "after-many" },
      { a: "No", next: "named" },
    ],
  },
  {
    id: "after-many",
    q: "One, or more than one?",
    answers: [
      { a: "One", lands: { case: "PARTITIVE", plural: false } },
      { a: "More than one", lands: { case: "PARTITIVE", plural: true } },
    ],
  },
  {
    id: "named",
    q: "Does the sentence only name it: say what something is, or ask which one it is?",
    answers: [
      { a: "Yes, it only names it", next: "named-many" },
      { a: "No, somebody does something to it", next: "number" },
    ],
  },
  {
    id: "named-many",
    q: "One, or more than one?",
    answers: [
      { a: "One", lands: { case: "NOMINATIVE", plural: false } },
      { a: "More than one", lands: { case: "NOMINATIVE", plural: true } },
    ],
  },
  ...PLURAL_OBJECT_STEPS,
];
