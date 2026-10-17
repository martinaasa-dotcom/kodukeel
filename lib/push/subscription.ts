/*
  WHAT A BROWSER HANDS OVER WHEN SOMEBODY TURNS REMINDERS ON, CHECKED BEFORE
  IT IS BELIEVED.

  `PushSubscription.toJSON()` in the browser is an endpoint and two keys, and
  it reaches the server through a Server Action, which is a public endpoint
  whose arguments are JSON off the wire whatever the types say. So nothing
  about it is trusted, and two of the checks matter more than they look.

  THE ENDPOINT IS A URL THIS SERVER WILL POST TO, LATER, WITH NOBODY WATCHING.
  An endpoint the caller chooses is a request the scheduled run makes on their
  behalf to wherever they like, which is server-side request forgery with a
  delay on it: an address inside the deployment's own network, a metadata
  service, somebody else's API. So it is https, on the default port, with no
  credentials in it, and on a host one of the four browser makers runs as a
  push service. That list is short and closed because the set of push
  services is: Chrome, Edge's Chromium and every browser built on them post
  through Google's, Firefox through Mozilla's, Safari through Apple's, and
  Windows' own through Microsoft's. A browser that uses none of them is a
  browser this feature does not reach, which is the honest cost and a small
  one. It is also what lets /privacy name the recipients exactly, rather than
  "whichever push service your browser uses".

  THE KEYS ARE CHECKED AS KEYS. A public key that is not a point on the curve
  is a subscription every run would fail to encrypt to, for ever, so it is
  refused here, where the learner is still looking at the screen.
*/
import { createECDH } from "node:crypto";

/**
 * The push services this deployment will post to, as host suffixes.
 *
 * Matched on a dot boundary, so `fcm.googleapis.com` is allowed and
 * `evilfcm.googleapis.com.example` is not. Google's legacy GCM host is left
 * out on purpose: it never spoke the protocol `lib/push/send.ts` speaks and
 * has been switched off since 2019.
 */
export const PUSH_SERVICE_HOSTS: readonly { host: string; runBy: string }[] = [
  { host: "fcm.googleapis.com", runBy: "Google" },
  { host: "push.services.mozilla.com", runBy: "Mozilla" },
  { host: "push.apple.com", runBy: "Apple" },
  { host: "notify.windows.com", runBy: "Microsoft" },
];

/** The longest endpoint kept. The four services' own are a few hundred characters. */
export const MAX_ENDPOINT_LENGTH = 1024;

/** One browser, as the server keeps it. */
export interface DeviceKeys {
  readonly endpoint: string;
  /** The browser's P-256 public key, base64url, uncompressed (65 bytes). */
  readonly p256dh: string;
  /** The browser's authentication secret, base64url (16 bytes). */
  readonly auth: string;
}

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function bytes(value: unknown, length: number): Buffer | null {
  if (typeof value !== "string" || value.length > 128 || !BASE64URL.test(value)) return null;
  const decoded = Buffer.from(value.replace(/=+$/, ""), "base64url");
  return decoded.length === length ? decoded : null;
}

/** Whether a URL is one this server may post a notification to. */
export function endpointAllowed(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_ENDPOINT_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "") return false;
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((s) => host === s.host || host.endsWith(`.${s.host}`));
}

/** Whether a base64url string is an uncompressed P-256 point that is really on the curve. */
function onTheCurve(p256dh: unknown): boolean {
  const point = bytes(p256dh, 65);
  if (!point || point[0] !== 0x04) return false;
  try {
    // A throwaway key agreeing with it is the check: an off-curve point throws.
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    ecdh.computeSecret(point);
    return true;
  } catch {
    return false;
  }
}

/**
 * The subscription a browser sent, or null where any part of it is wrong.
 *
 * Takes `unknown` because it is the boundary: the caller is a Server Action
 * and what arrives is whatever was posted.
 */
export function readSubscription(raw: unknown): DeviceKeys | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { endpoint, keys } = raw as { endpoint?: unknown; keys?: unknown };
  if (!endpointAllowed(endpoint)) return null;
  if (typeof keys !== "object" || keys === null) return null;
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  if (!onTheCurve(p256dh) || !bytes(auth, 16)) return null;
  return {
    endpoint,
    p256dh: (p256dh as string).replace(/=+$/, ""),
    auth: (auth as string).replace(/=+$/, ""),
  };
}

/** Whether an endpoint the caller names is one this server could ever have stored. */
export function readEndpoint(raw: unknown): string | null {
  return endpointAllowed(raw) ? raw : null;
}
