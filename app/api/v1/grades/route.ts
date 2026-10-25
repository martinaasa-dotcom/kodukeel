import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { GradesRequest, type GradesResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { applyGradeBatch } from "@/lib/srs/replay";
import { snapshotOf } from "@/lib/srs/undo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ONE GRADE OR A BATCH, IDEMPOTENT BY ID (N-4, ADR-029).
 *
 * The body is `applyGradeBatch`, the function the web's offline outbox replays
 * through (D2): the device chooses each grade's id before it asks, so a batch
 * sent twice records each answer once and comes back settled both times, the
 * time it was answered is clamped by the server rather than believed, and
 * every field the outbox carries (`PendingGrade`) is a field here, the slot
 * asked, the form reached instead, and whether it was said aloud. The answer
 * gives back the scheduling each written grade left its card at, which is what
 * a client hands to `/api/v1/grades/undo` to take one back.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, GradesRequest);
  if (!body.ok) return body.response;
  const result = await applyGradeBatch(who.ownerId, body.data.grades);
  if (!result.ok) return apiError(result.reason ?? "invalid", { message: result.error });
  const answer: GradesResponse = {
    settled: result.settled,
    results: result.written.map((w) => ({ id: w.id, cardId: w.cardId, scheduling: snapshotOf(w.state) })),
  };
  return apiJson(answer);
}
