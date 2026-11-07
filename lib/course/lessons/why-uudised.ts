/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE PART ABOUT WHAT WAS DONE.
 *
 * `b1-uudised` is the [umbisikuline] (-takse, people do), and it changes one
 * thing about the object rule `PLURAL_OBJECT_STEPS` (why.ts) walks: where
 * nobody is named as the one doing it, a whole thing with the job done takes
 * the [nimetav] (1st form) rather than the [omastav] (2nd form). So these
 * trees ask that out loud. English only, with no Estonian of their own, like
 * every tree; one word, one number, since the words they walk are said in the
 * singular in the conversations.
 */
import type { WhyStep } from "./types";

/**
 * Where one thing lands in a sentence that may name nobody: an amount first
 * (water up to the knees is some water, whatever the verb), then whether it is
 * the one doing the verb, then a no, then whether the job got done, and last
 * whether anybody is named as the one doing it.
 */
export const NOBODY_NAMED_STEPS: readonly WhyStep[] = [
  {
    id: "amount",
    q: "Does the sentence give an amount of it, some of it or how much, rather than the thing as a whole?",
    answers: [
      { a: "Yes, an amount of it", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, the thing as a whole", next: "doer" },
    ],
  },
  {
    id: "doer",
    q: "Is it the one doing the verb, or is something done to it?",
    answers: [
      { a: "It's the one doing the verb", lands: { case: "NOMINATIVE", plural: false } },
      { a: "Something is done to it", next: "no" },
    ],
  },
  {
    id: "no",
    q: "Is the sentence a no, with {ei}?",
    answers: [
      { a: "Yes, a no", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes", next: "done" },
    ],
  },
  {
    id: "done",
    q: "Does the job get done to the whole thing, or is it only some of it, or still going?",
    answers: [
      { a: "Only some, or still going", lands: { case: "PARTITIVE", plural: false } },
      { a: "Done, to the whole thing", next: "named" },
    ],
  },
  {
    id: "named",
    q: "Does the sentence name somebody as the one doing it?",
    answers: [
      { a: "Yes, somebody is named", lands: { case: "GENITIVE", plural: false } },
      { a: "No, nobody is named", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/** Where a paper or a radio is in a sentence: something in it, or something out of it, or into it. */
export const IN_OR_OUT_STEPS: readonly WhyStep[] = [
  {
    id: "where",
    q: "Is something in it, coming out of it, or going into it?",
    answers: [
      { a: "Something is in it", lands: { case: "INESSIVE", plural: false } },
      { a: "Something comes out of it, like what you read or learn there", lands: { case: "ELATIVE", plural: false } },
      { a: "Something goes into it", lands: { case: "ILLATIVE", plural: false } },
    ],
  },
];
