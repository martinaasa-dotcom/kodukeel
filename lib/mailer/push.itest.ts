import { createDecipheriv, createECDH, createHmac, randomBytes, type ECDH } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import webpush from "web-push";

import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings/store";
import { rememberDevice } from "@/lib/progress/push";
import { changeEmailPrefs } from "@/lib/progress/emailPrefs";
import { switchOff, switchOn } from "@/lib/email/prefs";
import { readSubscription } from "@/lib/push/subscription";
import { runMailout } from "./run";

/**
 * THE RUN, SENDING A REMINDER TO A COMPUTER, AGAINST A REAL DATABASE.
 *
 * The decision is driven in `lib/email/schedule.test.ts` and the protocol in
 * `lib/push/push.test.ts`. What neither can see is the run that joins them:
 * the booking written before the post, one channel per kind per day held by
 * the database's own key, a browser its push service calls gone being taken
 * out, and a kind switched off reaching nobody. The push service is a stub
 * that decrypts what it receives with the browser's own key, so "received" is
 * the same claim a browser would make.
 *
 * A deployment with no email configured at all, on purpose: it is the case
 * the run used to stop dead on, and a notification needs no address.
 */

const OWNER = "itest-owner-push";
// Wednesday, eight in the morning where the learner is (no zone set reads UTC),
// which is the window the word of the day goes out in.
const MORNING = new Date("2026-09-16T08:30:00.000Z");
const NEXT_MORNING = new Date("2026-09-17T08:30:00.000Z");

const VAPID = webpush.generateVAPIDKeys();
const ENV = {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: VAPID.publicKey,
  VAPID_PRIVATE_KEY: VAPID.privateKey,
  VAPID_SUBJECT: "mailto:ops@example.invalid",
  RESEND_API_KEY: "",
  NEXT_PUBLIC_SITE_URL: "",
};
const saved = Object.fromEntries(Object.keys(ENV).map((key) => [key, process.env[key]]));

/** RFC 8291 decryption, as a browser does it. See `lib/push/push.test.ts`. */
function decryptAsBrowser(body: Buffer, browserKey: ECDH, authSecret: Buffer): string {
  const hmac = (key: Buffer, data: Buffer) => createHmac("sha256", key).update(data).digest();
  const salt = body.subarray(0, 16);
  const idLength = body[20]!;
  const senderKey = body.subarray(21, 21 + idLength);
  const record = body.subarray(21 + idLength);
  const prkKey = hmac(authSecret, browserKey.computeSecret(senderKey));
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0"), browserKey.getPublicKey(), senderKey, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12);
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(record.subarray(record.length - 16));
  const padded = Buffer.concat([decipher.update(record.subarray(0, record.length - 16)), decipher.final()]);
  return padded.subarray(0, padded.lastIndexOf(2)).toString("utf8");
}

const browserKey = createECDH("prime256v1");
browserKey.generateKeys();
const authSecret = randomBytes(16);
const ENDPOINT = `https://fcm.googleapis.com/fcm/send/itest-${randomBytes(6).toString("hex")}`;

/** A push service that answers with `status` and keeps what it was sent. */
function pushService(status = 201) {
  const received: { url: string; message: { title: string; body: string; url: string; tag: string } }[] = [];
  const transport = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = Buffer.from(init?.body as Uint8Array);
    received.push({ url: String(url), message: JSON.parse(decryptAsBrowser(body, browserKey, authSecret)) });
    return new Response(null, { status });
  }) as typeof fetch;
  return { transport, received };
}

async function wipe() {
  await prisma.emailSend.deleteMany({ where: { ownerId: OWNER } });
  await prisma.pushSubscription.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
}

async function setting(key: string, value: string) {
  await prisma.setting.create({ data: { ownerId: OWNER, key, value } });
}

beforeAll(() => {
  Object.assign(process.env, ENV);
});
afterAll(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await wipe();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await wipe();
  // Finished first run ten days ago: on the roster, and past the welcome.
  await setting(SETTING_KEYS.onboardedAt, new Date(MORNING.getTime() - 10 * 86_400_000).toISOString());
  // The one letter that is off until asked for, asked for, through the one
  // door every preference change goes through.
  await changeEmailPrefs(OWNER, (current) => switchOn(current, "wordday"));
  await rememberDevice(OWNER, readSubscription({
    endpoint: ENDPOINT,
    keys: { p256dh: browserKey.getPublicKey().toString("base64url"), auth: authSecret.toString("base64url") },
  })!);
});
afterEach(wipe);

describe("a reminder pushed to a computer", () => {
  it("arrives, readable only by that browser, as the letter's own two lines and its screen", async () => {
    const service = pushService();
    const report = await runMailout(MORNING, { pushTransport: service.transport });

    expect(report.skipped).toBeNull();
    expect(report.emailOff).toMatch(/RESEND_API_KEY/);
    expect(service.received).toHaveLength(1);
    const [{ url, message }] = service.received as [(typeof service.received)[number]];
    expect(url).toBe(ENDPOINT);
    expect(message.tag).toBe("kodukeel-wordday");
    expect(message.title).toMatch(/: /);
    expect(message.url).toMatch(/^\/dictionary\?q=/);

    const booked = await prisma.emailSend.findMany({ where: { ownerId: OWNER } });
    expect(booked.map((row) => [row.kind, row.channel, row.messageId])).toEqual([["wordday", "push", null]]);
  });

  it("is booked once a day, whichever way it would go, so a second run sends nothing", async () => {
    const service = pushService();
    await runMailout(MORNING, { pushTransport: service.transport });
    await runMailout(new Date(MORNING.getTime() + 30 * 60_000), { pushTransport: service.transport });
    expect(service.received).toHaveLength(1);

    // And the database refuses a second booking of the same kind on the same
    // day by any channel, which is the half of "never both" the schema holds.
    await expect(
      prisma.emailSend.create({ data: { ownerId: OWNER, kind: "wordday", dayKey: "2026-09-16", channel: "email" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("reaches nobody when the kind is switched off", async () => {
    await changeEmailPrefs(OWNER, (current) => switchOff(current, ["wordday"]));
    const service = pushService();
    const report = await runMailout(MORNING, { pushTransport: service.transport });
    expect(service.received).toHaveLength(0);
    expect(report.pushed).toBe(0);
    expect(await prisma.emailSend.count({ where: { ownerId: OWNER } })).toBe(0);
  });

  it("lets go of a browser its push service says is gone", async () => {
    const service = pushService(410);
    const report = await runMailout(NEXT_MORNING, { pushTransport: service.transport });
    expect(service.received).toHaveLength(1);
    expect(report.failed).toBe(1);
    expect(await prisma.pushSubscription.count({ where: { ownerId: OWNER } })).toBe(0);
    // The slot is spent, as a failed letter's is: a missed reminder, not a duplicate.
    expect(await prisma.emailSend.count({ where: { ownerId: OWNER, channel: "push" } })).toBe(1);
  });
});

describe("the browsers a learner may keep", () => {
  it("moves a shared browser to whoever turned it on last, and keeps at most ten each", async () => {
    const other = "itest-owner-push-other";
    try {
      const device = readSubscription({
        endpoint: ENDPOINT,
        keys: { p256dh: browserKey.getPublicKey().toString("base64url"), auth: authSecret.toString("base64url") },
      })!;
      await rememberDevice(other, device);
      expect(await prisma.pushSubscription.findUnique({ where: { endpoint: ENDPOINT } })).toMatchObject({ ownerId: other });

      for (let i = 0; i < 12; i += 1) {
        await rememberDevice(other, { ...device, endpoint: `${ENDPOINT}-${i}` });
      }
      expect(await prisma.pushSubscription.count({ where: { ownerId: other } })).toBe(10);
    } finally {
      await prisma.pushSubscription.deleteMany({ where: { ownerId: other } });
    }
  });
});
