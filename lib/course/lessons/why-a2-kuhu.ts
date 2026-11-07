/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE A2 PART `a2-kuhu`.
 *
 * One "Why this form?" tree (`HowItWorks.why`) the place lessons walk, in the
 * shape `why.ts` gives the shared one: each answer leads to the next question
 * or lands on a form in the word's table. English only, with no Estonian
 * beyond the three question words a learner has asked since A1.
 */
import type { WhyStep } from "./types";

/**
 * A word for a place (lessons 9, 13a and 14): first whether it says where at
 * all, or is the thing itself, or only says whose place a small word after it
 * names; then which of the three questions it answers; then whether the place
 * takes the inside endings or the outside ones.
 */
export const PLACE_STEPS: readonly WhyStep[] = [
  {
    id: "role",
    q: "Does the word say where somebody is, where they're going, or where they're coming from?",
    answers: [
      { a: "Yes, it says where", next: "way" },
      { a: "No, a small word after it says where: next to, behind, in front of", lands: { case: "GENITIVE", plural: false } },
      { a: "No, it's the thing the sentence is about", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
  {
    id: "way",
    q: "Which question does it answer: {kus?} where, {kuhu?} where to, or {kust?} where from?",
    answers: [
      { a: "{kus?}, where it is", next: "set-kus" },
      { a: "{kuhu?}, where to", next: "set-kuhu" },
      { a: "{kust?}, where from", next: "set-kust" },
    ],
  },
  {
    id: "set-kus",
    q: "Is it a place you're inside, like a shop, a town or a garden, or a place you're at or on, like a market, a square or work?",
    answers: [
      { a: "Inside", lands: { case: "INESSIVE", plural: false } },
      { a: "At or on", lands: { case: "ADESSIVE", plural: false } },
    ],
  },
  {
    id: "set-kuhu",
    q: "Is it a place you're inside, like a shop, a town or a garden, or a place you're at or on, like a market, a square or work?",
    answers: [
      { a: "Inside", lands: { case: "ILLATIVE", plural: false } },
      { a: "At or on", lands: { case: "ALLATIVE", plural: false } },
    ],
  },
  {
    id: "set-kust",
    q: "Is it a place you're inside, like a shop, a town or a garden, or a place you're at or on, like a market, a square or work?",
    answers: [
      { a: "Inside", lands: { case: "ELATIVE", plural: false } },
      { a: "At or on", lands: { case: "ABLATIVE", plural: false } },
    ],
  },
];
