import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { unsubscribeLink } from "@/lib/email/unsubscribe";
import { writeSettingsWhileMailed } from "@/lib/mailer/mailedSetting";
import { SETTING_KEYS } from "@/lib/settings/store";

import { POST } from "./route";

/**
 * The unsubscribe link against a real database, because what it may not do is
 * a claim about rows rather than about a function.
 *
 * The link is an HMAC over a learner and a kind, and it works with no session
 * on purpose: a way out that asks somebody to sign in first is one a mail
 * client will not honour. So it keeps working after the account it names has
 * been erased, and a letter sits in an inbox for as long as its reader keeps
 * it. Clicked then, it used to upsert two `Setting` rows keyed on an owner
 * `deleteMyAccount` had just removed from every table, which is the erasure
 * promise on /privacy broken by the one route that never asks who is signed
 * in. A token proves the link was ours; it says nothing about whether the
 * person it names is still here.
 *
 * `EmailSend` is what says so. Every link that reached a mailbox was minted
 * for a letter whose row was written before it was sent, the row lives until
 * the account is deleted, and erasure deletes it. No row, nobody to write to.
 */

const SECRET = "itest-unsubscribe-secret-0123456789";
const ERASED = "itest-unsub-erased";
const MAILED = "itest-unsub-mailed";
const EVERYONE = [ERASED, MAILED];

let previousSecret: string | undefined;

function tokenFor(ownerId: string): URLSearchParams {
  const url = new URL(unsubscribeLink(ownerId, "weekly", "http://localhost", SECRET).url);
  return url.searchParams;
}

function post(ownerId: string): Request {
  return new Request("http://localhost/api/email/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenFor(ownerId).toString(),
  });
}

async function clean() {
  await prisma.setting.deleteMany({ where: { ownerId: { in: EVERYONE } } });
  await prisma.emailSend.deleteMany({ where: { ownerId: { in: EVERYONE } } });
}

beforeAll(() => {
  previousSecret = process.env.EMAIL_TOKEN_SECRET;
  process.env.EMAIL_TOKEN_SECRET = SECRET;
});

beforeEach(clean);

afterAll(async () => {
  await clean();
  if (previousSecret === undefined) delete process.env.EMAIL_TOKEN_SECRET;
  else process.env.EMAIL_TOKEN_SECRET = previousSecret;
});

describe("/api/email/unsubscribe", () => {
  it("writes nothing for a learner this deployment no longer holds", async () => {
    // Erased: every row gone, the letter still in their inbox.
    const response = await POST(post(ERASED));

    expect(response.status).toBe(200);
    // Still the same page, so the route says nothing about who exists.
    expect(await response.text()).toContain("You will not get those emails again.");
    expect(await prisma.setting.count({ where: { ownerId: ERASED } })).toBe(0);
  });

  it("still switches the letters off for a learner who was written to", async () => {
    await prisma.emailSend.create({ data: { ownerId: MAILED, kind: "weekly", dayKey: "2026-09-20" } });

    const response = await POST(post(MAILED));

    expect(response.status).toBe(200);
    const rows = await prisma.setting.findMany({
      where: { ownerId: MAILED }, select: { key: true, value: true },
    });
    expect(rows.map((r) => r.key).sort()).toEqual(
      [SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn].sort(),
    );
    expect(rows.find((r) => r.key === SETTING_KEYS.emailsOff)?.value).toContain("weekly");
  });

  it("writes nothing when the click lands while the account is being erased", async () => {
    /*
      The erasure deletes the letters, holds its transaction open, and only
      then sweeps the settings, which is the order `deleteMyAccount` takes.
      A write that arrives in between has to wait for it and then find nobody,
      or its row would be committed after the sweep and outlive the account.
    */
    await prisma.emailSend.create({ data: { ownerId: ERASED, kind: "weekly", dayKey: "2026-09-21" } });

    let begun!: () => void;
    const erasing = new Promise<void>((resolve) => { begun = resolve; });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });

    const erasure = prisma.$transaction(async (tx) => {
      await tx.emailSend.deleteMany({ where: { ownerId: ERASED } });
      begun();
      await held;
      await tx.setting.deleteMany({ where: { ownerId: ERASED } });
    }, { timeout: 15_000 });

    await erasing;
    const write = writeSettingsWhileMailed(ERASED, [{ key: SETTING_KEYS.emailsOff, value: "weekly" }]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    await erasure;

    expect(await write).toBe(false);
    expect(await prisma.setting.count({ where: { ownerId: ERASED } })).toBe(0);
  });
});
