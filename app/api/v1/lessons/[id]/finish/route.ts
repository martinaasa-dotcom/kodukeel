import { apiError } from "@/lib/api/errors";
import { apiJson } from "@/lib/api/respond";
import type { FinishLessonResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { lessonDayFor } from "@/lib/course";
import { finishLessonFor } from "@/lib/progress/lessons";
import { throttleAction } from "@/lib/security/actionLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A FINISHED LESSON: TODAY TICKED WHERE IT IS TODAY'S, ITS WORDS IN THE DECK
 * (N-7, ADR-029).
 *
 * The body is `finishLessonFor`, which the web's `finishLesson` calls, behind
 * the same allowance (D5). A lesson ahead of today records nothing and builds
 * nothing, and answers `recorded: false`, so a client cannot walk the course
 * forward with nothing learned.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const { id } = await params;
  if (!lessonDayFor(id)) return apiError("not_found", { message: "That lesson isn't part of the course." });
  const busy = throttleAction(who.ownerId, "finishLesson");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const result = await finishLessonFor(who.ownerId, id);
  if (!result.ok) return apiError(result.reason, { message: result.error });
  const body: FinishLessonResponse = { recorded: result.recorded };
  return apiJson(body);
}
