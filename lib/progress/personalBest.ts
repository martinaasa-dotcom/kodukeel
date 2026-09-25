import { prisma } from "@/lib/db";
import { forgetSettings, numberSetting, readSetting, type SettingKey } from "@/lib/settings/store";

/*
  A PERSONAL BEST IS KEPT IN ONE STATEMENT, OR A SLOWER ROUND OVERWRITES IT.

  Reading the stored best, comparing and writing back is check-then-act: two
  rounds finishing together (two tabs, or a retried request) both read the old
  best, both decide they beat it, and whichever write lands last wins, which
  can be the worse of the two. Measured against a real database, twenty scores
  of 1 to 20 at once left 12 standing. ADR-014 names a personal best as one of
  the few stored figures precisely because the log cannot rebuild it, so a
  lowered one is gone for good.

  So the comparison is inside the write: an upsert whose update only fires
  where the new value improves on the stored one. A stored value that is not a
  number, or a match time of 0 (which means never played), is always replaced,
  the way `numberSetting` already read them. What it returns is whether this
  call is the one that set the best; a call that did not reads the best back.
*/
export async function keepBest(
  ownerId: string,
  key: SettingKey,
  value: number,
  better: "higher" | "lower",
): Promise<{ best: number; isNewBest: boolean }> {
  const text = String(value);
  const won =
    better === "higher"
      ? await prisma.$queryRaw<{ value: string }[]>`
          INSERT INTO "Setting" ("ownerId", "key", "value") VALUES (${ownerId}, ${key}, ${text})
          ON CONFLICT ("ownerId", "key") DO UPDATE SET "value" = EXCLUDED."value"
          WHERE CASE WHEN "Setting"."value" ~ '^[0-9]{1,15}$'
                     THEN "Setting"."value"::bigint < ${value}::bigint
                     ELSE true END
          RETURNING "value"`
      : await prisma.$queryRaw<{ value: string }[]>`
          INSERT INTO "Setting" ("ownerId", "key", "value") VALUES (${ownerId}, ${key}, ${text})
          ON CONFLICT ("ownerId", "key") DO UPDATE SET "value" = EXCLUDED."value"
          WHERE CASE WHEN "Setting"."value" ~ '^[0-9]{1,15}$'
                     THEN "Setting"."value"::bigint = 0 OR "Setting"."value"::bigint > ${value}::bigint
                     ELSE true END
          RETURNING "value"`;
  // The request's memoised read of this learner's settings is stale either way.
  forgetSettings(ownerId);
  if (won.length > 0) return { best: value, isNewBest: true };
  return { best: numberSetting(await readSetting(ownerId, key), value), isNewBest: false };
}
