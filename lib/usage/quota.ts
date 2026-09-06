/**
 * The spend policy. Pure: it takes what has already been used and says whether
 * the next call may proceed.
 *
 * The original plan called for this in Phase 2 — "before heavy use, not after
 * the first bill" — and it was cut when the default model was free. The default
 * is a paid model again and sign-up is open, so an unmetered path is now one
 * stranger away from an unbounded invoice.
 *
 * Three limits, because they fail in different ways:
 *   - a burst limit stops a runaway client or a held-down key,
 *   - a per-user daily limit stops one enthusiastic person monopolizing the key,
 *   - a global daily cost cap is the actual guarantee about the bill,
 *   - and, since two providers are configured for two different jobs, a
 *     per-kind slice of that cap, because one shared number cannot protect two
 *     balances that are not the same size. See `DEFAULT_KIND_BUDGETS`.
 */
import type { UsageKind } from "./pricing";

export interface QuotaLimits {
  /** Calls one user may make in `burstWindowSeconds`. */
  burstCalls: number;
  burstWindowSeconds: number;
  /** Calls one user may make in a UTC day. */
  dailyCallsPerUser: number;
  /** Micro-dollars one user may spend in a UTC day. */
  dailyMicrosPerUser: number;
  /** Micro-dollars every user together may spend in a UTC day, on everything. */
  dailyMicrosGlobal: number;
  /**
   * Micro-dollars every user together may spend in a UTC day on *this kind* of
   * call. Both this and `dailyMicrosGlobal` have to hold: the overall figure is
   * the ceiling on the bill and this one is the ceiling on one provider's
   * balance, and neither is a substitute for the other.
   */
  dailyMicrosGlobalForKind: number;
  /**
   * The tail of the global budget held back for people who have barely used
   * Anu today. 0.25 means the last quarter is reserved.
   */
  globalReserveFraction: number;
  /** Calls a user may still make once the budget is down to that reserve. */
  reserveCallsPerUser: number;
}

/**
 * Sized for an app that is free to everybody and has to stay that way.
 *
 * The whole product works with no AI at all: review, the dictionary, every
 * drill, the writing exercise's actual verdict, offline. Anu is the one part
 * that costs money per use, so she is the one part with a small allowance. Ten
 * conversations a day is enough to understand what she is for and not enough
 * for anyone to run up a bill with. The number is the base; `lib/usage/ledger`
 * scales it per kind, because a grader note and a cache miss on speech are not
 * the same thing as a tutoring conversation.
 *
 * The per-user spend cap is a backstop rather than the control. At ten tutor
 * answers and thirty grader notes it should never be the thing that bites.
 */
export const DEFAULT_LIMITS: QuotaLimits = {
  burstCalls: 8,
  burstWindowSeconds: 60,
  dailyCallsPerUser: 10,
  dailyMicrosPerUser: 500_000,        // $0.50
  dailyMicrosGlobal: 20_000_000,      // $20.00
  // Overridden per kind by `DEFAULT_KIND_BUDGETS`; this is the value a kind
  // with nothing to say about itself falls back to, which is the whole budget.
  dailyMicrosGlobalForKind: 20_000_000,
  globalReserveFraction: 0.25,
  reserveCallsPerUser: 3,
};

/**
 * A slice of the day's budget per kind of call, and why one number stopped
 * being enough.
 *
 * ONE CAP CANNOT PROTECT TWO BALANCES. Until the provider split there was one
 * chain, so every path spent out of the same account and a single global figure
 * was the whole truth about the bill. There are two now and they are nothing
 * like each other: scene composition runs on Groq at $0.29/$0.59 per MTok, and
 * Anu runs on Anthropic at $2/$10 against a balance that is currently $5. One
 * Anu answer costs what thirty-three composed scene turns cost.
 *
 * What that does to a single $20/day cap is make it irrelevant to the thing
 * most worth protecting. Anu's whole $5 balance is about 347 answers, and 347
 * answers is $5, which is a quarter of the way to a cap that therefore never
 * fires: the balance runs out first, the provider answers 402, and the first
 * anybody knows about it is a learner getting a refusal. A cap that is reached
 * after the money has gone is not a cap, it is a receipt.
 *
 * THE ARITHMETIC THESE NUMBERS COME FROM, measured against the real prompts
 * (`lib/tutor/prompt.ts` builds a 3,031-token system prompt; the scene route's
 * word list is 714 to 955 tokens across the fourteen shipped scenes):
 *
 *   TUTOR   ~3,700 in at $2/MTok + ~700 out at $10/MTok  = $0.0144 an answer.
 *           $0.50 a day is ~34 answers, so a $5 balance lasts at least ten days
 *           of the cap being reached every single day, and the *cap* is what
 *           stops Anu rather than the balance. That is the difference between a
 *           learner reading "today's shared budget is used up, it resets at
 *           midnight" and a learner reading nothing while a 402 is logged.
 *   SCENE   ~1,400 in at $0.29/MTok + ~60 out at $0.59/MTok = $0.00044 a turn.
 *           $2.00 a day is ~4,500 composed turns, which is around 900
 *           conversations: more than this deployment will see, and bounded at
 *           $60 a month if it ever does.
 *   GRADER  ~900 in + ~200 out (the three system prompts in lib/tutor/grader.ts
 *           measure 462, 609 and 717 tokens). On Groq, which now leads the
 *           general chain, that is $0.00038 a note and $0.50 buys about 1,300
 *           of them; if Groq is down and Anthropic answers instead it is
 *           $0.0038, so the same $0.50 still buys 130. Sized off the dearer
 *           reading on purpose: a slice that only holds while the cheap
 *           provider is up is not a slice.
 *   SCAN    the dearest single call and the least repeated, since a page is
 *           photographed once and studied for weeks. ~3,000 in of image and
 *           ~400 out. It needs a model that can see, and the cheap one cannot,
 *           so it is priced against Anthropic at $0.010 a page: $1.00 is 100
 *           scans a day across the deployment.
 *
 * TTS is the one metered kind with no slice, and that is not an oversight: it
 * is free, so a budget denominated in money says nothing about it. What
 * rations speech is its call count, which `ALLOWANCE` already sets at thirty
 * times the base.
 *
 * These are defaults; each has an environment variable below, and
 * `AI_DAILY_USD_GLOBAL` still bounds the lot. The four together come to $4.00
 * against a $20 day, which is the shape intended: the global figure is a
 * backstop over everything rather than the number that decides any one path.
 */
export const DEFAULT_KIND_BUDGETS: Readonly<Partial<Record<UsageKind, number>>> = {
  TUTOR: 500_000,     // $0.50
  SCENE: 2_000_000,   // $2.00
  GRADER: 500_000,    // $0.50
  SCAN: 1_000_000,    // $1.00
};

/** The environment variable that overrides a kind's slice, where it has one. */
const KIND_BUDGET_ENV: Readonly<Partial<Record<UsageKind, string>>> = {
  TUTOR: "AI_DAILY_USD_TUTOR",
  SCENE: "AI_DAILY_USD_SCENE",
  GRADER: "AI_DAILY_USD_GRADER",
  SCAN: "AI_DAILY_USD_SCAN",
};

function num(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export interface QuotaEnv {
  AI_BURST_CALLS?: string | undefined;
  AI_BURST_WINDOW_SECONDS?: string | undefined;
  AI_DAILY_CALLS_PER_USER?: string | undefined;
  AI_DAILY_USD_PER_USER?: string | undefined;
  AI_DAILY_USD_GLOBAL?: string | undefined;
  AI_DAILY_USD_TUTOR?: string | undefined;
  AI_DAILY_USD_SCENE?: string | undefined;
  AI_DAILY_USD_GRADER?: string | undefined;
  AI_DAILY_USD_SCAN?: string | undefined;
  AI_GLOBAL_RESERVE_FRACTION?: string | undefined;
  AI_RESERVE_CALLS_PER_USER?: string | undefined;
  [key: string]: string | undefined;
}

/**
 * Limits are configurable, but every one of them has a value. There is no "off".
 *
 * `kind` is optional for the readers that want the deployment's shape rather
 * than a verdict about one call: `snapshotUsage` needs the burst window and
 * nothing else, and `lib/funding` prices a hypothetical month. Without one, the
 * per-kind slice is the whole budget, which is the honest answer to "what may
 * be spent" when nobody has said on what.
 */
export function readLimits(env: QuotaEnv = process.env, kind?: UsageKind): QuotaLimits {
  const dailyMicrosGlobal = Math.round(
    num(env.AI_DAILY_USD_GLOBAL, DEFAULT_LIMITS.dailyMicrosGlobal / 1e6) * 1e6,
  );
  return {
    burstCalls: num(env.AI_BURST_CALLS, DEFAULT_LIMITS.burstCalls),
    burstWindowSeconds: num(env.AI_BURST_WINDOW_SECONDS, DEFAULT_LIMITS.burstWindowSeconds),
    dailyCallsPerUser: num(env.AI_DAILY_CALLS_PER_USER, DEFAULT_LIMITS.dailyCallsPerUser),
    dailyMicrosPerUser: Math.round(
      num(env.AI_DAILY_USD_PER_USER, DEFAULT_LIMITS.dailyMicrosPerUser / 1e6) * 1e6,
    ),
    dailyMicrosGlobal,
    /*
      Clamped to the overall budget rather than trusted, for the reason the
      reserve fraction below is clamped: a per-kind slice larger than the whole
      is a configuration mistake that reads like a generous allowance, and the
      failure it produces is the one this app cannot have, which is a cap that
      is never the thing that binds. Setting `AI_DAILY_USD_SCENE="50"` under a
      $20 global does not buy $50 of scenes; it buys $20, and says so here
      rather than in a surprise.
    */
    dailyMicrosGlobalForKind: Math.min(
      dailyMicrosGlobal,
      kindBudgetMicros(kind, env, dailyMicrosGlobal),
    ),
    // Clamped rather than trusted: a fraction above 1 would reserve more than
    // the budget and refuse the first call of the day.
    globalReserveFraction: Math.min(
      0.9,
      num(env.AI_GLOBAL_RESERVE_FRACTION, DEFAULT_LIMITS.globalReserveFraction),
    ),
    reserveCallsPerUser: num(env.AI_RESERVE_CALLS_PER_USER, DEFAULT_LIMITS.reserveCallsPerUser),
  };
}

/**
 * What one kind of call may spend across the whole deployment in a day.
 *
 * A kind with no slice of its own gets the whole budget, which is exactly what
 * every kind had before the split: adding this must not quietly tighten SCAN or
 * GRADER, whose providers did not change.
 */
function kindBudgetMicros(
  kind: UsageKind | undefined,
  env: QuotaEnv,
  wholeBudget: number,
): number {
  if (!kind) return wholeBudget;
  const fallback = DEFAULT_KIND_BUDGETS[kind];
  if (fallback === undefined) return wholeBudget;
  const variable = KIND_BUDGET_ENV[kind];
  const raw = variable ? env[variable] : undefined;
  return Math.round(num(raw, fallback / 1e6) * 1e6);
}

export interface UsageSnapshot {
  /** Calls this user made inside the burst window. */
  burstCalls: number;
  /** Calls this user made today (UTC), of the kind being asked about. */
  dailyCalls: number;
  /**
   * Calls this user made today (UTC), of every kind.
   *
   * The reserve below asks "has this person already had a few answers today",
   * and `dailyCalls` answers a narrower question: a few answers *of this
   * kind*. So a learner on their tenth tutor call was held back while the
   * same learner's first scan, the dearest single call in the app, went
   * through as if they had asked nothing all day, and 29 grader calls went
   * with it. The reserve is about the person, so it counts the person.
   */
  dailyCallsAllKinds: number;
  /** Micro-dollars this user spent today (UTC). */
  dailyMicros: number;
  /** Micro-dollars everyone spent today (UTC), on everything. */
  globalMicros: number;
  /**
   * Micro-dollars everyone spent today (UTC) on the kind being asked about.
   *
   * A separate number rather than a share of the one above, because that is the
   * only version that can protect a provider's balance: the two purposes are
   * two accounts now, and Anu's $5 is not made safer by scene composition
   * having been cheap.
   */
  globalKindMicros: number;
}

export type QuotaDenial =
  | "BURST"
  | "DAILY_CALLS"
  | "DAILY_SPEND"
  /** The shared budget is into its reserve, and this user has had their share. */
  | "GLOBAL_BUSY"
  | "GLOBAL_SPEND"
  /** This kind of call has spent its own slice of the day, whatever is left overall. */
  | "KIND_SPEND";

export interface QuotaDecision {
  allowed: boolean;
  reason?: QuotaDenial;
  /** What to show the learner. Never mentions another user's usage. */
  message?: string;
  /** Seconds to wait, for the `Retry-After` header. */
  retryAfterSeconds?: number;
}

/**
 * Seconds until the next UTC midnight, for a `Retry-After` on a daily limit.
 * Callers pass `now` so this stays testable.
 */
export function secondsUntilUtcMidnight(now: Date): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
  );
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

/**
 * Checked *before* a call, so the limits are boundaries the next call must stay
 * under. A user sitting exactly on `dailyCallsPerUser` has used their day.
 */
/*
  THE MESSAGES NAME NO ONE FEATURE, and they used to name Anu.

  That was true when the tutor and the scan were the only paths that reached a
  model. A conversation reaches one now, so a learner standing at a reception
  desk was told "you have reached today's limit for Anu", which is a screen
  naming a feature they are not using: a failure may not misname its cause, and
  the cause here is the day's shared allowance rather than any one part of the
  app. This module is pure and is handed a `kind`-free snapshot on purpose, so
  the honest sentence is the one that is true of every caller.
*/
export function checkQuota(
  usage: UsageSnapshot,
  limits: QuotaLimits,
  now: Date,
): QuotaDecision {
  if (usage.burstCalls >= limits.burstCalls) {
    return {
      allowed: false,
      reason: "BURST",
      message: "That is a lot at once. Give it a few seconds.",
      retryAfterSeconds: limits.burstWindowSeconds,
    };
  }

  if (usage.dailyCalls >= limits.dailyCallsPerUser) {
    return {
      allowed: false,
      reason: "DAILY_CALLS",
      message:
        "You have used today's share of the parts that ask a model. Everything " +
        "else (review, the dictionary, your deck) keeps working, and it resets " +
        "at midnight UTC.",
      retryAfterSeconds: secondsUntilUtcMidnight(now),
    };
  }

  if (usage.dailyMicros >= limits.dailyMicrosPerUser) {
    return {
      allowed: false,
      reason: "DAILY_SPEND",
      message:
        "You have used today's share of the budget for the parts that ask a " +
        "model. It resets at midnight UTC.",
      retryAfterSeconds: secondsUntilUtcMidnight(now),
    };
  }

  /*
    THIS KIND'S OWN SLICE, CHECKED BEFORE THE SHARED ONE.

    Before the overall cap because it is the tighter and the more specific of
    the two, so it is the one that will actually fire, and a learner is owed the
    reason that is true rather than the one that is merely also true. Before the
    reserve for the same reason: the reserve is about who gets the tail of a
    budget that still has some left, and this kind's tail has already gone.

    THE FAILURE THIS BUYS IS AN INDEPENDENT ONE, which is the whole point. Anu
    reaching her slice stops Anu and leaves scene composition running on Groq,
    and a run of scenes exhausting theirs leaves Anu answering on Anthropic.
    Neither provider running dry takes the other's feature down with it, and
    neither can reach across and spend the other's balance, because since the
    purpose split there is no chain from one to the other.

    The message says which part of the app rather than naming a provider or a
    model: what a learner can act on is that this one thing is rested until
    midnight and everything else still works, and a sentence about somebody's
    Anthropic balance is a fact about the operator.
  */
  if (usage.globalKindMicros >= limits.dailyMicrosGlobalForKind) {
    return {
      allowed: false,
      reason: "KIND_SPEND",
      message:
        "This part of the app has used today's shared budget for asking a model. " +
        "The rest of it, and everything that never asks one, keeps working. It " +
        "resets at midnight UTC.",
      retryAfterSeconds: secondsUntilUtcMidnight(now),
    };
  }

  /*
    The shared budget, in two steps rather than one cliff.

    A single global cap is first come, first served: whoever arrives early
    spends it, and everybody after them finds Anu switched off, including
    somebody opening the app for the first time. The people most likely to be
    turned away are the ones who have used it least, which is exactly backwards.

    So the last slice of the budget is a reserve. Once spending reaches it,
    anyone who has already had a few answers today waits, and anyone who has
    not can still ask. It costs the heavy user their eleventh conversation and
    buys a newcomer their first, which is the right trade for a free app that
    strangers are still deciding about.
  */
  const reserveFrom = limits.dailyMicrosGlobal * (1 - limits.globalReserveFraction);
  if (
    usage.globalMicros >= reserveFrom &&
    usage.globalMicros < limits.dailyMicrosGlobal &&
    usage.dailyCallsAllKinds >= limits.reserveCallsPerUser
  ) {
    return {
      allowed: false,
      reason: "GLOBAL_BUSY",
      message:
        "The rest of today's shared budget is being kept for people who have not " +
        "asked anything yet, and it resets at midnight UTC. Everything else " +
        "(review, the dictionary, your deck) keeps working.",
      retryAfterSeconds: secondsUntilUtcMidnight(now),
    };
  }

  // Checked last: it is the rarest, and the least actionable for the person who
  // happens to trip it. The message says so rather than blaming them.
  if (usage.globalMicros >= limits.dailyMicrosGlobal) {
    return {
      allowed: false,
      reason: "GLOBAL_SPEND",
      message:
        "This deployment has reached its shared daily budget for AI. This is not " +
        "about your account. It resets at midnight UTC.",
      retryAfterSeconds: secondsUntilUtcMidnight(now),
    };
  }

  return { allowed: true };
}

/** The UTC day key a ledger row is filed under, e.g. "2026-08-29". */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}
