/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR A2'S FIRST PART.
 *
 * `a2-kelle` teaches the [omastav] (2nd form) and the three jobs it does in
 * its first lessons: saying whose a thing is or which one it is, standing
 * before a place word like {peal}, and standing before {pärast} when it means
 * "in". Each tree asks the one thing a learner can see in the sentence, what
 * comes next to the word, and lands on the form. A2 is where the cases are
 * first met, so every question is one plain idea, with the Estonian kept to
 * the small words the lessons teach.
 */
import type { WhyStep } from "./types";

/** Lessons 1 and 2: whose, and which one. */
export const WHOSE_STEPS: readonly WhyStep[] = [
  {
    id: "whose",
    q: "Does the word stand in front of something else, saying whose it is or which one it is?",
    answers: [
      { a: "Yes: a brother's key, the apartment key", lands: { case: "GENITIVE", plural: false } },
      { a: "No, it's the thing itself", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/** Lesson 3: where a thing is, with a place word after the noun. */
export const PLACE_STEPS: readonly WhyStep[] = [
  {
    id: "place",
    q: "Does a place word come right after it: {peal}, {all}, {sees}, {kõrval}?",
    answers: [
      { a: "Yes, a place word after it", lands: { case: "GENITIVE", plural: false } },
      { a: "No, it's the thing itself", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/** Lesson 4: before and after, where it matters which side {pärast} stands on. */
export const TIME_STEPS: readonly WhyStep[] = [
  {
    id: "side",
    q: "Where does {enne} or {pärast} stand: in front of the word, or after it?",
    answers: [
      { a: "In front of it: after work", lands: { case: "PARTITIVE", plural: false } },
      { a: "After it: in an hour", lands: { case: "GENITIVE", plural: false } },
    ],
  },
];
