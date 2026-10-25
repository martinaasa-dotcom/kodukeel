import { createHash } from "node:crypto";

/**
 * Who today's spending belongs to once the person who spent it has deleted
 * their account.
 *
 * The daily caps are sums over `UsageEvent`: one learner's day, and everybody's
 * day for the deployment-wide ceiling that is the one hard limit on the bill.
 * Erasure used to delete the rows, today's included, so spending the day's
 * allowance and then deleting the account handed the whole day back to the
 * global ceiling, and the same access token, which verifies until it expires,
 * went on spending as a learner with nothing on the ledger. Open sign-up made
 * that a loop.
 *
 * So today's rows outlive the account under this key rather than its id: a
 * digest of the id and the day, which ties nothing to a person anybody can
 * look up, and which `snapshotUsage` adds to the learner's own sum so a token
 * that outlives its account is still counted against what it already spent.
 * Every older row is deleted, as before, and the next erasure sweeps any
 * earlier day's keys down to the one anonymous `ERASED_OWNER`, so a key lives
 * no longer than the day the cap needs it.
 */
export const ERASED_PREFIX = "erased:";
export const ERASED_OWNER = "erased";

export function erasedOwnerKey(ownerId: string, day: string): string {
  return ERASED_PREFIX + createHash("sha256").update(`${ownerId}\n${day}`, "utf8").digest("hex").slice(0, 32);
}
