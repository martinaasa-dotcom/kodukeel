import { canonicalOrigin } from "@/lib/auth/canonical";
import { resolveOperator } from "@/lib/legal/operator";
import { securityTxt } from "@/lib/legal/securityTxt";

/**
 * RFC 9116, answered from the deployment's own operator (lib/legal/securityTxt.ts).
 *
 * Dynamic for the reason the policy pages are: a file baked at build time
 * would name whoever ran the build machine. The build time it counts its
 * expiry from is inlined by `next.config.ts` (`KODUKEEL_BUILT_AT`), and a
 * server started without one, which is only ever a test, counts from now.
 *
 * Plain text with no redirect, as the RFC asks, and public: it holds nothing
 * about anybody, only where to write. A deployment that names nobody answers
 * 404, so a fork does not publish this project's address as its own.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const built = Number(process.env.KODUKEEL_BUILT_AT);
  const body = securityTxt(resolveOperator(), canonicalOrigin(), Number.isFinite(built) && built > 0 ? new Date(built) : new Date());
  if (!body) {
    return new Response("No operator is named for this deployment, so there is no security contact to publish.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
