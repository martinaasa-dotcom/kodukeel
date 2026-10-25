import { refuseOldBuild } from "@/lib/api/build";
import { apiError } from "@/lib/api/errors";
import { buildMeta } from "@/lib/api/meta";
import { apiJson } from "@/lib/api/respond";
import { speechAvailability } from "@/lib/audio/speechAvailability";
import { supabaseConfigured } from "@/lib/auth/mode";
import { readSsoPolicy } from "@/lib/auth/sso";
import { bucketForRequest } from "@/lib/security/rateLimit";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * WHAT THIS INSTALLATION IS, FOR A NATIVE APP THAT HAS NOT SIGNED IN YET.
 *
 * The one v1 route that needs no token (ADR-029): the API version, the oldest
 * native build still answered, which features are switched off, the speech
 * model's pins, the interface languages and which ways of signing in exist.
 * Nothing about any person, and every switch as on or off rather than the
 * value the operator typed. Public, so it is counted per address through the
 * shared limiter, like the other routes a stranger can reach.
 */
const PER_MINUTE = 60;

export async function GET(request: Request) {
  const old = refuseOldBuild(request, process.env);
  if (old) return old;
  const limit = await checkSharedRateLimit(`api-v1-meta:${bucketForRequest(request)}`, PER_MINUTE, 60_000);
  if (!limit.ok) return apiError("rate_limited", { retryAfterSec: limit.retryAfterSec });
  return apiJson(buildMeta({
    env: process.env,
    speech: speechAvailability(),
    sso: readSsoPolicy().domains.length > 0,
    hosted: supabaseConfigured(),
  }));
}
