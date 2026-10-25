import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { SceneFinishRequest, type SceneFinishResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { SCENE_BODY_BYTES } from "@/lib/security/body";
import { finishSceneFor } from "@/lib/progress/sceneRuns";
import { throttleShared } from "@/lib/usage/sharedThrottle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A CONVERSATION FINISHED (N-5, ADR-029).
 *
 * The body is `finishSceneFor`, which the web's `finishScene` calls, behind the
 * same allowance. The client sends what it typed and never a mark: the server
 * reads the run's row, replays every turn through the marker the learner saw,
 * and grades through `gradeOnce` with ids named by the run, so a finish that
 * arrives twice is graded once and the second is refused.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, SceneFinishRequest, SCENE_BODY_BYTES);
  if (!body.ok) return body.response;
  const { runId } = await params;
  const busy = await throttleShared(who.ownerId, "finishScene");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const result = await finishSceneFor(who.ownerId, {
    runId, turns: body.data.turns, walkedOut: body.data.walkedOut, asked: body.data.asked,
  });
  if (!result.ok) return apiError(result.reason, { message: result.error });
  const answer: SceneFinishResponse = {
    runId: result.runId,
    objectives: result.objectives,
    hurdles: result.hurdles,
    outcome: result.outcome,
    turns: result.turns,
    recap: result.recap,
    gaps: result.gaps,
    review: result.review,
    graded: result.graded,
  };
  return apiJson(answer);
}
