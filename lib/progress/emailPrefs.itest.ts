import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { EMAIL_KINDS } from "@/lib/email/letter";
import { emailPrefsFrom, switchOff, switchOn, wants } from "@/lib/email/prefs";
import { SETTING_KEYS } from "@/lib/settings/store";
import { changeEmailPrefs } from "./emailPrefs";

/**
 * Switching letters off from two doors at once, against a database, because a
 * lost write is invisible to anything that runs one request at a time.
 */

const MINE = "itest-owner-email-prefs";
const KINDS = EMAIL_KINDS.filter((kind) => kind !== "system");

async function wipe() {
  await prisma.setting.deleteMany({ where: { ownerId: MINE } });
}

async function stored() {
  const rows = await prisma.setting.findMany({
    where: { ownerId: MINE, key: { in: [SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn] } },
  });
  const rowFor = (key: string) => rows.find((row) => row.key === key)?.value ?? null;
  return emailPrefsFrom(rowFor(SETTING_KEYS.emailsOff), rowFor(SETTING_KEYS.emailsOn));
}

describe("changeEmailPrefs", () => {
  beforeEach(wipe);
  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  it("keeps every opt-out when several arrive at once", async () => {
    for (let round = 0; round < 3; round++) {
      await wipe();
      await Promise.all(KINDS.map((kind) => changeEmailPrefs(MINE, (p) => switchOff(p, [kind]))));
      const prefs = await stored();
      expect(KINDS.filter((kind) => wants(prefs, kind))).toEqual([]);
    }
  });

  it("does not let an opt-in written at the same moment undo an unsubscribe of another kind", async () => {
    for (let round = 0; round < 3; round++) {
      await wipe();
      await Promise.all([
        changeEmailPrefs(MINE, (p) => switchOn(p, "wordday")),
        ...KINDS.filter((k) => k !== "wordday").map((kind) =>
          changeEmailPrefs(MINE, (p) => switchOff(p, [kind])),
        ),
      ]);
      const prefs = await stored();
      expect(KINDS.filter((kind) => wants(prefs, kind))).toEqual(["wordday"]);
    }
  });
});
