import { apiError } from "@/lib/api/errors";
import { apiJson } from "@/lib/api/respond";
import { requireBearerUser } from "@/lib/auth/bearer";
import { backupFor, EXPORT_LIMIT_MESSAGE, exportAllowance } from "@/lib/account/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * THE LEARNER'S BACKUP, FOR A PHONE (N-8, ADR-029).
 *
 * `backupFor` builds it, the same file the web's export downloads and the
 * web's restore reads back, and `exportAllowance` is the one allowance both
 * doors draw on (D2, D5): six an hour, counted where every instance sees it,
 * so a phone and a browser together get six rather than six each.
 */
export async function GET(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const limit = await exportAllowance(who.ownerId);
  if (!limit.ok) return apiError("rate_limited", { message: EXPORT_LIMIT_MESSAGE, retryAfterSec: limit.retryAfterSec });
  return apiJson(await backupFor(who.ownerId));
}
