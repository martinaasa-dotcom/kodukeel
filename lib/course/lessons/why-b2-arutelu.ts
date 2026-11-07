/**
 * THE QUESTIONS THAT DECIDE THE ENDING OF A WORD BESIDE A FIGURE, FOR B2'S PART ON MAKING A CASE.
 *
 * `b2-arutelu` lesson 43 reads the news in figures, and the word beside a
 * figure takes one of three endings: the whole a share is taken out of
 * ({pool inimestest}), the word after an amount ({kümme protsenti},
 * {rohkem inimesi}), or the plain form where no amount is said at all. The
 * order is the order they decide in: a share first, then an amount and what
 * kind of amount, then one or more than one. English only, with no Estonian
 * of its own.
 */
import type { WhyStep } from "./types";

export const SHARE_STEPS: readonly WhyStep[] = [
  {
    id: "share",
    q: "Is it the whole that a share or a figure is taken out of: ten percent of them, half of them?",
    answers: [
      { a: "Yes, the whole a share comes out of", next: "share-many" },
      { a: "No, not a share", next: "amount" },
    ],
  },
  {
    id: "share-many",
    q: "One whole, like a town, or a group of many, like people?",
    answers: [
      { a: "One whole", lands: { case: "ELATIVE", plural: false } },
      { a: "A group of many", lands: { case: "ELATIVE", plural: true } },
    ],
  },
  {
    id: "amount",
    q: "Is there an amount in front of it: a number, or a word like more, fewer or a lot?",
    answers: [
      { a: "A number, like ten", lands: { case: "PARTITIVE", plural: false } },
      { a: "A word like more, fewer or a lot", next: "count" },
      { a: "No amount at all", next: "plain-many" },
    ],
  },
  {
    id: "count",
    q: "Things you can count, like people, or stuff you can't, like money or time?",
    answers: [
      { a: "Things you can count", lands: { case: "PARTITIVE", plural: true } },
      { a: "Stuff you can't count", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
  {
    id: "plain-many",
    q: "One, or more than one?",
    answers: [
      { a: "One", lands: { case: "NOMINATIVE", plural: false } },
      { a: "More than one", lands: { case: "NOMINATIVE", plural: true } },
    ],
  },
];
