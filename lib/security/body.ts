/**
 * A request body, read only as far as a stated ceiling.
 *
 * `request.text()` reads whatever arrives, and a Route Handler has no body
 * limit of its own: Server Actions stop at a megabyte, route handlers do not,
 * and the 4.5 MB cap in front of this app on Vercel is the platform's rather
 * than this code's. On a self-hosted deployment a route anybody can reach
 * without signing in would buffer as much as a caller chose to send before
 * it had checked a single thing about them, which is where a webhook reads
 * its bytes to verify a signature over them.
 *
 * So the declared length is refused first, since it costs nothing to read,
 * and the stream is then read and counted anyway, because `content-length` is
 * the caller's claim and a chunked body carries none. Null means "not
 * answered": too long, or a stream that failed, and the caller already has a
 * sentence for a body it could not read.
 */
export async function readCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const joined = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    joined.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

/** A body that did not arrive under its ceiling: too long, or a stream that failed. */
export class BodyTooLargeError extends Error {
  constructor() {
    super("request body over its ceiling");
    this.name = "BodyTooLargeError";
  }
}

/**
 * A JSON body read through `readCapped`, for a route that used to call
 * `request.json()`, which reads whatever arrives before parsing any of it.
 * Throws where `request.json()` threw, so a caller's existing `try` answers a
 * body that will not parse exactly as before, and throws `BodyTooLargeError`
 * for one over the ceiling, so a caller that can say something better about
 * size can tell the two apart.
 */
export async function readJsonCapped(request: Request, maxBytes: number): Promise<unknown> {
  const raw = await readCapped(request, maxBytes);
  if (raw === null) throw new BodyTooLargeError();
  return JSON.parse(raw) as unknown;
}

/** The ceiling most routes read under: a question, a sentence, a short composition. */
export const JSON_BODY_BYTES = 64 * 1024;
