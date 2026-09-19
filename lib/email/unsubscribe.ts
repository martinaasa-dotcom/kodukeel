/*
  THE WAY OUT, SIGNED, AND WHY IT IS NOT A ROW IN A TABLE.

  Every letter carries a link that stops that kind of letter, and the link has
  to work for somebody who is not signed in: an unsubscribe that asks a person
  to log in first is an unsubscribe that a mail client will not honour and that
  an annoyed reader will replace with the spam button. So the link identifies
  the learner on its own, which means anybody who can read the URL could
  otherwise unsubscribe anybody else whose id they could guess.

  A signature is what stops that. The link carries the owner, the kind and an
  HMAC over both, and the route recomputes it. Nothing is stored: a token table
  would be a second source of truth about who may stop what, it would need
  expiring, and a letter from six months ago whose token had been swept would
  have a dead unsubscribe link in it, which is the one thing in the footer that
  may never be dead.

  IT FAILS CLOSED, LIKE THE SPENDING CAP. With no secret configured there is no
  signature to make, and `mailSecret()` returns null rather than falling back
  to a constant or to some other variable that happens to be set. A deployment
  in that state sends nothing at all, which is checked one layer up, because a
  letter that goes out with an unsigned or unverifiable way out is worse than
  a letter that does not go out.

  THE COMPARISON IS CONSTANT TIME. An HMAC compared with `===` leaks how much
  of it was right, one character at a time, to anybody willing to make enough
  requests. `timingSafeEqual` is the answer and it throws on a length mismatch,
  so the lengths are checked first.

  ONE-CLICK IS A SEPARATE THING AND IT IS NOT OPTIONAL. RFC 8058 is what lets a
  mail client show its own unsubscribe button beside the sender's name, and the
  large mailbox providers require it of anybody sending in volume. It needs the
  same URL to accept a POST with no body and no cookie, which is why the token
  has to stand alone rather than leaning on a session.
*/
import { createHmac, timingSafeEqual } from "node:crypto";

import { EMAIL_KINDS, isEmailKind, type EmailKind } from "./letter";

/**
 * A pseudo-kind meaning "every optional letter".
 *
 * The mail client's own one-click button has nowhere to say which kind it
 * meant, and a reader who presses it means all of them. It is spelled out
 * rather than inferred from a missing parameter, because a missing parameter
 * is also what a truncated link looks like.
 */
export const ALL_OPTIONAL = "all" as const;

export type UnsubscribeScope = EmailKind | typeof ALL_OPTIONAL;

export function isUnsubscribeScope(value: unknown): value is UnsubscribeScope {
  return value === ALL_OPTIONAL || isEmailKind(value);
}

/**
 * The secret, or null.
 *
 * Its own variable rather than a reuse of any other. A signing key that is
 * also a database password is a key that cannot be rotated without an outage,
 * and one that is also the cron secret means a leaked unsubscribe link is a
 * key to the endpoint that sends to everybody.
 */
export function mailSecret(): string | null {
  const secret = process.env.EMAIL_TOKEN_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function sign(ownerId: string, scope: UnsubscribeScope, secret: string): string {
  /*
    The two fields are joined with a character neither can contain, so that
    ("ab", "c") and ("a", "bc") cannot produce the same signature. An id is a
    uuid and a scope is off a closed list, so neither holds a newline today,
    and relying on that rather than saying it is how a length-extension of this
    shape arrives later.
  */
  return createHmac("sha256", secret).update(`${ownerId}\n${scope}`).digest("base64url");
}

export interface UnsubscribeLink {
  readonly url: string;
  /** What the footer calls it, which differs for a letter nobody may switch off. */
  readonly label: string;
}

/**
 * The link for one letter, and what to call it.
 *
 * A `system` letter gets a link to the preferences screen rather than a
 * signed token: there is nothing to switch off, and handing somebody a button
 * that claims to stop a sign-in link would be a lie in the one place a reader
 * has to be able to trust.
 */
export function unsubscribeLink(
  ownerId: string,
  kind: EmailKind,
  origin: string,
  secret: string,
): UnsubscribeLink {
  if (kind === "system") {
    return {
      url: `${origin}/settings#email`,
      label: "Choose which emails you get",
    };
  }
  const token = sign(ownerId, kind, secret);
  const query = new URLSearchParams({ u: ownerId, k: kind, t: token });
  return {
    url: `${origin}/api/email/unsubscribe?${query}`,
    label: "Stop these emails",
  };
}

/**
 * The URL the mail client's own button posts to, which stops all of them.
 *
 * Always present and always the everything scope, because a reader pressing
 * the client's button has not been offered a choice and is not asking for one.
 */
export function oneClickUrl(ownerId: string, origin: string, secret: string): string {
  const query = new URLSearchParams({
    u: ownerId,
    k: ALL_OPTIONAL,
    t: sign(ownerId, ALL_OPTIONAL, secret),
  });
  return `${origin}/api/email/unsubscribe?${query}`;
}

/**
 * Who this link is for, or null.
 *
 * Returns the owner and the scope together rather than a boolean, so a caller
 * cannot verify one link and act on another's parameters.
 */
export function readUnsubscribe(
  params: { u?: string | null; k?: string | null; t?: string | null },
  secret: string,
): { ownerId: string; scope: UnsubscribeScope } | null {
  const ownerId = params.u?.trim();
  const scope = params.k?.trim();
  const token = params.t?.trim();
  if (!ownerId || !token || !isUnsubscribeScope(scope)) return null;
  if (scope === "system") return null;

  const expected = Buffer.from(sign(ownerId, scope, secret));
  const given = Buffer.from(token);
  if (expected.length !== given.length) return null;
  return timingSafeEqual(expected, given) ? { ownerId, scope } : null;
}

/** Which kinds a scope switches off. */
export function kindsInScope(scope: UnsubscribeScope): EmailKind[] {
  return scope === ALL_OPTIONAL
    ? EMAIL_KINDS.filter((k) => k !== "system")
    : [scope];
}
