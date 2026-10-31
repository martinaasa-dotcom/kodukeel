/**
 * WHICH WORDS OF A TEXT TO READ ARE UNDERLINED (B2 on, `LessonSpec.read`).
 *
 * A real text runs ahead of the course on purpose: a notice in the stairwell
 * is written for the people who live there, not for somebody in their second
 * year of Estonian. So it is read and never asked about, and the words the
 * lessons have not taught by tonight are the ones underlined, each opening its
 * dictionary entry under the line (`GlossedSentence`). A word the learner has
 * been taught is drawn plain, since underlining what they know is noise and
 * the point is to see at a glance which words are new.
 *
 * "Taught" is the ledger's own reading (`uncovered`), phrases and names
 * included, against the ledger at the end of the lesson, which is what the
 * learner holds by the time they read it. What is under an underline is the
 * dictionary's to say (`lib/dict/glossed.ts`, ADR-021): a word it will not
 * vouch for stays plain, as on every other glossed sentence.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { namesOf, uncovered, wordsOf, type Ledger } from "./ledger";
import type { LessonSpec } from "./types";

/** Per line of the lesson's text, the words the ledger does not cover, lower-cased. Empty without a text. */
export function readUntaught(lesson: LessonSpec, ledger: Ledger): ReadonlySet<string>[] {
  return untaughtPerLine(lesson, lesson.read?.lines ?? [], ledger);
}

/**
 * The same for a talk taken down as notes (C1, `LessonSpec.notes`), whose
 * transcript is shown after the questions with the new words underlined as a
 * text's are. Empty without a talk.
 */
export function notesUntaught(lesson: LessonSpec, ledger: Ledger): ReadonlySet<string>[] {
  return untaughtPerLine(lesson, lesson.notes?.lines ?? [], ledger);
}

function untaughtPerLine(lesson: LessonSpec, lines: readonly { readonly et: string }[], ledger: Ledger): ReadonlySet<string>[] {
  const names = namesOf(lesson);
  return lines.map((line) => new Set(uncovered(line.et, ledger, names).map((w) => w.toLocaleLowerCase("et"))));
}

/** How many words a text runs to: what the C1 ramp measures a text read and a talk by (`rampC1.ts`). */
export function wordCount(lines: readonly { readonly et: string }[]): number {
  return lines.reduce((n, l) => n + wordsOf(l.et).length, 0);
}

/**
 * A line's dictionary tokens with the entry kept only on an untaught word, so
 * the screen underlines exactly those. Generic over the token, so this module
 * reaches no dictionary code.
 */
export function onlyUntaught<T extends { readonly text: string; readonly word: boolean; readonly entry: unknown }>(
  tokens: readonly T[], untaught: ReadonlySet<string>,
): T[] {
  return tokens.map((t) => (t.word && t.entry !== null && !untaught.has(t.text.toLocaleLowerCase("et")) ? { ...t, entry: null } : t));
}
