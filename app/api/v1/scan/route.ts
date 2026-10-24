import { apiError } from "@/lib/api/errors";
import { apiJson, readBody } from "@/lib/api/respond";
import { ScanRequest, type ScanResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { readScan, SCANS_PER_MINUTE, scanLimitKey } from "@/lib/progress/scanRead";
import { bucketForOwner, checkRateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * A PHOTOGRAPH READ (N-10, ADR-029).
 *
 * The body is `readScan`, which `/api/scan` calls too (D2): the vision chain,
 * the ledger (D5), and then the dictionary deciding which of the words the
 * model saw the app will vouch for. `PAID_OFF=scan` empties the chain on both
 * doors at once. The model that read it is named in `x-model-provider` and
 * `x-model-id`, as on the web.
 *
 * THE PHOTOGRAPH IS NEVER STORED, on this door or the web's (ADR-021): it is
 * decoded, sent once and dropped, and nothing this route reaches writes
 * anything but the ledger's row. Keeping the words somebody ticked is
 * `POST /api/v1/scans`, which is handed words and never a picture.
 */
/*
  A data URL is the image in base64, a third larger than its bytes, and the JSON
  around it. The picture itself is held to `MAX_IMAGE_BYTES` (4.5 MB) by the
  body, which says so in words; this only stops a request far past that being
  read into memory first.
*/
const SCAN_BODY_MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const limit = checkRateLimit(scanLimitKey(bucketForOwner(who.ownerId)), SCANS_PER_MINUTE, 60_000);
  if (!limit.ok) return apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });
  const body = await readBody(request, ScanRequest, SCAN_BODY_MAX_BYTES);
  if (!body.ok) return body.response;

  const read = await readScan(who.ownerId, body.data);
  if (!read.ok) return apiError(read.refusal, { message: read.message, retryAfterSec: read.retryAfterSec });
  const reading: ScanResponse = read.reading;
  return apiJson(reading, 200, { "x-model-provider": read.provider, "x-model-id": read.model });
}
