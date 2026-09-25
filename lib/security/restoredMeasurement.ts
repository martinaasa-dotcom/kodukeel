/**
 * A mock paper or a level check as it comes back out of a backup file.
 *
 * ADR-022: a result anybody can type is not a measurement. A sitting is marked
 * on the server from the paper it rebuilds out of (level, seed, pool), and a
 * backup carries the marks without the answers or the paper, so there is
 * nothing left to mark it again with. A hand-edited file could otherwise hand
 * itself a C1 pass, and that row would be read by the hub's confidence figure,
 * by the level the course opens at and by the band a teacher or a sponsor sees.
 *
 * So the row comes back exactly as written, because the backup is the
 * learner's own copy of their data and a restore that edited it would not be a
 * round trip, and it comes back stamped. `restoredAt` is never null on a row a
 * restore writes, whatever the file says: an earlier stamp the file carries is
 * kept, since a row restored twice was still never marked here, and anything
 * else is replaced by the moment of this restore. Every reader that treats a
 * sitting as evidence asks for `restoredAt: null`.
 *
 * Pure: no Prisma, so the rule is testable without a database.
 */
export function asRestoredMeasurement(
  row: Record<string, unknown>,
  restoredAt: Date,
): Record<string, unknown> {
  const claimed = row.restoredAt;
  const earlier =
    claimed instanceof Date && !Number.isNaN(claimed.getTime()) && claimed <= restoredAt
      ? claimed
      : typeof claimed === "string" && !Number.isNaN(Date.parse(claimed)) && new Date(claimed) <= restoredAt
        ? new Date(claimed)
        : null;
  return { ...row, restoredAt: earlier ?? restoredAt };
}
