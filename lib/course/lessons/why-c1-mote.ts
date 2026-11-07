/**
 * THE QUESTIONS THAT DECIDE THE ENDING OF A NOUN IN C1'S PART ON IDEAS AND BOOKS.
 *
 * `c1-mote` lesson 43 is about the two verbs English calls leave, and the
 * ending of {lõpp} is decided by which of them a sentence has: the ending
 * doing or being something itself, or the thing somebody acts on. Lesson 45
 * is about the verb that goes with {otsus}, and that verb decides its ending
 * the same way, with one more place a noun can stand: beside the thing it
 * comes together with. English only, with no Estonian of its own.
 */
import type { WhyStep } from "./types";

/** {Lõpp}, the ending of a book: the one being or doing, or the one acted on. */
export const ENDING_STEPS: readonly WhyStep[] = [
  {
    id: "who",
    q: "Is the ending what the sentence is about, the one that is clear, stays open or is liked? Or is it what somebody does something to, the thing an author leaves or a reader finds?",
    answers: [
      { a: "What the sentence is about", lands: { case: "NOMINATIVE", plural: false } },
      { a: "What somebody does something to", next: "whole" },
    ],
  },
  {
    id: "whole",
    q: "Is it a no, or something still going on? Or is one whole ending dealt with?",
    answers: [
      { a: "A no, or still going on", lands: { case: "PARTITIVE", plural: false } },
      { a: "One whole ending, dealt with", lands: { case: "GENITIVE", plural: false } },
    ],
  },
];

/** {Otsus}, a decision: what it comes with, a no, one decision taken, or decisions in general. */
export const DECISION_STEPS: readonly WhyStep[] = [
  {
    id: "role",
    q: "Is the decision what somebody does something to, or what something else goes together with?",
    answers: [
      { a: "What somebody does something to", next: "no" },
      { a: "What something goes together with", lands: { case: "COMITATIVE", plural: false } },
    ],
  },
  {
    id: "no",
    q: "Is the sentence a no?",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, a yes", next: "whole" },
    ],
  },
  {
    id: "whole",
    q: "Is it one particular decision, taken or picked up as a whole, even if only suggested? Or decisions in general, or an action that goes on without ever being finished with it, like explaining it?",
    answers: [
      { a: "One decision, as a whole", lands: { case: "GENITIVE", plural: false } },
      { a: "In general, or going on", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
