import { after } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { rateLimited } from "@/lib/security/rateLimit";
import { NO_STORE } from "@/lib/security/headers";
import { readJsonCapped, JSON_BODY_BYTES } from "@/lib/security/body";
import { sceneTurnFor } from "@/lib/progress/sceneRequest";

/**
 * One turn of a conversation, for the web's own screen.
 *
 * The body is `sceneTurnFor` in `lib/progress/sceneRequest.ts`, which
 * `POST /api/v1/scenes/{runId}/turns` calls too (ADR-029): this door resolves
 * the owner from the cookie, reads the request's JSON and answers in the shape
 * the screen has always read. Everything about the turn, the marking, the
 * judge, the ledger and the ladder, is there and written down there.
 *
 * `after` is this request's own, and it is handed in rather than imported
 * there, because the settlements and the dictionary growing have to outlive
 * the answer of the request that booked them, and only the door owns that.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/*
  A TURN CAN NOW ASK A MODEL UP TO MAX_COMPOSE_ATTEMPTS TIMES (`sceneLine`),
  which went from two to three so a learner reading a run of composed lines
  is less likely to meet the seam where one drops to the bank. The platform's
  own default is too short a bet on three sequential provider round trips
  going well, the way `/api/describe`, `/api/scan`, `/api/tutor` and
  `/api/write` already decided about their own calls.
*/
export const maxDuration = 60;

export async function POST(request: Request) {
  const ownerId = await requireUserId();
  // A body that parses to `null` or a number is not a turn, and reading a key
  // off `null` threw here, which the framework answered with a 500.
  const parsed: unknown = await readJsonCapped(request, JSON_BODY_BYTES).catch(() => null);
  const body = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
  const turn = await sceneTurnFor(ownerId, body, after);
  if (!turn.ok) {
    return turn.kind === "limited"
      ? rateLimited(turn.limit, turn.message)
      : Response.json({ error: turn.message }, { headers: NO_STORE, status: 400 });
  }
  return Response.json(turn.body, { headers: NO_STORE });
}
