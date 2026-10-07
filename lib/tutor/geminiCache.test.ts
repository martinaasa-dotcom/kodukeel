import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { thinkingFor } from "./thinking";
import { CACHE_TTL_SECONDS, cacheTag, contentsFor, forgetGeminiCaches, geminiCachedReply, setReplayRecord, usageFromMetadata } from "./geminiCache";
import { forgetExhausted, isExhausted } from "./exhausted";
import { SCENE_MODELS, openWithFallback, resolveProviders, type ProviderConfig } from "./provider";
import { cacheStorageAsInputTokens, estimateCostMicros } from "@/lib/usage/pricing";

const LINK: ProviderConfig = { name: "gemini", model: "gemini-3.8-flash", label: "Google Gemini", reasoning: "none" };

/** A cache entry as Google returns one, and a reply as it returns one, both off 2026-09-14. */
function google(
  calls: { url: string; body: string; method?: string }[],
  opts: { createStatus?: number; generateStatus?: number; listed?: unknown[] } = {},
) {
  return async (url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), body: String(init.body), method: init.method ?? "GET" });
    if (init.method === "PATCH") return Response.json({ name: "cachedContents/abc" });
    /* The listing a miss asks for before it pays to write (`cacheTag`). */
    if ((init.method ?? "GET") === "GET") return Response.json({ cachedContents: opts.listed ?? [] });
    if (String(url).includes("/cachedContents")) {
      if (opts.createStatus) return new Response("no", { status: opts.createStatus });
      return Response.json({ name: "cachedContents/abc", usageMetadata: { totalTokenCount: 1592 } });
    }
    if (opts.generateStatus) return new Response("no", { status: opts.generateStatus });
    return Response.json({
      candidates: [{ content: { parts: [{ text: "Kuidas ma saan teid aidata?" }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 1704, cachedContentTokenCount: 1592, candidatesTokenCount: 20 },
    });
  };
}

/** A call that wrote an entry, as opposed to the free listing a miss reads first. */
const made = (c: { url: string; method?: string }) => c.method === "POST" && c.url.includes("/cachedContents");

describe("the scene prompt held on Google's side", () => {
  beforeEach(() => {
    forgetGeminiCaches();
    forgetExhausted();
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("makes the entry once and names it on every call after", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    const first = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "tere" }], "Your move: ask.");
    const second = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "poodi" }], "Your move: ask.");
    expect(calls.filter(made)).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes(":generateContent"))).toHaveLength(2);
    for (const call of calls.filter((c) => c.url.includes(":generateContent"))) {
      expect(JSON.parse(call.body).cachedContent).toBe("cachedContents/abc");
    }
    expect(first.text).toBe("Kuidas ma saan teid aidata?");
    /* The turn that made the entry pays for the writing and the storage; the next pays for neither. */
    const storage = cacheStorageAsInputTokens("gemini-3.8-flash", 1592, CACHE_TTL_SECONDS);
    expect(storage).toBeGreaterThan(0);
    expect(first.usage).toMatchObject({ inputTokens: 1704 + 1592 + storage, cachedInputTokens: 1592, outputTokens: 20, measured: true });
    expect(second.usage).toMatchObject({ inputTokens: 1704, cachedInputTokens: 1592, outputTokens: 20 });
    /* And the ledger prices the cached share at a tenth, which is the whole point. */
    const warm = estimateCostMicros("gemini-3.8-flash", 1704, 20, { cachedInputTokens: 1592 });
    const cold = estimateCostMicros("gemini-3.8-flash", 1704, 20);
    expect(warm).toBeLessThan(cold / 4);
  });

  it("books the entry's write on the next turn that comes back, where the turn that made it failed", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls, { generateStatus: 429 }));
    await expect(geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "tere" }])).rejects.toThrow();
    vi.stubGlobal("fetch", google(calls));
    const next = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "tere" }]);
    const after = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "poodi" }]);
    const storage = cacheStorageAsInputTokens("gemini-3.8-flash", 1592, CACHE_TTL_SECONDS);
    expect(calls.filter(made)).toHaveLength(1);
    expect(next.usage).toMatchObject({ inputTokens: 1704 + 1592 + storage });
    expect(after.usage).toMatchObject({ inputTokens: 1704 });
  });

  it("books the entry's write once when two turns are in flight on it", async () => {
    /*
      The debt is taken by the turn it is handed to. Read and cleared only once
      a turn came back, the second of two overlapping turns was handed the same
      debt, and both booked a write that happened once.
    */
    const calls: { url: string; body: string; method?: string }[] = [];
    const answer = google(calls);
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let generates = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (String(url).includes(":generateContent") && generates++ === 0) await held;
      return answer(url, init);
    });
    const first = geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "tere" }]);
    await vi.waitFor(() => expect(generates).toBe(1));
    const second = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "poodi" }]);
    release();
    const storage = cacheStorageAsInputTokens("gemini-3.8-flash", 1592, CACHE_TTL_SECONDS);
    expect((await first).usage).toMatchObject({ inputTokens: 1704 + 1592 + storage });
    expect(second.usage).toMatchObject({ inputTokens: 1704 });
  });

  it("puts the system prompt in the entry, the live block before the last user turn, and the thinking off", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "assistant", content: "Tere!" }, { role: "user", content: "tere" }, { role: "user", content: "Your line:" }], "LIVE");
    const entry = JSON.parse(calls.find(made)!.body);
    expect(entry.systemInstruction.parts[0].text).toBe("SYSTEM");
    expect(entry.ttl).toBe(`${CACHE_TTL_SECONDS}s`);
    const asked = JSON.parse(calls.find((c) => c.url.includes(":generateContent"))!.body);
    expect(asked.contents.map((c: { role: string }) => c.role)).toEqual(["model", "user", "user"]);
    expect(asked.contents[2].parts[0].text).toBe("LIVE\n\nYour line:");
    expect(asked.generationConfig.thinkingConfig).toEqual({ thinkingLevel: thinkingFor(LINK.model).thinkingLevel });
    expect(JSON.stringify(asked)).not.toContain("SYSTEM");
  });

  it("stands the live block in a turn of its own where there is no user turn to lead", () => {
    expect(contentsFor([], "LIVE")).toEqual([{ role: "user", parts: [{ text: "LIVE" }] }]);
    expect(contentsFor([{ role: "assistant", content: "Tere!" }], "")).toEqual([{ role: "model", parts: [{ text: "Tere!" }] }]);
  });

  it("bills the thinking as output where the model did any", () => {
    const usage = usageFromMetadata({ promptTokenCount: 100, cachedContentTokenCount: 80, candidatesTokenCount: 20, thoughtsTokenCount: 300 }, null);
    expect(usage).toMatchObject({ inputTokens: 100, cachedInputTokens: 80, outputTokens: 320 });
    expect(usageFromMetadata(undefined, null).measured).toBe(false);
  });

  it("extends an entry with under half its life left, once, and books the storage it bought", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    vi.useFakeTimers();
    const T0 = Date.parse("2026-09-14T12:00:00Z");
    const at = (seconds: number) => vi.setSystemTime(new Date(T0 + seconds * 1000));
    try {
      at(0);
      const first = await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      expect(first.usage.inputTokens).toBe(1704 + 1592 + cacheStorageAsInputTokens("gemini-3.8-flash", 1592, CACHE_TTL_SECONDS));
      /* Two fifths in, more than half the term is left: nothing to extend, nothing extra to pay. */
      at(CACHE_TTL_SECONDS * 0.4);
      const second = await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      expect(second.usage.inputTokens).toBe(1704);
      expect(calls.filter((c) => c.url.includes("updateMask=ttl"))).toHaveLength(0);
      /* Three fifths in, under half is left: one PATCH, and three fifths of a term of storage booked on this turn. */
      at(CACHE_TTL_SECONDS * 0.6);
      const third = await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      const patches = calls.filter((c) => c.url.includes("updateMask=ttl"));
      expect(patches).toHaveLength(1);
      expect(JSON.parse(patches[0]!.body).ttl).toBe(`${CACHE_TTL_SECONDS}s`);
      expect(third.usage.inputTokens).toBe(1704 + cacheStorageAsInputTokens("gemini-3.8-flash", 1592, CACHE_TTL_SECONDS * 0.6));
      /* And it is not remade: one creation over the whole run. */
      expect(calls.filter(made)).toHaveLength(1);
      /* Well past the extended term with nothing said in it, so it is made again. */
      at(CACHE_TTL_SECONDS * 0.6 + CACHE_TTL_SECONDS + 60);
      await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      expect(calls.filter(made)).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to the plain transport on a link that will not hold the prompt, and never loses the line", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      if (String(url).includes("/cachedContents")) {
        if (init.method === "POST") calls.push({ url: String(url), body: "" });
        return new Response("too small", { status: 400 });
      }
      calls.push({ url: String(url), body: String(init.body) });
      return new Response(
        'data: {"choices":[{"delta":{"content":"tere"}}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    });
    const chain = resolveProviders({ purpose: "scene", allowFallback: false });
    const seen: string[] = [];
    const open = await openWithFallback([chain[0]!], "SYSTEM", [{ role: "user", content: "hi" }], (u, c) => seen.push(`${c.model}:${u.inputTokens}`), "LIVE", 100, true);
    let text = "";
    for await (const chunk of open.chunks) text += chunk;
    expect(text).toBe("tere");
    expect(calls.map((c) => c.url.includes("/openai/chat/completions"))).toEqual([false, true]);
    expect(seen).toEqual([`${chain[0]!.model}:10`]);
  });

  it("forgets an entry the provider no longer holds and makes it again next time", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    let generateStatus: number | undefined = 404;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const gone = String(url).includes(":generateContent") ? generateStatus : undefined;
      if (gone) generateStatus = undefined;
      return google(calls, { generateStatus: gone })(url, init);
    });
    await expect(geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }])).rejects.toMatchObject({ status: 502 });
    await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
    expect(calls.filter(made)).toHaveLength(2);
  });

  it("reaches the ledger with the cached share, through the chain the route uses", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    const chain = resolveProviders({ purpose: "scene", allowFallback: false });
    const seen: { cached?: number; input: number }[] = [];
    const open = await openWithFallback([chain[0]!], "SYSTEM", [{ role: "user", content: "hi" }], (u) => seen.push({ cached: u.cachedInputTokens, input: u.inputTokens }), "LIVE", 100, true);
    let text = "";
    for await (const chunk of open.chunks) text += chunk;
    expect(text).toBe("Kuidas ma saan teid aidata?");
    expect(seen[0]?.cached).toBe(1592);
    /* Off by default: a caller that did not ask goes through the compatible endpoint. */
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push({ url: String(url), body: "" });
      return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
    });
    await openWithFallback([chain[0]!], "SYSTEM", [{ role: "user", content: "hi" }]);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => c.url.includes("/openai/chat/completions"))).toBe(true);
  });
});

describe("one entry per prompt, however many instances ask", () => {
  beforeEach(() => {
    forgetGeminiCaches();
    forgetExhausted();
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const IN_TEN_MINUTES = () => new Date(Date.now() + 600_000).toISOString();

  it("tags the entry it makes with a digest of the model and the whole prompt", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "hi" }]);
    const entry = JSON.parse(calls.find(made)!.body);
    expect(entry.displayName).toBe(cacheTag(LINK.model, "SYSTEM"));
    /* A digest, so nothing of the prompt is in the name, and one per model and per prompt. */
    expect(entry.displayName).not.toContain("SYSTEM");
    expect(cacheTag(LINK.model, "SYSTEM")).not.toBe(cacheTag("gemini-3.1-flash-lite", "SYSTEM"));
    expect(cacheTag(LINK.model, "SYSTEM")).not.toBe(cacheTag(LINK.model, "SYSTEM2"));
  });

  it("adopts an entry another instance made for this prompt, and writes none of its own", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls, {
      listed: [{
        name: "cachedContents/theirs", model: `models/${LINK.model}`, displayName: cacheTag(LINK.model, "SYSTEM"),
        expireTime: IN_TEN_MINUTES(), usageMetadata: { totalTokenCount: 1592 },
      }],
    }));
    const reply = await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "hi" }]);
    expect(calls.filter(made)).toHaveLength(0);
    expect(JSON.parse(calls.find((c) => c.url.includes(":generateContent"))!.body).cachedContent).toBe("cachedContents/theirs");
    /* Whoever made it booked its write: this turn pays for the turn alone. */
    expect(reply.usage.inputTokens).toBe(1704);
  });

  it("does not adopt an entry for another model, another prompt, or one about to lapse", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls, {
      listed: [
        { name: "cachedContents/a", model: "models/gemini-3.1-flash-lite", displayName: cacheTag(LINK.model, "SYSTEM"), expireTime: IN_TEN_MINUTES() },
        { name: "cachedContents/b", model: `models/${LINK.model}`, displayName: cacheTag(LINK.model, "OTHER"), expireTime: IN_TEN_MINUTES() },
        { name: "cachedContents/c", model: `models/${LINK.model}`, displayName: cacheTag(LINK.model, "SYSTEM"), expireTime: new Date(Date.now() + 30_000).toISOString() },
      ],
    }));
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "hi" }]);
    expect(calls.filter(made)).toHaveLength(1);
    expect(JSON.parse(calls.find((c) => c.url.includes(":generateContent"))!.body).cachedContent).toBe("cachedContents/abc");
  });

  it("writes one entry when two turns miss at once", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    await Promise.all([
      geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "tere" }]),
      geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "poodi" }]),
      geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "piima" }]),
    ]);
    expect(calls.filter(made)).toHaveLength(1);
    /* And one listing answered all three misses. */
    expect(calls.filter((c) => c.method === "GET")).toHaveLength(1);
  });

  it("never adopts again an entry a call was told is gone", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    const listed = [{
      name: "cachedContents/stale", model: `models/${LINK.model}`, displayName: cacheTag(LINK.model, "SYSTEM"),
      expireTime: IN_TEN_MINUTES(), usageMetadata: { totalTokenCount: 1592 },
    }];
    let first = true;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const gone = String(url).includes(":generateContent") && first ? 404 : undefined;
      if (gone) first = false;
      return google(calls, { listed, generateStatus: gone })(url, init);
    });
    await expect(geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "hi" }])).rejects.toMatchObject({ status: 502 });
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "hi" }]);
    const asked = calls.filter((c) => c.url.includes(":generateContent")).map((c) => JSON.parse(c.body).cachedContent);
    expect(asked).toEqual(["cachedContents/stale", "cachedContents/abc"]);
  });
});

describe("a harness's record of what it already bought", () => {
  beforeEach(() => {
    forgetGeminiCaches();
    forgetExhausted();
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
  });
  afterEach(() => {
    forgetGeminiCaches();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("answers a question it holds before any entry is made or asked, and records the ones it buys", async () => {
    const held = new Map<string, string>();
    setReplayRecord({ get: (k) => held.get(k) ?? null, put: (k, v) => held.set(k, v) });
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    const bought = await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "tere" }]);
    expect(held.size).toBe(1);
    /* Another process: nothing in memory, the same record on disk. */
    forgetGeminiCaches();
    setReplayRecord({ get: (k) => held.get(k) ?? null, put: (k, v) => held.set(k, v) });
    calls.length = 0;
    const replayed = await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "tere" }]);
    expect(replayed.text).toBe(bought.text);
    expect(calls).toEqual([]);
    /* A different turn is a different question, and is bought. */
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "poodi" }]);
    expect(calls.filter((c) => c.url.includes(":generateContent"))).toHaveLength(1);
  });

  it("is never set in the app", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "tere" }]);
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "tere" }]);
    expect(calls.filter((c) => c.url.includes(":generateContent"))).toHaveLength(2);
  });
});

describe("a model that has said not until later", () => {
  beforeEach(() => {
    forgetGeminiCaches();
    forgetExhausted();
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  /* Google's own 429 for a spent daily quota, as it answered on 2026-10-02. */
  const QUOTA = JSON.stringify({
    error: {
      code: 429, status: "RESOURCE_EXHAUSTED",
      message: "Quota exceeded for metric: generate_requests_per_model_per_day, limit: 10000. Please retry in 1h2m5.5s.",
      details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "3725s" }],
    },
  });

  it("is believed for as long as it said, and gets no entry written for it in the meantime", async () => {
    const calls: { url: string; body: string; method?: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      if (String(url).includes(":generateContent")) {
        calls.push({ url: String(url), body: String(init.body), method: init.method });
        return new Response(QUOTA, { status: 429 });
      }
      return google(calls)(url, init);
    });
    await expect(geminiCachedReply(LINK, "SYSTEM", [{ role: "user", content: "hi" }])).rejects.toMatchObject({ status: 429 });
    expect(isExhausted(LINK)).toBe(true);
    const before = calls.length;
    /* A new prompt for the same model: nothing is listed, written or asked. */
    await expect(geminiCachedReply(LINK, "ANOTHER SCENE", [{ role: "user", content: "hi" }])).rejects.toMatchObject({ status: 429 });
    expect(calls.length).toBe(before);
  });

  it("is walked past by the chain, without a second refused request on the same link", async () => {
    const chain = resolveProviders({ purpose: "scene", allowFallback: false });
    const [first, second] = [chain[0]!.model, chain[1]!.model];
    expect(chain.map((c) => c.model)).toEqual([...SCENE_MODELS]);
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const u = String(url);
      if (u.includes(":generateContent")) {
        asked.push(`native ${u.split("/models/")[1]!.split(":")[0]}`);
        if (u.includes(`/models/${first}:`)) return new Response(QUOTA, { status: 429 });
      }
      if (u.includes("/openai/chat/completions")) asked.push(`plain ${JSON.parse(String(init.body)).model}`);
      return google([])(url, init);
    });
    const one = await openWithFallback(chain, "SYSTEM", [{ role: "user", content: "hi" }], undefined, "LIVE", 100, true);
    for await (const chunk of one.chunks) void chunk;
    /* The refusal went straight to the next link: no plain-transport retry of a model that is out. */
    expect(asked).toEqual([`native ${first}`, `native ${second}`]);
    asked.length = 0;
    const two = await openWithFallback(chain, "SYSTEM", [{ role: "user", content: "hi" }], undefined, "LIVE", 100, true);
    for await (const chunk of two.chunks) void chunk;
    /* And the next turn does not ask it at all. */
    expect(asked).toEqual([`native ${second}`]);
    expect(two.config.model).toBe(second);
  });
});

describe("what holding an entry costs, in the ledger's own unit", () => {
  it("turns storage by the hour into base-rate input tokens, exactly", () => {
    /* 1,592 tokens for ten minutes at $0.50 per million per hour is $0.0001327, which is 177 tokens at $0.75 a million. */
    expect(cacheStorageAsInputTokens("gemini-3.8-flash", 1592, 600)).toBe(177);
    /* The Lite tier stores at $1.00 and reads at $0.25, so the same entry is more tokens there. */
    expect(cacheStorageAsInputTokens("gemini-3.1-flash-lite", 1592, 600)).toBe(1062);
    expect(cacheStorageAsInputTokens("gemini-3.8-flash", 0, 600)).toBe(0);
    expect(cacheStorageAsInputTokens("some-free-model:free", 1592, 600)).toBe(0);
  });
});
