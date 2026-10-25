import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { BeginSceneRequest, type SceneOpenedResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { beginSceneFor } from "@/lib/progress/sceneRuns";
import { throttleShared } from "@/lib/usage/sharedThrottle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A CONVERSATION OPENED (N-5, ADR-029).
 *
 * The body is `beginSceneFor`, which the web's `beginScene` calls, behind the
 * same allowance (D5). The id may be a scene from the situations list or a
 * lesson's own role-play, exactly as the web takes it, so the last step of a
 * check-in or a part's end opens here. Only the briefing crosses: the seed,
 * the curveballs and the persona's leans stay on the server.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, BeginSceneRequest);
  if (!body.ok) return body.response;
  const busy = await throttleShared(who.ownerId, "beginScene");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const result = await beginSceneFor(who.ownerId, body.data.sceneId, body.data.difficulty, body.data.level);
  if (!result.ok) return apiError(result.reason, { message: result.error });
  const answer: SceneOpenedResponse = {
    runId: result.runId, briefing: result.briefing, plays: result.plays, composed: result.composed,
  };
  return apiJson(answer);
}
