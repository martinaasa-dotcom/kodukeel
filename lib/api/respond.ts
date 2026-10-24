import type { z } from "zod";

import { readCapped } from "@/lib/security/body";
import { NO_STORE } from "@/lib/security/headers";

import { apiError } from "./errors";

/**
 * AN ANSWER FROM A v1 ROUTE, WHICH IS NEVER KEPT.
 *
 * Every v1 response is one learner's rows or a fact about this deployment at
 * this minute, so none of it belongs in a cache between the server and the
 * phone (ADR-029). One helper rather than a header object spread at every
 * call, so a route cannot answer without it.
 */
export function apiJson(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...headers, ...NO_STORE } });
}

/**
 * An answer that is not JSON: a clip read aloud. Never kept, for the reason
 * `apiJson`'s answers are not, and with the headers a route names beside it
 * (which cache answered).
 */
export function apiBytes(body: Uint8Array, contentType: string, headers: Record<string, string> = {}): Response {
  return new Response(new Uint8Array(body), { headers: { ...headers, "content-type": contentType, ...NO_STORE } });
}

/** The ceiling on a v1 request body. A batch of fifty grades is about eight kilobytes. */
export const API_BODY_MAX_BYTES = 64 * 1024;

/**
 * A request body read against its schema, or the refusal to return.
 *
 * Read only as far as the ceiling (`readCapped`), parsed, and checked with the
 * contract's own schema, so what a route acts on is exactly what the published
 * JSON Schema says it accepts and nothing the client added on top.
 */
export async function readBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes = API_BODY_MAX_BYTES,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  const raw = await readCapped(request, maxBytes);
  if (raw === null) return { ok: false, response: apiError("invalid", { message: "That request was too large." }) };
  let json: unknown;
  try {
    json = raw.length === 0 ? null : JSON.parse(raw);
  } catch {
    return { ok: false, response: apiError("invalid") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, response: apiError("invalid") };
  return { ok: true, data: parsed.data };
}

/**
 * A GET's query read against its schema, or the refusal to return. Only the
 * names the schema knows are read, each as the one value it was given.
 */
export function readQuery<T extends z.ZodType>(
  request: Request,
  schema: T,
): { ok: true; data: z.infer<T> } | { ok: false; response: Response } {
  const params = new URL(request.url).searchParams;
  const raw: Record<string, string> = {};
  for (const [name, value] of params) if (!(name in raw)) raw[name] = value;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, response: apiError("invalid") };
  return { ok: true, data: parsed.data };
}
