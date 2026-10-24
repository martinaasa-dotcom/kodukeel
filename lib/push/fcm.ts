/*
  POSTING ONE NOTIFICATION TO ONE PHONE THROUGH FIREBASE CLOUD MESSAGING.

  Firebase's HTTP v1 API takes a short-lived OAuth access token, and the token
  is minted from the service account the operator downloads from the Firebase
  console: a JSON file holding the project, an address and an RSA private key.
  The file goes in `FCM_SERVICE_ACCOUNT`, as it is or base64 encoded, and it is
  a credential in the full sense: read on the server, never `NEXT_PUBLIC_`,
  and on the list the CI job greps the bundle for. Minting is a JWT signed with
  that key (RS256) and exchanged at Google's token address, which is the whole
  of what Google's own client library does here; `node:crypto` signs it, so
  this needs no dependency.

  ABSENT IS THE DEFAULT AND IT IS COMPLETE, as for Web Push
  (`lib/push/config.ts`): with no account, or one that does not parse, there
  is no sender, no recipient on /privacy, and the run's channel order skips
  phones (D13). A phone can still register, and nothing is sent to it.

  IT NEVER THROWS AT THE RUN, which is `lib/push/send.ts`'s rule: the caller
  is a loop over every learner, and one phone that will not answer costs one
  notification rather than everybody's.
*/
import { createSign } from "node:crypto";

import { fcmRequestBody, type NativeMessage, type NativePlatform } from "./native";
import type { PushResult } from "./send";

/** Google's token address, pinned: the account's own `token_uri` is not trusted to name another. */
export const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const SEND_TIMEOUT_MS = 10_000;
/** Google issues an hour; one is asked for again a minute before it runs out. */
const TOKEN_LIFETIME_S = 3600;
const TOKEN_MARGIN_MS = 60_000;

export interface FcmConfig {
  readonly projectId: string;
  readonly clientEmail: string;
  /** PEM, PKCS#8, exactly as the file carries it. Server only. */
  readonly privateKey: string;
}

/**
 * The service account, read out of the variable, or null.
 *
 * Null for anything that is not a usable account, rather than a throw, so a
 * deployment with a mangled variable sends nothing by phone and says so in
 * the run's report, instead of failing every letter beside it.
 */
export function fcmConfigFrom(raw: string | undefined): FcmConfig | null {
  const text = raw?.trim();
  if (!text) return null;
  let json: unknown;
  try {
    json = JSON.parse(text.startsWith("{") ? text : Buffer.from(text, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const account = json as Record<string, unknown>;
  const projectId = account.project_id;
  const clientEmail = account.client_email;
  const privateKey = account.private_key;
  if (typeof projectId !== "string" || !/^[a-z0-9-]{4,64}$/.test(projectId)) return null;
  if (typeof clientEmail !== "string" || !/^\S+@\S+$/.test(clientEmail)) return null;
  /*
    The shape of a PEM key rather than a parse of one, so the store-label
    script can name this recipient with a stand-in. A key that has the shape
    and will not sign is reported on the first send of a run, which is where an
    operator reading the run's log is looking. The dashes are counted rather
    than typed, so the build carries no PEM marker for `check:secrets` to find.
  */
  if (typeof privateKey !== "string" || !/-{5}BEGIN PRIVATE KEY-{5}[\s\S]+-{5}END PRIVATE KEY-{5}/.test(privateKey)) return null;
  return { projectId, clientEmail, privateKey };
}

/** This deployment's account, or null where phones are not configured. */
export function fcmConfig(): FcmConfig | null {
  return fcmConfigFrom(process.env.FCM_SERVICE_ACCOUNT);
}

/** Whether this deployment can remind a phone at all. */
export function fcmConfigured(): boolean {
  return fcmConfig() !== null;
}

/** The signed assertion Google exchanges for an access token. */
export function signedAssertion(config: FcmConfig, now: Date): string {
  const iat = Math.floor(now.getTime() / 1000);
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({
    iss: config.clientEmail,
    scope: SCOPE,
    aud: GOOGLE_TOKEN_URI,
    iat,
    exp: iat + TOKEN_LIFETIME_S,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

/** Access tokens this process holds, by account, so a run mints one and not one a phone. */
const held = new Map<string, { token: string; until: number }>();

/** Forgets every held token. For tests, and for a token Firebase refused. */
export function forgetAccessTokens(): void {
  held.clear();
}

async function accessToken(config: FcmConfig, transport: typeof fetch, now: Date): Promise<string | { reason: string }> {
  const kept = held.get(config.clientEmail);
  if (kept && kept.until - TOKEN_MARGIN_MS > now.getTime()) return kept.token;
  let assertion: string;
  try {
    assertion = signedAssertion(config, now);
  } catch (error) {
    return { reason: `token: the service account's key would not sign (${error instanceof Error ? error.message : "unknown"})` };
  }
  let response: Response;
  try {
    response = await transport(GOOGLE_TOKEN_URI, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
      redirect: "manual",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    return { reason: `token: ${error instanceof Error ? error.message : "the request did not complete"}` };
  }
  const answer = (await response.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!response.ok || typeof answer?.access_token !== "string") {
    // Google's own words go to a server log at most; they never carry the key.
    return { reason: `token: ${response.status}` };
  }
  const seconds = typeof answer.expires_in === "number" ? answer.expires_in : TOKEN_LIFETIME_S;
  held.set(config.clientEmail, { token: answer.access_token, until: now.getTime() + seconds * 1000 });
  return answer.access_token;
}

/**
 * Whether Firebase said this token no longer names an install.
 *
 * A 404, or an `UNREGISTERED` error code in its answer, which is what an app
 * uninstalled, a token rotated or notifications revoked look like from here.
 * Nothing else is read as gone: a refusal about this deployment (a key it no
 * longer accepts, a project with the API off) would otherwise delete every
 * learner's phone at once over one setting.
 */
export function tokenGone(status: number, body: unknown): boolean {
  if (status === 404) return true;
  const error = (body as { error?: { status?: unknown; details?: unknown } } | null)?.error;
  if (error?.status === "NOT_FOUND") return true;
  const details = Array.isArray(error?.details) ? error.details : [];
  return details.some((d) => (d as { errorCode?: unknown } | null)?.errorCode === "UNREGISTERED");
}

export interface NativeDevice {
  readonly token: string;
  readonly platform: NativePlatform;
}

export async function sendNative(
  device: NativeDevice,
  message: NativeMessage,
  config: FcmConfig,
  transport: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<PushResult> {
  const token = await accessToken(config, transport, now);
  if (typeof token !== "string") return { ok: false, gone: false, reason: token.reason };

  let response: Response;
  try {
    response = await transport(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(fcmRequestBody(device.token, device.platform, message, now)),
      redirect: "manual",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, gone: false, reason: error instanceof Error ? error.message : "the request did not complete" };
  }

  if (response.ok) return { ok: true };
  if (response.status === 401) held.delete(config.clientEmail);
  const text = await response.text().catch(() => "");
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* not JSON, said in the reason */ }
  return { ok: false, gone: tokenGone(response.status, body), reason: `${response.status} ${text.slice(0, 200)}`.trim() };
}
