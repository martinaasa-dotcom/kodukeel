/**
 * WHAT A RAW PROVIDER RESPONSE COST, AND WHETHER TWO REQUESTS ARE THE SAME
 * REQUEST, FOR THE HARNESSES THAT TALK TO A MODEL WITHOUT THE LEDGER.
 *
 * The app meters every call through `lib/usage/ledger.ts` and is capped at a
 * few dollars a day. The scripts that measure it are not: `eval:scene`,
 * `play:scenes --compose` and `scripts/critic-scenes.ts` call the same models
 * on the same key with nobody's allowance involved, by design, since a
 * developer measuring against their own key is not a learner. On 2026-10-02
 * thirteen rounds of the critic, ninety conversations each, took
 * `gemini-3.8-flash` past its quota of ten thousand requests a day, and not
 * one line anywhere said what any of it cost. `scripts/lib/meter.ts` is what
 * says so now, and this is its pure half: prices off `pricing.ts`, the same
 * table the ledger reads, and a request reduced to the bytes that decide its
 * answer.
 *
 * Pure: no network, no file system, no clock.
 */
import { estimateCostMicros } from "./pricing";

/** The provider hosts a harness reaches a model on. Anything else passes the meter untouched. */
export const MODEL_HOSTS = [
  "generativelanguage.googleapis.com",
  "api.groq.com",
  "api.openai.com",
  "api.anthropic.com",
  "openrouter.ai",
] as const;

/** Whether a request asks a model for words, which is the thing that is paid for and worth replaying. */
export function isModelCall(url: string, method: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  const u = safeUrl(url);
  if (!u || !(MODEL_HOSTS as readonly string[]).includes(u.hostname)) return false;
  return /:generateContent$/.test(u.pathname) || /\/chat\/completions$/.test(u.pathname) || /\/v1\/messages$/.test(u.pathname);
}

function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** The model a request names: in the body for the chat endpoints, in the path for Google's own. */
export function modelOf(url: string, body: string): string {
  const path = /\/models\/([^/:]+):/.exec(safeUrl(url)?.pathname ?? "")?.[1];
  if (path) return path;
  try {
    const parsed = JSON.parse(body) as { model?: unknown };
    return typeof parsed.model === "string" ? parsed.model.replace(/^models\//, "") : "";
  } catch {
    return "";
  }
}

export interface Spent {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheWriteTokens: number;
}

/**
 * What a response says it used, in whichever shape its provider writes, or
 * null where it says nothing (the caller then estimates, never assumes free).
 *
 * Google's own `usageMetadata`; the OpenAI-compatible `usage`, from a JSON
 * body or from the last frame of a stream that carries one, with thinking a
 * Gemini compatible layer hides in `total_tokens` read as output the way
 * `billedOutput` reads it; and Anthropic's, whose stream splits input and
 * output across two events.
 */
export function spentIn(text: string): Spent | null {
  const google = lastObject(text, "usageMetadata");
  if (google) {
    return {
      inputTokens: num(google.promptTokenCount),
      outputTokens: num(google.candidatesTokenCount) + num(google.thoughtsTokenCount),
      cachedInputTokens: num(google.cachedContentTokenCount),
      cacheWriteTokens: 0,
    };
  }
  const anthropicIn = lastObject(text, "usage", (o) => "input_tokens" in o);
  if (anthropicIn) {
    const out = allObjects(text, "usage").reduce((most, o) => Math.max(most, num(o.output_tokens)), 0);
    return {
      inputTokens: num(anthropicIn.input_tokens) + num(anthropicIn.cache_read_input_tokens) + num(anthropicIn.cache_creation_input_tokens),
      outputTokens: out,
      cachedInputTokens: num(anthropicIn.cache_read_input_tokens),
      cacheWriteTokens: num(anthropicIn.cache_creation_input_tokens),
    };
  }
  const compat = lastObject(text, "usage", (o) => "prompt_tokens" in o);
  if (compat) {
    const prompt = num(compat.prompt_tokens);
    const completion = num(compat.completion_tokens);
    const total = num(compat.total_tokens);
    const details = compat.prompt_tokens_details as Record<string, unknown> | undefined;
    return {
      inputTokens: prompt,
      outputTokens: Math.max(completion, total - prompt),
      cachedInputTokens: num(details?.cached_tokens),
      cacheWriteTokens: 0,
    };
  }
  return null;
}

/** A response's cost in micro-dollars, priced off the app's own table. */
export function costOf(model: string, spent: Spent): number {
  return estimateCostMicros(model, spent.inputTokens, spent.outputTokens, {
    cachedInputTokens: spent.cachedInputTokens,
    cacheWriteTokens: spent.cacheWriteTokens,
  });
}

/**
 * A request reduced to what decides its answer, so a byte-identical question
 * is answered from the record rather than paid for twice. The key in the query
 * string is not part of the question. A call served off a Gemini cache entry
 * is keyed inside `lib/tutor/geminiCache.ts` instead, on the prompt rather
 * than the entry's random name, because that is the one module that may know
 * what an entry holds.
 */
export function replayKeyOf(url: string, body: string): string {
  const u = safeUrl(url);
  return `${u ? `${u.hostname}${u.pathname}` : url}\n${body}`;
}

/** Whether a body names a Gemini cache entry, which `geminiCache` replays itself. */
export function namesCacheEntry(body: string): boolean {
  return /"cachedContent"\s*:/.test(body);
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Every `"<field>": { ... }` object in a body or a stream of frames, in order. */
function allObjects(text: string, field: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const marker = `"${field}"`;
  let at = text.indexOf(marker);
  while (at >= 0) {
    const open = text.indexOf("{", at + marker.length);
    if (open >= 0 && /^\s*:\s*$/.test(text.slice(at + marker.length, open))) {
      let depth = 0;
      for (let i = open; i < text.length; i += 1) {
        if (text[i] === "{") depth += 1;
        else if (text[i] === "}") {
          depth -= 1;
          if (depth === 0) {
            try {
              found.push(JSON.parse(text.slice(open, i + 1)) as Record<string, unknown>);
            } catch {
              // A frame cut short says nothing usable.
            }
            break;
          }
        }
      }
    }
    at = text.indexOf(marker, at + marker.length);
  }
  return found;
}

function lastObject(
  text: string,
  field: string,
  keep: (o: Record<string, unknown>) => boolean = () => true,
): Record<string, unknown> | null {
  const all = allObjects(text, field).filter(keep);
  return all.length > 0 ? all[all.length - 1]! : null;
}
