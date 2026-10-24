import { apiError } from "@/lib/api/errors";
import { apiJson } from "@/lib/api/respond";
import type { ScanDeckResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { addScanToDeckFor } from "@/lib/progress/scans";
import { throttleAction } from "@/lib/security/actionLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * EVERY WORD ON A KEPT PAGE THAT IS NOT IN THE DECK YET, ADDED (N-10, ADR-029).
 *
 * The body is `addScanToDeckFor`, which the web's `addScanToDeck` calls (D2),
 * behind the same allowance (D5). A page that is not this learner's is not
 * found.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const busy = throttleAction(who.ownerId, "addScanToDeck");
  if (busy) return apiError("rate_limited", { retryAfterSec: busy.retryAfterSec });
  const { id } = await params;
  const result = await addScanToDeckFor(who.ownerId, id.slice(0, 64));
  if (!result.ok) return apiError("not_found", { message: result.error });
  const answer: ScanDeckResponse = { added: result.added, words: result.words };
  return apiJson(answer);
}
