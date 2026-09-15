import type { Level } from "@/lib/collections/syllabus";

/**
 * The UI's own chrome is Estonian in a couple of deliberate places, the
 * home page greeting and a review verdict among them, on the argument that
 * those are exactly the phrases a course teaches first and the earliest
 * possible exposure is the point. That argument only holds once the learner
 * has actually met the phrase. At A1 they have not, so the chrome reads in
 * English there and switches over once the course says they have reached
 * A2, which is `courseLevelFor`'s own answer and not a second guess at it.
 *
 * This is about the interface's own words only: a card's Estonian content,
 * an attested sentence, a recorded verb form and so on are never touched by
 * it, and nothing here may generate or alter a word of Estonian (ADR-005).
 */
export function uiWantsEnglish(level: Level): boolean {
  return level === "A1";
}

/** Pick the Estonian or the English chrome string for this learner's level. */
export function uiText(level: Level, et: string, en: string): string {
  return uiWantsEnglish(level) ? en : et;
}
