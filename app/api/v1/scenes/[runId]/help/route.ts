import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { SceneHelpRequest, type SceneHelpResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { sceneHelpFor } from "@/lib/progress/sceneRuns";
import { throttleAction } from "@/lib/security/actionLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ONE WORD FOR A STUCK LEARNER (N-5, ADR-029).
 *
 * The body is `sceneHelpFor`, which the web's `sceneHelp` calls, behind the
 * same allowance. It reaches no model and books nothing: the word is the beat's
 * own topic, out of the dictionary. The client sends the turns so far, so the
 * server knows which beat is standing, and sends the next turn with `helped`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, SceneHelpRequest);
  if (!body.ok) return body.response;
  const { runId } = await params;
  const busy = throttleAction(who.ownerId, "sceneHelp");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const result = await sceneHelpFor(who.ownerId, runId, body.data.turns);
  if (!result.ok) return apiError(result.reason, { message: result.error });
  const answer: SceneHelpResponse = { lemma: result.lemma, gloss: result.gloss, lexemeId: result.lexemeId };
  return apiJson(answer);
}
