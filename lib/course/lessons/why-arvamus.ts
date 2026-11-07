/**
 * THE QUESTIONS THAT DECIDE A JOINING WORD'S ENDING (B1 part `b1-arvamus`).
 *
 * {Kes} joining a second sentence to a person takes the ending that second
 * sentence would give the person, never the ending of the word it points
 * back to. So the questions are all about the part after the comma: is the
 * person the one doing it there, or somebody it is done with, or the one it
 * is done to. English only, with no Estonian of their own, like the shared
 * trees in `why.ts`.
 */
import type { WhyStep } from "./types";

export const RELATIVE_PERSON_STEPS: readonly WhyStep[] = [
  {
    id: "doer",
    q: "Look at the part after the comma. Is the person the one doing it there: standing, eating, writing?",
    answers: [
      { a: "Yes, they do it", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No, somebody else does it", next: "with" },
    ],
  },
  {
    id: "with",
    q: "So what is the person to whoever does it?",
    answers: [
      { a: "Somebody they do it with: talk with, go with", lands: { case: "COMITATIVE", plural: false } },
      { a: "The one they know or see", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
