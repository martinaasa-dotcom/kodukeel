/**
 * How long the spending ledger is kept, and the day it is cut at.
 *
 * Thirteen months, so a month's spend can still be set beside the same month
 * a year earlier, and no longer: the caps it enforces are daily
 * (`lib/usage/quota.ts`), so nothing the app does reads a row past today. The
 * cut is made by the daily scheduled run (`pruneExpired` in
 * `lib/progress/prune.ts`), on the `day` column the ledger writes as a UTC date.
 *
 * Pure: no Prisma, and the clock is handed in.
 */
export const USAGE_RETENTION_MONTHS = 13;

/** The first UTC day still kept, in the ledger's own spelling ("YYYY-MM-DD"). */
export function usageCutoffDay(now: Date): string {
  const cut = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - USAGE_RETENTION_MONTHS, now.getUTCDate()));
  return cut.toISOString().slice(0, 10);
}
