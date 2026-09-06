import { describe, expect, it } from "vitest";
import {
  CACHE_READ_RATE,
  CACHE_WRITE_RATE,
  estimateCostMicros,
  priceFor,
} from "./pricing";

/**
 * What a cached token costs, and why the split has to reach the price.
 *
 * The three Anthropic call sites all reported one input figure with the cache
 * buckets folded into it, so a token served from a cache was charged at the
 * base rate: ten times what Anthropic bills for it. Nothing overspent, since
 * that is the safe direction, and the cost was the feature itself. Prompt
 * caching exists to take ninety percent off a prompt that does not change,
 * and the ledger that decides when to stop spending could not see any of it.
 */
describe("the price of a cached input token", () => {
  const MODEL = "claude-sonnet-5";
  const rate = priceFor(MODEL).inputPerMTok;

  it("is a tenth of base to read and a quarter more than base to write", () => {
    expect(CACHE_READ_RATE).toBe(0.1);
    expect(CACHE_WRITE_RATE).toBe(1.25);
  });

  it("charges a call served from the cache far less than the same call without one", () => {
    const cold = estimateCostMicros(MODEL, 2_000, 100);
    const warm = estimateCostMicros(MODEL, 2_000, 100, { cachedInputTokens: 1_900 });
    expect(warm).toBeLessThan(cold);
    /*
      1,900 read at a tenth plus 100 at base is 290 token-equivalents against
      2,000, so the input side of a warm call is about a seventh of a cold one.
      Asserted as a band rather than a figure, because the output side is in
      both and the exact ratio moves with the model's own two rates.
    */
    expect(warm / cold).toBeLessThan(0.5);
  });

  it("prices each bucket at its own rate and the remainder at base", () => {
    const micros = estimateCostMicros(MODEL, 1_000, 0, {
      cachedInputTokens: 600,
      cacheWriteTokens: 200,
    });
    const expected = Math.ceil(
      ((200 / 1e6) * rate + (600 / 1e6) * rate * CACHE_READ_RATE + (200 / 1e6) * rate * CACHE_WRITE_RATE) * 1e6,
    );
    expect(micros).toBe(expected);
  });

  /*
    A CALLER THAT KNOWS NOTHING ABOUT CACHING KEEPS THE BEHAVIOUR IT HAD.
    Every provider but Anthropic reports one input figure and no split, so the
    absent case is the common one and must stay exactly as it was: everything
    at base, which over-counts and therefore still fails closed.
  */
  it("prices a call with no reported split exactly as it did before", () => {
    expect(estimateCostMicros(MODEL, 1_000, 100, {})).toBe(estimateCostMicros(MODEL, 1_000, 100));
    expect(estimateCostMicros(MODEL, 1_000, 100)).toBe(
      Math.ceil(((1_000 / 1e6) * rate + (100 / 1e6) * priceFor(MODEL).outputPerMTok) * 1e6),
    );
  });

  /*
    The buckets are parts of the total, not extras on top of it. A provider
    that reported a split larger than the total, or a caller that populated
    one field and not the other, must never drive the plain remainder negative
    and hand money back: a cap that can be refunded into is not a cap.
  */
  it("never refunds a call when the reported split exceeds the total", () => {
    const micros = estimateCostMicros(MODEL, 100, 0, {
      cachedInputTokens: 5_000,
      cacheWriteTokens: 5_000,
    });
    expect(micros).toBeGreaterThan(0);
    expect(estimateCostMicros(MODEL, -50, -50, { cachedInputTokens: -10 })).toBe(0);
  });

  /*
    A `:free` SLUG IS THE ONLY THING THAT IS FREE, AND THAT IS A CORRECTION.
    This asserted that `qwen/qwen3.8-27b` costs nothing, which was true of the
    table on the day it was written and was never true of the invoice: Groq's
    own /v1/models reports $0.80 and $4.00 per MTok for it. A cap that prices a
    paid model at zero is a cap that fails open, so the rows were corrected to
    the API's figures. What stays free is a slug that says so.
  */
  it("charges nothing only for a slug the provider marks free, cached or not", () => {
    expect(estimateCostMicros("google/gemma-4-31b-it:free", 5_000, 500)).toBe(0);
    expect(estimateCostMicros("google/gemma-4-31b-it:free", 5_000, 500, { cachedInputTokens: 4_000 })).toBe(0);
    // And a model somebody is billed for is billed for, cache or no cache.
    expect(estimateCostMicros("qwen/qwen3.8-27b", 5_000, 500)).toBeGreaterThan(0);
  });

  /*
    AND AN UNKNOWN MODEL IS STILL CHARGED AT THE DEAREST RATE. The cache split
    is a discount, so the one thing it must not become is a way past the rule
    that a model nobody recognises fails closed.
  */
  it("keeps an unrecognised model above a recognised one even when its input is cached", () => {
    const unknown = estimateCostMicros("something-nobody-has-heard-of", 10_000, 500, {
      cachedInputTokens: 9_000,
    });
    expect(unknown).toBeGreaterThan(0);
  });
});
