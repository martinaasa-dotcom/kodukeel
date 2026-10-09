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
import { createHash } from "node:crypto";
import { cacheStorageAsInputTokens } from "@/lib/usage/pricing";
import { singleFlight } from "@/lib/cache/singleFlight";
import { isExhausted, noteRefusal } from "./exhausted";
import { thinkingFor } from "./thinking";
import { SCENE_REPLY_TOKENS, TutorError, type ChatMessage, type ProviderConfig, type UsageReport } from "./provider";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * How long an entry is asked to live. The storage is charged for the whole
 * term whether or not the entry is read, so the term is money spent holding a
 * prompt nobody may compose against again.
 *
 * FIVE MINUTES, WHERE IT WAS TEN. What an entry costs after a conversation
 * ends is its idle tail, storage nobody reads, and the life slides while a
 * run keeps talking (`EXTEND_BELOW_MS`), so a shorter term costs a talking
 * run nothing and halves the tail. Measured on 2026-10-02, with a run asking
 * two to four times, ten idle minutes of a 2,000-token prompt held on the
 * Lite were two thirds of a write. A run now asks on every turn again, which
 * makes the slide do more of the work and the tail no longer: a conversation
 * with a long pause in it pays one rewrite at worst.
 */
export const CACHE_TTL_SECONDS = 300;

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

/**
 * THE NAME AN ENTRY IS FOUND BY FROM ANOTHER PROCESS.
 *
 * The map above is one instance's memory, and a deployment is many instances:
 * a learner's turns land wherever the platform puts them, and every instance
 * that had not seen the prompt wrote its own copy of it. Listed off Google on
 * 2026-10-02, one prompt was being held nine times over at once, each copy a
 * paid write and ten minutes of paid storage. So an entry carries a tag that is
 * a digest of exactly what makes it reusable, the model and the whole system
 * text, and an instance that misses asks Google for one wearing that tag
 * before it pays to make another. A digest rather than the text, because the
 * listing is a list of names, and nothing in a system prompt is personal.
 */
export function cacheTag(model: string, system: string): string {
  return `kodukeel:${createHash("sha256").update(`${model}\n${system}`).digest("hex").slice(0, 40)}`;
}

/** An entry found by its tag is adopted only with this much life left, so a call never lands on one mid-eviction. */
const ADOPT_ABOVE_MS = 60_000;

/** One listing answers every miss for this long, so a burst of misses is one request rather than one each. */
const LISTING_FRESH_MS = 10_000;
let listing: { at: number; entries: Promise<Listed[]> } | null = null;
/** Entries a call was told are gone, so a listing that still shows one cannot hand it back. Bounded like `entries`. */
const gone = new Set<string>();

interface Listed {
  readonly name: string;
  readonly model: string;
  readonly displayName: string;
  readonly tokens: number;
  readonly expiresAt: number;
}

/**
 * A HARNESS'S RECORD OF WHAT IT HAS ALREADY BOUGHT, AND NOTHING IN THE APP.
 *
 * `scripts/lib/meter.ts` sets this so a harness asking a question it asked
 * before is answered from disk, and it sits here rather than in the meter for
 * two reasons. This is the one module that makes cache entries, asserted, and
 * the check for a recorded answer has to come before the entry is made, or a
 * fully replayed run still pays to write its prompt into Google's cache.
 * Keyed on the prompt's tag and the turn, never on an entry's random name, so
 * two processes asking the same thing share the answer. Null in the app,
 * always: no route sets it.
 */
export interface ReplayRecord {
  get(key: string): string | null;
  put(key: string, body: string): void;
}
let record: ReplayRecord | null = null;

/** For `scripts/lib/meter.ts` alone. */
export function setReplayRecord(next: ReplayRecord | null): void {
  record = next;
}

/** Whether a URL is one of Google's cache entry calls, so the meter can price one without naming the endpoint itself. */
export function isCacheEntryUrl(url: string): boolean {
  return url.startsWith(`${BASE}/cachedContents`);
}

/** Only the tests need to start from nothing. */
export function forgetGeminiCaches(): void {
  entries.clear();
  gone.clear();
  listing = null;
  record = null;
}

function trim(): void {
  const now = Date.now();
  for (const [key, entry] of entries) if (entry.expiresAt - SLACK_MS <= now) entries.delete(key);
  if (gone.size > MAX_ENTRIES) gone.clear();
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

  /*
    One look and at most one write per prompt however many turns miss at once
    (`singleFlight`): two learners on one scene, or one learner whose turns
    land together, used to write the same 2,600 tokens twice inside a second,
    and Google billed both. The debt goes to whichever of them takes it first.
  */
  const entry = await singleFlight(`gemini-cache:${cacheTag(config.model, system)}`, async () => {
    const found = await adopt(config, system);
    const made = found ?? await create(config, system);
    entries.set(key, made);
    return made;
  });
  return { entry, booked: takeOwed(entry) };
}

/**
 * An entry another instance already made for this exact prompt, or null.
 *
 * The listing is free and a write is not, so a miss asks first. Adopted with
 * no debt: whoever made it booked its write and its first term, and the
 * storage any later extension buys is booked by the turn that asks for it,
 * here as anywhere. A listing that fails is a miss, never an error: the worst
 * it costs is the write this module made on every miss before it looked.
 */
async function adopt(config: ProviderConfig, system: string): Promise<Entry | null> {
  const tag = cacheTag(config.model, system);
  const now = Date.now();
  if (!listing || now - listing.at > LISTING_FRESH_MS) listing = { at: now, entries: listEntries() };
  const found = (await listing.entries).find((one) =>
    !gone.has(one.name) && one.displayName === tag && one.model === `models/${config.model}` && one.expiresAt - Date.now() > ADOPT_ABOVE_MS);
  return found ? { name: found.name, tokens: found.tokens, expiresAt: found.expiresAt, owed: null } : null;
}

/** Every entry this key holds, a page at a time, bounded so a key holding thousands cannot make a miss slow. */
async function listEntries(): Promise<Listed[]> {
  const out: Listed[] = [];
  let token = "";
  try {
    for (let page = 0; page < 5; page += 1) {
      const res = await fetch(`${BASE}/cachedContents?pageSize=1000${token ? `&pageToken=${token}` : ""}&key=${keyOf()}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return out;
      const body = await res.json() as {
        cachedContents?: { name?: string; model?: string; displayName?: string; expireTime?: string; usageMetadata?: { totalTokenCount?: number } }[];
        nextPageToken?: string;
      };
      for (const one of body.cachedContents ?? []) {
        if (!one.name || !one.model || !one.displayName || !one.expireTime) continue;
        out.push({
          name: one.name, model: one.model, displayName: one.displayName,
          tokens: one.usageMetadata?.totalTokenCount ?? 0, expiresAt: Date.parse(one.expireTime),
        });
      }
      if (!body.nextPageToken) return out;
      token = body.nextPageToken;
    }
  } catch {
    // A miss rather than a failure: see `adopt`.
  }
  return out;
}

/** Makes the entry, tagged so the next instance to miss finds it (`cacheTag`). */
async function create(config: ProviderConfig, system: string): Promise<Entry> {
  const res = await fetch(`${BASE}/cachedContents?key=${keyOf()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: `models/${config.model}`,
      displayName: cacheTag(config.model, system),
      systemInstruction: { parts: [{ text: system }] },
      ttl: `${CACHE_TTL_SECONDS}s`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new TutorError(`${config.label} didn't accept the API key. Check it in your .env file.`, 401);
    }
    if (res.status === 429) {
      noteRefusal(config, await res.text().catch(() => ""), res.headers.get("retry-after"));
      throw new TutorError(`${config.label} is getting too many requests for this model right now.`, 429);
    }
    throw new TutorError(`${config.label} would not hold the prompt (${res.status}).`, 502);
  }
  const made = await res.json() as { name?: string; usageMetadata?: { totalTokenCount?: number } };
  if (!made.name) throw new TutorError(`${config.label} made a cache entry with no name.`, 502);
  return {
    name: made.name,
    tokens: made.usageMetadata?.totalTokenCount ?? 0,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    owed: { tokens: made.usageMetadata?.totalTokenCount ?? 0, model: config.model, written: true, storageSeconds: CACHE_TTL_SECONDS },
  };
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

/** The line a reply carries, every part of it. */
function textOf(reply: GenerateReply): string {
  return reply.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
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
  const generationConfig = {
    maxOutputTokens: maxTokens,
    // The chain's own answer to a flash model thinking by default (`ProviderConfig.reasoning`).
    ...(config.reasoning === "none" ? { thinkingConfig: thinkingFor(config.model) } : {}),
  };
  const contents = contentsFor(messages, live);
  /* A harness's recorded answer, before anything is made or asked (`ReplayRecord`). */
  const replayKey = record ? JSON.stringify([config.model, cacheTag(config.model, system), contents, generationConfig]) : "";
  const kept = record?.get(replayKey);
  if (kept) {
    const reply = JSON.parse(kept) as GenerateReply;
    return { text: textOf(reply), usage: usageFromMetadata(reply.usageMetadata, null) };
  }
  /*
    A model that has said "not until later" gets no entry written for it
    (`lib/tutor/exhausted.ts`). The entry is made before the line is asked for,
    so without this every new prompt paid for a cache write on a model that
    was about to refuse it.
  */
  if (isExhausted(config)) throw new TutorError(`${config.label} is getting too many requests for this model right now.`, 429);
  const { entry, booked } = await entryFor(config, system);
  try {
    const body = { cachedContent: entry.name, contents, generationConfig };
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
        // And never adopted again off a listing taken before it went (`adopt`).
        gone.add(entry.name);
        listing = null;
        throw new TutorError(`${config.label} no longer holds the prompt (${res.status}).`, 502);
      }
      if (res.status === 401) throw new TutorError(`${config.label} didn't accept the API key. Check it in your .env file.`, 401);
      // Out of credit is the account's, so the plain transport on this link would be refused too.
      if (res.status === 402) throw new TutorError(`${config.label} has run out of credit on this key.`, 402);
      if (res.status === 429) {
        // Believed for as long as it says, so the next turn neither asks nor writes an entry for it.
        noteRefusal(config, await res.text().catch(() => ""), res.headers.get("retry-after"));
        throw new TutorError(`${config.label} is getting too many requests for this model right now.`, 429);
      }
      throw new TutorError(`${config.label} answered ${res.status}.`, 502);
    }
    const raw = await res.text();
    const reply = JSON.parse(raw) as GenerateReply;
    const text = textOf(reply);
    record?.put(replayKey, raw);
    const usage = usageFromMetadata(reply.usageMetadata, booked);
    if (reply.candidates?.[0]?.finishReason === "MAX_TOKENS") usage.truncated = true;
    return { text, usage };
  } catch (error) {
    // This turn booked nothing, so what the entry cost waits for the next turn that comes back.
    returnOwed(entry, booked);
    throw error;
  }
}
