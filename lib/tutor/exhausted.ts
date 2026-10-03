/**
 * A MODEL THAT HAS SAID "NOT UNTIL TOMORROW" IS NOT ASKED AGAIN UNTIL TOMORROW.
 *
 * On 2026-10-02 `gemini-3.8-flash` reached its quota of 10,000 requests a day
 * and Google answered every call after that with a 429 naming the reset an hour
 * away. Nothing here listened. Every scene turn still went to it first, and the
 * order of that walk is what made the refusal expensive rather than merely
 * slow: the cached path makes a `cachedContents` entry *before* it asks for a
 * line, so each new prompt paid to write 2,600 tokens into a cache for a model
 * that was about to refuse, then paid for ten minutes of holding it, then asked
 * the plain transport on the same link, which refused too, and only then
 * reached the Lite link, which made its own entry. Listed off Google's own
 * `cachedContents` that evening: 180 live entries, every prompt held twice, one
 * of each pair for a model that could not answer it.
 *
 * So a refusal that says how long it lasts is believed for that long. Google
 * puts a `RetryInfo` on every 429 (`"retryDelay": "3725s"`) and Groq a
 * `retry-after` header, and either one marks the provider's model out until
 * then. A link that is out is walked past before anything is spent on it: no
 * entry, no request, no booking. A 429 that names no delay marks nothing,
 * because a transient limit is the case the walk's own patience is for.
 *
 * In-process, on purpose. A serverless instance learns it from its own first
 * refusal, which is one request, and a mark that outlives a deploy or crosses
 * instances would need a table to say something Google repeats for free.
 *
 * Pure apart from the map: no network, no database, and the clock is a
 * parameter wherever a test needs to hold it.
 */

/** Long enough for any quota window a provider names, short enough that a wrong reading heals the same day. */
export const MAX_OUT_MS = 6 * 60 * 60 * 1000;

const out = new Map<string, number>();

function keyOf(link: { name: string; model: string }): string {
  return `${link.name}\n${link.model}`;
}

/** Whether a link is known to refuse until later. */
export function isExhausted(link: { name: string; model: string }, now = Date.now()): boolean {
  const until = out.get(keyOf(link));
  if (until === undefined) return false;
  if (until <= now) {
    out.delete(keyOf(link));
    return false;
  }
  return true;
}

/** The links worth asking right now, in the order given. */
export function liveLinks<T extends { name: string; model: string }>(chain: readonly T[], now = Date.now()): T[] {
  return chain.filter((link) => !isExhausted(link, now));
}

/** Marks a link out for `ms`, capped at `MAX_OUT_MS`; a longer mark already standing is kept. */
export function markExhausted(link: { name: string; model: string }, ms: number, now = Date.now()): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  const until = now + Math.min(ms, MAX_OUT_MS);
  const held = out.get(keyOf(link)) ?? 0;
  if (until > held) out.set(keyOf(link), until);
}

/** Only the tests need to start from nothing. */
export function forgetExhausted(): void {
  out.clear();
}

/**
 * How long a 429 says to wait, in milliseconds, or null where it does not say.
 *
 * Read from the places the two providers this app uses put it: Google's
 * `google.rpc.RetryInfo` detail, then a `retry-after` header in seconds, which
 * is what Groq and most OpenAI-compatible gateways send, then the "retry in
 * 1h2m5.5s" Google also writes into the message. Never a guess.
 */
export function retryDelayMs(body: string, retryAfter?: string | null): number | null {
  const info = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  if (info) return Math.round(Number(info[1]) * 1000);
  if (retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter.trim())) return Math.round(Number(retryAfter.trim()) * 1000);
  const said = /retry in ((?:\d+h)?(?:\d+m)?(?:\d+(?:\.\d+)?s)?)/i.exec(body)?.[1];
  if (said) {
    const h = Number(/(\d+)h/.exec(said)?.[1] ?? 0);
    const m = Number(/(\d+)m/.exec(said)?.[1] ?? 0);
    const s = Number(/(\d+(?:\.\d+)?)s/.exec(said)?.[1] ?? 0);
    const ms = Math.round(((h * 60 + m) * 60 + s) * 1000);
    if (ms > 0) return ms;
  }
  return null;
}

/** Reads a 429 and marks the link for as long as it said, where it said. */
export function noteRefusal(
  link: { name: string; model: string },
  body: string,
  retryAfter?: string | null,
  now = Date.now(),
): void {
  const ms = retryDelayMs(body, retryAfter);
  if (ms !== null) markExhausted(link, ms, now);
}
