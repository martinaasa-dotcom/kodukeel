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
  "compound-mini": { inputPerMTok: 0, outputPerMTok: 0 },

  /*
    THE ONE ROW THAT IS NOT FREE, AND THE REASON IT STOPPED BEING.

    `qwen3.8-27b` sat in the block above at zero, with the rest of Groq's free
    tier, and that was true while the only Groq account anybody here had was a
    free one. It is the scene composer's model now (`SCENE_GROQ_MODELS`) on a
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

    Groq's published rate for this model, per MTok. Checked against the pricing
    page rather than guessed from the model's size, which is the rule this
    whole table is written under. Re-check it when the plan changes.
  */
  "qwen3.8-27b": { inputPerMTok: 0.29, outputPerMTok: 0.59 },
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

/** Cost of one call, in micro-dollars, rounded up so it is never understated. */
export function estimateCostMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = priceFor(model);
  const dollars =
    (Math.max(0, inputTokens) / 1e6) * price.inputPerMTok +
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

    Measured rather than re-estimated. The static system block is 128 tokens and
    identical on every turn of every scene; the live block is dominated by the
    word list the route hands over, which is 714 to 955 tokens across the
    fourteen shipped scenes (mean 821), plus the stage direction, the register,
    six banked lines for tone and the turns so far. The reply is capped at
    `MAX_WORDS`, fourteen words, and comes back as one short sentence.
  */
  SCENE: { input: 1_400, output: 60 },
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
