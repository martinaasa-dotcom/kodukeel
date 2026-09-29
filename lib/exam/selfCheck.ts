/**
 * What to read your own text back against, for the two written tasks.
 *
 * The marks on those two come from length and from the words the task named,
 * because those are all a machine can settle without judging Estonian, and
 * the result page says so. That leaves the candidate holding a ceiling rather
 * than a mark, and the useful thing to hand them next is the questions an
 * examiner's marking would turn on, asked of the text they just wrote. These
 * are questions for the learner to answer about their own writing: nothing
 * here marks anything, stores anything, or claims to be the Board's rubric.
 * For the Board's own view the result links the scripts it published with the
 * examiners' comments (`writtenSampleFor` in `lib/exam/official.ts`).
 *
 * English only, and no Estonian at all, for the reason `lib/estonian/grammar.ts`
 * holds none: a checklist that named a form would be this app writing one.
 */
import type { TaskKind } from "./spec";

export type WrittenKind = Extract<TaskKind, "message" | "compose">;

export const SELF_CHECK: Record<WrittenKind, readonly string[]> = {
  message: [
    "Every point in the task has its own sentence.",
    "It's clear who it's for, and it starts and ends the way a note to that person would.",
    "Every sentence has a verb, and the verb matches who is doing it.",
    "The words you were given are in the form the sentence needs, not the dictionary form.",
  ],
  compose: [
    "It does what the brief asked, and a stranger could sum it up in one line.",
    "It has a beginning, a middle and an end, joined up with linking words, not just a string of short sentences.",
    "Every sentence has a verb, and the verb matches who is doing it.",
    "Things that already happened are in a past tense, and the tense stays put.",
    "The words you were given are in the form the sentence needs, not the dictionary form.",
  ],
};

export function isWrittenKind(kind: TaskKind | undefined): kind is WrittenKind {
  return kind === "message" || kind === "compose";
}
