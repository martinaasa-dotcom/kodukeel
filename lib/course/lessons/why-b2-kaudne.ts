/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE B2 PART ON PASSING THINGS ON.
 *
 * `b2-kaudne` is about verbs, how a thing heard, asked or requested is passed
 * on, and two of its lessons turn on a noun's case as well: the news naming
 * its source before {sõnul}, and the object of a command, which changes form
 * once the command is passed on with {et}. Each tree asks what the sentence
 * is doing with the word, the one thing that decides it.
 */
import type { WhyStep } from "./types";

/** Lesson 8: the one who said it, or the one doing something. */
export const SOURCE_STEPS: readonly WhyStep[] = [
  {
    id: "source",
    q: "Is {sõnul} or {teatel}, according to, right after it?",
    answers: [
      { a: "Yes, it's the source of what was said", lands: { case: "GENITIVE", plural: false } },
      { a: "No, it's the one doing the wanting or saying", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/** Lesson 10: a command said straight out, or one passed on with {et}. */
export const COMMAND_STEPS: readonly WhyStep[] = [
  {
    id: "command",
    q: "Is it a command said straight to somebody, or a request passed on with {et}?",
    answers: [
      { a: "A command: bring the child", lands: { case: "NOMINATIVE", plural: false } },
      { a: "Passed on with {et}: she asked us to bring the child", lands: { case: "GENITIVE", plural: false } },
    ],
  },
];
