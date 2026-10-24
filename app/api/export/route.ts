import { requireUserId } from "@/lib/auth/session";
import { backupFor, EXPORT_LIMIT_MESSAGE, exportAllowance } from "@/lib/account/export";
import { rateLimited } from "@/lib/security/rateLimit";
import { PRIVATE_NO_STORE } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

/**
 * Full export, downloaded as a file.
 *
 * The backup itself is `backupFor` in lib/account/export.ts, which
 * `GET /api/v1/export` calls too (D2): what it carries, and why every table is
 * in it, is argued there. This door resolves the learner from the cookie, asks
 * the one allowance both doors share, and hands the file over as a download.
 */
export async function GET() {
  const ownerId = await requireUserId();

  const limit = await exportAllowance(ownerId);
  if (!limit.ok) return rateLimited(limit, EXPORT_LIMIT_MESSAGE);

  const payload = await backupFor(ownerId);

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="kodukeel-backup-${date}.json"`,
      /*
        Every review, every conversation with Anu and every exam composition
        this learner has written, in one response at one URL. It carried no
        freshness directive at all, so a shared cache in front of the app with
        a default TTL for a 200 would have been free to hand it to the next
        request. `private, no-store` and a `Cookie` vary say who it belongs to.
      */
      ...PRIVATE_NO_STORE,
    },
  });
}
