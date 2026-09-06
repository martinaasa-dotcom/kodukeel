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

export interface ModelPrice {
  /** USD per million input tokens. */
  readonly inputPerMTok: number;
  /** USD per million output tokens. */
  readonly outputPerMTok: number;
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
  "gpt-oss-120b": { inputPerMTok: 0, outputPerMTok: 0 },
  "qwen3.8-27b": { inputPerMTok: 0, outputPerMTok: 0 },
  "compound-mini": { inputPerMTok: 0, outputPerMTok: 0 },
  "gemini-flash-latest": { inputPerMTok: 0, outputPerMTok: 0 },
  "gemini-3.6-flash": { inputPerMTok: 0, outputPerMTok: 0 },
  "gemini-3.5-flash": { inputPerMTok: 0, outputPerMTok: 0 },
};

/** Charged when the model is not in the table. Deliberately the dearest rate. */
export const UNKNOWN_MODEL: ModelPrice = { inputPerMTok: 10, outputPerMTok: 50 };

/**
 * OpenRouter slugs carry a vendor prefix and sometimes a variant suffix —
 * `anthropic/claude-sonnet-5`, `openai/gpt-4o:free`. Both are stripped so one
 * table serves every provider.
 */
export function normaliseModel(model: string): string {
  const withoutVariant = model.split(":")[0] ?? model;
  const parts = withoutVariant.split("/");
  return (parts[parts.length - 1] ?? withoutVariant).trim().toLowerCase();
}

/** True when the slug names a model the provider serves at no charge. */
export function isFreeModel(model: string): boolean {
  return model.trim().toLowerCase().endsWith(":free");
}

export function priceFor(model: string): ModelPrice {
  if (isFreeModel(model)) return { inputPerMTok: 0, outputPerMTok: 0 };
  return PRICES[normaliseModel(model)] ?? UNKNOWN_MODEL;
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
    ONE TURN OF ONE CONVERSATION, MEASURED.

    This read 3,500 in and 1,000 out, and both halves were a fossil. The
    figures were set when a scene booked *once for the whole run*
    (docs/19-situations.md §16), on the argument that running out of allowance
    halfway through a conversation is the worst failure available here. The
    booking moved to one per turn afterwards, because two of the three limits
    count `CALL` rows and a dozen turns behind one booking is eleven calls the
    allowance never saw. The profile did not move with it, so every composed
    turn was reserved at a whole run's estimate.

    What a turn actually costs was measured over all fourteen shipped scenes
    against the shipped dictionary. A scene's closed word list is 373 lemmas
    on average and that list is most of the prompt: with the instruction, the
    stage direction, the six tone examples and the list, a turn is about 760
    input tokens, and twelve turns of conversation on top of it, which is what
    the model is now given so it can answer what was actually said, adds about
    290 more. The output is one short Estonian sentence, capped at MAX_WORDS,
    which measures around 20 tokens.

    So 1,200 in and 100 out: comfortably over the measured figure in both
    directions, which is what a reservation is for, and no longer over it by
    three times on the input and fifty on the output. A settlement follows
    within seconds either way and the totals come out the same; what the
    fossil was costing was the *reservation*, which is what makes concurrent
    calls visible to the cap, and one that overstates by that much makes a
    deployment look like it is spending an order of magnitude more than it is
    for as long as the calls are in flight.
  */
  SCENE: { input: 1_200, output: 100 },
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
