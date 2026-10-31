/**
 * THE END OF THE COURSE: WHETHER IT IS FINISHED, AND WHAT IT TOOK.
 *
 * The course is finished when the check after its last part is passed, which
 * is the C1 check (`lib/course/checks.ts`). Ticking the last lesson is not
 * enough on its own: the check is how every level of the lessons is left, and
 * the last one is no different, so until it is passed `/course` and Today
 * offer it, and once it is they say the course is done.
 *
 * Every figure is read off something the app already keeps (ADR-014): the
 * lessons finished off the learner's own ticks (`lessonListStates`), the days
 * studied off the review log through their own day clock (`daysStudied`), and
 * the conversations off what they told Today (`conversationsReported`). Nothing
 * is stored for this screen.
 */
import { PROGRAMMES } from "@/lib/course";
import { checkAfter, type CourseCheck } from "@/lib/course/checks";
import { checksPassedFor } from "@/lib/progress/checks";
import { lessonListStates } from "@/lib/progress/course";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { conversationsReported, daysStudied } from "@/lib/progress/record";

/** The check after the course's last part, which is how the course is finished. */
export function courseEndCheck(): CourseCheck | null {
  const last = PROGRAMMES.at(-1);
  return last ? checkAfter(PROGRAMMES, last.id) ?? null : null;
}

/** Whether the learner has passed the check that finishes the course. */
export async function courseFinished(ownerId: string): Promise<boolean> {
  const check = courseEndCheck();
  return check !== null && (await checksPassedFor(ownerId)).has(check.id);
}

/** What the course-finished screen says the course took. */
export interface CourseFinishedFigures {
  /** Lessons finished, of every level. */
  readonly lessons: number;
  /** Distinct days with a review, in the learner's own zone. */
  readonly days: number;
  /** Conversations in Estonian the learner told Today about. */
  readonly conversations: number;
}

export async function courseFinishedFigures(ownerId: string): Promise<CourseFinishedFigures> {
  const clock = await learnerDayClock(ownerId);
  const [states, days, conversations] = await Promise.all([
    lessonListStates(ownerId),
    daysStudied(ownerId, clock),
    conversationsReported(ownerId),
  ]);
  return { lessons: [...states.values()].filter((s) => s === "done").length, days, conversations };
}
