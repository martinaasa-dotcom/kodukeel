import { prisma } from "@/lib/db";
import { emailOptInTo, emailPrefsFrom, emailPrefsTo, type EmailPrefs } from "@/lib/email/prefs";
import { forgetSettings, SETTING_KEYS } from "@/lib/settings/store";

/*
  WHICH LETTERS A LEARNER GETS IS CHANGED UNDER ONE LOCK, OR AN OPT-OUT IS LOST.

  Three doors write the pair of rows `lib/email/prefs.ts` reads: the switches in
  Settings, the unsubscribe link and a provider's complaint webhook. Each reads
  both rows, works out the new set and writes it back, which is check-then-act:
  two of them inside that gap both read the old set, and the second write puts
  back the kind the first had just switched off. That is a learner who pressed
  "stop these" and goes on getting them, which is the one outcome an
  unsubscribe may never have. Measured against a real database: eight kinds
  switched off at once left two or three of them on.

  So the read and the write are one transaction behind an advisory lock keyed
  on the learner, the shape `lockDeck` takes for the deck. A row lock cannot do
  it, since the rows may not exist yet and `FOR UPDATE` locks nothing that is
  not there.

  AND A DOOR WITH NO SESSION BEHIND IT WRITES ONLY FOR SOMEBODY STILL HERE.
  The unsubscribe link and the complaint webhook name a learner by a signature
  rather than a sign-in, and both keep arriving after `deleteMyAccount`, since a
  letter stays in an inbox. `whileMailed` asks the question
  `lib/mailer/mailedSetting.ts` asks, inside this same transaction: an
  `EmailSend` row read `FOR SHARE`, or nothing is written and this returns
  null. Two locked writers were merged onto these rows on one day and the
  second dropped the first one's check, which recreated settings rows for an
  erased account on every late click; the route's own integration test is what
  said so. The Settings switch has a session and passes nothing.
*/
export async function changeEmailPrefs(
  ownerId: string,
  change: (current: EmailPrefs) => EmailPrefs,
): Promise<EmailPrefs>;
export async function changeEmailPrefs(
  ownerId: string,
  change: (current: EmailPrefs) => EmailPrefs,
  options: { whileMailed: true },
): Promise<EmailPrefs | null>;
export async function changeEmailPrefs(
  ownerId: string,
  change: (current: EmailPrefs) => EmailPrefs,
  options?: { whileMailed: true },
): Promise<EmailPrefs | null> {
  const next = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`emails:${ownerId}`}, 0))`;
    if (options?.whileMailed) {
      const held = await tx.$queryRaw<Array<{ one: number }>>`
        SELECT 1 AS one FROM "EmailSend" WHERE "ownerId" = ${ownerId} LIMIT 1 FOR SHARE
      `;
      if (held.length === 0) return null;
    }
    const rows = await tx.setting.findMany({
      where: { ownerId, key: { in: [SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn] } },
      select: { key: true, value: true },
    });
    const rowFor = (key: string) => rows.find((row) => row.key === key)?.value ?? null;
    const updated = change(emailPrefsFrom(rowFor(SETTING_KEYS.emailsOff), rowFor(SETTING_KEYS.emailsOn)));
    const off = emailPrefsTo(updated);
    const on = emailOptInTo(updated);
    await tx.setting.upsert({
      where: { ownerId_key: { ownerId, key: SETTING_KEYS.emailsOff } },
      create: { ownerId, key: SETTING_KEYS.emailsOff, value: off },
      update: { value: off },
    });
    await tx.setting.upsert({
      where: { ownerId_key: { ownerId, key: SETTING_KEYS.emailsOn } },
      create: { ownerId, key: SETTING_KEYS.emailsOn, value: on },
      update: { value: on },
    });
    return updated;
  });
  // The request's memoised read is now stale; see `forgetSettings`.
  if (next) forgetSettings(ownerId);
  return next;
}
