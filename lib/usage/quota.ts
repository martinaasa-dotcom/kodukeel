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
 *   - a global daily cost cap is the actual guarantee about the bill.
 */

export interface QuotaLimits {
  /** Calls one user may make in `burstWindowSeconds`. */
  burstCalls: number;
  burstWindowSeconds: number;
  /** Calls one user may make in a UTC day. */
  dailyCallsPerUser: number;
  /** Micro-dollars one user may spend in a UTC day. */
  dailyMicrosPerUser: number;
  /** Micro-dollars every user together may spend in a UTC day. */
  dailyMicrosGlobal: number;
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
 * The per-user spend cap was a backstop rather than the control, and at ten
 * tutor answers and thirty grader notes it was never the thing that bit. That
 * stopped being true when the global cap came down; see below.
 *
 * THE GLOBAL CAP IS ELEVEN CENTS A DAY, AND IT USED TO BE TWENTY DOLLARS
 * (2026-09-05). Twenty was chosen when the default chain was free models: a
 * number that could not plausibly be reached, standing in front of a bill that
 * was going to be nothing anyway. Every call is billed now, and the operator is
 * one person with $5 of credit on the account and no auto-reload, so the cap is
 * sized against that balance rather than against a shrug.
 *
 * THE ARITHMETIC, because a ceiling nobody can check is a ceiling nobody
 * trusts. A daily cap is a *worst* case, not an expected spend, so the number
 * to set it by is what a month of days all at the cap would cost:
 *
 *   $0.11 x 30.44 days (a mean month) = $3.35
 *   $0.11 x 31    days (the longest)  = $3.41
 *
 * That is inside the $3.00-$3.50 a month the balance is meant to cover, and it
 * leaves about $1.59 of the $5 untouched even in the pathological case where
 * every single day maxes out. An ordinary month, where most days spend a
 * fraction of the cap, lands nearer $1.50. The point of the margin is exactly
 * the uneven day: two or three heavy days inside a quiet month are absorbed by
 * the headroom rather than by the next month's balance.
 *
 * WHAT ELEVEN CENTS BUYS, at Sonnet 5's $2/$10 per million tokens against the
 * profile in `lib/usage/pricing.ts`. A tutor answer is 4,000 tokens in and 700
 * out, which is $0.008 + $0.007 = $0.015. A scene turn is 3,500 and 1,000,
 * which is $0.017. A grader note is $0.0034 and a scan is $0.010. So a day is
 * about seven questions, or six composed scene turns, or a real session of
 * three questions, three scene turns and four writing notes, which comes to
 * $0.110 exactly. Caching moves it the right way rather than the wrong one:
 * the Estonian system prompt is identical every turn and sits behind a
 * `cache_control` breakpoint, a cache read is a tenth of the input rate, and a
 * warm tutor answer is nearer $0.010, so a busy day gets ten or eleven.
 *
 * WHICH LIMIT ACTUALLY BITES CHANGED WITH IT, and that is worth knowing before
 * anybody tunes one of the others. `dailyCallsPerUser` is ten, so one person at
 * their call limit would spend $0.15 on tutor answers alone: more than the
 * whole day's money. Money is the binding control now and the call counts are
 * the backstop, which is the reverse of what the paragraph above says about the
 * $20 era. `dailyMicrosPerUser` had to move with it for the same reason: at
 * $0.50 it sat above the global cap and could never fire, so it is $0.05, which
 * is what guarantees the day's budget reaches at least two people rather than
 * being spent by whoever opens the app first. `globalReserveFraction` holds the
 * last quarter back on top of that.
 *
 * This is a personal deployment's number. Opening this to a class means raising
 * it, and that is `AI_DAILY_USD_GLOBAL` in the environment rather than a code
 * change: roughly $0.35 a day for a pilot of a few learners, and $1 a day for
 * something that looks like a small class.
 */
export const DEFAULT_LIMITS: QuotaLimits = {
  burstCalls: 8,
  burstWindowSeconds: 60,
  dailyCallsPerUser: 10,
  dailyMicrosPerUser: 50_000,         // $0.05
  dailyMicrosGlobal: 110_000,         // $0.11
  globalReserveFraction: 0.25,
  reserveCallsPerUser: 3,
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
  AI_GLOBAL_RESERVE_FRACTION?: string | undefined;
  AI_RESERVE_CALLS_PER_USER?: string | undefined;
  [key: string]: string | undefined;
}

/** Limits are configurable, but every one of them has a value. There is no "off". */
export function readLimits(env: QuotaEnv = process.env): QuotaLimits {
  return {
    burstCalls: num(env.AI_BURST_CALLS, DEFAULT_LIMITS.burstCalls),
    burstWindowSeconds: num(env.AI_BURST_WINDOW_SECONDS, DEFAULT_LIMITS.burstWindowSeconds),
    dailyCallsPerUser: num(env.AI_DAILY_CALLS_PER_USER, DEFAULT_LIMITS.dailyCallsPerUser),
    dailyMicrosPerUser: Math.round(
      num(env.AI_DAILY_USD_PER_USER, DEFAULT_LIMITS.dailyMicrosPerUser / 1e6) * 1e6,
    ),
    dailyMicrosGlobal: Math.round(
      num(env.AI_DAILY_USD_GLOBAL, DEFAULT_LIMITS.dailyMicrosGlobal / 1e6) * 1e6,
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
  /** Micro-dollars everyone spent today (UTC). */
  globalMicros: number;
}

export type QuotaDenial =
  | "BURST"
  | "DAILY_CALLS"
  | "DAILY_SPEND"
  /** The shared budget is into its reserve, and this user has had their share. */
  | "GLOBAL_BUSY"
  | "GLOBAL_SPEND";

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
