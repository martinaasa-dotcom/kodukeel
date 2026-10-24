import { apiError } from "@/lib/api/errors";
import { apiStream, readBody } from "@/lib/api/respond";
import { TutorRequest } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { askAnu, QUESTIONS_PER_MINUTE, questionLimitKey } from "@/lib/progress/askAnu";
import { bucketForOwner, checkRateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** A conversation is text; this is far above any day of questions and far below a payload meant to hold memory. */
const TUTOR_BODY_MAX_BYTES = 512 * 1024;

/**
 * A QUESTION TO ANU (N-10, ADR-029).
 *
 * The body is `askAnu`, which `/api/tutor` calls too (D2): Anu's own chain, the
 * ledger booked once the question is worth answering and settled by whoever
 * answered (D5), what she is told about the learner read off their own log, and
 * today's turn kept while yesterday's is forgotten. `PAID_OFF=tutor` empties
 * the chain on both doors at once. The answer streams as on the web, with the
 * provider and model that actually answered in `x-model-provider` and
 * `x-model-id`; the screen context is read as material and never stored.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const limit = checkRateLimit(questionLimitKey(bucketForOwner(who.ownerId)), QUESTIONS_PER_MINUTE, 60_000);
  if (!limit.ok) return apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });
  const body = await readBody(request, TutorRequest, TUTOR_BODY_MAX_BYTES);
  if (!body.ok) return body.response;

  const answer = await askAnu(who.ownerId, body.data);
  if (!answer.ok) return apiError(answer.refusal, { message: answer.message, retryAfterSec: answer.retryAfterSec });
  return apiStream(answer.stream, "text/plain; charset=utf-8", {
    "x-model-provider": answer.provider,
    "x-model-id": answer.model,
  });
}
