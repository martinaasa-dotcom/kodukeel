/**
 * A SCENE'S PROMPT, HELD ON GOOGLE'S SIDE AND READ AT A TENTH OF THE PRICE.
 *
 * The scene prompt is about 1,800 tokens and nine tenths of it is the same on
 * every turn of a run: the rules, the scene's closed word list, the setting,
 * the band and the persona (`composeSystem`). The OpenAI-compatible endpoint
 * this app speaks to Gemini through reports no cached share on an identical
 * prefix, measured twice (docs/21-situations.md §62), so every turn paid full
 * price to re-read a block the model had read the turn before. Google's own
 * API has the thing the compatible layer lacks: an explicit cache entry,
 * `cachedContents`, created once and named on every call after it, billed at
 * a tenth of the input rate to read plus a small charge by the hour to hold.
 *
 * Measured on 2026-09-14 on the route's own prompt: `gemini-3.8-flash` and
 * `gemini-3.1-flash-lite` both report 1,592 of a 1,704-token turn as served
 * from the entry, which at the primary's rates is a turn's input going from
 * $0.0013 to $0.0002 once the entry exists. The entry costs one base-rate
 * read to create and about $0.00013 to hold for ten minutes, so a run of
 * more than two composed turns is cheaper with it, and a run is a dozen.
 *
 * WHAT THIS DOES NOT CHANGE. The prompt is byte for byte the one
 * `lib/scenes/prompt.ts` builds and the gate reads every line exactly as
 * before; only where the constant half is stored moved. The live block, which
 * used to be appended to the system prompt, goes in front of "Your line:" in
 * the last user message instead, because a cache entry is fixed and the live
 * block is not, and its own text already says the messages before it are the
 * conversation. The harness (`scripts/lib/sceneDraft.ts`) sends the same
 * shape through this same function, asserted, so a transcript measures the
 * conversation the app has.
 *
 * ONE ENTRY PER PROMPT PER PROCESS, and it is a map rather than a row. A
 * `SceneRun` could carry the entry's name, and then every instance would have
 * to agree about an entry any of them may have let expire; a map is right for
 * a serverless instance, which is warm for the minutes a scene lasts and
 * forgets on the way out. A miss costs exactly what every turn cost before,
 * one base-rate read, plus the storage; it never costs a line. Keyed on the
 * model and the whole system text, so two scenes, two bands or two personas
 * are two entries and a prompt edit is a new one. Moving the persona out to
 * share an entry across personas was tried and measured worse (§63).
 *
 * AND IT SLIDES: an entry a turn lands on with under half its life left is
 * asked for another term, so a run that keeps talking never pays to remake
 * it, and one nobody is talking against lapses (`EXTEND_BELOW_MS`).
 *
 * FAILING IS NEVER LOSING THE LINE. An entry that cannot be created (the
 * prompt under the provider's minimum, a field the API stopped taking, a bad
 * minute) makes the caller fall back to the plain transport for that link,
 * and an entry the provider no longer holds is forgotten and made again once.
 * A rejected key is the one thing passed straight up, because every path
 * would answer it the same way.
 *
 * The ledger sees all of it: the tokens the entry served come back as
 * `cachedInputTokens`, priced at `CACHE_READ_RATE`, and the call that made an
 * entry carries its creation and its storage as plain input tokens
 * (`cacheStorageAsInputTokens`), so the cap sees the whole bill on the turn
 * that ran it up and nothing is booked to a later turn.
 *
 * No React, no Next, no Prisma: `fetch` and a map.
 */
import { cacheStorageAsInputTokens } from "@/lib/usage/pricing";
import { SCENE_REPLY_TOKENS, TutorError, type ChatMessage, type ProviderConfig, type UsageReport } from "./provider";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * How long an entry is asked to live. A scene is played in one sitting and a
 * sitting is minutes, so ten of them cover a run and a pause in it; the
 * storage is charged for the whole term whether or not the entry is read, so
 * longer is money spent holding a prompt nobody is composing against.
 */
export const CACHE_TTL_SECONDS = 600;

/** How close to expiry an entry is treated as gone, so a call never lands on one mid-eviction. */
const SLACK_MS = 20_000;

/**
 * THE LIFE SLIDES WITH USE. An entry with less than this left when a turn
 * lands on it is asked for another `CACHE_TTL_SECONDS` from now, which is one
 * `PATCH` and no tokens (probed 2026-09-14: the new expiry is measured from
 * the moment of the call). So a run that keeps talking never remakes its
 * entry, and an entry nobody is talking against lapses on its own; the
 * storage the extension costs is booked on the turn that asked for it, the
 * way the creation is booked on the turn that made it.
 */
const EXTEND_BELOW_MS = CACHE_TTL_SECONDS * 1000 / 2;

interface Entry {
  readonly name: string;
  readonly tokens: number;
  expiresAt: number;
  /**
   * What making or extending the entry cost and no turn has booked yet.
   *
   * Google charges for the write and the storage when the entry is made,
   * whatever happens to the generate call after it. Handed only to the turn
   * that made it, a 429 on that turn lost the charge, and the next turn
   * reused the entry booking the prompt alone. So it is carried here and
   * cleared by the first turn that comes back.
   */
  owed: Booked | null;
}

/** What this turn owes for the entry it used: the tokens written, if it made it, and the seconds of storage it bought. */
export interface Booked {
  readonly tokens: number;
  readonly model: string;
  readonly written: boolean;
  readonly storageSeconds: number;
}

/** Live entries, keyed on model and system text. Bounded by `MAX_ENTRIES`, oldest first. */
const entries = new Map<string, Entry>();
const MAX_ENTRIES = 64;

function keyFor(model: string, system: string): string {
  return `${model}\n${system}`;
}

/** Only the tests need to start from nothing. */
export function forgetGeminiCaches(): void {
  entries.clear();
}

function trim(): void {
  const now = Date.now();
  for (const [key, entry] of entries) if (entry.expiresAt - SLACK_MS <= now) entries.delete(key);
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

/** The key the config's provider was resolved with; see `callOpenAiCompatible` for why the bang is safe. */
function keyOf(): string {
  return process.env.GEMINI_API_KEY!;
}

/**
 * The entry for this prompt, made where none is live and extended where it is
 * near its end, with what this call owes for either.
 */
async function entryFor(config: ProviderConfig, system: string): Promise<{ entry: Entry; booked: Booked | null }> {
  trim();
  const key = keyFor(config.model, system);
  const held = entries.get(key);
  if (held) {
    const now = Date.now();
    if (held.expiresAt - now > EXTEND_BELOW_MS) return { entry: held, booked: takeOwed(held) };
    const bought = await extend(config, held, now);
    if (bought > 0) {
      held.owed = {
        tokens: held.tokens,
        model: config.model,
        written: held.owed?.written ?? false,
        storageSeconds: (held.owed?.storageSeconds ?? 0) + bought,
      };
    }
    return { entry: held, booked: takeOwed(held) };
  }

  const res = await fetch(`${BASE}/cachedContents?key=${keyOf()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: `models/${config.model}`,
      systemInstruction: { parts: [{ text: system }] },
      ttl: `${CACHE_TTL_SECONDS}s`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new TutorError(`${config.label} rejected the API key. Check it in your .env file.`, 401);
    }
    throw new TutorError(`${config.label} would not hold the prompt (${res.status}).`, 502);
  }
  const made = await res.json() as { name?: string; usageMetadata?: { totalTokenCount?: number } };
  if (!made.name) throw new TutorError(`${config.label} made a cache entry with no name.`, 502);
  const entry: Entry = {
    name: made.name,
    tokens: made.usageMetadata?.totalTokenCount ?? 0,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    owed: { tokens: made.usageMetadata?.totalTokenCount ?? 0, model: config.model, written: true, storageSeconds: CACHE_TTL_SECONDS },
  };
  entries.set(key, entry);
  return { entry, booked: takeOwed(entry) };
}

/**
 * Hands the entry's debt to the turn asking and clears it, in one step.
 *
 * Read and cleared later instead, two turns in flight on one entry were both
 * handed the same debt and both booked it: a scene another learner opened a
 * moment after this one paid for a write it did not make. A turn that fails
 * gives it back through `returnOwed`.
 */
function takeOwed(entry: Entry): Booked | null {
  const owed = entry.owed;
  entry.owed = null;
  return owed;
}

/** Puts a failed turn's debt back, merged with any the entry has taken on since. */
function returnOwed(entry: Entry, booked: Booked | null): void {
  if (!booked) return;
  const now = entry.owed;
  entry.owed = now
    ? {
        tokens: booked.tokens,
        model: booked.model,
        written: booked.written || now.written,
        storageSeconds: booked.storageSeconds + now.storageSeconds,
      }
    : booked;
}

/**
 * Asks the provider to keep an entry another term, and returns the seconds of
 * storage that bought. A refusal costs nothing: the entry keeps the life it
 * had, and if that runs out the next call finds it gone and makes it again.
 */
async function extend(config: ProviderConfig, entry: Entry, now: number): Promise<number> {
  try {
    const res = await fetch(`${BASE}/${entry.name}?key=${keyOf()}&updateMask=ttl`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ttl: `${CACHE_TTL_SECONDS}s` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return 0;
    const until = now + CACHE_TTL_SECONDS * 1000;
    const bought = Math.max(0, Math.round((until - entry.expiresAt) / 1000));
    entry.expiresAt = until;
    return bought;
  } catch {
    return 0;
  }
}

/** What Google's own API says a call cost, in its own field names. */
interface UsageMetadata {
  promptTokenCount?: number;
  cachedContentTokenCount?: number;
  candidatesTokenCount?: number;
  /** Thinking, where the model did any; billed as output like the line. */
  thoughtsTokenCount?: number;
}

interface GenerateReply {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: UsageMetadata;
  error?: { message?: string; status?: string };
}

/**
 * The usage of one native call as the ledger reads it. Exported for the test:
 * the total is `promptTokenCount`, which already counts the cached share, so
 * a caller that only knows about `inputTokens` still sees the whole call and
 * still errs high, exactly as `absorbUsage` keeps the Anthropic total.
 */
export function usageFromMetadata(meta: UsageMetadata | undefined, booked: Booked | null): UsageReport {
  const prompt = meta?.promptTokenCount ?? 0;
  const cached = meta?.cachedContentTokenCount ?? 0;
  const output = (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
  /*
    What this turn owes for the entry: the tokens written, at base, on the
    turn that made it, and the storage it bought, on the turn that made it or
    extended it, as the base-rate tokens that cost the same. Both are plain
    input rather than a cache bucket, because Google bills a write at the
    ordinary rate, and a term is paid for whether the run lasts it or not.
  */
  const owed = booked
    ? (booked.written ? booked.tokens : 0)
      + cacheStorageAsInputTokens(booked.model, booked.tokens, booked.storageSeconds)
    : 0;
  return {
    inputTokens: prompt + owed,
    outputTokens: output,
    cachedInputTokens: cached,
    measured: meta != null,
  };
}

/**
 * The messages as Google's API takes them. The live block rides in front of
 * "Your line:" in the last user message, which is after the turns, where its
 * own text says it belongs; a run with no user message yet gets one.
 */
export function contentsFor(messages: readonly ChatMessage[], live: string) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (live) {
    const last = contents[contents.length - 1];
    if (last && last.role === "user") last.parts = [{ text: `${live}\n\n${last.parts[0]!.text}` }];
    else contents.push({ role: "user", parts: [{ text: live }] });
  }
  return contents;
}

/**
 * One reply from Gemini with the system prompt served off a cache entry.
 *
 * Not streamed, on purpose: a scene line is twenty tokens and the route
 * gathers the whole of it before the gate reads it, so a stream would buy
 * nothing and cost a second frame parser. Throws `TutorError` the way the
 * other transports do, so the chain's own fallback rules apply.
 */
export async function geminiCachedReply(
  config: ProviderConfig,
  system: string,
  messages: readonly ChatMessage[],
  live = "",
  maxTokens = SCENE_REPLY_TOKENS,
): Promise<{ text: string; usage: UsageReport }> {
  const { entry, booked } = await entryFor(config, system);
  try {
    const body = {
      cachedContent: entry.name,
      contents: contentsFor(messages, live),
      generationConfig: {
        maxOutputTokens: maxTokens,
        // The chain's own answer to a flash model thinking by default (`ProviderConfig.reasoning`).
        ...(config.reasoning === "none" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    };
    const res = await fetch(`${BASE}/models/${config.model}:generateContent?key=${keyOf()}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      /*
        An entry the provider no longer holds is a 4xx naming it; forget ours
        so the next turn makes a fresh one, and let the caller fall back to the
        plain transport for this line rather than compose nothing.
      */
      if (res.status === 400 || res.status === 403 || res.status === 404) {
        entries.delete(keyFor(config.model, system));
        throw new TutorError(`${config.label} no longer holds the prompt (${res.status}).`, 502);
      }
      if (res.status === 401) throw new TutorError(`${config.label} rejected the API key. Check it in your .env file.`, 401);
      if (res.status === 429) throw new TutorError(`${config.label} is rate-limiting this model.`, 429);
      throw new TutorError(`${config.label} answered ${res.status}.`, 502);
    }
    const reply = await res.json() as GenerateReply;
    const text = reply.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const usage = usageFromMetadata(reply.usageMetadata, booked);
    if (reply.candidates?.[0]?.finishReason === "MAX_TOKENS") usage.truncated = true;
    return { text, usage };
  } catch (error) {
    // This turn booked nothing, so what the entry cost waits for the next turn that comes back.
    returnOwed(entry, booked);
    throw error;
  }
}
