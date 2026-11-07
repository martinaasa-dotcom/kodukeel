/**
 * TODAY'S PATTERN, READ OFF A GO OF AGAIN, FASTER (`Faster.checks`).
 *
 * Each check is lit by a spelling standing in what was said as whole words,
 * the Estonian way lower-cased, which is how a retell point is lit
 * (`pointsHeard`, `standsIn`), with one addition: a word of a spelling may
 * carry a star at one end, so `*nud` stands for any longer word ending in
 * `nud` and `ei *nud` for `ei` followed by one. That is an ending rather than
 * a form, so nothing here writes Estonian (ADR-005), and a whole spelling is
 * exactly `standsIn`'s comparison. `atLeast` counts the places a check is
 * met, one per word position whichever of its spellings met it there.
 *
 * What a miss names (`near`) is read off the transcript too: the words of the
 * transcript a `near` spelling stood on, as they were written, so a cross can
 * say "we heard leib" and never a word the learner did not produce.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { estonianIn, spansOf, spellingWords, standsIn, wordsOf } from "./ledger";
import type { FasterCheck, LessonSpec } from "./types";

/** The whole words of a spelling, the part the ledger holds: `ei *nud` is `ei`. */
export function wholeWordsOf(spelling: string): string {
  return spellingWords(spelling).filter((w) => !w.includes("*") && w !== "...").join(" ");
}

export interface CheckReading {
  readonly met: boolean;
  /** How many places it was met. */
  readonly found: number;
  /** The transcript's own words a near-miss spelling stood on, as written. */
  readonly heard: readonly string[];
}

export function readCheck(check: FasterCheck, said: string): CheckReading {
  const words = wordsOf(said);
  const places = new Set(check.any.flatMap((spelling) => spansOf(words, spelling).map(([at]) => at)));
  const found = places.size;
  const met = found >= (check.atLeast ?? 1);
  const heard: string[] = [];
  if (!met) {
    for (const spelling of check.near ?? []) {
      for (const [at, end] of spansOf(words, spelling)) {
        const span = words.slice(at, end).map((w) => w.raw).join(" ");
        if (!heard.some((h) => h.toLocaleLowerCase("et") === span.toLocaleLowerCase("et"))) heard.push(span);
      }
    }
  }
  return { met, found, heard: heard.slice(0, 3) };
}

export function readChecks(checks: readonly FasterCheck[], said: string): CheckReading[] {
  return checks.map((check) => readCheck(check, said));
}

/** How many checks a race carries: enough to say the pattern, few enough to read between goes. */
export const FASTER_CHECKS = { least: 2, most: 3 } as const;

/**
 * What is wrong with a lesson's checks, as sentences: two or three of them,
 * each lit by something, the model answer passing every one (a check the
 * lesson's own answer fails is a check nobody can pass), and every whole
 * spelling one the lesson itself shows, in what it teaches, its conversation,
 * its rule or the model, so a check never names a word the evening did not.
 */
export function fasterCheckProblems(lesson: LessonSpec): string[] {
  const faster = lesson.faster;
  if (!faster) return [];
  const problems: string[] = [];
  const checks = faster.checks;
  if (checks.length < FASTER_CHECKS.least || checks.length > FASTER_CHECKS.most) {
    problems.push(`again-faster has ${checks.length} checks, where it has ${FASTER_CHECKS.least} to ${FASTER_CHECKS.most}`);
  }
  const shown = lessonShows(lesson);
  checks.forEach((check, i) => {
    const at = `again-faster check ${i + 1}`;
    if (!check.en.trim()) problems.push(`${at} says nothing`);
    if (check.any.length === 0) problems.push(`${at} lights on nothing`);
    if (check.atLeast !== undefined && (!Number.isInteger(check.atLeast) || check.atLeast < 1)) problems.push(`${at} asks for ${check.atLeast}`);
    if (!readCheck(check, faster.model.et).met) problems.push(`${at} ("${check.en}") is not met by the model answer`);
    for (const spelling of [...check.any, ...(check.near ?? [])]) {
      const whole = wholeWordsOf(spelling);
      if (!whole && !spelling.includes("*")) problems.push(`${at}: "${spelling}" is no spelling`);
      if (whole && !shown.some((text) => standsIn(text, whole))) problems.push(`${at}: "${whole}" is in nothing the lesson shows`);
    }
  });
  return problems;
}

/** The Estonian a lesson shows that a check may name: what it teaches, its conversation, its rule and the race's own model. */
function lessonShows(lesson: LessonSpec): string[] {
  const how = lesson.how;
  return [
    ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.et, t.first] : [t.et])),
    ...lesson.conversation.flatMap((line) => (line.et ? [line.et] : [])),
    ...[how.point, how.watchOut, ...(how.notes ?? [])].flatMap((text) => estonianIn(text ?? "")),
    ...(how.table?.rows ?? []).flatMap((row) => row.flatMap((cell) => ("et" in cell ? [cell.et] : []))),
    lesson.faster?.ask.et ?? "",
    lesson.faster?.model.et ?? "",
  ];
}
