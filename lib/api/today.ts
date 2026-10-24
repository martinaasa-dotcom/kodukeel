import type { TodayResponse } from "./contract";

/**
 * WHAT TODAY IS ON A PHONE: A LESSON, A CHECK, THE WEB, OR NOTHING (D15).
 *
 * A1 is lessons and the checks that close its parts, and a native app serves
 * both. An evening that is still a module is web rounds a native app does not
 * have, so it is answered with the web's address and nothing about its steps.
 * This is the decision alone, over facts the route reads through the same
 * functions the course screen reads (`courseReading`, `checkAfter`,
 * `moveBlockedFor`), so the phone and the course screen cannot disagree about
 * which of the four today is. Pure.
 */
export interface TodayFacts {
  /** Whether the learner follows the planned course at all. */
  following: boolean;
  /** Every evening of the current part is done. */
  finished: boolean;
  /** The check that closes the current part, where there is one. */
  check: { id: string; final: boolean } | null;
  /** Whether a check still stands between the learner and the next part. */
  blocked: boolean;
  /** The part after the current one, by id. */
  nextPart: string | null;
  /** The lesson today's evening is, or null where it is a module. */
  lesson: string | null;
  /** Today's evening was finished today, and `lesson` is then the one just done. */
  finishedToday: boolean;
  /** Where today is on the web. */
  webHref: string;
}

export function todayFrom(facts: TodayFacts): TodayResponse {
  if (!facts.following) return { kind: "nothing", reason: "off" };
  if (facts.finished) {
    /* The part ends in a check, and until it is passed the check is today, as
       the course screen draws it. Passed, the check stays the answer and says
       so, since what opens the next part is the learner's own press. */
    if (facts.check) {
      return { kind: "check", checkId: facts.check.id, final: facts.check.final, passed: !facts.blocked, next: facts.nextPart };
    }
    return facts.nextPart ? { kind: "web", href: facts.webHref } : { kind: "nothing", reason: "finished" };
  }
  if (facts.lesson) return { kind: "lesson", lessonId: facts.lesson, finished: facts.finishedToday };
  return { kind: "web", href: facts.webHref };
}
