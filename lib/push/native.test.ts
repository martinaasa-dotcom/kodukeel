/*
  REMINDERS ON A PHONE (N-9), DRIVEN WITHOUT A PHONE OR A NETWORK.

  What a phone is sent, in Firebase's envelope, and the sender against a stub
  that plays Google: the token exchange, a send, and the three answers that
  matter, delivered, gone and refused. The signature on the assertion is
  checked with the account's public half, the way Google checks it, so a
  token that would be refused for a bad signature fails here first.
*/
import { createVerify, generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import type { Letter } from "@/lib/email/letter";
import { PUSH_TTL_SECONDS } from "./kinds";
import { fcmRequestBody, nativeMessageFor } from "./native";
import { fcmConfigFrom, forgetAccessTokens, GOOGLE_TOKEN_URI, sendNative, signedAssertion, tokenGone, type FcmConfig } from "./fcm";

const LETTER: Letter = {
  kind: "tonight",
  subject: "Two steps left in Kodus",
  preheader: "A reading and a round. About ten minutes left.",
  blocks: [
    { t: "heading", text: "Today" },
    { t: "button", label: "Carry on", href: "https://kodukeel.ee/course" },
  ],
};
const NOW = new Date("2026-10-24T18:00:00Z");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const ACCOUNT = { project_id: "kodukeel-test", client_email: "push@kodukeel-test.iam.gserviceaccount.com", private_key: privateKey };
const CONFIG = fcmConfigFrom(JSON.stringify(ACCOUNT)) as FcmConfig;

describe("what a phone is sent", () => {
  it("is the letter's own two lines and its screen, and nothing about the person", () => {
    const message = nativeMessageFor(LETTER, "https://kodukeel.ee");
    expect(message).toEqual({
      title: LETTER.subject,
      body: LETTER.preheader,
      link: "/course",
      kind: "tonight",
      tag: "kodukeel-tonight",
      ttlSeconds: PUSH_TTL_SECONDS.tonight,
    });
  });

  it("goes in Android's block alone for an Android token, private on a locked screen", () => {
    const body = fcmRequestBody("tok", "android", nativeMessageFor(LETTER, "https://kodukeel.ee"), NOW) as { message: Record<string, unknown> };
    expect(body.message).toMatchObject({
      token: "tok",
      notification: { title: LETTER.subject, body: LETTER.preheader },
      data: { link: "/course", kind: "tonight" },
      android: { collapse_key: "kodukeel-tonight", ttl: `${PUSH_TTL_SECONDS.tonight}s`, notification: { visibility: "PRIVATE" } },
    });
    expect(body.message).not.toHaveProperty("apns");
    // Firebase takes only strings in `data`.
    expect(Object.values(body.message.data as object).every((v) => typeof v === "string")).toBe(true);
  });

  it("goes in Apple's block alone for an iPhone token, expiring when the reminder stops being true", () => {
    const body = fcmRequestBody("tok", "ios", nativeMessageFor(LETTER, "https://kodukeel.ee"), NOW) as { message: { apns: { headers: Record<string, string> } } };
    expect(body.message).not.toHaveProperty("android");
    expect(body.message.apns.headers["apns-collapse-id"]).toBe("kodukeel-tonight");
    expect(Number(body.message.apns.headers["apns-expiration"])).toBe(NOW.getTime() / 1000 + PUSH_TTL_SECONDS.tonight!);
  });
});

describe("the service account", () => {
  it("is read as JSON or as base64, and refused when it is not an account", () => {
    expect(CONFIG).toMatchObject({ projectId: "kodukeel-test", clientEmail: ACCOUNT.client_email });
    expect(fcmConfigFrom(Buffer.from(JSON.stringify(ACCOUNT)).toString("base64"))).toEqual(CONFIG);
    expect(fcmConfigFrom(undefined)).toBeNull();
    expect(fcmConfigFrom("")).toBeNull();
    expect(fcmConfigFrom("not an account")).toBeNull();
    expect(fcmConfigFrom(JSON.stringify({ ...ACCOUNT, private_key: "nope" }))).toBeNull();
    expect(fcmConfigFrom(JSON.stringify({ ...ACCOUNT, project_id: "Not A Project!" }))).toBeNull();
  });

  it("signs an assertion Google can check with the public half", () => {
    const jwt = signedAssertion(CONFIG, NOW);
    const [head, claims, signature] = jwt.split(".") as [string, string, string];
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const read = JSON.parse(Buffer.from(claims, "base64url").toString());
    expect(read).toMatchObject({ iss: ACCOUNT.client_email, aud: GOOGLE_TOKEN_URI, iat: NOW.getTime() / 1000, exp: NOW.getTime() / 1000 + 3600 });
    expect(read.scope).toBe("https://www.googleapis.com/auth/firebase.messaging");
    expect(createVerify("RSA-SHA256").update(`${head}.${claims}`).verify(publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });
});

/** Google, as far as the sender is concerned: a token address and a send address. */
function google(send: () => Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const transport = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url) === GOOGLE_TOKEN_URI) return Response.json({ access_token: "access-1", expires_in: 3600 });
    return send();
  }) as typeof fetch;
  return { transport, calls };
}

describe("the sender", () => {
  beforeEach(forgetAccessTokens);
  const PHONE = { token: "phone-token-123456789012345", platform: "android" as const };
  const MESSAGE = nativeMessageFor(LETTER, "https://kodukeel.ee");

  it("mints a token once and sends with it", async () => {
    const g = google(() => Response.json({ name: "projects/kodukeel-test/messages/1" }));
    expect(await sendNative(PHONE, MESSAGE, CONFIG, g.transport, NOW)).toEqual({ ok: true });
    expect(await sendNative(PHONE, MESSAGE, CONFIG, g.transport, NOW)).toEqual({ ok: true });
    expect(g.calls.filter((c) => c.url === GOOGLE_TOKEN_URI)).toHaveLength(1);
    const sends = g.calls.filter((c) => c.url !== GOOGLE_TOKEN_URI);
    expect(sends.map((c) => c.url)).toEqual([
      "https://fcm.googleapis.com/v1/projects/kodukeel-test/messages:send",
      "https://fcm.googleapis.com/v1/projects/kodukeel-test/messages:send",
    ]);
    expect((sends[0]!.init?.headers as Record<string, string>).authorization).toBe("Bearer access-1");
    expect(JSON.parse(String(sends[0]!.init?.body)).message.token).toBe(PHONE.token);
  });

  it("reads a token Firebase no longer knows as gone", async () => {
    const unregistered = { error: { code: 404, status: "NOT_FOUND", details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } };
    const g = google(() => Response.json(unregistered, { status: 404 }));
    expect(await sendNative(PHONE, MESSAGE, CONFIG, g.transport, NOW)).toMatchObject({ ok: false, gone: true });
    expect(tokenGone(400, { error: { status: "INVALID_ARGUMENT", details: [{ errorCode: "UNREGISTERED" }] } })).toBe(true);
  });

  it("never reads a refusal about this deployment as a dead phone", async () => {
    for (const status of [400, 403, 429, 500, 503]) {
      const g = google(() => Response.json({ error: { status: "PERMISSION_DENIED" } }, { status }));
      forgetAccessTokens();
      expect(await sendNative(PHONE, MESSAGE, CONFIG, g.transport, NOW)).toMatchObject({ ok: false, gone: false });
    }
  });

  it("asks for a new token after Firebase refuses the old one", async () => {
    let first = true;
    const g = google(() => {
      const answer = first ? new Response("", { status: 401 }) : Response.json({ name: "m" });
      first = false;
      return answer;
    });
    expect(await sendNative(PHONE, MESSAGE, CONFIG, g.transport, NOW)).toMatchObject({ ok: false, gone: false });
    expect(await sendNative(PHONE, MESSAGE, CONFIG, g.transport, NOW)).toEqual({ ok: true });
    expect(g.calls.filter((c) => c.url === GOOGLE_TOKEN_URI)).toHaveLength(2);
  });

  it("does not throw when nothing answers, and sends nothing when the token will not mint", async () => {
    const down = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    expect(await sendNative(PHONE, MESSAGE, CONFIG, down, NOW)).toMatchObject({ ok: false, gone: false });
    let sent = 0;
    const refuses = (async (url: string | URL | Request) => {
      if (String(url) === GOOGLE_TOKEN_URI) return Response.json({ error: "invalid_grant" }, { status: 400 });
      sent += 1;
      return Response.json({});
    }) as typeof fetch;
    expect(await sendNative(PHONE, MESSAGE, CONFIG, refuses, NOW)).toMatchObject({ ok: false, gone: false, reason: "token: 400" });
    expect(sent).toBe(0);
  });
});
