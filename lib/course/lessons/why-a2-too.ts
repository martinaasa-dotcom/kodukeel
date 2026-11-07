/**
 * THE QUESTIONS THAT DECIDE AN ENDING, FOR THE A2 PART `a2-too`.
 *
 * Two "Why this form?" trees (`HowItWorks.why`) the work and home lessons
 * walk, in the shape of the shared one in `why.ts`: each answer leads to the
 * next question or lands on a form in the word's table. English only, with no
 * Estonian beyond the small words a learner looks for in the sentence.
 */
import type { WhyStep } from "./types";

/**
 * What something is for, or what it turns into (lesson 43): -ks. A word that
 * is only named, with nothing meant for it, keeps its plain form.
 */
export const FOR_OR_BECOMING_STEPS: readonly WhyStep[] = [
  {
    id: "for",
    q: "Is something meant for it, or due by it? A present for a birthday, a job done by tomorrow.",
    answers: [
      { a: "Yes, it's for it, or by it", lands: { case: "TRANSLATIVE", plural: false } },
      { a: "No", next: "becoming" },
    ],
  },
  {
    id: "becoming",
    q: "Is somebody or something turning into it, becoming it?",
    answers: [
      { a: "Yes, it's becoming it", lands: { case: "TRANSLATIVE", plural: false } },
      { a: "No, the sentence only names it", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];

/**
 * Having something, or not having it (lesson 45a): {mul on} keeps the plain
 * form, and a no takes the {osastav}.
 */
export const HAVE_STEPS: readonly WhyStep[] = [
  {
    id: "have",
    q: "Is it a no? Look for {pole} or {ei ole}.",
    answers: [
      { a: "Yes, a no: they don't have it", lands: { case: "PARTITIVE", plural: false } },
      { a: "No, it's a yes: they have it", lands: { case: "NOMINATIVE", plural: false } },
    ],
  },
];
