import { requireUserId } from "@/lib/auth/session";
import { readScan, SCANS_PER_MINUTE, scanLimitKey } from "@/lib/progress/scanRead";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { NO_STORE } from "@/lib/security/headers";
import { BodyTooLargeError, readJsonCapped } from "@/lib/security/body";
import { MAX_IMAGE_BYTES } from "@/lib/scan/image";

/*
  The picture arrives as base64, which is four bytes for every three, so the
  largest photo `readScan` accepts is about 6 MB of text; half a megabyte over
  that covers the rest of the body. Read through the ceiling rather than
  `request.json()`, which holds whatever is sent before checking any of it.
*/
const SCAN_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 512 * 1024;

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/**
 * Reads a photograph of a page, or of the things around somebody, and hands
 * back the vocabulary on it.
 *
 * The body is `readScan` (lib/progress/scanRead.ts), which `POST /api/v1/scan`
 * calls too: the vision chain, the ledger, and the dictionary deciding which
 * words it will vouch for. What stays here is the web's door: the cookie
 * session and the limiter on the key a phone's photograph is counted under.
 *
 * The picture is never stored. It is decoded, sent once, and dropped.
 */
export async function POST(request: Request) {
  const ownerId = await requireUserId();

  const limit = checkRateLimit(scanLimitKey(bucketForOwner(ownerId)), SCANS_PER_MINUTE, 60_000);
  if (!limit.ok) {
    return rateLimited(limit, "Give the last page a moment to finish before you send another.");
  }

  let body: unknown;
  try {
    body = await readJsonCapped(request, SCAN_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return Response.json(
        { error: `That photo is over ${Math.round(MAX_IMAGE_BYTES / 1_000_000)} MB. Try a smaller one.` },
        { headers: NO_STORE, status: 413 },
      );
    }
    return Response.json({ error: "Something went wrong sending that. Reload the page and try again." }, { headers: NO_STORE, status: 400 });
  }

  const read = await readScan(ownerId, body);
  if (!read.ok) {
    return Response.json(
      { error: read.message, ...(read.reason ? { reason: read.reason } : {}) },
      {
        status: read.status,
        headers: {
          ...NO_STORE,
          ...(read.retryAfterSec ? { "retry-after": String(read.retryAfterSec) } : {}),
        },
      },
    );
  }
  return Response.json(read.reading, {
    headers: {
      ...NO_STORE,
      // Which model read the page is a fact about the reading: the one that answered.
      "x-model-provider": read.provider,
      "x-model-id": read.model,
    },
  });
}
