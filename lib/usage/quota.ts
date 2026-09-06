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
   * Micro-dollars every user together may spend in a UTC day on *fallback*
   * traffic: Anthropic answering for a purpose whose own provider is Groq.
   *
   * A fourth number rather than a wider slice, because it bounds a different
   * thing. The per-kind slices ask "how much may this feature spend"; this asks
   * "how much may a bad day at Groq cost the balance Anu runs on", and the
   * answer has to hold across every feature at once. Anu's own spend is not in
   * it: Anthropic is her primary, not her fallback.
   */
  dailyMicrosFallback: number;
  /**
   * The tail of the global budget held back for people who have barely used
   * Anu today. 0.25 means the last quarter is reserved.
   */
  globalReserveFraction: number;
  /** Calls a user may still make once the budget is down to that reserve. */
  reserveCallsPerUser: number;
}

/**
 * What a day of falling back to Anthropic may cost, across every purpose.
 *
 * THE RISK THIS EXISTS TO BOUND is the one the purpose split was praised for
 * removing: with no fallback at all, a scene could never touch the Anthropic
 * balance however badly Groq behaved. Giving every purpose a last resort hands
 * that risk straight back, unless the fallback itself is capped. So it is.
 *
 * THE ARITHMETIC. On a day Groq never answers, every fallback call is priced at
 * Anthropic's rate: a scene turn is $0.0034, a grader note $0.0038, a scanned
 * page $0.0100. $0.05 is therefore about 14 scene turns, or 13 grader notes, or
 * 5 pages, or some mixture — thin, and deliberately so. It is a limp rather
 * than a spare leg: enough that a short Groq wobble is invisible to a learner,
 * not enough that a sustained outage quietly re-routes the app onto the dear
 * provider for a day.
 *
 * WHAT IT COSTS THE BALANCE. Anu is $0.10 a day and is not fallback traffic, so
 * the worst an outage can add is this $0.05, giving $0.15 against the $0.167 a
 * day that makes $5 last a month. Fifty days normally, thirty-three on a day
 * Groq is out from midnight to midnight. Neither is the collapse-to-hours that
 * an ungated fallback would have been: the same outage against uncapped
 * fallback would have run SCENE alone at $2.00 of Anthropic in a day, which is
 * the whole balance inside three days.
 *
 * PAST IT, THE PURPOSE DEGRADES RATHER THAN SPENDING. `authoriseCall` stops
 * offering the fallback link, the chain is the purpose's own provider again,
 * that provider is down, and the ladder falls to where it already falls with
 * no key at all: a scene plays off its recorded and banked lines, the grader
 * keeps the verdict it decided by string comparison before any model was asked,
 * and the scanner says so. That is the behaviour this app already ships with,
 * reached by a budget rather than by a missing key.
 */
export const DEFAULT_FALLBACK_BUDGET = 50_000; // $0.05

/**
 * Sized for an app that is free to everybody and has to stay that way.
 *
 * `dailyMicrosGlobal` was $20 and is $3.00, because it had stopped being a
 * statement about anything. It predated the per-kind slices, and once those
 * existed it was a leftover: the four of them come to $2.16 a day, so a $20
 * ceiling was seven times a total nothing could reach and could never be the
 * thing that bound. $3.00 is the real combined ceiling with a little room, and
 * the room is deliberate — the reserve holds back the last quarter, which at
 * $3.00 starts at $2.25, above the $2.16 the slices add up to, so the reserve
 * cannot clip a path that is still inside its own budget.
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
  dailyMicrosGlobal: 3_000_000,       // $3.00
  // Overridden per kind by `DEFAULT_KIND_BUDGETS`; this is the value a kind
  // with nothing to say about itself falls back to, which is the whole budget.
  dailyMicrosGlobalForKind: 3_000_000,
  dailyMicrosFallback: DEFAULT_FALLBACK_BUDGET,
  globalReserveFraction: 0.25,
  reserveCallsPerUser: 3,
};

/**
 * What the daily ceiling above comes to over a month, for copy that talks about
 * a budget rather than about a day.
 *
 * Derived rather than typed, because a page saying "five dollars a month" over a
 * constant somebody has since raised is the kind of small wrongness a reader
 * catches once and then stops trusting the page for. `/funding` is the caller,
 * and that page's whole argument is that every number on it says where it came
 * from.
 */
export function monthlyBudgetUsd(limits: QuotaLimits = DEFAULT_LIMITS): number {
  return (limits.dailyMicrosGlobal / 1e6) * 30;
}


/**
 * A slice of the day's budget per kind of call, and why one number stopped
 * being enough.
 *
 * ONE CAP CANNOT PROTECT TWO BALANCES. Until the provider split there was one
 * chain, so every path spent out of the same account and a single global figure
 * was the whole truth about the bill. There are two now and they are nothing
 * like each other: Groq bills separately from Anthropic, and a dollar spent on
 * one is not a dollar out of the other.
 *
 * THE BINDING CONSTRAINT IS A BALANCE, NOT A BILL, and two versions of these
 * numbers were sized against the wrong thing before this one.
 *
 * The first checked them against `dailyMicrosGlobal`, which was $20 and was a
 * figure from before any of this existed. What actually constrains this
 * deployment is $5 sitting in one Anthropic account, wanted to last a month:
 * $0.167 a day. Sized against the $20, TUTOR and SCAN came to $1.50 a day
 * between them, nine times the real ceiling, and the balance would have been
 * gone inside four days with every cap reporting itself comfortably unspent.
 *
 * The second used a Groq rate that was quoted rather than read. See the note on
 * `qwen3.8-27b` in `pricing.ts`: the real figures come off Groq's own
 * `/v1/models`, and everything below is priced with them.
 *
 * WHICH PATHS CAN REACH ANTHROPIC AT ALL, since that is what the $5 constrains:
 *
 *   TUTOR   always. It is Anthropic by purpose and has no other chain.
 *   SCENE   never. It is Groq by purpose, and there is no cross-purpose
 *           fallback, so a scene cannot spend the tutor's balance however badly
 *           Groq is behaving.
 *   SCAN    normally not, and sometimes. It is on the general chain, which
 *           leads with Groq, and `qwen3.8-27b` accepts images, so a scan is a
 *           Groq call until Groq fails.
 *   GRADER  the same, for the same reason.
 *
 * So the ceiling that matters is TUTOR plus the two fallbacks, and the numbers
 * below are sized so that even a day when Groq is down from midnight to
 * midnight stays inside it. A cap that only holds while the cheap provider is
 * up is not a cap.
 *
 * THE ARITHMETIC, measured against the real prompts (`lib/tutor/prompt.ts`
 * builds a 3,031-token system prompt; the scene route's word list is 714 to 955
 * tokens across the fourteen shipped scenes; the three grader systems in
 * `lib/tutor/grader.ts` are 462, 609 and 717):
 *
 *   TUTOR   ~3,700 in + ~700 out on claude-sonnet-5 = $0.0144 an answer.
 *           $0.10 a day is 6 answers. It takes the largest share because Anu is
 *           what the Anthropic key was bought for.
 *   SCAN    ~3,000 in of image + ~400 out. $0.0040 on Groq, $0.0100 on
 *           Anthropic. $0.02 a day is 5 scans, or 2 on a day Groq is out. This
 *           is the one that gives up headroom, on the README's own word for it:
 *           a page is photographed once and studied for weeks. Fifteen a day
 *           was asked about and fits in no arrangement, because fifteen scans
 *           on Anthropic is $0.15, which is the whole daily balance with
 *           nothing left for the tutor.
 *   GRADER  ~900 in + ~200 out. $0.0015 on Groq, $0.0038 on Anthropic. $0.04 a
 *           day is 26 notes, or 10 on a day Groq is out.
 *   SCENE   ~1,400 in + ~60 out on Groq = $0.0014 a turn. $2.00 a day is about
 *           1,470 composed turns. It is the one slice with no bearing on the
 *           $5, and it is also $60 a month of Groq if it is ever reached, which
 *           is the number to argue with rather than this arithmetic.
 *
 * WHAT THAT COMES TO. Anthropic sees $0.10 a day in the ordinary case, which is
 * fifty days of the tutor cap being reached every single day, and $0.16 on a day
 * Groq never answers at all, which is 4% under what the balance allows and
 * thirty-one days. Both readings are under it, which is the property worth
 * having: the arithmetic does not depend on a provider behaving.
 *
 * These are deployment-wide, not per learner. At a pilot's size six answers a
 * day is the number to argue with, and the answer to it is a bigger balance
 * rather than a bigger cap.
 *
 * There is quiet margin under all of it. Anthropic's cache read is a tenth of
 * the input rate and `absorbUsage` counts a cache read as a full input token,
 * so a cached tutor answer is charged here at about 1.6 times what it costs.
 * That over-charge is deliberate elsewhere in this file and is left alone: it
 * makes the cap bind sooner than the balance, which is the safe order.
 *
 * TTS is the one metered kind with no slice, and that is not an oversight: it
 * is free, so a budget denominated in money says nothing about it. What rations
 * speech is its call count, which `ALLOWANCE` already sets at thirty times the
 * base.
 *
 * A SLICE PER KIND STILL CANNOT SAY "CHEAP HERE, DEAR THERE", which is why SCAN
 * and GRADER are sized off their dear reading and are therefore stingy on the
 * ordinary one. Only a cap per *provider* expresses the real constraint, and
 * the ledger already records which provider answered every settled call. That
 * is the better fix and a larger change than this: written down rather than
 * half-done.
 *
 * These are defaults; each has an environment variable below, and
 * `AI_DAILY_USD_GLOBAL` still bounds the lot.
 */
export const DEFAULT_KIND_BUDGETS: Readonly<Partial<Record<UsageKind, number>>> = {
  // Anthropic's balance: $0.10 a day normally, $0.16 if Groq is out all day,
  // against the $0.167 that makes $5 last a month.
  TUTOR: 100_000,     // $0.10  =  6 answers
  SCAN: 20_000,       // $0.02  =  5 scans on Groq, 2 on Anthropic
  GRADER: 40_000,     // $0.04  =  26 notes on Groq, 10 on Anthropic
  // Groq's, which is a separate bill and cannot reach the Anthropic balance.
  SCENE: 2_000_000,   // $2.00  =  1,470 composed turns
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
  AI_DAILY_USD_FALLBACK?: string | undefined;
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
    // Clamped to the day's budget for the reason the slice above is: a fallback
    // allowance larger than the whole cannot be spent and reads like one that
    // can.
    dailyMicrosFallback: Math.min(
      dailyMicrosGlobal,
      Math.round(num(env.AI_DAILY_USD_FALLBACK, DEFAULT_FALLBACK_BUDGET / 1e6) * 1e6),
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
  /**
   * Micro-dollars everyone spent today (UTC) on Anthropic answering for a
   * purpose whose own provider is Groq.
   *
   * Settled calls only, because a reservation is written before the chain has
   * opened and cannot know which provider will answer: `PENDING` is the honest
   * value there and it is not this one. So a burst of fallback calls in flight
   * at once is under-counted for the seconds before they settle, which is the
   * same window every figure in this file has and is bounded by how many
   * requests one deployment has open at a time.
   */
  globalFallbackMicros: number;
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
