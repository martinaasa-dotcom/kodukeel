/*
  REMINDERS ON A COMPUTER (VB-10), DRIVEN WITHOUT A BROWSER OR A NETWORK.

  The half of Web Push that can go wrong silently is all here: which kinds
  have a short form, which addresses this server will ever post to, what a
  notification says, and whether what is posted is something a browser could
  actually read. The last one is checked the way a browser checks it: by
  holding the private key a subscription was made with and decrypting the body
  the push service would have carried.
*/
import { createDecipheriv, createECDH, createHmac, randomBytes, type ECDH } from "node:crypto";
import { describe, expect, it } from "vitest";
import webpush from "web-push";

import { EMAIL_KINDS, type Letter } from "@/lib/email/letter";
import { LETTER_ONLY, PUSH_KINDS, PUSH_TTL_SECONDS } from "./kinds";
import { endpointAllowed, readEndpoint, readSubscription, PUSH_SERVICE_HOSTS } from "./subscription";
import { pushConfigFrom } from "./config";
import { BODY_MAX, notificationFor, pathWithin, TITLE_MAX } from "./notification";
import { sendPush } from "./send";

/**
 * What a browser does with a push message body (RFC 8291 over RFC 8188),
 * written out here rather than borrowed from the library that encrypted it,
 * so the check is a second implementation rather than the first one agreeing
 * with itself.
 */
function decryptAsBrowser(body: Buffer, browserKey: ECDH, authSecret: Buffer): string {
  const hmac = (key: Buffer, data: Buffer) => createHmac("sha256", key).update(data).digest();
  const salt = body.subarray(0, 16);
  const idLength = body[20]!;
  const senderKey = body.subarray(21, 21 + idLength);
  const record = body.subarray(21 + idLength);

  const shared = browserKey.computeSecret(senderKey);
  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), browserKey.getPublicKey(), senderKey, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12);

  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(record.subarray(record.length - 16));
  const padded = Buffer.concat([decipher.update(record.subarray(0, record.length - 16)), decipher.final()]);
  // The last record ends with a 0x02 delimiter and any zero padding after it.
  return padded.subarray(0, padded.lastIndexOf(2)).toString("utf8");
}

/** A browser, as far as the protocol is concerned: a key pair and a secret. */
function browser(endpoint = "https://fcm.googleapis.com/fcm/send/abc123") {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return {
    ecdh,
    auth,
    subscription: {
      endpoint,
      keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: auth.toString("base64url") },
    },
  };
}

const VAPID = webpush.generateVAPIDKeys();
const CONFIG = pushConfigFrom({ publicKey: VAPID.publicKey, privateKey: VAPID.privateKey, subject: "mailto:ops@example.ee" })!;

const LETTER: Letter = {
  kind: "tonight",
  subject: "Two steps left in Kodus",
  preheader: "A reading and a round. About ten minutes left.",
  blocks: [
    { t: "heading", text: "Tonight" },
    { t: "button", label: "Carry on", href: "https://kodukeel.ee/course" },
    { t: "link", label: "Elsewhere", href: "https://kodukeel.ee/progress" },
  ],
};

describe("which letters have a short form", () => {
  it("names every kind exactly once, pushed or kept a letter with a reason", () => {
    for (const kind of EMAIL_KINDS) {
      const pushed = PUSH_KINDS.includes(kind);
      const kept = Object.hasOwn(LETTER_ONLY, kind);
      expect(pushed !== kept, `${kind} is in ${pushed && kept ? "both lists" : "neither list"}`).toBe(true);
      if (kept) expect((LETTER_ONLY[kind] ?? "").length).toBeGreaterThan(60);
    }
  });

  it("pushes the evening nudge, and gives every pushed kind a lifetime", () => {
    expect(PUSH_KINDS).toContain("tonight");
    for (const kind of PUSH_KINDS) expect(PUSH_TTL_SECONDS[kind]).toBeGreaterThan(0);
    // An evening nudge delivered the next morning is asking somebody to study an evening that is over.
    expect(PUSH_TTL_SECONDS.tonight).toBeLessThanOrEqual(4 * 3600);
  });

  it("never pushes the sign-in link", () => {
    expect(PUSH_KINDS).not.toContain("system");
  });
});

describe("the addresses this server will post to", () => {
  it("takes the four browser makers' push services", () => {
    for (const url of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/QGx",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(endpointAllowed(url), url).toBe(true);
    }
    expect(PUSH_SERVICE_HOSTS.map((s) => s.runBy)).toEqual(["Google", "Mozilla", "Apple", "Microsoft"]);
  });

  it("refuses anything else, which is a request forged on the learner's behalf", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com:8443/fcm/send/abc",
      "https://user:pw@fcm.googleapis.com/fcm/send/abc",
      "https://evilfcm.googleapis.com.example/x",
      "https://fcm.googleapis.com.example/x",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost/push",
      "https://android.googleapis.com/gcm/send/abc",
      `https://fcm.googleapis.com/${"a".repeat(1100)}`,
      "not a url",
      "",
    ]) {
      expect(endpointAllowed(url), url).toBe(false);
    }
    expect(readEndpoint(42)).toBeNull();
  });
});

describe("what a browser hands over", () => {
  it("is read when it is an address and two keys", () => {
    const { subscription } = browser();
    expect(readSubscription({ ...subscription, expirationTime: null })).toEqual({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  });

  it("is refused when any part of it is wrong", () => {
    const { subscription } = browser();
    const offCurve = Buffer.alloc(65, 7);
    offCurve[0] = 0x04;
    for (const bad of [
      null,
      "a string",
      { endpoint: subscription.endpoint },
      { ...subscription, endpoint: "https://example.com/push" },
      { ...subscription, keys: { ...subscription.keys, p256dh: "short" } },
      { ...subscription, keys: { ...subscription.keys, p256dh: offCurve.toString("base64url") } },
      { ...subscription, keys: { ...subscription.keys, auth: randomBytes(15).toString("base64url") } },
      { ...subscription, keys: { ...subscription.keys, auth: "not/base64url!" } },
    ]) {
      expect(readSubscription(bad)).toBeNull();
    }
  });
});

describe("whether this deployment can push", () => {
  it("needs both halves of the key pair, the right shape, and somebody to name", () => {
    expect(pushConfigFrom({})).toBeNull();
    expect(pushConfigFrom({ publicKey: VAPID.publicKey, subject: "mailto:a@b.ee" })).toBeNull();
    expect(pushConfigFrom({ publicKey: VAPID.privateKey, privateKey: VAPID.privateKey, subject: "mailto:a@b.ee" })).toBeNull();
    expect(pushConfigFrom({ publicKey: VAPID.publicKey, privateKey: VAPID.privateKey })).toBeNull();
    expect(pushConfigFrom({ publicKey: VAPID.publicKey, privateKey: VAPID.privateKey, site: "http://localhost:3000" })).toBeNull();
  });

  it("names the operator by the first contact it has", () => {
    const keys = { publicKey: VAPID.publicKey, privateKey: VAPID.privateKey };
    expect(pushConfigFrom({ ...keys, subject: "mailto:ops@example.ee", site: "https://kodukeel.ee" })?.subject).toBe("mailto:ops@example.ee");
    expect(pushConfigFrom({ ...keys, site: "https://kodukeel.ee" })?.subject).toBe("https://kodukeel.ee");
    expect(pushConfigFrom({ ...keys, operator: "hei@kodukeel.ee" })?.subject).toBe("mailto:hei@kodukeel.ee");
  });
});

describe("a notification is the letter's own first two lines", () => {
  it("is the subject, the preheader and the button's screen", () => {
    expect(notificationFor(LETTER, "https://kodukeel.ee")).toEqual({
      title: LETTER.subject,
      body: LETTER.preheader,
      url: "/course",
      tag: "kodukeel-tonight",
    });
  });

  it("falls back to the first link where a letter has no button, which the word of the day has not", () => {
    const wordday: Letter = {
      ...LETTER,
      kind: "wordday",
      blocks: [{ t: "link", label: "See it", href: "https://kodukeel.ee/dictionary?q=kodu" }],
    };
    expect(notificationFor(wordday, "https://kodukeel.ee").url).toBe("/dictionary?q=kodu");
  });

  it("never opens another site", () => {
    expect(pathWithin("https://evil.example/course", "https://kodukeel.ee")).toBe("/");
    expect(pathWithin("//evil.example/x", "https://kodukeel.ee")).toBe("/");
    expect(pathWithin("javascript:alert(1)", "https://kodukeel.ee")).toBe("/");
    expect(pathWithin("/course", "")).toBe("/course");
  });

  it("is cut to a size a push service accepts", () => {
    const long = notificationFor({ ...LETTER, subject: "s".repeat(500), preheader: "p".repeat(900) }, "");
    expect([...long.title].length).toBeLessThanOrEqual(TITLE_MAX);
    expect([...long.body].length).toBeLessThanOrEqual(BODY_MAX);
  });
});

describe("what is posted to the push service", () => {
  it("is something only the browser it was made for can read", async () => {
    const device = browser();
    const kept = readSubscription(device.subscription)!;
    let posted: { url: string; init: RequestInit } | null = null;
    const transport = (async (url: string | URL | Request, init?: RequestInit) => {
      posted = { url: String(url), init: init ?? {} };
      return new Response(null, { status: 201 });
    }) as typeof fetch;

    const message = notificationFor(LETTER, "https://kodukeel.ee");
    const result = await sendPush(kept, message, { ttlSeconds: 3600, topic: "tonight" }, CONFIG, transport);
    expect(result).toEqual({ ok: true });
    expect(posted).not.toBeNull();
    const { url, init } = posted!;
    expect(url).toBe(device.subscription.endpoint);
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Encoding"]).toBe("aes128gcm");
    expect(headers.TTL).toBe("3600");
    expect(headers.Topic).toBe("tonight");
    expect(headers.Authorization).toMatch(/^vapid t=.+, k=/);
    expect(init.redirect).toBe("manual");

    const body = Buffer.from(init.body as Uint8Array);
    // Ciphertext, not the message: nothing in it reads as the subject.
    expect(body.toString("utf8")).not.toContain(LETTER.subject);
    expect(JSON.parse(decryptAsBrowser(body, device.ecdh, device.auth))).toEqual(message);
    // And a browser holding some other key cannot read it at all.
    expect(() => decryptAsBrowser(body, browser().ecdh, device.auth)).toThrow();
  });

  it("reads 404 and 410 as a browser that is gone, and nothing else", async () => {
    const kept = readSubscription(browser().subscription)!;
    const message = notificationFor(LETTER, "");
    const answer = (status: number) => (async () => new Response("no", { status })) as unknown as typeof fetch;
    for (const status of [404, 410]) {
      expect(await sendPush(kept, message, { ttlSeconds: 60, topic: "tonight" }, CONFIG, answer(status))).toMatchObject({ ok: false, gone: true });
    }
    for (const status of [400, 401, 403, 413, 429, 500, 503]) {
      expect(await sendPush(kept, message, { ttlSeconds: 60, topic: "tonight" }, CONFIG, answer(status))).toMatchObject({ ok: false, gone: false });
    }
    const failing = (async () => {
      throw new Error("socket hang up");
    }) as unknown as typeof fetch;
    expect(await sendPush(kept, message, { ttlSeconds: 60, topic: "tonight" }, CONFIG, failing)).toMatchObject({ ok: false, gone: false });
  });

  it("never posts to an address off the list, whatever the row says", async () => {
    let called = false;
    const transport = (async () => {
      called = true;
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;
    const row = { ...readSubscription(browser().subscription)!, endpoint: "https://169.254.169.254/x" };
    expect(await sendPush(row, notificationFor(LETTER, ""), { ttlSeconds: 60, topic: "tonight" }, CONFIG, transport)).toMatchObject({ ok: false, gone: true });
    expect(called).toBe(false);
  });
});
