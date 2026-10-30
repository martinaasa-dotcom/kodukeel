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

/** What the finished lesson offers: a worksheet page, and the theme it leads with or null for the page to choose. */
export interface LessonWorksheet {
  theme: string | null;
}

/** The worksheet a lesson evening offers on its finish, or null below B1. */
export function worksheetFor(day: Pick<CourseDay, "level" | "cases" | "topics">): LessonWorksheet | null {
  return offersWorksheet(day.level) ? { theme: worksheetTheme(day) } : null;
}

/** Where the offer goes on the website. */
export function worksheetLink(worksheet: LessonWorksheet): string {
  return worksheet.theme ? `${WORKSHEET_HREF}?theme=${encodeURIComponent(worksheet.theme)}` : WORKSHEET_HREF;
}
