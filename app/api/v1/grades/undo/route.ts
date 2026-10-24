import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { UndoRequest, type UndoResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { undoGradeFor } from "@/lib/srs/undo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A CARD'S SCHEDULING PUT BACK, THE REVIEW LOG UNTOUCHED (N-4, ADR-029).
 *
 * The body is `undoGradeFor`, which the web's `undoGrade` action calls too
 * (D2). The previous scheduling is the one the grade's own answer handed back;
 * it is checked against the contract's ranges and only ever applied to a card
 * this learner holds. The `Review` row stays, because the card really was
 * answered and that table is never edited.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, UndoRequest);
  if (!body.ok) return body.response;
  const undone = await undoGradeFor(who.ownerId, body.data.cardId, body.data.previous);
  if (!undone.ok) return apiError(undone.reason, { message: undone.error });
  const answer: UndoResponse = { undone: true };
  return apiJson(answer);
}
