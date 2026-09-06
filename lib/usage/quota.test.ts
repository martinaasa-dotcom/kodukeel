import { describe, expect, it } from "vitest";
import {
  DEFAULT_KIND_BUDGETS, DEFAULT_LIMITS, checkQuota, readLimits,
  secondsUntilUtcMidnight, utcDay,
  type UsageSnapshot,
} from "./quota";
import {
  UNKNOWN_MODEL, estimateCostMicros, estimateTokens, formatMicros, isFreeModel,
  normaliseModel, priceFor,
} from "./pricing";

const clear: UsageSnapshot = {
  burstCalls: 0, dailyCalls: 0, dailyCallsAllKinds: 0, dailyMicros: 0,
  globalMicros: 0, globalKindMicros: 0,
};
const NOON = new Date("2026-08-29T12:00:00.000Z");

describe("checkQuota", () => {
  it("allows a call when nothing has been used", () => {
    expect(checkQuota(clear, DEFAULT_LIMITS, NOON).allowed).toBe(true);
  });

  it("allows the call that lands exactly one under each limit", () => {
    const usage: UsageSnapshot = {
      burstCalls: DEFAULT_LIMITS.burstCalls - 1,
      dailyCalls: DEFAULT_LIMITS.dailyCallsPerUser - 1,
      dailyCallsAllKinds: DEFAULT_LIMITS.dailyCallsPerUser - 1,
      dailyMicros: DEFAULT_LIMITS.dailyMicrosPerUser - 1,
      // Under the reserve threshold, not one micro under the hard cap: past
      // the threshold a user with nine calls behind them is meant to wait, and
      // that is the rule the block below covers.
      globalMicros: reserveFrom() - 1,
      globalKindMicros: DEFAULT_LIMITS.dailyMicrosGlobalForKind - 1,
    };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).allowed).toBe(true);
  });

  /*
    THE CAP THAT PROTECTS A BALANCE RATHER THAN A BILL.

    One global figure was the whole truth while every path spent out of one
    account. Since the provider split, TUTOR spends an Anthropic balance and
    SCENE spends a Groq one, and the two are nothing like the same size: an Anu
    answer is about $0.0144 and a composed scene turn about $0.00044, so the
    $5 Anthropic balance is roughly 347 answers, which is a quarter of a $20
    day. The overall cap therefore cannot fire before the money is gone, and a
    cap that is reached after the money is gone is a receipt.
  */
  it("stops a kind that has spent its own slice, with the day's budget untouched", () => {
    const usage: UsageSnapshot = {
      ...clear,
      globalKindMicros: DEFAULT_LIMITS.dailyMicrosGlobalForKind,
      // Nowhere near the overall cap, which is exactly the case that used to
      // sail through: the balance runs out and nothing here had an opinion.
      globalMicros: 0,
    };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("KIND_SPEND");
    // Not a provider, not a model, not somebody's balance: what a learner can
    // act on is that this one part is rested and the rest still works.
    expect(decision.message).toMatch(/keeps working/);
  });

  it("leaves a kind one micro under its slice alone", () => {
    const usage: UsageSnapshot = {
      ...clear,
      globalKindMicros: DEFAULT_LIMITS.dailyMicrosGlobalForKind - 1,
    };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).allowed).toBe(true);
  });

  it("does not let one purpose's exhausted slice stop the other", () => {
    /*
      The independence the split exists for. `globalKindMicros` is the spend of
      the kind being asked about, so a snapshot taken for SCENE carries none of
      TUTOR's spend: Anu running her Anthropic balance down to the cap leaves
      scene composition answering on Groq, and a long evening of scenes leaves
      Anu answering. Neither can reach the other's provider to spend it, either,
      because since the split there is no chain from one to the other.
    */
    const tutorSpent: UsageSnapshot = {
      ...clear,
      globalKindMicros: DEFAULT_LIMITS.dailyMicrosGlobalForKind,
    };
    expect(checkQuota(tutorSpent, DEFAULT_LIMITS, NOON).allowed).toBe(false);

    // The same day, asked about the other kind: its own slice is untouched.
    const sceneUnspent: UsageSnapshot = { ...clear, globalKindMicros: 0 };
    expect(checkQuota(sceneUnspent, DEFAULT_LIMITS, NOON).allowed).toBe(true);
  });

  it("still stops everything when the whole day's budget has gone", () => {
    // The per-kind slice is a second floor, never a replacement: a kind well
    // inside its own allowance still cannot spend a budget that is finished.
    const usage: UsageSnapshot = {
      ...clear,
      globalKindMicros: 0,
      globalMicros: DEFAULT_LIMITS.dailyMicrosGlobal,
    };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).reason).toBe("GLOBAL_SPEND");
  });

  it("denies on the burst limit first, since it is the most recoverable", () => {
    const usage = { ...clear, burstCalls: DEFAULT_LIMITS.burstCalls, dailyCalls: 9999 };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.reason).toBe("BURST");
    expect(decision.retryAfterSeconds).toBe(DEFAULT_LIMITS.burstWindowSeconds);
  });

  it("denies on the per-user daily call limit", () => {
    const usage = { ...clear, dailyCalls: DEFAULT_LIMITS.dailyCallsPerUser };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).reason).toBe("DAILY_CALLS");
  });

  it("denies on the per-user spend limit", () => {
    const usage = { ...clear, dailyMicros: DEFAULT_LIMITS.dailyMicrosPerUser };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).reason).toBe("DAILY_SPEND");
  });

  it("denies on the global cap even when this user has spent nothing", () => {
    const usage = { ...clear, globalMicros: DEFAULT_LIMITS.dailyMicrosGlobal };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.reason).toBe("GLOBAL_SPEND");
    // The person who trips it did not cause it; the message must not imply they did.
    expect(decision.message).toMatch(/not about your account/i);
  });

  it("tells a daily denial to come back after midnight UTC", () => {
    const usage = { ...clear, dailyCalls: DEFAULT_LIMITS.dailyCallsPerUser };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.retryAfterSeconds).toBe(12 * 3600);
  });

  it("never reports a zero or negative retry delay", () => {
    const oneSecondToMidnight = new Date("2026-08-29T23:59:59.500Z");
    expect(secondsUntilUtcMidnight(oneSecondToMidnight)).toBeGreaterThan(0);
  });
});

describe("readLimits", () => {
  it("falls back to the defaults when nothing is configured", () => {
    expect(readLimits({})).toEqual(DEFAULT_LIMITS);
  });

  it("gives a kind with no slice of its own the whole budget", () => {
    // SCAN, the writing grader and speech did not change provider, so the split
    // must not quietly tighten them.
    const limits = readLimits({ AI_DAILY_USD_GLOBAL: "20" }, "SCAN");
    expect(limits.dailyMicrosGlobalForKind).toBe(limits.dailyMicrosGlobal);
  });

  it("gives the two routed purposes their own slices", () => {
    expect(readLimits({}, "TUTOR").dailyMicrosGlobalForKind)
      .toBe(DEFAULT_KIND_BUDGETS.TUTOR);
    expect(readLimits({}, "SCENE").dailyMicrosGlobalForKind)
      .toBe(DEFAULT_KIND_BUDGETS.SCENE);
    // And Anu's is the tighter of the two, since hers is the dearer call
    // against the smaller balance.
    expect(DEFAULT_KIND_BUDGETS.TUTOR!).toBeLessThan(DEFAULT_KIND_BUDGETS.SCENE!);
  });

  it("lets a deployment set its own slice per purpose", () => {
    expect(readLimits({ AI_DAILY_USD_TUTOR: "1.50" }, "TUTOR").dailyMicrosGlobalForKind)
      .toBe(1_500_000);
    expect(readLimits({ AI_DAILY_USD_SCENE: "0.10" }, "SCENE").dailyMicrosGlobalForKind)
      .toBe(100_000);
  });

  it("clamps a slice bigger than the whole budget down to it", () => {
    /*
      A slice above the global reads like a generous allowance and is a
      configuration mistake, and the failure it produces is the one thing this
      module may not do: a cap that is never what binds.
    */
    const limits = readLimits({ AI_DAILY_USD_GLOBAL: "5", AI_DAILY_USD_SCENE: "50" }, "SCENE");
    expect(limits.dailyMicrosGlobalForKind).toBe(5_000_000);
  });

  it("stops a purpose dead when the global budget is set to zero", () => {
    // `AI_DAILY_USD_GLOBAL="0"` is documented as the way to stop AI spending
    // entirely, and a per-purpose slice must not become a way around it.
    const limits = readLimits({ AI_DAILY_USD_GLOBAL: "0", AI_DAILY_USD_TUTOR: "5" }, "TUTOR");
    expect(limits.dailyMicrosGlobalForKind).toBe(0);
    expect(checkQuota(clear, limits, NOON).allowed).toBe(false);
  });

  it("reads dollars and stores micro-dollars", () => {
    expect(readLimits({ AI_DAILY_USD_PER_USER: "0.25" }).dailyMicrosPerUser).toBe(250_000);
  });

  it("ignores a value that is not a usable number, rather than disabling the limit", () => {
    expect(readLimits({ AI_DAILY_CALLS_PER_USER: "lots" }).dailyCallsPerUser)
      .toBe(DEFAULT_LIMITS.dailyCallsPerUser);
    expect(readLimits({ AI_DAILY_USD_GLOBAL: "-5" }).dailyMicrosGlobal)
      .toBe(DEFAULT_LIMITS.dailyMicrosGlobal);
  });

  it("allows an explicit zero, which stops AI spending entirely", () => {
    expect(readLimits({ AI_DAILY_USD_GLOBAL: "0" }).dailyMicrosGlobal).toBe(0);
    const denied = checkQuota(clear, readLimits({ AI_DAILY_USD_GLOBAL: "0" }), NOON);
    expect(denied.allowed).toBe(false);
  });
});

describe("utcDay", () => {
  it("keys by UTC date, not local time", () => {
    expect(utcDay(new Date("2026-08-29T23:59:59.999Z"))).toBe("2026-08-29");
    expect(utcDay(new Date("2026-08-30T00:00:00.000Z"))).toBe("2026-08-30");
  });
});

describe("pricing", () => {
  it("strips an OpenRouter vendor prefix and a variant suffix", () => {
    expect(normaliseModel("anthropic/claude-sonnet-5")).toBe("claude-sonnet-5");
    expect(normaliseModel("openai/gpt-4o:extended")).toBe("gpt-4o");
    expect(normaliseModel("GPT-4O")).toBe("gpt-4o");
  });

  it("prices a known model from the table", () => {
    expect(priceFor("claude-sonnet-5")).toEqual({ inputPerMTok: 2, outputPerMTok: 10 });
    expect(priceFor("anthropic/claude-opus-5")).toEqual({ inputPerMTok: 5, outputPerMTok: 25 });
  });

  it("charges an unknown model at the dearest rate rather than at zero", () => {
    // A cap that fails open is not a cap.
    expect(priceFor("some-new-model-2027")).toEqual(UNKNOWN_MODEL);
    expect(estimateCostMicros("some-new-model-2027", 1_000_000, 0)).toBe(10_000_000);
  });

  it("prices an explicitly free model at zero", () => {
    expect(isFreeModel("z-ai/glm-5.2:free")).toBe(true);
    expect(estimateCostMicros("z-ai/glm-5.2:free", 1_000_000, 1_000_000)).toBe(0);
  });

  it("computes a cost that matches the published rate", () => {
    // 1M in + 1M out on sonnet-5 is $2 + $10.
    expect(estimateCostMicros("claude-sonnet-5", 1e6, 1e6)).toBe(12_000_000);
  });

  it("rounds a fractional cost up, never down to zero", () => {
    expect(estimateCostMicros("gpt-4o-mini", 1, 0)).toBe(1);
  });

  it("treats a negative token count as zero", () => {
    expect(estimateCostMicros("gpt-4o", -500, 0)).toBe(0);
  });

  it("over-counts tokens rather than under-counting them", () => {
    // Estonian agglutination tokenizes worse than English, and the safe
    // direction for a quota is to bind sooner.
    expect(estimateTokens("kolmekümne")).toBeGreaterThanOrEqual("kolmekümne".length / 4);
  });

  it("formats micro-dollars for a human", () => {
    expect(formatMicros(1_234_567)).toBe("$1.23");
    expect(formatMicros(0)).toBe("$0.00");
  });
});

/** Where the shared budget starts being held back for people who have had none. */
const reserveFrom = () =>
  DEFAULT_LIMITS.dailyMicrosGlobal * (1 - DEFAULT_LIMITS.globalReserveFraction);

/*
  The reserve exists because a single global cap is first come, first served.
  Whoever arrives early spends the day's budget and everyone after them finds
  Anu switched off, newcomers included. The people turned away are the ones who
  have used it least, which is backwards for an app strangers are still
  deciding about.
*/
describe("the reserve at the end of the shared budget", () => {
  const deepInReserve = DEFAULT_LIMITS.dailyMicrosGlobal - 1;

  it("still answers somebody who has asked nothing today", () => {
    const usage = { ...clear, globalMicros: deepInReserve };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).allowed).toBe(true);
  });

  it("asks a heavy user to wait once the budget is into the reserve", () => {
    const usage = {
      ...clear,
      dailyCalls: DEFAULT_LIMITS.reserveCallsPerUser,
      dailyCallsAllKinds: DEFAULT_LIMITS.reserveCallsPerUser,
      globalMicros: deepInReserve,
    };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("GLOBAL_BUSY");
  });

  /*
    THE RESERVE IS ABOUT THE PERSON, SO IT COUNTS THE PERSON.

    It read `dailyCalls`, which `snapshotUsage` fills with calls *of the kind
    being asked about*. So a learner on their tenth tutor call waited, and the
    same learner's first scan, the dearest single call in the app at ten
    thousand micros reserved, went through as though they had asked nothing
    all day, with 29 grader calls behind it.
  */
  it("counts every kind of call when deciding who has already had a few", () => {
    const usage = {
      ...clear,
      // Nothing of *this* kind yet, and a full day of something else.
      dailyCalls: 0,
      dailyCallsAllKinds: DEFAULT_LIMITS.reserveCallsPerUser,
      globalMicros: deepInReserve,
    };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("GLOBAL_BUSY");
  });

  it("says it is not about this person's account", () => {
    const usage = {
      ...clear,
      dailyCalls: DEFAULT_LIMITS.reserveCallsPerUser,
      dailyCallsAllKinds: DEFAULT_LIMITS.reserveCallsPerUser,
      globalMicros: deepInReserve,
    };
    // The learner did nothing wrong and can do nothing about it, so the message
    // says what still works rather than implying they overspent.
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).message).toMatch(/review, the dictionary/);
  });

  it("does not hold anyone back while the budget is still comfortable", () => {
    const usage = { ...clear, dailyCalls: 9, dailyCallsAllKinds: 9, globalMicros: reserveFrom() - 1 };
    expect(checkQuota(usage, DEFAULT_LIMITS, NOON).allowed).toBe(true);
  });

  it("stops everybody once the budget is genuinely gone, reserve or not", () => {
    const usage = { ...clear, globalMicros: DEFAULT_LIMITS.dailyMicrosGlobal };
    const decision = checkQuota(usage, DEFAULT_LIMITS, NOON);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("GLOBAL_SPEND");
  });

  it("keeps the app free: nothing here charges anyone anything", () => {
    // The allowance is the whole mechanism. There is no plan, no tier and no
    // paid escape from any of these limits, by design.
    expect(Object.keys(DEFAULT_LIMITS)).not.toContain("plan");
  });
});
