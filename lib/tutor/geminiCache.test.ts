import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TTL_SECONDS, contentsFor, forgetGeminiCaches, geminiCachedReply, usageFromMetadata } from "./geminiCache";
import { openWithFallback, resolveProviders, type ProviderConfig } from "./provider";
import { cacheStorageAsInputTokens, estimateCostMicros } from "@/lib/usage/pricing";

const LINK: ProviderConfig = { name: "gemini", model: "gemini-3.8-flash", label: "Google Gemini", reasoning: "none" };

/** A cache entry as Google returns one, and a reply as it returns one, both off 2026-09-14. */
function google(calls: { url: string; body: string }[], opts: { createStatus?: number; generateStatus?: number } = {}) {
  return async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: String(init.body) });
    if (init.method === "PATCH") return Response.json({ name: "cachedContents/abc" });
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

describe("the scene prompt held on Google's side", () => {
  beforeEach(() => {
    forgetGeminiCaches();
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
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    const first = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "tere" }], "Your move: ask.");
    const second = await geminiCachedReply(LINK, "the rules and the list", [{ role: "user", content: "poodi" }], "Your move: ask.");
    expect(calls.filter((c) => c.url.includes("/cachedContents"))).toHaveLength(1);
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

  it("puts the system prompt in the entry, the live block before the last user turn, and the thinking off", async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    await geminiCachedReply(LINK, "SYSTEM", [{ role: "assistant", content: "Tere!" }, { role: "user", content: "tere" }, { role: "user", content: "Your line:" }], "LIVE");
    const made = JSON.parse(calls[0]!.body);
    expect(made.systemInstruction.parts[0].text).toBe("SYSTEM");
    expect(made.ttl).toBe(`${CACHE_TTL_SECONDS}s`);
    const asked = JSON.parse(calls[1]!.body);
    expect(asked.contents.map((c: { role: string }) => c.role)).toEqual(["model", "user", "user"]);
    expect(asked.contents[2].parts[0].text).toBe("LIVE\n\nYour line:");
    expect(asked.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
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
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", google(calls));
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
      const first = await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      expect(first.usage.inputTokens).toBe(1704 + 1592 + cacheStorageAsInputTokens("gemini-3.8-flash", 1592, CACHE_TTL_SECONDS));
      /* Four minutes in, more than half the term is left: nothing to extend, nothing extra to pay. */
      vi.setSystemTime(new Date("2026-09-14T12:04:00Z"));
      const second = await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      expect(second.usage.inputTokens).toBe(1704);
      expect(calls.filter((c) => c.url.includes("updateMask=ttl"))).toHaveLength(0);
      /* Six minutes in, four are left: one PATCH, and six more minutes of storage booked on this turn. */
      vi.setSystemTime(new Date("2026-09-14T12:06:00Z"));
      const third = await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      const patches = calls.filter((c) => c.url.includes("updateMask=ttl"));
      expect(patches).toHaveLength(1);
      expect(JSON.parse(patches[0]!.body).ttl).toBe(`${CACHE_TTL_SECONDS}s`);
      expect(third.usage.inputTokens).toBe(1704 + cacheStorageAsInputTokens("gemini-3.8-flash", 1592, 360));
      /* And it is not remade: one creation over the whole run. */
      expect(calls.filter((c) => c.url.endsWith("/cachedContents?key=gem-key"))).toHaveLength(1);
      /* Twenty-one minutes in, the extended term has lapsed with nothing said in it, so it is made again. */
      vi.setSystemTime(new Date("2026-09-14T12:21:00Z"));
      await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
      expect(calls.filter((c) => c.url.endsWith("/cachedContents?key=gem-key"))).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to the plain transport on a link that will not hold the prompt, and never loses the line", async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (String(url).includes("/cachedContents")) {
        calls.push({ url: String(url), body: "" });
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
    const calls: { url: string; body: string }[] = [];
    let generateStatus: number | undefined = 404;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const gone = String(url).includes(":generateContent") ? generateStatus : undefined;
      if (gone) generateStatus = undefined;
      return google(calls, { generateStatus: gone })(url, init);
    });
    await expect(geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }])).rejects.toMatchObject({ status: 502 });
    await geminiCachedReply(LINK, "S", [{ role: "user", content: "hi" }]);
    expect(calls.filter((c) => c.url.includes("/cachedContents"))).toHaveLength(2);
  });

  it("reaches the ledger with the cached share, through the chain the route uses", async () => {
    const calls: { url: string; body: string }[] = [];
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
    expect(calls.every((c) => c.url.includes("/openai/chat/completions"))).toBe(true);
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
