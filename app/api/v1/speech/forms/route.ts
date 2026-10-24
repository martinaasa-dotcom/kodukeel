import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { SpeechFormsRequest, type SpeechFormsResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { FORMS_PER_MINUTE, heardSpellings } from "@/lib/progress/speechForms";
import { bucketForOwner, checkRateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * WHICH OF THE WORDS JUST HEARD ARE ESTONIAN SPELLINGS AT ALL (N-6, ADR-029).
 *
 * The body is `heardSpellings`, which `/api/speech/forms` calls too (D2): the
 * forms list asked about the words heard and nothing else, on the web's limiter
 * and key, and refused while speaking is switched off (D5). No audio reaches
 * this (ADR-028), and nothing sent here is kept.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const limit = checkRateLimit(`speech-forms:${bucketForOwner(who.ownerId)}`, FORMS_PER_MINUTE, 60_000);
  if (!limit.ok) return apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });
  const body = await readBody(request, SpeechFormsRequest);
  if (!body.ok) return body.response;
  const answer = await heardSpellings(body.data);
  if (!answer.ok) return apiError(answer.refusal);
  const reply: SpeechFormsResponse = { known: answer.known, asked: answer.asked };
  return apiJson(reply);
}
