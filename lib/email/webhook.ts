/*
  WHAT THE SENDING PROVIDER TELLS US AFTERWARDS, AND WHY IT HAS TO BE VERIFIED.

  A send either goes or it does not, and this app already reads the second
  case: `transport.ts` marks an address the provider refused outright. That is
  the synchronous half and it is the smaller one. Most bad addresses are
  accepted at the door and rejected minutes later by the receiving server, and
  a spam complaint arrives hours after a message somebody read. Neither reaches
  the code that sent it.

  What they reach is a webhook, which is a public endpoint that changes whether
  this deployment will write to somebody. That makes forging one worth doing:
  an unsigned endpoint would let a stranger stop any learner's mail, or, worse
  in the other direction, would be the first thing an attacker probes for a way
  to write to the settings table. So every delivery is verified before anything
  is read out of it, and a delivery that will not verify is not parsed at all.

  THE SCHEME IS SVIX'S, WHICH IS WHAT RESEND SIGNS WITH, and it is written out
  here rather than taken from a library because it is nine lines and the
  library is a dependency with a transitive tree for nine lines. Confirmed
  against svix.com/receiving/verifying-payloads/how-manual rather than
  remembered:

    signed content   `${svix-id}.${svix-timestamp}.${raw body}`
    key              base64 decode of the part after `whsec_`
    signature        base64 of HMAC-SHA256 over the signed content
    header           space delimited, each entry `v1,<signature>`, any may match

  THE RAW BODY, NOT THE PARSED ONE. Re-serialising the JSON changes the bytes
  and the signature is over the bytes, so the route reads `request.text()` and
  parses only after the signature holds. Getting that backwards is the usual
  way this is broken and it fails in the direction that looks like the
  provider's fault.

  AND A TIMESTAMP TOLERANCE, because a signature is valid for ever without one:
  anybody who captures one delivery can replay it whenever they like. Five
  minutes, which is Svix's own window, and it is checked in both directions,
  since a timestamp far in the future is as much a sign of a forgery as one
  far in the past.

  Pure, and in `lib/email/` for it: no Prisma, no network, no clock of its own.
*/
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** How far from now a delivery's own timestamp may be, in seconds. */
export const TOLERANCE_SECONDS = 5 * 60;

/**
 * The signing secret, or null.
 *
 * Its own variable rather than a reuse of `EMAIL_TOKEN_SECRET`: that one signs
 * the unsubscribe links this app hands out and this one verifies what somebody
 * else sends in, so they are a different key with a different blast radius and
 * a different rotation. A deployment with no secret configured accepts no
 * webhook at all, which is the state this repository ships in.
 */
export function webhookSecret(): string | null {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  return secret ? secret : null;
}

export interface SignatureHeaders {
  readonly id: string | null;
  readonly timestamp: string | null;
  readonly signature: string | null;
}

/**
 * Whether this delivery really came from the provider.
 *
 * Takes `now` rather than reading a clock, so the replay window can be driven
 * over rather than reasoned about.
 */
export function verifyDelivery(
  headers: SignatureHeaders,
  rawBody: string,
  secret: string,
  now: Date,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return false;
  /*
    Both directions. A delivery stamped an hour ago is a replay; one stamped an
    hour ahead is a forgery with a clock problem, and accepting it would widen
    the replay window by however far ahead somebody cared to set it.
  */
  if (Math.abs(Math.floor(now.getTime() / 1000) - sent) > TOLERANCE_SECONDS) return false;

  /*
    The secret is `whsec_<base64>`, and the key is the decoded base64 rather
    than the string. Splitting on the *first* underscore only: a base64 body
    cannot contain one, but `split("_")[1]` would silently take a fragment if
    the prefix ever gained a second, and a key that is quietly wrong verifies
    nothing while looking configured.
  */
  const marker = secret.indexOf("_");
  const encoded = marker === -1 ? secret : secret.slice(marker + 1);
  const key = Buffer.from(encoded, "base64");
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  /*
    The header carries every signature the provider considers current, so that
    a secret can be rotated without an outage: during a rotation two are sent
    and either is good. Each is `v1,<base64>`, and a version this code does not
    know is skipped rather than guessed at.

    Compared in constant time, and the loop deliberately does not stop early on
    a match: `some` would return on the first success, which is fine, but the
    comparison inside it must not leak how much of a wrong signature was right.
  */
  let matched = false;
  for (const entry of signature.split(" ")) {
    const comma = entry.indexOf(",");
    if (comma === -1 || entry.slice(0, comma) !== "v1") continue;
    const given = Buffer.from(entry.slice(comma + 1), "base64");
    if (given.length !== expected.length) continue;
    if (timingSafeEqual(given, expected)) matched = true;
  }
  return matched;
}

/** What the provider is telling us, once the signature holds. */
export type DeliveryEvent =
  /**
   * The receiving server refused it for good. `permanent` is read off the
   * provider's own classification rather than assumed: a full mailbox and a
   * server having a bad afternoon are transient, and treating either as a dead
   * address stops writing to somebody who is perfectly reachable.
   */
  | { readonly kind: "bounced"; readonly messageId: string; readonly permanent: boolean; readonly address: string | null }
  /**
   * It arrived, they read it, and they pressed the spam button. Stronger than
   * a bounce and a different instruction: the address works, the person does
   * not want the mail.
   */
  | { readonly kind: "complained"; readonly messageId: string; readonly address: string | null };

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Read one delivery, or null for anything this app has no action for.
 *
 * Null covers a great deal on purpose. Resend reports sends, deliveries, opens
 * and clicks as well, and the ones about opens are exactly the ones this app
 * has said it does not keep: subscribing to them and then throwing them away
 * would be a promise kept by nothing but this function. A type nobody handles
 * is answered 200 and dropped, because a webhook that errors on an event it
 * did not ask for is a webhook the provider starts retrying and then disables.
 */
export function readDelivery(body: unknown): DeliveryEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const event = body as { type?: unknown; data?: unknown };
  const data = (typeof event.data === "object" && event.data !== null ? event.data : {}) as {
    email_id?: unknown;
    to?: unknown;
    bounce?: unknown;
  };

  const messageId = text(data.email_id);
  if (!messageId) return null;

  /*
    The recipient, where the payload carries one. An array, because a message
    can have several and this app only ever sends to one, so the first is the
    one it sent to.
  */
  const address = Array.isArray(data.to) ? text(data.to[0]) : text(data.to);

  if (event.type === "email.complained") return { kind: "complained", messageId, address };

  if (event.type === "email.bounced") {
    const bounce = (typeof data.bounce === "object" && data.bounce !== null ? data.bounce : {}) as {
      type?: unknown;
    };
    /*
      "Permanent" is the provider's own word for it. Anything else, including a
      classification this code has not seen, is read as transient, which is the
      side to err on: a transient bounce read as permanent costs somebody every
      future letter silently, and a permanent one read as transient costs one
      more attempt.
    */
    return {
      kind: "bounced",
      messageId,
      permanent: text(bounce.type)?.toLowerCase() === "permanent",
      address,
    };
  }

  return null;
}

/**
 * A digest of an address, which is what gets written down rather than the
 * address.
 *
 * WHY A DIGEST AND WHY AN ADDRESS AT ALL. The first version of this marked the
 * *learner* undeliverable and nothing else, which is a deadlock: somebody whose
 * old address bounced changes it in their account, and this app goes on
 * refusing to write to them for ever, because the row is about them rather than
 * about the address that failed. Nothing would have reported it and they would
 * simply never hear from us again.
 *
 * So what is stored is which address failed, and the send path compares it with
 * the address it is about to use: the same one is still dead, a different one
 * is somebody who fixed it. A digest rather than the address because
 * `prisma/schema.prisma` deliberately holds none, which is what lets erasure
 * promise that deleting an account takes the address with it; a digest tells
 * two addresses apart, which is the whole job, and does not hold the address.
 * It is unsalted, so anybody holding a candidate address can hash it and
 * confirm a match: pseudonymous rather than anonymous.
 *
 * Folded to lower case and trimmed first, since a mailbox is not case sensitive
 * in the part that matters and the provider may echo it back differently from
 * how it was sent.
 */
export function addressDigest(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex").slice(0, 32);
}

/**
 * The value written when an address bounced but the payload named no address.
 *
 * Blocks the learner whatever address they hold, which is what this app did
 * before any of this and is the conservative answer to not knowing. It is a
 * value rather than an absence so that the send path can tell "blocked, and we
 * know which address" from "blocked, and we do not".
 */
export const BLOCKED_ANY = "any";

/**
 * Whether a stored block applies to the address about to be written to.
 *
 * The one reader of both halves, so the send path cannot accidentally compare
 * a digest against a raw address, and so the fallback above has exactly one
 * meaning.
 */
export function blocks(stored: string | null | undefined, address: string): boolean {
  const value = (stored ?? "").trim();
  if (!value) return false;
  /*
    `1` is what the synchronous path wrote before this existed, and a
    deployment that has been running carries rows in that shape. Read as the
    same conservative block rather than as nothing, because reading an old row
    as "not blocked" would start writing to every address that had already
    bounced.
  */
  if (value === BLOCKED_ANY || value === "1") return true;
  return value === addressDigest(address);
}
