import { createECDH, generateKeyPairSync, randomBytes } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import webpush from "web-push";

import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings/store";
import { rememberDevice } from "@/lib/progress/push";
import { registerNativeDevice } from "@/lib/progress/nativePush";
import { changeEmailPrefs } from "@/lib/progress/emailPrefs";
import { switchOn } from "@/lib/email/prefs";
import { forgetAccessTokens, GOOGLE_TOKEN_URI } from "@/lib/push/fcm";
import { readSubscription } from "@/lib/push/subscription";
import { runMailout } from "./run";

/**
 * THE RUN, SENDING A REMINDER TO A PHONE, AGAINST A REAL DATABASE (N-9).
 *
 * The order is driven over a week in `lib/email/schedule.test.ts` and the
 * sender against a stub in `lib/push/native.test.ts`. What neither sees is the
 * run joining them: a learner with a phone and a computer both registered is
 * sent one kind on one channel, the phone, booked as `native` before the
 * send; a second run that morning sends nothing on any channel; and a token
 * Firebase calls gone is taken out. Firebase is a stub that answers the token
 * exchange and keeps every message it is sent.
 */

const OWNER = "itest-owner-native";
const MORNING = new Date("2026-09-16T08:30:00.000Z");
const TOKEN = `itest-native-${randomBytes(12).toString("hex")}`;

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const VAPID = webpush.generateVAPIDKeys();
const ENV = {
  FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: "itest-project", client_email: "itest@itest.example.invalid", private_key: privateKey }),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: VAPID.publicKey,
  VAPID_PRIVATE_KEY: VAPID.privateKey,
  VAPID_SUBJECT: "mailto:ops@example.invalid",
  RESEND_API_KEY: "",
  NEXT_PUBLIC_SITE_URL: "",
};
const saved = Object.fromEntries(Object.keys(ENV).map((key) => [key, process.env[key]]));

interface Sent { readonly token: string; readonly title: string; readonly body: string; readonly link: string; readonly kind: string }

/** Firebase: the token address and the send address, answering `status` to a send. */
function firebase(status = 200, answer: unknown = { name: "projects/itest-project/messages/1" }) {
  const sent: Sent[] = [];
  const transport = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === GOOGLE_TOKEN_URI) return Response.json({ access_token: "itest-access", expires_in: 3600 });
    const body = JSON.parse(String(init?.body)) as { message: { token: string; notification: { title: string; body: string }; data: { link: string; kind: string } } };
    sent.push({ token: body.message.token, ...body.message.notification, ...body.message.data });
    return Response.json(answer, { status });
  }) as typeof fetch;
  return { transport, sent };
}

/** A browser's push service that only counts what it is sent. */
function browsers() {
  let count = 0;
  const transport = (async () => { count += 1; return new Response(null, { status: 201 }); }) as typeof fetch;
  return { transport, count: () => count };
}

async function wipe() {
  await prisma.emailSend.deleteMany({ where: { ownerId: OWNER } });
  await prisma.pushSubscription.deleteMany({ where: { ownerId: OWNER } });
  await prisma.nativePushDevice.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
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
  forgetAccessTokens();
  await prisma.setting.create({
    data: { ownerId: OWNER, key: SETTING_KEYS.onboardedAt, value: new Date(MORNING.getTime() - 10 * 86_400_000).toISOString() },
  });
  await changeEmailPrefs(OWNER, (current) => switchOn(current, "wordday"));
  // A computer and a phone, both asking: D13 sends to the phone and nowhere else.
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  await rememberDevice(OWNER, readSubscription({
    endpoint: `https://fcm.googleapis.com/fcm/send/itest-${randomBytes(6).toString("hex")}`,
    keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") },
  })!);
  await registerNativeDevice(OWNER, { token: TOKEN, platform: "android", appBuild: "android/12" }, MORNING);
});
afterEach(wipe);

describe("a reminder sent to a phone", () => {
  it("goes to the phone alone, as the letter's own two lines, booked as native before the send", async () => {
    const phone = firebase();
    const computer = browsers();
    const report = await runMailout(MORNING, { fcmTransport: phone.transport, pushTransport: computer.transport });

    expect(report.skipped).toBeNull();
    expect(report.phoned).toBe(1);
    expect(report.pushed).toBe(0);
    expect(computer.count()).toBe(0);
    expect(phone.sent).toHaveLength(1);
    const [message] = phone.sent as [Sent];
    expect(message.token).toBe(TOKEN);
    expect(message.kind).toBe("wordday");
    expect(message.title).toMatch(/: /);
    expect(message.link).toMatch(/^\/dictionary\?q=/);

    const booked = await prisma.emailSend.findMany({ where: { ownerId: OWNER } });
    expect(booked.map((row) => [row.kind, row.channel])).toEqual([["wordday", "native"]]);
  });

  it("is sent once a day on one channel, so a second run that morning sends nothing anywhere", async () => {
    const phone = firebase();
    const computer = browsers();
    await runMailout(MORNING, { fcmTransport: phone.transport, pushTransport: computer.transport });
    await runMailout(new Date(MORNING.getTime() + 30 * 60_000), { fcmTransport: phone.transport, pushTransport: computer.transport });
    expect(phone.sent).toHaveLength(1);
    expect(computer.count()).toBe(0);
  });

  it("lets go of a token Firebase reports gone, and spends the slot", async () => {
    const phone = firebase(404, { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } });
    const report = await runMailout(MORNING, { fcmTransport: phone.transport, pushTransport: browsers().transport });
    expect(report.failed).toBe(1);
    expect(await prisma.nativePushDevice.count({ where: { ownerId: OWNER } })).toBe(0);
    expect(await prisma.emailSend.count({ where: { ownerId: OWNER, channel: "native" } })).toBe(1);
  });

  it("falls to the computer once no phone is registered", async () => {
    await prisma.nativePushDevice.deleteMany({ where: { ownerId: OWNER } });
    const phone = firebase();
    const computer = browsers();
    const report = await runMailout(MORNING, { fcmTransport: phone.transport, pushTransport: computer.transport });
    expect(phone.sent).toHaveLength(0);
    expect(computer.count()).toBe(1);
    expect(report.pushed).toBe(1);
  });
});
