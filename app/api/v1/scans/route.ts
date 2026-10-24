import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { ScanSaveRequest, type ScanSaveResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { saveScanFor } from "@/lib/progress/scans";
import { throttleAction } from "@/lib/security/actionLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A PAGE KEPT, WITH THE WORDS THE LEARNER TICKED (N-10, ADR-029).
 *
 * The body is `saveScanFor`, which the web's `saveScan` calls (D2), behind the
 * same allowance (D5). Every word is vouched for by the dictionary again here
 * rather than believed off the request, and a word it would not vouch for is
 * kept as the learner's own entry with recognition and production cards only.
 * What is kept is the list of words: no picture is ever handed to this route.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const busy = throttleAction(who.ownerId, "saveScan");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const body = await readBody(request, ScanSaveRequest);
  if (!body.ok) return body.response;
  const saved = await saveScanFor(who.ownerId, body.data);
  if (!saved.ok) return apiError("invalid", { message: saved.error });
  const answer: ScanSaveResponse = { id: saved.id, words: saved.words, cards: saved.cards, created: saved.created };
  return apiJson(answer);
}
