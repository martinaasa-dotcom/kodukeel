import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { BeginChatRequest, type SceneOpenedResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { beginChatFor } from "@/lib/progress/sceneRuns";
import { throttleAction } from "@/lib/security/actionLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * TODAY'S CHAT OPENED (N-5, ADR-029).
 *
 * The body is `beginChatFor`, which the web's `beginChat` calls, behind the
 * same allowance. It asks `chatOffered` before anything else, so a deployment
 * with no model answers `switched_off` here as it refuses on the web: a chat
 * has no built-in lines to fall back on. The evening is worked out on the
 * server from the learner's own ticks; nothing in the request names a day.
 * Its turns go to `/api/v1/scenes/{runId}/turns` like any other run's.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, BeginChatRequest);
  if (!body.ok) return body.response;
  const busy = throttleAction(who.ownerId, "beginScene");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const result = await beginChatFor(who.ownerId, body.data.level);
  if (!result.ok) return apiError(result.reason, { message: result.error });
  const answer: SceneOpenedResponse = {
    runId: result.runId, briefing: result.briefing, plays: result.plays, composed: result.composed,
  };
  return apiJson(answer);
}
