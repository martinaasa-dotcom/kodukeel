/*
  POSTING ONE NOTIFICATION TO ONE BROWSER'S PUSH SERVICE.

  The Web Push protocol is two things layered, and this file uses a library
  for the part that is cryptography and does the part that is a request
  itself. `web-push` encrypts the message to the browser's own key (RFC 8291,
  aes128gcm) and signs the request with this deployment's key (RFC 8292,
  VAPID); `generateRequestDetails` hands back the method, the headers and the
  encrypted body, and the post is ours. That split is deliberate: the
  library's own sender goes through Node's `https` module with no deadline of
  ours and no way to hand it a stub, and the request is the part worth
  testing, since it is where a dead subscription is told apart from a push
  service having a bad minute.

  THE PAYLOAD IS ENCRYPTED END TO END. The push service carries ciphertext it
  cannot read, to an address that names a browser rather than a person: what
  it learns is that this deployment sent that browser something of a certain
  size at a certain time. Only the service worker in that browser, holding
  the private key the browser never let go of, can read the title and line.

  IT NEVER THROWS AT THE RUN, which is `lib/mailer/transport.ts`'s rule: the
  caller is a loop over every learner, and one browser that will not answer
  costs one notification rather than everybody's.
*/
import webpush from "web-push";

import type { PushConfig } from "./config";
import type { PushMessage } from "./notification";
import { endpointAllowed, type DeviceKeys } from "./subscription";

/** How long one post may take before it is somebody else's problem. */
const SEND_TIMEOUT_MS = 10_000;

export type PushResult =
  | { readonly ok: true }
  /**
   * `gone` is the one thing the caller acts on rather than records: the push
   * service has said this browser's address no longer exists (404 or 410),
   * which is what a browser that unsubscribed, revoked the permission or was
   * reinstalled looks like from here. The row is deleted. Anything else is
   * reported and the row kept, because a refusal that is really about this
   * deployment (a key it no longer accepts, a limit it has hit) would
   * otherwise delete every learner's browser at once over one setting.
   */
  | { readonly ok: false; readonly gone: boolean; readonly reason: string };

export interface PushOptions {
  /** Seconds a push service may hold this for a browser that is asleep. */
  readonly ttlSeconds: number;
  /**
   * Replaces a message of the same topic still waiting at the push service,
   * so a computer that wakes up gets one evening nudge rather than three.
   * Base64url, at most 32 characters (RFC 8030).
   */
  readonly topic: string;
}

export async function sendPush(
  device: DeviceKeys,
  message: PushMessage,
  options: PushOptions,
  config: PushConfig,
  transport: typeof fetch = fetch,
): Promise<PushResult> {
  /*
    Asked again here rather than trusted from the row. The Server Action that
    writes a subscription refuses an address off the list, and this is the
    second door: a row that reached the table some other way is a request to a
    host nobody chose, so it is reported as gone and taken out.
  */
  if (!endpointAllowed(device.endpoint)) {
    return { ok: false, gone: true, reason: "the address is not on a push service this app posts to" };
  }

  let details: ReturnType<typeof webpush.generateRequestDetails>;
  try {
    details = webpush.generateRequestDetails(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(message),
      {
        vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
        TTL: options.ttlSeconds,
        urgency: "normal",
        topic: options.topic,
        contentEncoding: "aes128gcm",
      },
    );
  } catch (error) {
    /*
      The keys would not encrypt or the request would not sign. Never read as
      a dead browser: the commonest cause is this deployment's own key, and
      that is a fault in one place rather than in every learner's row.
    */
    return { ok: false, gone: false, reason: error instanceof Error ? error.message : "the message could not be prepared" };
  }

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(details.headers)) headers[name] = String(value);

  let response: Response;
  try {
    response = await transport(details.endpoint, {
      method: details.method,
      headers,
      body: details.body ? new Uint8Array(details.body) : null,
      // A push service answers; it does not send anybody anywhere else.
      redirect: "manual",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, gone: false, reason: error instanceof Error ? error.message : "the request did not complete" };
  }

  if (response.status >= 200 && response.status < 300) return { ok: true };
  // The body is a push service's own words and goes to a server log at most.
  const detail = await response.text().catch(() => "");
  return {
    ok: false,
    gone: response.status === 404 || response.status === 410,
    reason: `${response.status} ${detail.slice(0, 200)}`.trim(),
  };
}

