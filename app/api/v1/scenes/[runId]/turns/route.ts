import { after } from "next/server";

import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { SceneTurnRequest } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { sceneTurnFor } from "@/lib/progress/sceneRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Up to three model calls in a row, as the web's `/api/scene` allows for.
export const maxDuration = 60;

/**
 * ONE TURN OF A CONVERSATION (N-5, ADR-029).
 *
 * The body is `sceneTurnFor`, the web's `/api/scene` body, behind the same
 * per-learner limit and the same ledger. The client sends every turn so far
 * and the server replays them all, so it keeps nothing between turns. This
 * request's own `after` is handed in, because the ledger's settlements and the
 * dictionary growing run after the answer has gone and only the door that
 * owns the request can keep it alive for them.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, SceneTurnRequest);
  if (!body.ok) return body.response;
  const { runId } = await params;
  const turn = await sceneTurnFor(who.ownerId, { ...body.data, runId }, after);
  if (!turn.ok) {
    return turn.kind === "limited"
      ? apiError("rate_limited", { message: turn.message, retryAfterSec: turn.limit.retryAfterSec })
      : apiError("not_found", { message: turn.message });
  }
  return apiJson(turn.body);
}
