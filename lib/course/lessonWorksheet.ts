/**
 * A WORKSHEET PAGE AFTER EVERY B1 LESSON.
 *
 * B1 had the worksheet (Töövihik, `lib/games/workbook.ts`) on its rotation
 * while it was built from units: a page of recorded sentences, each with a
 * word in brackets to put in the form the sentence needs, set from the
 * learner's own words. When B1 became forty-nine lessons (docs/43-lessons.md
 * §11) every evening became one step, the lesson, and nothing in the level
 * dealt a worksheet any more. The operator asked for it back, as the grammar
 * practice that helps most.
 *
 * It comes back on the lesson's finish screen rather than as a second step of
 * the evening. A lesson evening is one step throughout the course, the native
 * API and Today included, and a worksheet on top of a lesson that already runs
 * to twenty-five or forty minutes is an offer rather than a requirement. The
 * page it opens is the ordinary one, held to what the evenings have taught so
 * far (`practiceScope`), so it asks nothing the lessons have not shown.
 *
 * WHICH PAGE. Where the lesson explains a rule the worksheet has a theme for,
 * the page leads with that theme: a case the lesson is about, the would form,
 * a tense, a command, or the osastav for the object rule, since the
 * osastav is the half of that rule a learner gets wrong. Most B1 lessons
 * explain no one rule, and there the page chooses the way it always does,
 * the learner's own weakest case first (`themeOrder`).
 *
 * Pure: no React, no Prisma, no clock.
 */

import { LEVELS, levelIndex, type Level } from "@/lib/collections/syllabus/types";
import type { CaseKey } from "@/lib/estonian/types";
import type { CourseDay } from "./types";
import type { LessonSpec } from "./lessons/types";

/** The first level whose lessons end on a worksheet. */
export const WORKSHEET_FROM: Level = "B1";

/** The worksheet's own route. */
export const WORKSHEET_HREF = "/review/workbook";

/** A case's worksheet theme, built from its key. */
const caseTheme = (key: CaseKey | string): string => `case:${key}`;

/**
 * The worksheet theme for each reference topic a lesson can explain, where
 * the worksheet has one. The spellings are `Theme`'s in `lib/games/workbook.ts`
 * and `lessonWorksheet.test.ts` holds each to `parseTheme`.
 */
export const TOPIC_THEME: Readonly<Record<string, string>> = {
  "present-tense": "present",
  imperfect: "past",
  conditional: "conditional",
  imperative: "imperative",
  object: caseTheme("PARTITIVE" satisfies CaseKey),
};

/** The theme a lesson's worksheet leads with, or null to let the page choose. */
export function worksheetTheme(day: Pick<CourseDay, "cases" | "topics">): string | null {
  const firstCase = day.cases?.[0];
  if (firstCase) return caseTheme(firstCase);
  for (const topic of day.topics ?? []) {
    const theme = TOPIC_THEME[topic];
    if (theme) return theme;
  }
  return null;
}

/** Whether a lesson at this level ends on a worksheet. */
export function offersWorksheet(level: string): boolean {
  return (LEVELS as readonly string[]).includes(level) && levelIndex(level as Level) >= levelIndex(WORKSHEET_FROM);
}

/**
 * What the finished lesson offers: a worksheet page, the theme it leads with
 * or null for the page to choose, and the lesson whose words and sentences it
 * is set from, or null for the general page.
 */
export interface LessonWorksheet {
  theme: string | null;
  lesson?: string | null;
}

/** The worksheet a lesson evening offers on its finish, or null below B1: a page of that lesson's own. */
export function worksheetFor(day: Pick<CourseDay, "level" | "cases" | "topics">, lessonId: string | null = null): LessonWorksheet | null {
  return offersWorksheet(day.level) ? { theme: worksheetTheme(day), lesson: lessonId } : null;
}

/** Where the offer goes on the website. */
export function worksheetLink(worksheet: LessonWorksheet): string {
  const params = new URLSearchParams();
  if (worksheet.lesson) params.set("lesson", worksheet.lesson);
  if (worksheet.theme) params.set("theme", worksheet.theme);
  const query = params.toString();
  return query ? `${WORKSHEET_HREF}?${query}` : WORKSHEET_HREF;
}

/*
  A PAGE OF ONE LESSON'S OWN.

  The page a finished lesson offered was the general one, held to what the
  evenings had taught so far, and a learner who had just spent an evening on
  `kööki` and `köögi` was set sentences about other words entirely: it felt
  random, and they asked for a page per lesson. So a lesson's page is set from
  that lesson: its words (what it teaches, by the word each form is of) and
  its own sentences first, the conversation, the sentences it changes and puts
  right, and the story told back, each with its English. Those are the
  lesson's Estonian, written for it and read by the native speaker
  (ADR-005 amendment 6), so a line cut from one is a gap in a sentence the
  learner has already met. Where they do not fill a page, the dictionary's own
  sentences for the same words top it up. The general page stays on Practice.
*/

/** The headwords a lesson's page asks about: every word and verb it teaches, and the word each form it teaches is of. */
export function lessonWorksheetLemmas(lesson: LessonSpec): string[] {
  const out = new Set<string>();
  for (const item of lesson.teaches) {
    if (item.kind === "phrase") continue;
    out.add(item.kind === "form" ? item.of : item.et);
  }
  return [...out];
}

/** One of the lesson's own sentences, as the worksheet reads a sentence. */
export interface LessonSentence { readonly et: string; readonly en: string }

/**
 * The lesson's own sentences, each with its English, once each: the
 * conversation, the sentences it changes, the lines it puts right, and the
 * story told back. Not the model answers about the learner, which carry the
 * stand-in name, and not a line without English, since the page says what
 * every line means.
 */
export function lessonSentences(lesson: LessonSpec): LessonSentence[] {
  const out = new Map<string, LessonSentence>();
  const add = (et: string | undefined, en: string | undefined) => {
    if (!et || !en || out.has(et)) return;
    out.set(et, { et, en });
  };
  for (const line of lesson.conversation) add(line.et, line.en);
  for (const r of lesson.reworks ?? []) { add(r.to.et, r.to.en); add(r.from.et, r.from.en); }
  for (const f of lesson.fixes ?? []) add(f.line.et, f.line.en);
  for (const line of lesson.retell?.story ?? []) add(line.et, line.en);
  return [...out.values()];
}
