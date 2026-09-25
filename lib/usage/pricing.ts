/**
 * What a request costs, in micro-dollars (millionths of a USD).
 *
 * Integers throughout: a spend cap compared with accumulated floating-point
 * dollars drifts, and the drift is always in the direction of spending more.
 * One micro-dollar is finer than any per-token price, so nothing rounds to zero.
 *
 * The table is a *floor for safety*, not an invoice. Prices change and a
 * deployment may point at a model nobody here has heard of, so an unrecognised
 * model is charged at `UNKNOWN_MODEL` — the most expensive rate in the table —
 * rather than at zero. A cap that fails open is not a cap.
 */

export interface Rate {
  /** USD per million input tokens. */
  readonly inputPerMTok: number;
  /** USD per million output tokens. */
  readonly outputPerMTok: number;
  /**
   * What an explicit cache entry costs to keep, per million tokens per hour,
   * where a provider charges for one. Only Gemini's `cachedContents` does;
   * Anthropic's ephemeral cache is priced into its write rate. Absent means
   * the table's own default, `CACHE_STORAGE_PER_MTOK_HOUR`, which is the
   * dearer of the two figures Google publishes.
   */
  readonly cacheStoragePerMTokHour?: number;
}

/**
 * A RATE THE VENDOR HAS ALREADY PUBLISHED AN END DATE FOR.
 *
 * The comment on the Gemini block says the Flash tier "roughly doubles on
 * 1 January 2027, which is written here rather than in a diary because a table
 * that silently halves the real rate is the fault above wearing a date". It was
 * written here and nothing read it. A date in a comment is a diary with extra
 * steps: on the morning it passes, six rows understate by two and the only
 * thing that notices is the bill, which is the one reader this table exists so
 * nobody has to wait for. Every other way of being wrong about a price in this
 * file now fails expensive, and this one was set to fail cheap on a known day.
 *
 * So the end date and the rate after it are data, and `priceFor` reads them.
 * Nobody merges anything: a deployment that has not been touched since 2026
 * starts charging the real rate on the day Google starts charging it.
 *
 * `until` is exclusive and is read as UTC midnight, which is deliberately no
 * later than the vendor's own switch whatever zone they mean by it: charging
 * the higher rate a few hours early is the direction this table always errs.
 */
export interface Promotion {
  /** ISO date, exclusive. The promotional rate applies strictly before this. */
  readonly until: string;
  /** What the row becomes from that date. */
  readonly then: Rate;
}

/** A row of the table: today's rate, and the end date where the vendor set one. */
export interface ModelPrice extends Rate {
  readonly promotion?: Promotion;
}

/**
 * Anthropic first-party rates are current as of 2026-06. OpenAI's are the
 * published gpt-4o rates. Both are checked against the provider's pricing page
 * when a model is added — never guessed from a model's name or size.
 */
const PRICES: Readonly<Record<string, ModelPrice>> = {
  // Anthropic
  "claude-fable-5": { inputPerMTok: 10, outputPerMTok: 50 },
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-7": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-6": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10 },
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },

  // OpenAI
  "gpt-4o": { inputPerMTok: 2.5, outputPerMTok: 10 },
  "gpt-4o-mini": { inputPerMTok: 0.15, outputPerMTok: 0.6 },

  /*
    The models the free-tier providers give away, at the rate they are given
    away for. Named one by one rather than pricing a whole provider at zero,
    because "free" is a property of the account and this table cannot see the
    account: a deployment that has upgraded its Groq or Gemini plan and pinned
    some other model still meets UNKNOWN_MODEL and still fails closed.

    Without these rows the cap would fail the other way. An unrecognised model
    is charged at the dearest rate in the table, so a handful of genuinely free
    Groq calls would have read as several dollars and switched Anu off for
    everybody, which is exactly the fault the TTS speaker name caused once
    before.
  */
  // Keyed the way `normaliseModel` leaves them: the vendor prefix a provider
  // puts in front of a model, "openai/" or "qwen/", is stripped before lookup.
  "gpt-oss-120b": { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  // Read the same way, off Groq's own `/v1/models`: half its bigger sibling,
  // and the cheapest input rate any provider on this deployment's keys quotes.
  "gpt-oss-20b": { inputPerMTok: 0.075, outputPerMTok: 0.3 },
  /*
    `compound-mini` was here at zero because Groq published no price for it, and
    it is gone because Groq no longer publishes the model: asked with this
    deployment's own key on 2026-09-22, `/v1/models` does not list it and
    `/v1/models/groq/compound-mini` answers `model_not_found`. The row's whole
    justification was "there is no rate to write down", and a row with no rate
    behind it for a model nobody can call is the silent zero this block argues
    against, kept alive by the reason it was created for.

    It has gone from `FREE_GROQ_MODELS` with it, and it had to: `provider.test.ts`
    holds every model on a free list to having a row here, which is the right
    pairing and is what caught this. Nothing was lost by the link going, since
    it could only ever answer 404. If Groq restore the model it prices at
    `UNKNOWN_MODEL` until somebody reads the real rate off the API, which is
    the direction every other omission in this table fails.
  */

  /*
    THE ONE ROW THAT IS NOT FREE, AND THE REASON IT STOPPED BEING.

    `qwen3.8-27b` sat in the block above at zero, with the rest of Groq's free
    tier, and that was true while the only Groq account anybody here had was a
    free one. It is the scene composer's fallback now (`SCENE_FALLBACK_MODEL`) on a
    paid Groq plan, and a paid model priced at zero is not a rounding error in
    a cost estimate: it is the global spend cap switched off for the single
    highest-volume path in the app. A conversation is a dozen turns and a scene
    composes several of them, so this is the row most likely to be charged and
    it was the row charging nothing. `AI_DAILY_USD_GLOBAL` would never have
    bound on scene composition at all.

    The comment above still holds and this is it happening: "free" is a property
    of the account and this table cannot see the account. So the table takes the
    side that fails closed. Charging a free-tier deployment 0.29 for a call that
    cost it nothing makes its cap bind sooner by a fraction of a cent per scene
    turn, which is the safe direction and, at these rates, not a direction
    anybody will notice: 54,000 composed turns to reach a $20 day. Charging a
    paid deployment nothing has no floor under it at all.

    AND THE FIRST NUMBER WRITTEN HERE WAS WRONG, WHICH IS WHY THIS ONE IS READ
    RATHER THAN QUOTED.

    It went in at $0.29/$0.59 on a figure supplied in good faith and never
    checked, because there was no obvious way to check it. There is: Groq's
    `/v1/models` returns a `pricing` object per model, and asked with this
    deployment's own key it answers $0.80 and $4.00 per MTok. So the rate was
    understated by 2.75x on input and 6.8x on output, which is the same failure
    as the zero it replaced, one order of magnitude smaller: a cap sized against
    a price that low binds long after the money has gone.

    Every Groq row in this table is now that answer rather than anybody's
    recollection, this one and `gpt-oss-120b` above, which was also sitting at
    zero and is $0.15/$0.60. Re-read them the same way when the plan changes:

      curl -s https://api.groq.com/openai/v1/models \
        -H "Authorization: Bearer $GROQ_API_KEY"
  */
  "qwen3.8-27b": { inputPerMTok: 0.8, outputPerMTok: 4 },

  /*
    AND THE GEMINI ROWS WERE THE SAME FAULT, ONE PROVIDER OVER.

    They sat at zero for the reason the Groq block above sat at zero: the only
    Gemini access this project had was a free key, and "free" is a property of
    the account rather than of the model. The moment a paid key is set, and one
    is now, every one of these prices a real call at nothing, which is the
    global spend cap switched off on the one scenes are pinned to
    (`SCENE_MODELS`) and on whichever the general chain names.

    Read off Google's own page rather than recalled, on 2026-09-06 and again on
    2026-09-22, when every row below still matched it exactly:
    https://ai.google.dev/gemini-api/docs/pricing. The Flash tier is
    promotional until the end of 2026 and roughly doubles on 1 January 2027,
    which is written here rather than in a diary because a table that silently
    halves the real rate is the fault above wearing a date.

    That sentence was true and was still a diary, because nothing read it. The
    three dated rows carry a `promotion` now and `priceFor` resolves it, so the
    doubling happens on the day whether or not anybody has looked at this file
    since.

    A model this table does not name prices at `UNKNOWN_MODEL`, which is the
    dearest row and the honest answer for a rate nobody has looked up. That is
    what makes the omissions safe and the zeros dangerous.
  */
  /*
    The three carrying `promotion` are the rows Google's page dates: input,
    output and cache storage all double on 1 January 2027, and `priceFor`
    switches them itself rather than waiting for somebody to read this comment.

    The storage figure is on all three now, where two of them were letting it
    fall through to `CACHE_STORAGE_PER_MTOK_HOUR`. That default is the dearer
    of the two figures and so was never dangerous, and it made the same three
    rows disagree about a rate the page quotes identically for them. Writing it
    down costs nothing: `cacheStorageAsInputTokens` divides the storage cost by
    the row's own input rate, and both halves double together, so a held entry
    books the same number of token-equivalents before and after the flip.
  */
  "gemini-3.8-flash": {
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
    cacheStoragePerMTokHour: 0.5,
    promotion: {
      until: "2027-01-01",
      then: { inputPerMTok: 1.5, outputPerMTok: 7.5, cacheStoragePerMTokHour: 1 },
    },
  },
  "gemini-3.7-flash": {
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
    cacheStoragePerMTokHour: 0.5,
    promotion: {
      until: "2027-01-01",
      then: { inputPerMTok: 1.5, outputPerMTok: 7.5, cacheStoragePerMTokHour: 1 },
    },
  },
  "gemini-3.6-flash": {
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
    cacheStoragePerMTokHour: 0.5,
    promotion: {
      until: "2027-01-01",
      then: { inputPerMTok: 1.5, outputPerMTok: 7.5, cacheStoragePerMTokHour: 1 },
    },
  },
  "gemini-3.5-flash": { inputPerMTok: 1.5, outputPerMTok: 9 },
  "gemini-2.5-flash": { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  "gemini-3.5-flash-lite": { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  "gemini-3.1-flash-lite": { inputPerMTok: 0.25, outputPerMTok: 1.5, cacheStoragePerMTokHour: 1 },
  "gemini-2.5-flash-lite": { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  "gemini-3.1-pro-preview": { inputPerMTok: 2, outputPerMTok: 12 },
  /*
    The two aliases move with whatever Google points them at, so they carry the
    dearest rate of the tier they name rather than a snapshot: an alias priced
    at last quarter's model is a cap sized against a model nobody is calling.
  */
  "gemini-flash-latest": { inputPerMTok: 1.5, outputPerMTok: 9 },
  "gemini-flash-lite-latest": { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  "gemini-pro-latest": { inputPerMTok: 2, outputPerMTok: 12 },
};

/** Charged when the model is not in the table. Deliberately the dearest rate. */
export const UNKNOWN_MODEL: ModelPrice = { inputPerMTok: 10, outputPerMTok: 50 };

/**
 * Groq and Gemini slugs carry a vendor prefix and sometimes a variant suffix,
 * `openai/gpt-oss-120b`, `openai/gpt-4o:free`. Both are stripped so one
 * table serves every provider.
 */
export function normaliseModel(model: string): string {
  const withoutVariant = model.split(":")[0] ?? model;
  const parts = withoutVariant.split("/");
  const bare = (parts[parts.length - 1] ?? withoutVariant).trim().toLowerCase();
  /*
    Anthropic publishes a dated id beside the alias: `claude-haiku-4-5` and
    `claude-haiku-4-5-20251001` are one model, and only the first is a key in
    the table above. The dated one therefore missed and priced at
    `UNKNOWN_MODEL`, which is the dearest row: a deployment that pinned the
    exact snapshot, which is what anybody wanting a reproducible model does,
    had every call booked at $10/$50. It fails expensive rather than dangerous,
    so nothing was ever refused that should have run, but the ledger, the
    Settings meter and the funding page were all reading a number about a model
    nobody was using. Eight digits after a final hyphen is the date and nothing
    else: no model in the table ends that way, and a version like `claude-sonnet-4-6`
    is three groups of one or two digits rather than one of eight.
  */
  return bare.replace(/-\d{8}$/, "");
}

/** True when the slug names a model the provider serves at no charge. */
export function isFreeModel(model: string): boolean {
  return model.trim().toLowerCase().endsWith(":free");
}

/**
 * What a model costs, on the day it is asked about.
 *
 * `now` is a parameter because a rate with an end date on it cannot be tested
 * against a clock nobody controls, and because this is the one function in the
 * file whose answer moves on its own. Production passes nothing.
 *
 * A promotion is resolved away rather than handed back, so no caller can read
 * `inputPerMTok` off a row whose promotional rate has expired.
 */
export function priceFor(model: string, now: Date = new Date()): Rate {
  if (isFreeModel(model)) return { inputPerMTok: 0, outputPerMTok: 0 };
  const row = PRICES[normaliseModel(model)] ?? UNKNOWN_MODEL;
  const { promotion, ...rate } = row;
  if (!promotion) return rate;
  return now.getTime() < Date.parse(`${promotion.until}T00:00:00Z`) ? rate : promotion.then;
}

/**
 * What a cached input token costs, as a multiple of the ordinary input rate.
 *
 * Anthropic's `cache_control: { type: "ephemeral" }`, which is the only kind
 * this app asks for, bills a five-minute entry at 1.25x base input to write
 * and 0.1x base input to read. Every other provider in the chain either
 * caches transparently at no stated discount or does not cache at all, so
 * these only ever apply to tokens a caller actually reported as cached.
 *
 * WHY THIS MATTERS RATHER THAN BEING A ROUNDING DETAIL. Every Anthropic call
 * site summed `input_tokens`, `cache_read_input_tokens` and
 * `cache_creation_input_tokens` into one figure and priced the lot at the
 * base rate, under a comment saying cache reads "are real input tokens and
 * are billed as such". They are real input tokens and they are not billed as
 * such: a cache read was being charged ten times what Anthropic charges for
 * it. The direction is the safe one, so nothing ever overspent, and the cost
 * is the whole point of the feature: the tutor's prompt is ~2,275 tokens of
 * case table read on every turn, and the ledger could not see the ninety
 * percent that caching takes off it. The deployment budget and the learner's
 * own spend meter both bound roughly ten times too early on exactly the
 * traffic the breakpoint was added to make cheap.
 */
export const CACHE_READ_RATE = 0.1;
export const CACHE_WRITE_RATE = 1.25;

/**
 * What Gemini charges to hold an explicit cache entry, per million tokens per
 * hour, where the model's own row does not say. Read off
 * https://ai.google.dev/gemini-api/docs/pricing on 2026-09-14 and again on
 * 2026-09-22: $1.00 on the Lite tier and every older Flash, $0.50 on the three
 * promotional Flash rows until the end of 2026 and $1.00 from 1 January 2027.
 * All three write their own figure and their own end date now, so this default
 * is reached only by a row that never had a storage rate at all; it stays the
 * dearer figure, so such a row errs high rather than free.
 */
export const CACHE_STORAGE_PER_MTOK_HOUR = 1;

/**
 * THE STORAGE OF A CACHE ENTRY, AS INPUT TOKENS AT THE MODEL'S OWN BASE RATE.
 *
 * Google bills an explicit cache twice: the tokens written, at the ordinary
 * input rate, and then storage by the hour for as long as the entry lives.
 * The ledger prices calls in tokens and nothing else, so the storage is
 * turned into the number of base-rate input tokens that cost the same and
 * booked on the call that created the entry. Exact rather than approximate:
 * 1,592 tokens held ten minutes on `gemini-3.8-flash` is $0.000133, which is
 * 177 tokens at $0.75 a million, and that is what is booked. A model with no
 * input price at all (a free row) is charged nothing for storage either,
 * since there is no rate to express it in; a free row is a decision this
 * table already makes about the whole call.
 */
export function cacheStorageAsInputTokens(
  model: string,
  tokens: number,
  seconds: number,
  now?: Date,
): number {
  const price = priceFor(model, now);
  if (price.inputPerMTok <= 0 || tokens <= 0 || seconds <= 0) return 0;
  const perHour = price.cacheStoragePerMTokHour ?? CACHE_STORAGE_PER_MTOK_HOUR;
  const dollars = (tokens / 1e6) * perHour * (seconds / 3600);
  return Math.ceil((dollars / price.inputPerMTok) * 1e6);
}

/**
 * The parts of one call's input, where the provider told them apart.
 *
 * `inputTokens` stays the total, cached tokens included, so a caller that has
 * not been taught about caching keeps the behaviour it had: everything at the
 * base rate, which over-counts and therefore still fails closed. What these
 * two do is move the tokens the provider named as cached onto their own rate.
 */
export interface CacheSplit {
  /** Tokens served from an existing cache entry. Billed at CACHE_READ_RATE. */
  readonly cachedInputTokens?: number;
  /** Tokens written into a new cache entry. Billed at CACHE_WRITE_RATE. */
  readonly cacheWriteTokens?: number;
}

/** Cost of one call, in micro-dollars, rounded up so it is never understated. */
export function estimateCostMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cache: CacheSplit = {},
): number {
  const price = priceFor(model);
  const cached = Math.max(0, cache.cachedInputTokens ?? 0);
  const written = Math.max(0, cache.cacheWriteTokens ?? 0);
  /*
    Clamped at zero rather than trusted. `inputTokens` is the total and these
    are parts of it, so a provider reporting the parts and a smaller total, or
    a caller populating one and not the other, must never make the plain
    remainder negative and refund the call.
  */
  const plain = Math.max(0, Math.max(0, inputTokens) - cached - written);
  const dollars =
    (plain / 1e6) * price.inputPerMTok +
    (cached / 1e6) * price.inputPerMTok * CACHE_READ_RATE +
    (written / 1e6) * price.inputPerMTok * CACHE_WRITE_RATE +
    (Math.max(0, outputTokens) / 1e6) * price.outputPerMTok;
  return Math.ceil(dollars * 1e6);
}

/**
 * A token count for text, when the provider did not report one.
 *
 * Roughly four characters per token for English, but Estonian's long agglutinated
 * words tokenize worse than that, so this divides by three. Over-counting is the
 * safe direction: it makes the quota bind sooner, never later. Any real count
 * reported by the provider replaces this.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

/**
 * The kinds of call this app pays for.
 *
 * Declared here rather than in `lib/usage/ledger`, which is where it used to
 * live, because it keys the token profile below and that profile now has a
 * second reader: `lib/funding` prices a hypothetical month of traffic and may
 * not open a database to do it. `ledger.ts` re-exports the name, so nothing
 * that already meant "a metered call" had to move.
 */
export type UsageKind = "TUTOR" | "GRADER" | "TTS" | "SCAN" | "SCENE";

/**
 * What one call of each kind is assumed to cost until it says otherwise.
 *
 * A reservation has to be written before the provider is opened, and at that
 * moment nobody knows what the answer will cost: not the tokens, and on a
 * chain with fallback, not even the model. So it is booked at a stated
 * expectation and corrected the moment the real numbers arrive.
 *
 * The numbers are a rough profile of each kind of request, priced against one
 * mid-range model. They do not have to be right for the ledger, because a
 * settlement follows every one of them within seconds and the totals come out
 * identical either way. They have to be non-zero and roughly the right size,
 * which is the whole job: to make ten requests in flight at once look like ten
 * requests in flight at once rather than like none.
 *
 * `lib/funding` reads the same profile, and there it is doing the harder job,
 * because no settlement follows a projection. A funding page that quoted its
 * own guess at what a tutor answer costs would be a second answer to a
 * question this app already answers, and the two would drift the first time
 * anybody tuned the reservation.
 */
export const EXPECTED_TOKENS: Readonly<Record<UsageKind, { input: number; output: number }>> = {
  // A question with a conversation behind it, and a full answer.
  TUTOR: { input: 4_000, output: 700 },
  // A few hundred tokens about one sentence or one word.
  GRADER: { input: 700, output: 200 },
  // Free, and priced as free. The row still exists: the call count is what
  // rations speech, not the money.
  TTS: { input: 0, output: 0 },
  // A photograph, which is a few thousand input tokens of image.
  SCAN: { input: 3_000, output: 400 },
  /*
    ONE COMPOSED TURN, BOOKED PER TURN, WHICH IS NOT WHAT THIS USED TO SAY.

    This row read "a whole conversation, booked once" and was sized for one:
    3,500 in and 1,000 out, roughly five composed lines. `app/api/scene/route.ts`
    has booked per turn since, under a comment of its own explaining why ("one
    `CALL` row in front of twelve settlements is eleven calls the allowance
    never saw"), and nothing moved this. So every composed line was reserved at
    about five lines' worth.

    Over-reserving is the safe direction and a settlement follows within seconds,
    so no money was mis-counted. What it distorted is the seconds in between,
    which is exactly what a reservation is for: several turns in flight at once
    looked like several times as much spend as they were, so the global reserve
    fraction bit early and a busy evening could refuse a turn on an imaginary
    bill.

    Measured rather than re-estimated, and measured again once the prompt was
    cut and held (`docs/21-situations.md` §63). A turn is 1,704 to 1,821 tokens
    on Google's own tokenizer, 1,592 of them served off the cached entry at a
    tenth of the input rate; the reservation has no cache to price against, so
    the whole prompt is booked at base, which is the safe direction and the
    only one a figure settled seconds later needs. The reply is bounded by
    `MAX_COMPOSED_WORDS`, forty words, and with thinking switched off comes
    back as two to four sentences of about twenty to forty tokens.
  */
  SCENE: { input: 1_800, output: 60 },
};

/**
 * The model a reservation is priced against.
 *
 * Named rather than derived, because the point of an estimate is that it is
 * stated. The dearest rate in the table would refuse honest traffic for the
 * seconds a call is in flight; zero would reserve nothing at all. A mid-range
 * paid model is the middle of that, and a deployment running free models
 * simply settles every reservation back down to nothing.
 */
export const RESERVE_PRICED_AS = "claude-sonnet-5";

/** What one call of a kind is booked at, in micro-dollars, before it happens. */
export function reserveMicros(kind: UsageKind, model: string = RESERVE_PRICED_AS): number {
  const expected = EXPECTED_TOKENS[kind];
  return estimateCostMicros(model, expected.input, expected.output);
}

/** Formats micro-dollars for a human, e.g. 1234567 → "$1.23". */
export function formatMicros(micros: number): string {
  return `$${(micros / 1e6).toFixed(2)}`;
}
