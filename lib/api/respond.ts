import { NO_STORE } from "@/lib/security/headers";

/**
 * AN ANSWER FROM A v1 ROUTE, WHICH IS NEVER KEPT.
 *
 * Every v1 response is one learner's rows or a fact about this deployment at
 * this minute, so none of it belongs in a cache between the server and the
 * phone (ADR-029). One helper rather than a header object spread at every
 * call, so a route cannot answer without it.
 */
export function apiJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { ...NO_STORE } });
}
