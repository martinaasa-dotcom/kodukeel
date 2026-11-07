/**
 * THE QUESTIONS THAT DECIDE ONE THING'S ENDING, FOR B1'S LAST PART.
 *
 * The forms, documents and cards of `b1-asjaajamine` are one thing at a time,
 * and they turn up in every role a sentence has: the thing the sentence is
 * about, the thing a command is about, the thing a job got done to, and the
 * thing a no is about. These questions sort them in an order a learner can
 * answer from the sentence alone: a number first, because it decides the
 * ending whatever comes after, then what the word is doing in the sentence (with
 * "there isn't one" asked of the thing a sentence is about, since that takes the
 * osastav too), then a no, then a command, then whether the job is done. English only, with
 * no Estonian of their own, the same rule `why.ts` keeps for the shared trees.
 */
import type { WhyStep } from "./types";

export const ONE_THING_STEPS: readonly WhyStep[] = [
  {
    id: "number",
    q: "Is there a number in front of it, like two, three or ten?",
    answers: [
      { a: "Yes, a number", lands: { case: "PARTITIVE", plural: false } },
      { a: "No", next: "role" },
    ],
  },
  {
    id: "role",
    q: "Is it what the sentence is about, the thing that is somewhere or is some way? Or is somebody doing something to it?",
    answers: [
      { a: "It's what the sentence is about", next: "none" },
      { a: "Somebody is doing something to it", next: "no" },
    ],
  },
  {
    id: "none",
    q: "Does the sentence say there isn't one, or it isn't there?",
    answers: [
      { a: "Yes, there isn't one", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's there", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
  {
    id: "no",
    q: "Is it a no: didn't, can't, won't?",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "command" },
    ],
  },
  {
    id: "command",
    q: "Is somebody being told or asked to do it, with or without a please?",
    answers: [
      { a: "Yes, it's a command", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No, it says what happens or happened", next: "done" },
    ],
  },
  {
    id: "done",
    q: "Is the job done to the whole thing, or will it be?",
    answers: [
      { a: "Yes, the whole thing, done", lands: { case: "GENITIVE", plural: false } },
      { a: "No, it's still going on", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
];
