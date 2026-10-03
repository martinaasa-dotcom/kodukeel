import { describe, expect, it } from "vitest";
import { costOf, isModelCall, modelOf, namesCacheEntry, replayKeyOf, spentIn } from "./harnessSpend";
import { estimateCostMicros } from "./pricing";

const GOOGLE = "https://generativelanguage.googleapis.com/v1beta";

describe("which requests are paid for", () => {
  it("is a POST asking a model for words, on a provider's own host", () => {
    expect(isModelCall(`${GOOGLE}/models/gemini-3.8-flash:generateContent?key=k`, "POST")).toBe(true);
    expect(isModelCall("https://api.groq.com/openai/v1/chat/completions", "POST")).toBe(true);
    expect(isModelCall("https://api.anthropic.com/v1/messages", "post")).toBe(true);
    expect(isModelCall(`${GOOGLE}/models/gemini-3.8-flash:countTokens?key=k`, "POST")).toBe(false);
    expect(isModelCall(`${GOOGLE}/models/gemini-3.8-flash:generateContent?key=k`, "GET")).toBe(false);
    expect(isModelCall("https://ekilex.ee/api/word/details/1", "POST")).toBe(false);
  });

  it("names the model from the path on Google's API and from the body elsewhere", () => {
    expect(modelOf(`${GOOGLE}/models/gemini-3.1-flash-lite:generateContent?key=k`, "{}")).toBe("gemini-3.1-flash-lite");
    expect(modelOf("https://api.groq.com/openai/v1/chat/completions", JSON.stringify({ model: "openai/gpt-oss-120b" }))).toBe("openai/gpt-oss-120b");
  });
});

describe("what a response says it used", () => {
  it("reads Google's own usage, thinking billed as output", () => {
    const body = JSON.stringify({ usageMetadata: { promptTokenCount: 2596, cachedContentTokenCount: 2592, candidatesTokenCount: 24, thoughtsTokenCount: 6 } });
    expect(spentIn(body)).toEqual({ inputTokens: 2596, outputTokens: 30, cachedInputTokens: 2592, cacheWriteTokens: 0 });
  });

  it("reads the last frame of an OpenAI-compatible stream, with hidden thinking as output", () => {
    const stream = [
      'data: {"choices":[{"delta":{"content":"Tere"}}]}',
      'data: {"choices":[],"usage":{"prompt_tokens":100,"completion_tokens":20,"total_tokens":150,"prompt_tokens_details":{"cached_tokens":40}}}',
      "data: [DONE]",
    ].join("\n\n");
    expect(spentIn(stream)).toEqual({ inputTokens: 100, outputTokens: 50, cachedInputTokens: 40, cacheWriteTokens: 0 });
  });

  it("reads Anthropic's input off its first event and its output off its last", () => {
    const stream = [
      'event: message_start\ndata: {"message":{"usage":{"input_tokens":10,"cache_read_input_tokens":500,"cache_creation_input_tokens":0,"output_tokens":1}}}',
      'event: message_delta\ndata: {"usage":{"output_tokens":42}}',
    ].join("\n\n");
    expect(spentIn(stream)).toEqual({ inputTokens: 510, outputTokens: 42, cachedInputTokens: 500, cacheWriteTokens: 0 });
  });

  it("says nothing where the response says nothing, so the caller estimates", () => {
    expect(spentIn("no usage here")).toBeNull();
  });

  it("prices off the table the ledger reads", () => {
    const spent = { inputTokens: 2596, outputTokens: 24, cachedInputTokens: 2592, cacheWriteTokens: 0 };
    expect(costOf("gemini-3.8-flash", spent)).toBe(estimateCostMicros("gemini-3.8-flash", 2596, 24, { cachedInputTokens: 2592 }));
  });
});

describe("two requests that are the same question", () => {
  it("ignores the key in the query string", () => {
    const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: "tere" }] }] });
    expect(replayKeyOf(`${GOOGLE}/models/m:generateContent?key=one`, body)).toBe(replayKeyOf(`${GOOGLE}/models/m:generateContent?key=two`, body));
  });

  it("is a different question where anything that reaches the model differs", () => {
    const ask = (text: string) => JSON.stringify({ contents: [{ role: "user", parts: [{ text }] }] });
    const base = replayKeyOf(`${GOOGLE}/models/m:generateContent`, ask("tere"));
    expect(replayKeyOf(`${GOOGLE}/models/m:generateContent`, ask("poodi"))).not.toBe(base);
    expect(replayKeyOf(`${GOOGLE}/models/other:generateContent`, ask("tere"))).not.toBe(base);
  });

  it("leaves a call served off a cache entry to the module that knows what the entry holds", () => {
    expect(namesCacheEntry(JSON.stringify({ cachedContent: "x/abc", contents: [] }))).toBe(true);
    expect(namesCacheEntry(JSON.stringify({ contents: [] }))).toBe(false);
  });
});
