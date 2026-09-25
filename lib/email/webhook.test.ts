/*
  A PUBLIC ENDPOINT THAT DECIDES WHETHER THIS APP WILL WRITE TO SOMEBODY.

  Forging one is worth doing in both directions: stopping a stranger's mail, or
  finding a way to write to the settings table. So the signature is the whole
  control, and these drive it with signatures built the way the provider builds
  them rather than with a stub that agrees with the implementation.
*/
import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  addressDigest,
  undeliverableValue,
  BLOCKED_ANY,
  blocks,
  readDelivery,
  TOLERANCE_SECONDS,
  verifyDelivery,
  webhookSecret,
} from "./webhook";

/** A `whsec_` secret, as a dashboard hands one over. */
const KEY = Buffer.from("a-thirty-two-byte-key-for-testing").toString("base64");
const SECRET = `whsec_${KEY}`;
const NOW = new Date("2026-09-18T12:00:00Z");
const AT = String(Math.floor(NOW.getTime() / 1000));

/** The provider's own scheme: base64 HMAC-SHA256 over `id.timestamp.body`. */
function sign(id: string, timestamp: string, body: string, secret = SECRET): string {
  const key = Buffer.from(secret.slice(secret.indexOf("_") + 1), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

const BODY = JSON.stringify({
  type: "email.bounced",
  created_at: "2026-09-18T12:00:00.000Z",
  data: { email_id: "56761188-7520-42d8-8898-ff6fc54ce618", to: ["mari@example.ee"], bounce: { type: "Permanent", subType: "Suppressed" } },
});

const good = (over: Partial<{ id: string; timestamp: string; signature: string }> = {}) => ({
  id: "msg_123",
  timestamp: AT,
  signature: `v1,${sign("msg_123", AT, BODY)}`,
  ...over,
});

describe("verifying a delivery", () => {
  it("accepts one the provider really signed", () => {
    expect(verifyDelivery(good(), BODY, SECRET, NOW)).toBe(true);
  });

  it("refuses one signed with a different secret", () => {
    const other = `whsec_${Buffer.from("a-completely-different-signing-key").toString("base64")}`;
    const forged = { ...good(), signature: `v1,${sign("msg_123", AT, BODY, other)}` };
    expect(verifyDelivery(forged, BODY, SECRET, NOW)).toBe(false);
  });

  it("refuses one whose body was changed after signing", () => {
    /*
      The reason the route reads the raw text and parses afterwards. Re-
      serialising the JSON changes the bytes, and the signature is over bytes.
    */
    const tampered = BODY.replace("Permanent", "Transient");
    expect(verifyDelivery(good(), tampered, SECRET, NOW)).toBe(false);
  });

  it("refuses one whose id or timestamp was changed after signing", () => {
    // Both are inside the signed content, so neither can be swapped for
    // another delivery's.
    expect(verifyDelivery({ ...good(), id: "msg_999" }, BODY, SECRET, NOW)).toBe(false);
    expect(verifyDelivery({ ...good(), timestamp: String(Number(AT) + 1) }, BODY, SECRET, NOW)).toBe(false);
  });

  it("refuses a replay of a delivery that really was signed", () => {
    /*
      A captured delivery is valid for ever without a tolerance window, so this
      is the check that stops anybody who has ever seen one from replaying it
      whenever they like.
    */
    const later = new Date(NOW.getTime() + (TOLERANCE_SECONDS + 1) * 1000);
    expect(verifyDelivery(good(), BODY, SECRET, NOW)).toBe(true);
    expect(verifyDelivery(good(), BODY, SECRET, later)).toBe(false);
  });

  it("refuses a delivery stamped far in the future", () => {
    // As much a sign of a forgery as one stamped in the past, and accepting it
    // would widen the replay window by however far ahead somebody set it.
    const ahead = new Date(NOW.getTime() - (TOLERANCE_SECONDS + 1) * 1000);
    expect(verifyDelivery(good(), BODY, SECRET, ahead)).toBe(false);
  });

  it("accepts either signature while a secret is being rotated", () => {
    /*
      The provider sends every signature it considers current, space delimited,
      so a secret can be rotated without an outage. Both orders, because a
      check that only looks at the first entry passes one of these and fails
      the other.
    */
    const stale = `v1,${sign("msg_123", AT, BODY, `whsec_${Buffer.from("an-old-key-being-rotated-out-now").toString("base64")}`)}`;
    const fresh = `v1,${sign("msg_123", AT, BODY)}`;
    expect(verifyDelivery(good({ signature: `${stale} ${fresh}` }), BODY, SECRET, NOW)).toBe(true);
    expect(verifyDelivery(good({ signature: `${fresh} ${stale}` }), BODY, SECRET, NOW)).toBe(true);
  });

  it("skips a signature version it does not know rather than guessing", () => {
    const v2 = `v2,${sign("msg_123", AT, BODY)}`;
    expect(verifyDelivery(good({ signature: v2 }), BODY, SECRET, NOW)).toBe(false);
  });

  it("refuses a missing or malformed header without throwing", () => {
    /*
      `timingSafeEqual` throws on a length mismatch, so the lengths are compared
      first. A webhook route that 500s is a webhook the provider retries and
      then disables.
    */
    for (const headers of [
      { id: null, timestamp: AT, signature: "v1,x" },
      { id: "msg_123", timestamp: null, signature: "v1,x" },
      { id: "msg_123", timestamp: AT, signature: null },
      { id: "msg_123", timestamp: "not-a-number", signature: "v1,x" },
      { id: "msg_123", timestamp: AT, signature: "" },
      { id: "msg_123", timestamp: AT, signature: "no-comma-here" },
      { id: "msg_123", timestamp: AT, signature: "v1," },
      { id: "msg_123", timestamp: AT, signature: "v1,!!!not-base64!!!" },
    ]) {
      expect(() => verifyDelivery(headers, BODY, SECRET, NOW)).not.toThrow();
      expect(verifyDelivery(headers, BODY, SECRET, NOW)).toBe(false);
    }
  });

  it("refuses a secret that decodes to nothing", () => {
    // A misconfigured secret must verify nothing rather than verify everything.
    expect(verifyDelivery(good(), BODY, "whsec_", NOW)).toBe(false);
  });
});

describe("the secret fails closed", () => {
  beforeEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it("is null when unset or blank, so no delivery is accepted at all", () => {
    expect(webhookSecret()).toBeNull();
    process.env.RESEND_WEBHOOK_SECRET = "   ";
    expect(webhookSecret()).toBeNull();
  });

  it("is its own key, not the one that signs the unsubscribe links", () => {
    /*
      Different blast radius and different rotation: one signs what this app
      hands out, the other verifies what somebody else sends in.
    */
    process.env.EMAIL_TOKEN_SECRET = "a-secret-long-enough-to-be-one";
    expect(webhookSecret()).toBeNull();
  });
});

describe("reading a delivery", () => {
  it("reads a permanent bounce as permanent", () => {
    expect(readDelivery(JSON.parse(BODY))).toEqual({
      kind: "bounced",
      messageId: "56761188-7520-42d8-8898-ff6fc54ce618",
      permanent: true,
      address: "mari@example.ee",
    });
  });

  it("reads anything that is not the provider's own word for permanent as transient", () => {
    /*
      The side to err on. A full mailbox read as a dead address costs somebody
      every future letter, silently; a dead address read as a full one costs
      one more attempt.
    */
    for (const type of ["Transient", "Undetermined", "SomethingNew", "", null, undefined, 7]) {
      const event = readDelivery({
        type: "email.bounced",
        data: { email_id: "e1", bounce: { type } },
      });
      expect(event, `bounce type ${String(type)}`).toMatchObject({ kind: "bounced", permanent: false });
    }
  });

  it("reads a complaint, which is a different instruction from a bounce", () => {
    expect(
      readDelivery({ type: "email.complained", data: { email_id: "e1", to: ["mari@example.ee"] } }),
    ).toEqual({ kind: "complained", messageId: "e1", address: "mari@example.ee" });
  });

  it("drops an event this app has no action for", () => {
    /*
      Including the ones about opens, which are exactly the ones /privacy says
      this app does not keep. A type nobody handles is dropped rather than
      erroring, because a webhook that errors is one the provider disables.
    */
    for (const type of ["email.sent", "email.delivered", "email.opened", "email.clicked", "contact.created"]) {
      expect(readDelivery({ type, data: { email_id: "e1" } }), type).toBeNull();
    }
  });

  it("drops anything shapeless rather than throwing", () => {
    for (const body of [null, undefined, "", 7, [], {}, { type: "email.bounced" }, { type: "email.bounced", data: {} }]) {
      expect(() => readDelivery(body)).not.toThrow();
      expect(readDelivery(body)).toBeNull();
    }
  });
});

const MAIL_KEY = "a-mail-secret-long-enough";
const OTHER_MAIL_KEY = "another-mail-secret-entirely";
function bareHash(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex").slice(0, 32);
}

describe("which address a block is about", () => {
  it("blocks the address that bounced and lets a new one through", () => {
    /*
      THE DEADLOCK THIS EXISTS TO PREVENT. Marking the learner rather than the
      address means somebody whose old address bounced changes it in their
      account and never hears from this app again, silently, for ever.
    */
    const stored = addressDigest("old@example.ee", MAIL_KEY);
    expect(blocks(stored, "old@example.ee", MAIL_KEY)).toBe(true);
    expect(blocks(stored, "new@example.ee", MAIL_KEY)).toBe(false);
  });

  it("ignores case and surrounding space, which the provider may echo back", () => {
    const stored = addressDigest("Mari@Example.EE", MAIL_KEY);
    expect(blocks(stored, "  mari@example.ee ", MAIL_KEY)).toBe(true);
  });

  it("blocks every address where the payload named none", () => {
    // The conservative answer to not knowing, and what this app did before any
    // of this existed.
    expect(blocks(BLOCKED_ANY, "anything@example.ee", MAIL_KEY)).toBe(true);
  });

  it("still reads the row the synchronous path used to write", () => {
    /*
      A deployment that has been running carries `1` rows from the send path's
      own refusal handling. Reading one as "not blocked" would start writing to
      every address that had already bounced.
    */
    expect(blocks("1", "anything@example.ee", MAIL_KEY)).toBe(true);
  });

  it("blocks nobody where nothing is stored", () => {
    for (const stored of [null, undefined, "", "   "]) {
      expect(blocks(stored, "mari@example.ee", MAIL_KEY)).toBe(false);
    }
  });

  it("keeps no address, only something that tells two apart", () => {
    const digest = addressDigest("mari@example.ee", MAIL_KEY);
    expect(digest).not.toContain("mari");
    expect(digest).not.toContain("@");
    expect(digest).toMatch(/^[0-9a-f]{32}$/);
    expect(digest).not.toBe(addressDigest("teet@example.ee", MAIL_KEY));
  });

  /*
    KEYED, OR IT CAN BE READ BACK. An unkeyed hash of an address is undone by
    anybody holding a guess: hash the guess and compare. Keyed on a secret the
    deployment holds, the guess is worth nothing without the secret.
  */
  it("is not the bare hash of the address, which anybody with a guess can recompute", () => {
    expect(addressDigest("mari@example.ee", MAIL_KEY)).not.toBe(bareHash("mari@example.ee"));
  });

  it("depends on the key, so a digest from one deployment says nothing about another", () => {
    expect(addressDigest("mari@example.ee", MAIL_KEY)).not.toBe(addressDigest("mari@example.ee", OTHER_MAIL_KEY));
  });

  it("still blocks an address stored as the old unkeyed digest", () => {
    /*
      Rows written before the digest was keyed hold the bare hash. Reading one
      as "not blocked" would write again to every address that had already
      bounced, which is what costs a sender its reputation.
    */
    const legacy = bareHash("old@example.ee");
    expect(blocks(legacy, "old@example.ee", MAIL_KEY)).toBe(true);
    expect(blocks(legacy, "new@example.ee", MAIL_KEY)).toBe(false);
  });

  it("writes the keyed digest when an address bounces", () => {
    const key = createHmac("sha256", MAIL_KEY).update("address-digest").digest();
    const keyed = createHmac("sha256", key).update("mari@example.ee").digest("hex").slice(0, 32);
    const written = undeliverableValue(" Mari@Example.EE ", MAIL_KEY);
    expect(written).toBe(keyed);
    expect(written).not.toBe(bareHash("mari@example.ee"));
    expect(blocks(written, "mari@example.ee", MAIL_KEY)).toBe(true);
    expect(undeliverableValue(null, MAIL_KEY)).toBe(BLOCKED_ANY);
  });

  it("writes the unkeyed digest only where there is no key, and still reads it", () => {
    expect(addressDigest("mari@example.ee", null)).toBe(bareHash("mari@example.ee"));
    expect(blocks(addressDigest("mari@example.ee", null), "mari@example.ee", null)).toBe(true);
  });
});
