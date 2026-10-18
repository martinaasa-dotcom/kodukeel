import type { Level } from "@/lib/collections/syllabus";

/**
 * HOW A LEARNER ANSWERS IN A CONVERSATION, REMEMBERED FROM THE LAST ONE
 * (docs/41-fifth-batch.md, VB-4).
 *
 * Three ways, one switch: pick one of the lines on offer, say it, or type it.
 * Picking is batch 4's bridge for a beginner (they recognize the right thing
 * before they can produce it), saying it is what a conversation in a shop
 * actually is, and typing is how it was rehearsed before the app could hear.
 *
 * The switch remembers which was used last, because somebody who chose to
 * speak in one scene wants to speak in the next. Where nothing is stored the
 * default is batch 4's: picking at A1 and typing above it. A stored "say" on a
 * device or deployment where speech is not offered falls back to that default
 * rather than offering a microphone that cannot open, so the screen always
 * does its job by tapping or typing.
 */
export type SceneAnswer = "pick" | "say" | "type";

const ANSWERS: readonly SceneAnswer[] = ["pick", "say", "type"];

/** A stored answer, read off the wire or the settings table: one of the three, or nothing. */
export function sceneAnswerFrom(stored: unknown): SceneAnswer | null {
  return typeof stored === "string" && (ANSWERS as readonly string[]).includes(stored) ? (stored as SceneAnswer) : null;
}

/** The way this run opens: what was used last, where it can be used here, else the band's default. */
export function openingAnswer(stored: SceneAnswer | null, level: Level, speechOffered: boolean): SceneAnswer {
  const plain: SceneAnswer = level === "A1" ? "pick" : "type";
  if (stored === "say" && !speechOffered) return plain;
  return stored ?? plain;
}
