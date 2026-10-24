import { refuseOldBuild } from "@/lib/api/build";
import { apiError } from "@/lib/api/errors";
import { recordingsList } from "@/lib/api/recordings";
import { apiJson } from "@/lib/api/respond";
import { bucketForRequest } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * THE NATIVE SPEAKER'S CLIPS, AND WHICH SPELLING EACH ONE ANSWERS FOR (N-6, ADR-029).
 *
 * Public, like `/api/v1/meta`: the catalog is the same for everybody and says
 * nothing about anybody, and the clips themselves are served from the site's
 * own files. Counted per address through the shared limiter, like the other
 * routes a stranger can reach. A phone's speaker button plays the recording
 * first and the synthesizer second, as the web's does (D9), and finds it by
 * the same rule: `key` is set only where `nativeFor` answers for the clip.
 */
const PER_MINUTE = 60;

export async function GET(request: Request) {
  const old = refuseOldBuild(request, process.env);
  if (old) return old;
  const limit = await checkSharedRateLimit(`api-v1-recordings:${bucketForRequest(request)}`, PER_MINUTE, 60_000);
  if (!limit.ok) return apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });
  return apiJson(recordingsList());
}
