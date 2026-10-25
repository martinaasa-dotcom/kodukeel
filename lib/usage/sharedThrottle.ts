import { ACTION_LIMITS, busyMessage, type ActionLimit, type ActionRefusal } from "@/lib/security/actionLimits";
import { bucketForOwner } from "@/lib/security/rateLimit";
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
 * Postgres table the export and the speech route use. `checkSharedRateLimit`
 * counts the in-memory bucket first, so the ordinary second press costs no
 * round trip, and a database that cannot answer falls back to it.
 *
 * It is the whole of the count, never a second one after `throttleAction`: the
 * two read the same memory bucket under the same key, so calling both counted
 * every press twice and halved every allowance this was meant to enforce.
 */
export async function throttleShared(ownerId: string, action: ActionLimit): Promise<ActionRefusal | null> {
  const { perMinute } = ACTION_LIMITS[action];
  const shared = await checkSharedRateLimit(`action:${action}:${bucketForOwner(ownerId)}`, perMinute, 60_000);
  if (shared.ok) return null;
  const seconds = shared.retryAfterSec ?? 60;
  return { ok: false, error: busyMessage("en", seconds), retryAfterSec: seconds };
}
