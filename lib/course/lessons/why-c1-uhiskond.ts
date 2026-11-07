/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE C1 PART `c1-uhiskond`.
 *
 * One "Why this form?" tree (`HowItWorks.why`) for the evening of the radio
 * debate, in the shape `why.ts` gives the shared one: each answer leads to the
 * next question or lands on a form in the word's table. A debate is where the
 * same spelling turns up for two reasons, {plaani} after a verb and {plaani}
 * in front of {poolt} or {vastu}, so the first question looks after the word
 * and the second at the verb. English only, with no Estonian beyond the small
 * words a learner looks for in the sentence.
 */
import type { WhyStep } from "./types";

/**
 * What a council member is for or against (lesson 33): in front of {poolt} or
 * {vastu}, or something a verb does to it.
 */
export const VOTE_STEPS: readonly WhyStep[] = [
  {
    id: "after",
    q: "What comes straight after it? Look for {poolt}, for, or {vastu}, against.",
    answers: [
      { a: "{Poolt} or {vastu}", lands: { case: "GENITIVE", plural: false } },
      { a: "Neither: a verb does something to it", next: "verb" },
    ],
  },
  {
    id: "verb",
    q: "Does the verb get a job done to the whole of it, or is it something that goes on and never gets finished, like supporting, waiting for or listening to?",
    answers: [
      { a: "It goes on, nothing gets finished", lands: { case: "PARTITIVE", plural: false } },
      { a: "The whole job gets done", lands: { case: "GENITIVE", plural: false } },
    ],
  },
];
