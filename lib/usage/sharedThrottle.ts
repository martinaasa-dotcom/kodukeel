import { ACTION_LIMITS, busyMessage, throttleAction, type ActionLimit, type ActionRefusal } from "@/lib/security/actionLimits";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

/**
 * `throttleAction`, counted where every instance can see it.
 *
 * The allowance in `ACTION_LIMITS` lives in each server's memory, which is
 * right for a person pressing a button twice and soft against a script: a
 * native client or a cookie replayed in a loop is spread across instances by
 * the platform, and each instance starts its own count at nought. The
 * expensive actions (a conversation opened, a page scanned and stored, a
 * lesson's words built into a deck) are counted here as well, in the same
 * Postgres table the export and the speech route use. The in-memory check runs
 * first, so the ordinary second press costs no round trip, and a database that
 * cannot answer falls back to it (`checkSharedRateLimit`).
 */
export async function throttleShared(ownerId: string, action: ActionLimit): Promise<ActionRefusal | null> {
  const local = throttleAction(ownerId, action);
  if (local) return local;
  const { perMinute } = ACTION_LIMITS[action];
  const shared = await checkSharedRateLimit(`action:${action}:o:${ownerId}`, perMinute, 60_000);
  if (shared.ok) return null;
  const seconds = shared.retryAfterSec ?? 60;
  return { ok: false, error: busyMessage("en", seconds), retryAfterSec: seconds };
}
