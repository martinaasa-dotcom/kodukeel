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
*/
export async function changeEmailPrefs(
  ownerId: string,
  change: (current: EmailPrefs) => EmailPrefs,
): Promise<EmailPrefs> {
  const next = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`emails:${ownerId}`}, 0))`;
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
  forgetSettings(ownerId);
  return next;
}
