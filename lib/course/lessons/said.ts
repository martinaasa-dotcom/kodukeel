import type { Difference, Grade } from "./againstLine";
import type { Finding } from "./sentenceCheck";

/**
 * WHAT WAS SAID ON A LESSON'S SAY IT STEP, AS IT IS LISTED AND KEPT.
 *
 * The step lists these when it is over (`SaidList`), and the lesson keeps the
 * latest attempt's on the server so a finished lesson opened again shows what
 * the learner actually said. Pure types, so a client card, the list and the
 * server all read one shape.
 */

/** One sentence's two readings: against the line asked, and against the language. */
export interface LineResult {
  readonly grade: Grade;
  readonly differences: readonly Difference[];
  readonly findings: readonly Finding[];
}

/**
 * One thing said on the step: what was asked, what the learner said, one way
 * to say it, and what the two readings found. `grade` is null where nothing
 * was read (an answer the marker already called the line, or one shown
 * without being answered), and `note` is the marker's own sentence where it
 * had one.
 */
export interface SaidResult {
  readonly kind: "answer" | "retell";
  readonly label: string;
  readonly cue: string;
  readonly said: string;
  readonly model: string | null;
  readonly modelEn: string | null;
  readonly grade: Grade | null;
  readonly note: string | null;
  readonly differences: readonly Difference[];
  readonly findings: readonly Finding[];
}
