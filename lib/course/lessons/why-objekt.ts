/**
 * THE QUESTIONS THAT DECIDE THE OBJECT'S CASE, FOR B1'S FIRST PART.
 *
 * `PLURAL_OBJECT_STEPS` (`why.ts`) is lesson 3's tree, about some apples or
 * all of them. The rest of the part is about one thing as often as several,
 * and about the three things that settle the case before "did the job get
 * done" is even asked: a no, a verb that never finishes, and a command. The
 * order is the order they decide in: a no wins over everything (a command
 * with {ära} is a no), a verb like waiting keeps the [osastav] (3rd form)
 * even in a command, and only then does a command or a finished job choose
 * the whole thing. English only, with no Estonian of its own.
 */
import type { WhyStep } from "./types";

const NO_Q = "Is it a no: not, didn't, don't, there isn't?";
const NO_YES = "Yes, a no";
const NO_NO = "No, it's a yes";
const NEVER_Q = "Is the verb one that never finishes on its own, like waiting, looking for, loving or being scared of?";
const NEVER_YES = "Yes, it never finishes";
const NEVER_NO = "No, it can be finished";

export const OBJECT_STEPS: readonly WhyStep[] = [
  {
    id: "many",
    q: "One, or more than one?",
    answers: [
      { a: "One", next: "no-one" },
      { a: "More than one", next: "no-many" },
    ],
  },
  {
    id: "no-one",
    q: NO_Q,
    answers: [
      { a: NO_YES, lands: { case: "PARTITIVE", plural: false } },
      { a: NO_NO, next: "never-one" },
    ],
  },
  {
    id: "never-one",
    q: NEVER_Q,
    answers: [
      { a: NEVER_YES, lands: { case: "PARTITIVE", plural: false } },
      { a: NEVER_NO, next: "command-one" },
    ],
  },
  {
    id: "command-one",
    q: "Is it a command, telling somebody to do it?",
    answers: [
      { a: "Yes, a command", lands: { case: "NOMINATIVE", plural: false } },
      { a: "No, somebody says what they did or will do", next: "done-one" },
    ],
  },
  {
    id: "done-one",
    q: "Is the job done with the whole thing, or going to be?",
    answers: [
      { a: "Yes, done or going to be", lands: { case: "GENITIVE", plural: false } },
      { a: "No, still going, not finished", lands: { case: "PARTITIVE", plural: false } },
    ],
  },
  {
    id: "no-many",
    q: NO_Q,
    answers: [
      { a: NO_YES, lands: { case: "PARTITIVE", plural: true } },
      { a: NO_NO, next: "never-many" },
    ],
  },
  {
    id: "never-many",
    q: NEVER_Q,
    answers: [
      { a: NEVER_YES, lands: { case: "PARTITIVE", plural: true } },
      { a: NEVER_NO, next: "set" },
    ],
  },
  {
    id: "set",
    q: "Is it a set amount: these ones, all of them?",
    answers: [
      { a: "No, just some, an open amount", lands: { case: "PARTITIVE", plural: true } },
      { a: "Yes, a known set", next: "done-many" },
    ],
  },
  {
    id: "done-many",
    q: "Is it a command, or is the job done with all of them, or going to be?",
    answers: [
      { a: "Yes, a command, or done", lands: { case: "NOMINATIVE", plural: true } },
      { a: "No, still going, not finished", lands: { case: "PARTITIVE", plural: true } },
    ],
  },
];
