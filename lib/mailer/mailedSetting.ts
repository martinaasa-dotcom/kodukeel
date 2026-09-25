import { prisma } from "@/lib/db";
import { forgetSettings } from "@/lib/settings/store";

/*
  A SETTING WRITTEN BY SOMEBODY WHO IS NOT SIGNED IN, ONLY FOR SOMEBODY WHO IS
  STILL HERE.

  Two routes write a learner's settings with no session behind them: the
  unsubscribe link, which is an HMAC over a learner and a kind, and the bounce
  webhook, which is the provider's signature over a message this deployment
  sent. Both are right to trust what they are handed, and neither can tell
  from it whether the account it names still exists. A letter stays in an
  inbox for as long as its reader keeps it, so the unsubscribe link is pressed
  after `deleteMyAccount` as readily as before it, and an upsert then recreated
  rows keyed on a person every table had just been emptied of. That is the
  erasure promise on /privacy broken by the one kind of caller that never asks
  who is signed in.

  `EmailSend` is the answer, and it is a fact rather than a guess. Every link
  that reached a mailbox was minted for a letter whose row was written before
  the letter was posted (`lib/mailer/run.ts`), the row lives until the account
  is deleted (`docs/25-data-retention.md`), and erasure deletes it. So "this
  learner has an `EmailSend` row" is exactly "this deployment wrote to them and
  they have not left".

  AND IT IS ASKED UNDER A LOCK, BECAUSE THE CLICK AND THE ERASURE CAN MEET.
  The row is read `FOR SHARE` inside the same transaction as the write. Where
  the lock is taken first, erasure's delete of that row waits for this write to
  commit, and erasure deletes `EmailSend` before `Setting`, so its sweep of the
  settings then finds this row and takes it. Where erasure's delete comes
  first, this read waits for erasure to commit and then finds nothing. Neither
  order leaves a row behind; the ordering in `deleteMyAccount` is half of this
  and says so there.

  Returns whether anything was written, so a caller can tell, though neither
  route says so to its reader: a page that answered differently for a person
  who has left would be a way to find out who has.
*/
export async function writeSettingsWhileMailed(
  ownerId: string,
  rows: ReadonlyArray<{ key: string; value: string }>,
): Promise<boolean> {
  const wrote = await prisma.$transaction(async (tx) => {
    const held = await tx.$queryRaw<Array<{ one: number }>>`
      SELECT 1 AS one FROM "EmailSend" WHERE "ownerId" = ${ownerId} LIMIT 1 FOR SHARE
    `;
    if (held.length === 0) return false;
    for (const { key, value } of rows) {
      await tx.setting.upsert({
        where: { ownerId_key: { ownerId, key } },
        create: { ownerId, key, value },
        update: { value },
      });
    }
    return true;
  });
  // A request holds one read of a learner's settings, so the store is told.
  if (wrote) forgetSettings(ownerId);
  return wrote;
}
