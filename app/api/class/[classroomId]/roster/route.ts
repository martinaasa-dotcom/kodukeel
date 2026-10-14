import { requireUserId } from "@/lib/auth/session";
import { rosterClassFor } from "@/lib/classroom/poster";
import { classRoster, workplaceRoster } from "@/lib/classroom/roster";
import { cohortKind } from "@/lib/classroom/cohort";
import { rosterCsv, rosterFilename } from "@/lib/classroom/rosterCsv";
import { EXAM_LEVELS, type ExamLevel } from "@/lib/exam/spec";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { bucketForOwner, rateLimited } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";
import { PRIVATE_NO_STORE } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

/**
 * THE ROSTER, AS A FILE, FOR THE ONE PERSON WHO ALREADY SEES IT.
 *
 * The owner of a class downloads what the class page shows them, through the
 * same two queries the page draws from: `classRoster` for a class and
 * `workplaceRoster` for a workplace group, never a query of its own, so the
 * file cannot hold a figure the board does not. A member who is not the owner,
 * a stranger and a guessed id all get the same not-found, which confirms
 * nothing about whether the class is real. An archived class still answers,
 * because a teacher may want the records of a class that has ended.
 *
 * Six an hour per owner, counted where every instance sees it, as the export
 * is: a roster rolls up every member's review log, so it is one of the dearer
 * reads in the app, and a teacher downloading their own register needs a
 * handful a term.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const ownerId = await requireUserId();
  const { classroomId } = await params;
  const classroom = await rosterClassFor(ownerId, classroomId);
  if (!classroom) return new Response("Not found", { status: 404, headers: PRIVATE_NO_STORE });

  const limit = await checkSharedRateLimit(`roster:${bucketForOwner(ownerId)}`, 6, 60 * 60_000);
  if (!limit.ok) {
    return rateLimited(
      limit,
      "You've downloaded the roster six times in the last hour, which is the limit. Try again a bit later.",
    );
  }

  const [locale, clock] = await Promise.all([localeFor(ownerId), learnerDayClock(ownerId)]);
  const say = (english: string) => tr(locale, english);
  const date = clock.dayKey();
  const level: ExamLevel = (EXAM_LEVELS as readonly string[]).includes(classroom.targetLevel)
    ? (classroom.targetLevel as ExamLevel)
    : "B1";

  const text = cohortKind(classroom.kind) === "WORKPLACE"
    ? rosterCsv({ kind: "WORKPLACE", className: classroom.name, date, say, summary: await workplaceRoster(classroom.id, level) })
    : rosterCsv({ kind: "CLASS", className: classroom.name, date, say, summary: await classRoster(classroom.id) });

  return new Response(text, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${rosterFilename(classroom.name, date)}"`,
      ...PRIVATE_NO_STORE,
    },
  });
}
