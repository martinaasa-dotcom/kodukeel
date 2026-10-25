import { apiJson } from "@/lib/api/respond";
import { todayFrom } from "@/lib/api/today";
import { requireBearerUser } from "@/lib/auth/bearer";
import { MODULE_HOME, PROGRAMMES, programmeAfter } from "@/lib/course";
import { checkAfter } from "@/lib/course/checks";
import { moveBlockedFor } from "@/lib/progress/checks";
import { courseReading, programmeFor } from "@/lib/progress/course";
import { learnerDayClock } from "@/lib/progress/dayClock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * WHETHER TODAY IS A LESSON, A CHECK, THE WEB OR NOTHING (N-7, D15).
 *
 * Read through the course screen's own functions: `courseReading` for where
 * the learner is, `checkAfter` for the check that closes a finished part, and
 * `moveBlockedFor` for whether it still stands in the way, which is the gate
 * every door up asks. The decision over those facts is `todayFrom`. Nothing is
 * written: opening the app records nothing.
 */
export async function GET(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const programme = await programmeFor(who.ownerId);
  if (!programme) {
    return apiJson(todayFrom({
      following: false, finished: false, check: null, blocked: false, nextPart: null,
      lesson: null, finishedToday: false, webHref: MODULE_HOME,
    }));
  }
  const clock = await learnerDayClock(who.ownerId);
  const reading = await courseReading(who.ownerId, programme, clock, new Date());
  const after = programmeAfter(programme) ?? null;
  const check = reading.finished ? checkAfter(PROGRAMMES, programme.id) ?? null : null;
  const blocked = check && after ? Boolean(await moveBlockedFor(who.ownerId, programme, after)) : false;
  /*
    An evening finished today leaves the next one as the current day, as the
    course screen reads it, so the lesson just done is the day before it.
  */
  const day = reading.current?.day ?? null;
  const justDone = reading.finishedToday && day ? programme.days[day.index - 2] ?? null : null;
  const lesson = justDone?.lesson ?? day?.lesson ?? null;
  return apiJson(todayFrom({
    following: true,
    finished: reading.finished,
    check: check ? { id: check.id, final: check.final } : null,
    blocked,
    nextPart: after?.id ?? null,
    lesson,
    finishedToday: Boolean(justDone?.lesson),
    webHref: MODULE_HOME,
  }));
}
