import { beforeEach, describe, expect, it } from "vitest";
import { MAX_OUT_MS, forgetExhausted, isExhausted, liveLinks, markExhausted, noteRefusal, retryDelayMs } from "./exhausted";

const FLASH = { name: "gemini", model: "gemini-3.8-flash" };
const LITE = { name: "gemini", model: "gemini-3.1-flash-lite" };
const T0 = Date.parse("2026-10-02T23:00:00Z");

describe("how long a refusal says it lasts", () => {
  it("reads Google's RetryInfo, whole and fractional", () => {
    expect(retryDelayMs('{"details":[{"retryDelay":"3725s"}]}')).toBe(3_725_000);
    expect(retryDelayMs('"retryDelay": "12.5s"')).toBe(12_500);
  });

  it("reads a retry-after header in seconds, which is what Groq sends", () => {
    expect(retryDelayMs("", "30")).toBe(30_000);
    expect(retryDelayMs("", "Wed, 21 Oct 2026 07:28:00 GMT")).toBeNull();
  });

  it("reads the delay Google writes into the message where the detail is missing", () => {
    expect(retryDelayMs("Please retry in 1h2m5.5s.")).toBe(3_725_500);
    expect(retryDelayMs("Please retry in 40s")).toBe(40_000);
  });

  it("guesses nothing where nothing is said", () => {
    expect(retryDelayMs("too many requests")).toBeNull();
    expect(retryDelayMs("")).toBeNull();
  });
});

describe("a model marked out", () => {
  beforeEach(() => forgetExhausted());

  it("stays out for as long as it said and comes back on its own", () => {
    noteRefusal(FLASH, '"retryDelay": "60s"', null, T0);
    expect(isExhausted(FLASH, T0 + 59_000)).toBe(true);
    expect(isExhausted(FLASH, T0 + 60_000)).toBe(false);
  });

  it("is never marked by a refusal that names no delay", () => {
    noteRefusal(FLASH, "slow down", null, T0);
    expect(isExhausted(FLASH, T0)).toBe(false);
  });

  it("is capped, so a misread delay heals the same day", () => {
    markExhausted(FLASH, 10 * 24 * 3_600_000, T0);
    expect(isExhausted(FLASH, T0 + MAX_OUT_MS - 1)).toBe(true);
    expect(isExhausted(FLASH, T0 + MAX_OUT_MS)).toBe(false);
  });

  it("keeps the longer of two marks", () => {
    markExhausted(FLASH, 3_600_000, T0);
    markExhausted(FLASH, 10_000, T0);
    expect(isExhausted(FLASH, T0 + 60_000)).toBe(true);
  });

  it("is one model on one provider, never its neighbours", () => {
    markExhausted(FLASH, 60_000, T0);
    expect(liveLinks([FLASH, LITE], T0)).toEqual([LITE]);
    expect(isExhausted({ name: "groq", model: FLASH.model }, T0)).toBe(false);
  });
});
