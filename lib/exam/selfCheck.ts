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
    "Every point the task listed has a sentence of its own.",
    "It is clear who it is for, and it opens and closes the way a note to that person would.",
    "Each sentence has a verb, in the person that matches its subject.",
    "The words you were given are in the form their sentence needs, not the dictionary form.",
  ],
  compose: [
    "It answers the brief you chose, and a stranger could say what it is about in one line.",
    "It has a beginning, a middle and an end, joined by linking words rather than a list of short sentences.",
    "Each sentence has a verb, in the person that matches its subject.",
    "Things that already happened are in a past tense, and the tense does not wander.",
    "The words you were given are in the form their sentence needs, not the dictionary form.",
  ],
};

export function isWrittenKind(kind: TaskKind | undefined): kind is WrittenKind {
  return kind === "message" || kind === "compose";
}
