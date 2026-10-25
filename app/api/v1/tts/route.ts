import { apiError } from "@/lib/api/errors";
import { apiBytes, readBody } from "@/lib/api/respond";
import { TtsRequest } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { clipLimitKey, HEARD_PER_MINUTE, SPEECH_PER_MINUTE, speakClip } from "@/lib/progress/speakClip";
import { bucketForOwner } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A CLIP READ ALOUD (N-6, ADR-029).
 *
 * The body is `speakClip`, which `/api/tts` calls too (D2): the shared store,
 * the in-flight joining, so a clip a browser and a phone ask for at the same
 * moment is one request to TartuNLP, and the ledger (D5). The limiter is the
 * web's, on the same key, so a learner on both doors spends one allowance.
 *
 * `POST` rather than the `GET` the draft named, for the reason the web's door
 * gives: a `GET` puts the sentence being read into every access log between
 * here and the phone, and nothing would cache it anyway, since every v1 answer
 * is `no-store`. A read-back of what was heard (`transient`) is never cached,
 * never stored, and refused while speaking is switched off.
 */
export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const body = await readBody(request, TtsRequest);
  if (!body.ok) return body.response;
  const transient = body.data.transient === true;
  const limit = await checkSharedRateLimit(
    clipLimitKey(bucketForOwner(who.ownerId), transient), transient ? HEARD_PER_MINUTE : SPEECH_PER_MINUTE, 60_000,
  );
  if (!limit.ok) return apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });

  const spoken = await speakClip({ ownerId: who.ownerId, body: body.data, transient });
  if (!spoken.ok) return apiError(spoken.refusal, { message: spoken.message, retryAfterSec: spoken.retryAfterSec });
  return apiBytes(spoken.audio, "audio/wav", { "x-tts-cache": spoken.source });
}
