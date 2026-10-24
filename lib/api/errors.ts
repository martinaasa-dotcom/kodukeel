import { z } from "zod";

import { safeMessage } from "@/lib/security/redact";
import { NO_STORE } from "@/lib/security/headers";

/**
 * EVERY REFUSAL A v1 ROUTE GIVES, IN ONE SHAPE AND FROM A CLOSED LIST.
 *
 * A native app outlives a deploy (ADR-029), so what it reads off a refusal has
 * to be something it can switch on rather than a sentence it has to parse. The
 * code is the contract and the message is for a person: it is written here, in
 * English, and it goes through `safeMessage` on the way out, so nothing a
 * caller can make a route say carries a stack, a Prisma sentence or a
 * provider's body. A code added here is a widening; one removed is v2.
 *
 * What each code means to the client is the half that matters:
 *
 * - `unauthenticated`: no token, a malformed one, an expired one, or one this
 *   server will not accept. The client signs out, and only on this code.
 * - `auth_unavailable`: the auth service did not answer in time. Never a
 *   sign-out (D6); wait `Retry-After` seconds and ask again.
 * - `too_old`: this native build is below the minimum the operator set. The
 *   client says an update is needed and calls nothing else.
 */
export const API_ERROR_CODES = [
  "unauthenticated",
  "auth_unavailable",
  "forbidden",
  "not_found",
  "invalid",
  "rate_limited",
  "switched_off",
  "too_old",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** The status each code is answered with, so a code never arrives under two. */
export const API_ERROR_STATUS: Readonly<Record<ApiErrorCode, number>> = {
  unauthenticated: 401,
  auth_unavailable: 503,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  rate_limited: 429,
  switched_off: 503,
  too_old: 426,
};

/** What a person reads where the route has nothing more particular to say. */
export const API_ERROR_MESSAGE: Readonly<Record<ApiErrorCode, string>> = {
  unauthenticated: "Sign in again to carry on.",
  auth_unavailable: "Sign-in isn't answering just now. Try again in a moment.",
  forbidden: "That isn't yours to change.",
  not_found: "We couldn't find that.",
  invalid: "That request didn't come through properly.",
  rate_limited: "That was a lot at once. Give it a moment.",
  switched_off: "This installation has that switched off.",
  too_old: "This version of the app is too old. Update it from the store to carry on.",
};

export const ApiErrorBody = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
}).describe("Every refusal from a v1 route, whatever its status.");

export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

/**
 * A refusal, ready to return from a route.
 *
 * `message` may be a sentence of the route's own or anything it caught; either
 * way it is redacted and cut to one line before it leaves. A 429 or a 503 says
 * how long to wait, since "try again in a moment" with no moment named is a
 * retry loop on the client.
 */
export function apiError(
  code: ApiErrorCode,
  options: { message?: unknown; retryAfterSec?: number } = {},
): Response {
  const status = API_ERROR_STATUS[code];
  const message = options.message === undefined ? API_ERROR_MESSAGE[code] : safeMessage(options.message) || API_ERROR_MESSAGE[code];
  const headers: Record<string, string> = { ...NO_STORE };
  if (status === 429 || status === 503) headers["retry-after"] = String(Math.max(1, Math.ceil(options.retryAfterSec ?? 30)));
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers });
}
