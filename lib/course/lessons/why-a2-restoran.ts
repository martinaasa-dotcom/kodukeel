/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE A2 PART `a2-restoran`.
 *
 * One "Why this form?" tree (`HowItWorks.why`) for the evenings of ordering
 * and shopping, in the shape `why.ts` gives the shared one: each answer leads
 * to the next question or lands on a form in the word's table. English only,
 * with no Estonian beyond the small words a learner looks for in the sentence.
 */
import type { WhyStep } from "./types";

/**
 * A thing in a restaurant or a shop (lessons 36 and 40): what the sentence is
 * about keeps its plain form; what somebody does something to takes the
 * osastav after a no, for food or drink ordered and for trying, and the
 * omastav for one whole thing taken.
 */
export const SHOP_THING_STEPS: readonly WhyStep[] = [
  {
    id: "role",
    q: "Is it what the sentence is about, the thing that is something, like \"the fish is good\"? Or is it what somebody does something to: orders, tries on or takes?",
    answers: [
      { a: "What the sentence is about", lands: { case: "NOMINATIVE", plural: false } },
      { a: "What somebody does something to", next: "no" },
    ],
  },
  {
    id: "no",
    q: "Is it a no? Look for {ei} or {pole}.",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "whole" },
    ],
  },
  {
    id: "whole",
    q: "Is it one whole, particular thing that somebody takes, like this jacket? Or is it food or drink you order, or something you only try?",
    answers: [
      { a: "One whole thing, taken", lands: { case: "GENITIVE", plural: false } },
      { a: "Food or drink, or only trying", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
