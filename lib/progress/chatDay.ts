import type { CourseDay, Programme } from "@/lib/course";
import { courseReading, programmeFor } from "@/lib/progress/course";
import { learnerDayClock } from "@/lib/progress/dayClock";
import type { CourseReading } from "@/lib/progress/course";

/**
 * WHICH EVENING TONIGHT'S CHAT IS ABOUT, WORKED OUT ON THE SERVER EVERY TIME.
 *
 * The evening the learner finished today, and nothing else: a chat is offered
 * at the end of an evening, about its words, while they are fresh. The day is
 * never taken from a caller. A day id off the wire could name tomorrow's
 * evening, whose words nobody has met, and the chat would ask the learner to
 * use words they were never shown, which is the one thing D11 forbids.
 *
 * The finished evening is the day before the one in play, or the last day of a
 * part somebody has just finished, read through the same `courseReading` the
 * module screen draws "Today's module is done" from, so the screen offering a
 * chat and the action opening it cannot disagree about which evening it is.
 */
export function finishedEvening(programme: Programme, reading: CourseReading): CourseDay | null {
  if (!reading.eveningDoneToday) return null;
  if (reading.finished) return programme.days[programme.days.length - 1] ?? null;
  const current = reading.current?.day;
  return current ? programme.days[current.index - 2] ?? null : null;
}

/** The learner's own finished evening today, or null where there is none. */
export async function chatDay(ownerId: string): Promise<{ programme: Programme; day: CourseDay } | null> {
  const programme = await programmeFor(ownerId);
  if (!programme) return null;
  const reading = await courseReading(ownerId, programme, await learnerDayClock(ownerId));
  const day = finishedEvening(programme, reading);
  return day ? { programme, day } : null;
}
