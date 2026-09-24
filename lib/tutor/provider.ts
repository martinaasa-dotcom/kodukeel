/**
 * Provider-agnostic chat streaming, with a fallback chain behind it.
 *
 * The app works with whichever keys are configured: Groq and Google Gemini
 * (both with a real free tier and no card), and Anthropic or OpenAI as the
 * dear, gated fallback behind them. Nothing above this layer knows which. Keys
 * are read from the environment on the server and never leave it.
 *
 * WHY A CHAIN RATHER THAN A CHOICE. The default provider is a free model, and
 * a free model is rate-limited hard upstream by design: a 429 is the ordinary
 * case, not the exception. `withRetry` already softened that, and retrying is
 * the wrong tool once a whole minute of quota is gone. If a second key is
 * configured, walking past the exhausted provider costs one request and gets
 * the learner an answer; refusing when there was another way to ask is the
 * app choosing to fail. The order is deliberate: Groq first, because it is the
 * cheap measured one, then any free tier, then the dear keys last.
 *
 * WHICH ONE ANSWERED IS THEN A FACT ABOUT THE ANSWER, and the app says so.
 * `streamReply` reports the provider that actually served the stream, never
 * the head of the chain, because a screen naming the wrong model is worse
 * than one naming none.
 */
import { geminiCachedReply } from "./geminiCache";
import { reportError } from "@/lib/observability/report";
import { estimateTokens } from "@/lib/usage/pricing";

export type ProviderName = "groq" | "gemini" | "openai" | "anthropic";

/**
 * How much a reply may cost in tokens, and why it is not small.
 *
 * A scene line is one short Estonian sentence and the obvious budget for one is
 * a few dozen tokens. That is wrong on the models this app is built to run on:
 * several free models spend their whole budget in a reasoning field and write
 * into `content` only once they have finished thinking, so a tight cap returns
 * HTTP 200 with an empty string. Measured on one beat with the route's own
 * prompt: at 80 tokens `openai/gpt-oss-120b` and `gemini-3.6-flash` both
 * answered empty; at 1200 both wrote a clean line. An empty answer is
 * indistinguishable from a bad minute one rung down, so the cap was quietly
 * deciding which free models this app can use.
 *
 * Exported so a script measuring which model to put in front measures the app
 * rather than itself, which is the rule `PROVIDER_KEY_ENV` states about lists
 * that live in a test.
 */
export const REPLY_TOKENS = 1200;

/**
 * THINKING OFF ON THE ANTHROPIC PATH, BECAUSE THE CEILING ABOVE IS SHARED.
 *
 * The comment above is about free models that spend their whole budget in a
 * reasoning field and write nothing into `content`, which reads as an answer.
 * Claude has that shape too, and nothing here was stopping it. Anthropic's own
 * troubleshooting page lists Sonnet 5 as "Adaptive only, Default: On", so
 * omitting this field is not the same as switching it off, and it says thinking
 * tokens "count toward the `max_tokens` limit for the turn", with the failure
 * spelled out: the response "stops with `stop_reason: max_tokens`, often with a
 * truncated or missing text block".
 *
 * That is the same bug one provider over, and it lands where it hurts most.
 * Anthropic is the *last resort* in `resolveProviders`, so it answers on the
 * day every free link is throttled or out of quota, on `claude-sonnet-5` by
 * default, into a ceiling sized when nothing in the chain thought. A learner
 * meets it as Anu going quiet on the one evening nothing else could answer.
 *
 * Neither thing this app asks Anthropic for is reasoning-hard: an explanation
 * of a point the prompt already contains, and one Estonian sentence built from
 * a word list handed over in full. What thinking buys is nothing measurable and
 * what it costs is real, since a thinking token bills at the output rate.
 *
 * Off rather than a bigger ceiling, which was the other way and is worse: the
 * ceiling is shared with every other provider, so raising it to buy room for
 * reasoning nobody wants would move the budget for models that are not doing it
 * and change what a free link may spend. This touches the one path that thinks.
 *
 * A deployment that pins `ANTHROPIC_MODEL` to a model where thinking cannot be
 * turned off gets a 400 with a clear message, which is the right way for that
 * to fail: silent truncation is the thing being fixed.
 */
const ANTHROPIC_THINKING = { type: "disabled" } as const;

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  label: string;
  /**
   * Ask the model not to think before it writes, where the link is on a model
   * that does so by default and the job is one thinking does nothing for.
   *
   * `gemini-3.8-flash` reasons unless told not to, and the OpenAI-compatible
   * endpoint hides that: `completion_tokens` is the line, `total_tokens` is
   * the line plus the thinking, and Google bills the thinking as output at
   * five times the input rate. Measured 2026-09-14 on the scene route's own
   * prompt: a twenty-token line arrived under 678 and 1,147 hidden tokens on
   * two calls, so a scene line the ledger priced at $0.0017 cost about $0.005,
   * and `npm run eval:thinking` put thinking on and off at 24 of 24 beats
   * each, one refusal apart, on the same lines. Sent as `reasoning_effort`,
   * which is the one spelling both Google and Groq read; only a value an eval
   * has measured is allowed, so a link cannot be quietly put on a setting and
   * called a saving nobody measured.
   *
   * "low" IS MEASURED AND UNUSED, AND THE FIGURE IS WHY. Anu's Groq link is
   * a reasoning model that refuses "none", and `npm run eval:anu -- --effort low`
   * on 2026-09-14 cut her output from about 410 billed tokens an answer to
   * about 150, four fifths of the default being reasoning nobody reads, which
   * is $0.16 a thousand questions off a bill of $0.70. It also missed 4 of 30
   * facts against the default's 2 of 30 over five runs, and the two it dropped
   * were the gradation and the partitive plural, which are the two facts a
   * grammar tutor exists for. Sixteen cents a thousand questions does not buy
   * that. The value stays in the type so the next measurement is a flag
   * rather than a cast, and no chain carries it.
   */
  reasoning?: "none" | "low";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Every provider with a key, in the order they should be tried.
 *
 * Free first. A deployment with only one key gets a chain of one, which is
 * what this app has always done; a deployment with two gets somewhere to go
 * when the first is throttled.
 */
/**
 * How many *independent* things can answer, which is not the length of the
 * chain.
 *
 * Groq contributes one link per free model, so a chain of three can still be a
 * single account with a single allowance. When one account's balance ran out
 * here every link behind it returned 402 together and Anu went down, which is
 * exactly the failure a fallback chain is supposed to absorb. What protects
 * availability is a second *provider*, not a fourth model.
 *
 * Pure, so Settings can say this without asking anything upstream.
 */
export function providerResilience(chain = resolveProviders()): {
  providers: string[];
  models: number;
  singlePointOfFailure: boolean;
} {
  const providers = [...new Set(chain.map((c) => c.label))];
  return {
    providers,
    models: chain.length,
    // Nothing configured is its own problem, reported elsewhere; this flag is
    // about a chain that looks redundant and is not.
    singlePointOfFailure: providers.length === 1,
  };
}

/**
 * Every environment variable that can put a provider into the chain.
 *
 * One list rather than five reads scattered through `resolveProviders`, and it
 * exists for the test suite rather than for the chain: a unit test here must
 * describe a machine, not run on one. `provider.test.ts` clears exactly these
 * before each case, so a machine that happens to carry a real key in its
 * environment measures the same chain CI does.
 *
 * That is not hypothetical. `GROQ_API_KEY` and `GEMINI_API_KEY` were added to
 * the chain without being added to the test helper that cleared keys, so the
 * whole suite passed on CI, which has none, and failed thirteen ways on any
 * machine that had either. The suite was reporting the machine.
 */
export const PROVIDER_KEY_ENV = [
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
] as const;

/**
 * What a chain is being built *for*.
 *
 * "tutor" is Anu: general questions about grammar and vocabulary, asked rarely
 * and answered at length. "scene" is one line of a role-play conversation:
 * asked constantly, answered in a few short sentences (`MAX_COMPOSED_WORDS`),
 * mostly inside a closed word list and every line checked by the gate.
 *
 * They are different jobs and the measurements say so, which is why they no
 * longer share a chain. See `PURPOSE_CHAINS` for which provider answers which
 * and what the evidence was.
 */
export type ProviderPurpose = "tutor" | "scene" | "grader";

export interface ChainOptions {
  /**
   * Omit for the chain the app has always built: every configured provider,
   * cheapest-first. That default is what the twenty-odd callers asking "is any
   * model configured at all" mean, and none of them is choosing a model.
   *
   * Name a purpose and the chain leads with that purpose's own provider.
   */
  purpose?: ProviderPurpose;
  /**
   * Whether Anthropic may be appended as the last resort.
   *
   * Defaults to true, so a caller that has not thought about it gets the
   * behaviour the chain has always had. What passes `false` is a caller that
   * has asked the ledger and been told the day's fallback budget is spent:
   * `authoriseCall` answers it, because only the ledger knows.
   *
   * WHY THIS IS A PARAMETER AND NOT A READ. Everything under `lib/tutor/` that
   * builds a chain is pure and may not open a database, which is the same rule
   * `lib/usage/pricing.ts` keeps against `lib/usage/ledger.ts`. So the fact
   * travels in rather than being fetched, and the one place that knows it is
   * the one place already holding a transaction open to find out.
   */
  allowFallback?: boolean;
}

/**
 * Which provider answers which job, and why it is a routing table rather than
 * an order.
 *
 * THE CHAIN WAS ONE LIST TRIED IN ONE ORDER, and that is the right shape while
 * every link is a free model and the only question is which of them is awake.
 * It is the wrong shape once two paid keys are configured for two different
 * reasons, because then "whichever answers first" is a cost decision and a
 * quality decision being made by a rate limiter.
 *
 * AND WHICH PROVIDER ANSWERS WHICH JOB IS MEASURED PER JOB, BECAUSE NOTHING
 * GENERALISES ACROSS THEM. That is the finding, and it is worth stating before
 * the three rows below, because every intuition about it is wrong.
 * `gemini-3.8-flash` writes the best Estonian of anything tested and returns
 * the second-worst JSON; `openai/gpt-oss-120b` is perfect at the JSON and
 * middling at the Estonian; `claude-sonnet-5` is the dearest thing here and
 * came last or nearly last at every one of the four. A model that wins one
 * path tells you nothing about the next, so each row cites its own eval.
 *
 * SCENE COMPOSITION GOES TO GEMINI (`npm run eval:thinking`). Twenty-four
 * beats across ten scenes, on this route's own prompt, every line read:
 * `gemini-3.8-flash` was on the beat 24 times out of 24 with nothing withheld,
 * and put the situation in the line rather than asking the bare question
 * (`Meil on täna väga hea kala. Mida ma teile süüa toon?`). It is also the
 * cheapest of the three that scored at all well, which is why this is not a
 * trade: `gemini-3.1-pro-preview` is 2.7 times the price and answered
 * `Kuidas saan teid aidata?` on six different beats, and `claude-sonnet-5` is
 * 3.8 times the price and is the only one the gate had to withhold from.
 * Spending up buys a model that repeats itself.
 *
 * AND GROQ BACKS UP GEMINI EVERYWHERE GEMINI ANSWERS, SCENES INCLUDED. The
 * grader already put `openai/gpt-oss-120b` behind `gemini-3.1-flash-lite`;
 * `SCENE_FALLBACK_MODEL` puts a Groq model behind `SCENE_MODELS`, and the
 * vision chain already reaches Groq too, through the general chain appended
 * behind Gemini in `visionProviders`. It is a fixed second link on every
 * budget, not the bounded Anthropic last resort, because it costs a
 * fraction of Anthropic's rate and carries none of the risk that fallback
 * is gated against.
 *
 * ANU GOES TO GEMINI, WITH GROQ BEHIND HER (`npm run eval:anu`). This said
 * Anthropic and the reasoning was that being right about Estonian matters
 * more than being cheap, which is still true and is not an argument for a
 * particular vendor. Asked six grammar questions through the route's own
 * transport, `openai/gpt-oss-120b` answered all six at $0.72 per thousand
 * and `claude-sonnet-5` missed one at $12.44, which moved her to Groq. Asked
 * thirty-seven questions of seven kinds, gpt-oss-120b taught a wrong form
 * three times in ninety-three answers and the Gemini rows, thinking off,
 * taught none, so a Gemini model leads and the Groq one is the fixed
 * backup (`TUTOR_MODEL`, `TUTOR_FALLBACK_MODEL`). Which Gemini row is a
 * cost decision taken with the guards the Lite needed built first, and
 * `openai/gpt-oss-20b` is cheaper than all of them and answers 21 of 29, so
 * the floor is measured rather than the cheapest thing on the list.
 *
 * THE SCANNER GOES TO GEMINI (`npm run eval:scan`). Six runs of twenty-four
 * words that every one carry a diacritic: `gemini-3.1-flash-lite` read 144 of
 * 144 exactly, and so did `gemini-3.8-flash` and `claude-sonnet-5` at three
 * and eight times its price. The one it replaces was inventing words off a
 * clean page.
 *
 * WHAT THIS IS NOT is a change to `openWithFallback`. The mechanism underneath
 * is untouched: a purpose still gets a chain, the chain is still walked in
 * order, and the provider that actually answered is still what the ledger and
 * the response header are told. What changed is which links go in it.
 */
const PURPOSE_CHAINS: Readonly<Record<ProviderPurpose, (chain: ProviderConfig[]) => void>> = {
  tutor: (chain) => {
    /*
      PINNED, LIKE THE SCENE CHAIN, AND FOR ITS REASON. `TUTOR_MODEL` used to
      be read through an environment variable, which is the door the
      `SCENE_MODEL` fault came through one purpose over: a deployment that
      pinned it to whatever is cheapest this week would silently move Anu off
      the model the eval ranked, with nothing failing. Gemini leads on the
      cheapest model the wide eval passed with the guards on, thinking off
      because the eval was run that way (`TUTOR_MODEL`), and Groq backs it up
      on the model Anu ran on before, which answers 83 of 87 facts on the same
      eval (`TUTOR_FALLBACK_MODEL`):
      Groq backs up Gemini everywhere Gemini answers, and Anu is no longer the
      exception.
    */
    if (process.env.GEMINI_API_KEY) {
      chain.push({ name: "gemini", model: TUTOR_MODEL, label: "Google Gemini", reasoning: "none" });
    }
    if (process.env.GROQ_API_KEY) {
      chain.push({ name: "groq", model: TUTOR_FALLBACK_MODEL, label: "Groq" });
    }
  },
  scene: (chain) => {
    // Gemini leads; `resolveProviders` appends the bounded Anthropic fallback
    // behind whatever this pushes, if the day's fallback budget has room.
    /*
      PINNED, AND NO VARIABLE MOVES EITHER LINK. Scenes always compose on
      `SCENE_MODELS`, which is the one model `eval:composers` ranked for
      writing Estonian, and nothing in the environment is read here.

      It used to read `SCENE_MODEL`, and that is how the model came to be out
      of the loop for a week on production. Scenes ran on Groq once and the
      variable held its model, `qwen/qwen3.8-27b`; the chain moved to Gemini
      and went on reading the same name, Google answered 404 on every composed
      turn, `openWithFallback` correctly never walks past a model that does not
      exist, and the ladder fell to the bank. The route answered 200, so every
      off-script turn was the scripted repeat with "Vabandust!" in front of it
      and the learner reported a conversation that could not leave its script,
      which is exactly what it could not do. A measured choice that an
      environment variable can silently move is a measured choice for as long
      as nobody touches the dashboard. This one is a constant, and the operator
      asked for it to be one.
    */
    if (process.env.GEMINI_API_KEY) {
      for (const model of SCENE_MODELS) {
        // Thinking off: see `ProviderConfig.reasoning` for the measurement.
        chain.push({ name: "gemini", model, label: "Google Gemini", reasoning: "none" });
      }
      warnIfSceneModelSet();
    }
    /*
      GROQ IS A SECOND FIXED LINK BEHIND GEMINI, NOT THE BOUNDED LAST RESORT.

      The bounded Anthropic fallback below exists because Groq having a bad
      hour must not drain the Anthropic balance Anu depends on (see the note
      on `allowFallback`). Groq itself carries no such risk to anything: it
      spends nothing Anu runs on, and `SCENE_FALLBACK_MODEL` is the Groq
      model `eval:composers` ranked first on writing Estonian (see the
      constant). So it answers whenever Gemini is unconfigured, throttled,
      or having a bad minute, on every budget, the same way `GRADER_MODELS`
      already puts Groq behind Gemini for the grader.

      Hardcoded like `SCENE_MODELS`, for the reason the block above gives at
      length: an environment variable that can silently repoint a scene's
      composer is the exact door `SCENE_MODEL` came through once. It is a
      distinct constant from `TUTOR_MODEL` rather than a reuse of it, so a
      future change to one does not silently retune the other's job.
    */
    if (process.env.GROQ_API_KEY) {
      chain.push({ name: "groq", model: SCENE_FALLBACK_MODEL, label: "Groq" });
    }
  },
  grader: (chain) => {
    /*
      The three graders and the dictionary's translation fallback, which are
      metered as one kind (`GRADER`) and want one answer: a model that returns
      the JSON asked for, every time, for as little as possible. Measured
      through the graders' own transport (`npm run eval:grader`, the figures
      are in its header): `gemini-3.1-flash-lite` and `openai/gpt-oss-120b`
      were the only two that never failed to return a verdict, and the first
      is about half the price of the second, so it leads and the other stands
      behind it for a bad minute at Google. Pinned like the scene model and
      for the same reason: this used to be the head of the general chain,
      which is whatever the environment happened to make it.

      Each link only where its key is set, so a Groq-only or Gemini-only
      install still has a grader, and an install with neither has none, which
      the routes already answer with `aiAvailable: false`. `resolveProviders`
      appends the paid tail behind both while the fallback budget has room.
    */
    for (const link of GRADER_MODELS) {
      if (link.name === "gemini" && !process.env.GEMINI_API_KEY) continue;
      if (link.name === "groq" && !process.env.GROQ_API_KEY) continue;
      chain.push({ ...link });
    }
  },
};

/**
 * The graders' chain, in order. See `PURPOSE_CHAINS.grader` for the
 * measurement; `scripts/eval-grader.ts` is the instrument.
 */
export const GRADER_MODELS: readonly ProviderConfig[] = [
  { name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini" },
  { name: "groq", model: "openai/gpt-oss-120b", label: "Groq" },
];

/**
 * The one courtesy the pin owes an operator: a `SCENE_MODEL` still set in the
 * environment does nothing, and a variable that does nothing looks exactly
 * like one that works. Said once per process, in the error log, naming it.
 */
let warnedSceneModel = false;
function warnIfSceneModelSet(): void {
  if (warnedSceneModel || !(process.env.SCENE_MODEL ?? "").trim()) return;
  warnedSceneModel = true;
  reportError(
    new Error(`SCENE_MODEL is set and not read: scenes always compose on ${SCENE_MODELS.join(", ")}.`),
    { at: "provider/scene", extra: { variable: "SCENE_MODEL" } },
  );
}

/**
 * The model Anu asks, and the reason it is the cheapest one that holds up.
 *
 * Measured rather than assumed, which is the whole of the change: the six
 * grammar questions in `npm run eval:anu` put Anu on `openai/gpt-oss-120b`
 * at 6 of 6, the thirty-seven questions the eval asks now put
 * `gemini-3.8-flash` at 29 of 29, and every cheaper row the two keys reach
 * was asked the same questions. `gemini-3.1-flash-lite` invented no form on
 * the grounded shape, at a quarter of the price and a third of the latency,
 * and what it got wrong was a short, named list: gradation explained as a
 * vowel, a case name misspelt, the answer buried under a preamble, a
 * correction that reworded a right sentence, and answers twice the length.
 * Those are faults a guard can catch and a briefing can prevent, so each has
 * one: the words block spells the grade change out letter by letter
 * (`gradePlain`), the prompt asks for the Estonian first and for a
 * correction that changes only what was wrong, `nearestCaseName` repairs a
 * case name one or two letters off, and `isStrayFix` refuses a FIX: line
 * under a question with no sentence in it. A fault a learner cannot see is
 * the bar, not the price, and the Lite clears it with the guards on
 * (`docs/21-situations.md` §55). The operator asked for the cheaper model
 * on the same day, and cost is the reason it is this row and not the one
 * above it.
 *
 * `openai/gpt-oss-20b` is cheaper still and answers 21 of 29, and
 * `gemini-3.5-flash-lite` costs the same as this row and invented a verb
 * form, which is what makes this a floor rather than the bottom of a price
 * list.
 */
export const TUTOR_MODEL = "gemini-3.1-flash-lite";

/**
 * The Groq link behind `TUTOR_MODEL`, which is the model Anu ran on until the
 * wide eval. It answers 83 of 87 facts on that eval and is a tenth of the
 * price, and it is the second link rather than the first because of what the
 * other 4 were: a place put in the allative, a form built on a guessed
 * genitive, a correct sentence corrected, all faults a learner cannot see.
 * Pinned for the reason `SCENE_FALLBACK_MODEL` is.
 */
export const TUTOR_FALLBACK_MODEL = "openai/gpt-oss-120b";

/**
 * The model the scanner reads a photograph with.
 *
 * `npm run eval:scan`: 144 of 144 diacritic-carrying words read exactly over
 * six runs, which `gemini-3.8-flash` and `claude-sonnet-5` also managed at
 * three and eight times the price. `claude-haiku-4-5` folded `esmaspäev` to
 * `esmaspaev` wholesale, which for this one task is a total failure however
 * good its prose is.
 *
 * NOT A PHOTOGRAPH TEST, and `scripts/eval-scan.ts` says so at length: the
 * pages are rendered text, so a model that fails there would certainly fail on
 * a phone photograph of somebody's homework, and one that passes has cleared
 * the easier half.
 */
export const VISION_MODEL = "gemini-3.1-flash-lite";

/**
 * The model scene composition asks, and why it is one name rather than three.
 *
 * `FREE_GROQ_MODELS` carries three because a free model is retired without
 * notice and walking past a 404 within one provider costs a request where
 * refusing costs the learner their answer. That reasoning does not survive
 * `lib/usage/pricing.ts`: this deployment bills for these calls, and a
 * fallback to a model the price table cannot price is a call charged at
 * `UNKNOWN_MODEL`, which is the dearest rate in the table, so the fallback
 * that was protecting availability would be spending the scene budget forty
 * times faster than the line it replaced.
 *
 * The scene ladder already has somewhere to go, which is what makes one name
 * safe here where it would not be for Anu. A composed line is the third rung:
 * below it are the recorded usages, the drafted bank in `lib/scenes/bank.ts`,
 * and the phrase the other side says when it did not catch that. A deployment
 * with no key at all plays all fourteen scenes start to finish (§16), so a
 * retired slug costs a conversation some freshness and never the conversation.
 *
 * AND THE NAME IN IT IS NEITHER THE NEWEST NOR THE DEAREST FLASH, WHICH IS
 * WORTH KNOWING BECAUSE BOTH GUESSES ARE WRONG. `gemini-3.5-flash` sits on an
 * older and dearer tier than `3.8-flash`, twice the price for no better line,
 * so picking by version number picks badly; and `gemini-3.1-pro-preview` is
 * 2.7 times the price and repeats itself. Read `npm run eval:thinking` before
 * changing it, and the price row before believing a version number.
 */
/*
  AND A SECOND GEMINI LINK BEHIND THE FIRST, CHOSEN ON PRICE AND READ.

  The operator asked for the cheapest model that still writes a line a person
  would say, for the fallback, and every model the two keys reach was measured
  the same way, forty cold lines through `eval:composers` and then the
  survivors played live through `play:scenes --compose` on all fourteen
  scenes (docs/21 §61). `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite`
  both played at 19 percent withheld against the Groq fallback's 36 to 41,
  and both read as a person: `Mis teil viga on või kus teil valutab?`,
  `Palun võtke järjekorranumber ja oodake, kuni ma teid kutsun.` The 3.1
  Lite is the cheaper of the two, $0.00044 a draft against $0.00057 at the
  scene's token profile and a third of the primary's, and it is already
  `VISION_MODEL`, so it is the second link. The others are out on the read:
  `gpt-oss-20b` played at 57 percent withheld and put `Mis on probleemi?` on
  screen, `gemma-4-26b` wrote `Kust sa nüüd tulemast?`, and `gemma-4-31b`
  wrote clean lines at eighteen seconds each, which is not a conversation.

  Two Gemini links is not the three-model reasoning above coming back: both
  are priced rows in `lib/usage/pricing.ts`, so a walk from the first to the
  second is charged at a known rate, and the Groq link still stands behind
  both for the day the Gemini key itself stops answering.
*/
export const SCENE_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite"] as const;

/**
 * The fixed second link behind `SCENE_MODELS`, on Groq, once Gemini is
 * unconfigured, throttled, or having a bad minute.
 *
 * MEASURED, NOT INHERITED. This was `openai/gpt-oss-120b` on the argument
 * that a model trusted with the tutor's harder job could be trusted with a
 * scene line, and a job interview run on it (docs/21 §61) read `Kas see
 * oskus töö? Palun valima üks või kaks`. Nothing generalises across the
 * four model jobs in this app (§55), and this was the one job the fallback
 * had never been measured on. `npm run eval:composers` over the three Groq
 * models, forty lines each through the route's own prompt and the shipped
 * gate, 2026-09-14:
 *
 *   model                 gate, keyless   gate, forms list   no finite verb   median
 *   groq/compound-mini    28/40           32/40              4                2088ms
 *   qwen/qwen3.8-27b      16/40           30/40              1                 368ms
 *   openai/gpt-oss-120b   22/40           25/40              4                1829ms
 *
 * The gate rate is not the ranking, and the lines say why. What the gate
 * cannot see is a line with no verb in it, since `clause` fires only on four
 * or more words entirely inside the scene's list, and the two models it
 * passes most write exactly that: `Kus teie valu?`, `Pikk aeg? Arst?`,
 * `Millal see katki?`, `Piim ostma.` from compound-mini, and `Kas teie valu
 * peas?`, `Teie mis katki?`, `Tuba katki, korrus?`, `Teie nägema arst
 * esmaspäev kell 10` from gpt-oss-120b. qwen writes sentences: `Kust sa nüüd
 * tuled? Kas oled poe lähedal?`, `Millises toas see on? Kas see on esimesel
 * korrusel?`, `Kahjuks ühel meist pole aega sel nädalal tulla.` What it gets
 * wrong is a word rather than a sentence, `pakkun` for `pakun`, `kotistamas`,
 * `abikõneleja`, and every one of those the forms list withholds, which is
 * the fault the gate is built to catch. Its keyless rate of 16 is the harness
 * vouching against the scene's list alone, where production also asks the
 * forms list; re-gated that way it is 30. Five times the price of gpt-oss
 * per line, about $0.0013, and it is still the cheapest link on the chain
 * after the one it backs up, and a fifth of the latency.
 *
 * PINNED, EXACTLY LIKE `SCENE_MODELS`. See `PURPOSE_CHAINS.scene` for why: an
 * environment variable that can move it is the door `SCENE_MODEL` came
 * through once, one provider over.
 */
export const SCENE_FALLBACK_MODEL = "qwen/qwen3.8-27b";

/**
 * How much room a scene line needs, which is not what Anu needs.
 *
 * `REPLY_TOKENS` is 1,200 and its own note says the cap exists because some
 * models spend their budget in a reasoning field and write into `content` only
 * once they have finished. Measured on the route's own prompt across the
 * models this deployment can reach, that is not a hypothetical: `qwen/
 * qwen3.8-27b` spends about ten output tokens and never comes close, while
 * `openai/gpt-oss-120b` spends about 380 a line and `groq/compound` about 770,
 * with single lines over a thousand. A trace that runs past the cap comes back
 * as an empty string, which is indistinguishable from a bad minute one rung
 * down, so the cap was quietly deciding which models the scene composer can
 * use.
 *
 * Four thousand, and it costs nothing to raise: output is billed on what comes
 * back, so a model that answers in ten tokens is charged for ten either way.
 * What it buys is that changing the scene model is a change to one line rather
 * than a change that silently truncates.
 */
export const SCENE_REPLY_TOKENS = 4_000;

/**
 * How much room Anu's own answer needs, which `REPLY_TOKENS` was never sized
 * for.
 *
 * `REPLY_TOKENS` (1,200) was measured against a *scene* line, one short
 * Estonian sentence, on the models that spend hundreds of tokens on a hidden
 * reasoning field before writing anything into `content` (this file's own
 * note above it: `openai/gpt-oss-120b` alone spends about 380 of those on a
 * single line). It was then reused as Anu's ceiling, and Anu is not writing
 * one line: her own prompt asks for a named rule, a minimal pair and a next
 * step, which is several sentences, sometimes a worked case table, on top of
 * whatever a reasoning model spends before it writes a word of that. A reply
 * that runs past its ceiling does not come back empty the way a scene line
 * does, because by then real content has already been written: it comes back
 * cut off mid-word, in the middle of a sentence, which is worse, because
 * nothing about it looks like a failure.
 *
 * `TUTOR_FALLBACK_MODEL` is a Groq reasoning model for the same reason
 * `SCENE_FALLBACK_MODEL` is one: it is one of the measured, cheap ones. So
 * this takes the same fix `SCENE_REPLY_TOKENS` already took for the identical
 * shape of the same bug.
 */
export const TUTOR_REPLY_TOKENS = 3_000;

/**
 * Every provider with a key, in the order they should be tried.
 *
 * With no `purpose` this is Groq first and the dear keys last, one link per
 * free model. That chain is what `providerResilience`, the Settings
 * panel, the recipients list and every "is a model configured" read mean, and
 * none of them is picking a model to send anything to.
 *
 * With a `purpose` it is that purpose's provider and nothing else. There is no
 * cross-purpose fallback and that is a decision rather than an omission: see
 * the note on `PURPOSE_CHAINS`, and `docs/05-integrations.md` for the argument
 * against letting a Groq outage take Anu down with it.
 */
export function resolveProviders(options: ChainOptions = {}): ProviderConfig[] {
  const allowFallback = options.allowFallback ?? true;

  if (options.purpose) {
    const chain: ProviderConfig[] = [];
    PURPOSE_CHAINS[options.purpose](chain);
    /*
      THE LAST RESORT, AND THE THING THAT MAKES IT SAFE TO HAVE ONE.

      A purpose whose own provider is having a bad hour used to have nowhere to
      go, which was deliberate: the note above says a Groq outage routed to
      Anthropic would drain the balance Anu depends on, so one provider's bad
      hour would take down the feature with no fallback at all.

      That argument was about an *ungated* fallback. What makes this safe is
      `allowFallback`, which the ledger sets false the moment the day's
      dedicated fallback budget is spent: the fallback is bounded, small, and
      separate from every per-kind slice, so the worst a total Groq outage can
      cost the Anthropic balance is that one number. Past it the chain is the
      purpose's own provider again, that provider is down, and the purpose
      degrades exactly as it did before this existed — a scene off its
      recorded and banked lines, which is how a keyless deployment plays every
      one of them.

      Anu is the exception and takes no Anthropic tail. Her chain is her own
      two pinned links, Gemini then Groq (`PURPOSE_CHAINS.tutor`), each
      measured on `npm run eval:anu` with the dictionary's words block in
      front of it, and behind them is nothing rather than a dearer model
      nobody chose for her. This comment used to say her provider was
      Anthropic, which stopped being true when `TUTOR_MODEL` moved to Gemini.
    */
    if (allowFallback && options.purpose !== "tutor" && process.env.ANTHROPIC_API_KEY) {
      if (!chain.some((c) => c.name === "anthropic")) {
        chain.push({
          name: "anthropic",
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
          label: "Anthropic",
        });
      }
    }
    return chain;
  }
  const chain: ProviderConfig[] = [];
  /*
    GROQ LEADS, AND THE POLICY THIS REPLACED WAS "FREE FIRST".

    That rule was written when the only way to run this app without a card was
    a gateway's free models, so the order encoded "everything a stranger can
    set up for nothing is tried before anything that bills". It is still the
    right instinct for an install with a free key and no budget, and it is no
    longer the right *default*, for a reason the price table now makes plain:
    Groq's rate is $0.29 and $0.59 per MTok, which is a fortieth of what the
    dearest link in this chain charges and close enough to nothing that
    preferring a rate-limited free model over it buys a 429 to save a
    hundredth of a cent. A free model is limited hard upstream by design, so
    "free first" spends the learner's wait rather than the operator's money.

    So the ordering rule is now: the measured, cheap, reliable provider first,
    then Gemini's free tier where an install has it, then the dear ones.
    `worthFallingBackFrom` is untouched, so a throttled Groq still walks to
    whatever is behind it.

    THIS IS THE GENERAL CHAIN ONLY. Anu and scene composition do not read it
    (see `PURPOSE_CHAINS`); what it serves is the writing grader, the
    dictionary's translation and the page scanner. On an install carrying the
    two free keys this app is now run with, it is Groq then Gemini, and a paid
    key behind them only while the day's fallback budget has room.
  */
  if (process.env.GROQ_API_KEY) {
    for (const model of configuredModels(process.env.GROQ_MODEL, FREE_GROQ_MODELS)) {
      chain.push({ name: "groq", model, label: "Groq" });
    }
  }
  if (process.env.GEMINI_API_KEY) {
    for (const model of configuredModels(process.env.GEMINI_MODEL, FREE_GEMINI_MODELS)) {
      chain.push({ name: "gemini", model, label: "Google Gemini" });
    }
  }
  /*
    The dear tail of the general chain is a fallback like any other, and is
    gated like one. Groq leads it and the free tiers sit behind Groq, so
    anything reached down here is reached because everything cheaper failed,
    which is exactly the traffic the fallback budget exists to bound.
  */
  if (allowFallback && process.env.ANTHROPIC_API_KEY) {
    chain.push({
      name: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      label: "Anthropic",
    });
  }
  if (allowFallback && process.env.OPENAI_API_KEY) {
    chain.push({
      name: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      label: "OpenAI",
    });
  }
  return chain;
}

/**
 * The two free-tier providers, and the models they give away.
 *
 * These exist so that a second provider does not mean a credit card. Both hand
 * out a real free tier with no card, both speak the OpenAI wire format, and
 * neither shares an account with the other, which is the entire point: one
 * account is one balance, and when a gateway account's balance ran out here
 * every free model behind it answered 402 in the same second, because they
 * were one account wearing several hats. `GROQ_MODEL` and `GEMINI_MODEL` each
 * take a comma-separated list, so a deployment can point a provider at a paid
 * model without touching this.
 *
 * Three models each, because a model name that has been retired is walkable
 * within a provider but ends the chain if it is that provider's only link.
 * Both lists are overridable, and the console's own model list is the thing to
 * check if a name here has moved on.
 *
 * EVERY NAME BELOW WAS ASKED THE QUESTION BEFORE IT WAS WRITTEN DOWN, against
 * each account's own model list and then with a real Estonian one ("Why is it
 * 'Lugesin raamatut' and not 'Lugesin raamatu'?"). Listed is not the same as
 * usable and the difference is not visible from a name, which is what the
 * three rejections are worth recording for.
 *
 * `openai/gpt-oss-20b` answers 200 and returns an empty string: it spends the
 * whole budget in its reasoning field and writes nothing into `content`, so a
 * learner would watch a stream produce nothing and the chain would count it as
 * an answer. `qwen/qwen3.6-27b` puts its reasoning in `content` behind a
 * `<think>` tag, which streams straight to the screen. And Gemini's
 * `gemini-flash-lite-latest` answers cleanly and got the Estonian wrong,
 * offering `raamatud` for the partitive, which is the one kind of failure this
 * app cannot let through to somebody who is learning the case.
 *
 * `gemini-flash-latest` answered 503 on the day this was widened, which is not
 * an argument against it. It is the alias that tracks whatever the current
 * flash model is, and a provider having a bad minute is the exact thing the
 * two names behind it are for.
 */
export const FREE_GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "groq/compound-mini",
] as const;

/*
  An alias first, deliberately.

  The first names written here were `llama-3.3-70b-versatile` and
  `gemini-2.0-flash`, both plausible and both already retired: the accounts
  answered 404 for them within a day of the list being written. Google publish
  `gemini-flash-latest`, which follows whatever the current flash model is, so
  it cannot go stale the way a pinned version does. The pinned name behind it
  is the fallback for the day the alias itself moves.

  Groq publish no alias, so both of theirs are pinned and both were checked
  against the account's own model list rather than guessed.
*/
export const FREE_GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
] as const;

function configuredModels(raw: string | undefined, fallback: readonly string[]): string[] {
  const configured = (raw ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return configured.length > 0 ? configured : [...fallback];
}

/** The head of the chain, for the places that only need to say whether Anu is set up at all. */
export function resolveProvider(): ProviderConfig | null {
  return resolveProviders()[0] ?? null;
}

/**
 * Is this worth asking somebody else about?
 *
 * A throttled or broken-down provider is: another key would answer. A
 * rejected key or a model name that does not exist is not, because every
 * provider in the chain would give the same answer for its own reasons and
 * trying them all just turns one clear message into a slower one.
 */
function worthFallingBackFrom(error: unknown, sameProviderNext = false): boolean {
  if (!(error instanceof TutorError)) return true;
  // A model that does not exist is fatal across providers, for the reason
  // above, and is exactly what to walk past within one: the defaults here are
  // free models, and a free model is retired the moment it stops being worth
  // somebody's money. Reaching the next one costs a request; refusing costs
  // the learner their answer over a slug that went stale in a constant.
  if (error.status === 404) return sameProviderNext;
  // 402 belongs here for the same reason as 429: one provider being out of
  // credit says nothing about the next one's balance, so falling through costs
  // a request and keeps the tutor answering.
  return (
    error.status === 402 ||
    error.status === 429 ||
    error.status === 502 ||
    error.status === 503
  );
}

export class TutorError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Tokens a completed call actually consumed, for the usage ledger. */
export interface UsageReport {
  /** Every input token the call was billed for, cached ones included. */
  inputTokens: number;
  outputTokens: number;
  /** False when the provider never sent a usage frame and this is an estimate. */
  measured: boolean;
  /**
   * How much of `inputTokens` came off a cache, where the provider said so.
   *
   * Anthropic reports the three buckets separately and they are billed at
   * three different rates (`CACHE_READ_RATE`, `CACHE_WRITE_RATE`), so keeping
   * only the total charged a cache read ten times over. They are carried
   * beside the total rather than subtracted from it, so any reader that only
   * knows about `inputTokens` still sees the whole call and still errs high.
   * Absent on every other provider, none of which reports a split.
   */
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  /**
   * The provider stopped because the reply hit its token ceiling rather than
   * because it was finished, so what arrived is a real prefix of an answer
   * rather than the whole of one.
   *
   * A raised `TUTOR_REPLY_TOKENS` makes this rare and does not make it
   * impossible: a reasoning model can still spend enough of it thinking that
   * what is left runs out mid-sentence, and a caller reading the finished
   * text alone cannot tell that case apart from an answer that simply ended.
   * Read off Anthropic's own `stop_reason` and the OpenAI-compatible
   * `finish_reason`, both `"length"`/`"max_tokens"` in that one case.
   */
  truncated?: boolean;
}

/** A provider that has accepted the question, and the reply it is about to give. */
export interface OpenStream {
  /** The provider that actually answered, which may not be the head of the chain. */
  config: ProviderConfig;
  chunks: AsyncGenerator<string>;
}

/**
 * Pulls token counts out of whichever frame carries them.
 *
 * OpenAI-compatible providers send a final chunk with a `usage` object when
 * `stream_options.include_usage` is set. Anthropic splits it: input tokens
 * arrive on `message_start`, output tokens on `message_delta`.
 */
interface UsageFrame {
  type?: string;
  message?: {
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  usage?: {
    output_tokens?: number; prompt_tokens?: number; completion_tokens?: number;
    /** Prompt plus everything billed on the way out, which on Gemini is more than `completion_tokens`. */
    total_tokens?: number;
    /** Where an OpenAI-compatible provider says how much of the prompt it served from its cache. */
    prompt_tokens_details?: { cached_tokens?: number };
  };
  /** Anthropic's own reason the turn stopped, carried on the same `message_delta` frame as the output count. */
  delta?: { stop_reason?: string | null };
  /** Where an OpenAI-compatible provider says the same thing: the last streamed chunk for a choice, `content` empty. */
  choices?: { finish_reason?: string | null }[];
}

/**
 * What a provider will bill on the way out, which is not always what it calls
 * `completion_tokens`.
 *
 * Gemini's OpenAI layer reports the line in `completion_tokens` and the line
 * plus the model's thinking in `total_tokens`, and says nothing else about the
 * thinking; Google bills it as output. Measured 2026-09-14 on
 * `gemini-3.8-flash`: `prompt 2017, completion 19, total 3183`, so a
 * nineteen-token line was 1,166 billed tokens, and a ledger reading the
 * completion count alone booked it at a sixtieth of its output cost. Groq
 * and OpenAI count reasoning inside `completion_tokens` and their totals add
 * up, so the larger of the two readings is right on every provider, and a
 * frame with no total reads exactly as it did.
 */
export function billedOutput(usage: {
  completion_tokens?: number; prompt_tokens?: number; total_tokens?: number;
}): number | undefined {
  const completion = usage.completion_tokens;
  const hidden = usage.total_tokens != null && usage.prompt_tokens != null
    ? usage.total_tokens - usage.prompt_tokens
    : undefined;
  if (completion == null) return hidden != null && hidden > 0 ? hidden : undefined;
  return hidden != null ? Math.max(completion, hidden) : completion;
}

function absorbUsage(provider: ProviderName, frame: unknown, into: UsageReport): void {
  const f = frame as UsageFrame;

  if (provider === "anthropic") {
    if (f.type === "message_start" && f.message?.usage) {
      const u = f.message.usage;
      /*
        Cache reads and writes are real input tokens, and the three buckets are
        billed at three different rates: a read at a tenth of base, a write at
        1.25x. The total is what the call was for; the split is what it cost.
        This used to keep the total alone, which priced a read as though the
        cache did not exist and hid the whole saving from the ledger.
      */
      const cached = u.cache_read_input_tokens ?? 0;
      const written = u.cache_creation_input_tokens ?? 0;
      into.inputTokens = (u.input_tokens ?? 0) + written + cached;
      into.cachedInputTokens = cached;
      into.cacheWriteTokens = written;
      into.measured = true;
    }
    if (f.type === "message_delta") {
      if (f.usage?.output_tokens != null) {
        into.outputTokens = f.usage.output_tokens;
        into.measured = true;
      }
      if (f.delta?.stop_reason === "max_tokens") into.truncated = true;
    }
    return;
  }

  const finishReason = f.choices?.[0]?.finish_reason;
  if (finishReason === "length") into.truncated = true;

  if (f.usage) {
    into.inputTokens = f.usage.prompt_tokens ?? into.inputTokens;
    into.outputTokens = billedOutput(f.usage) ?? into.outputTokens;
    /*
      The cached share, in the field OpenAI, Gemini and Groq all use for it.
      Read for the reason the Anthropic branch reads its two buckets: a cached
      token is billed at a fraction of base, and a ledger that cannot see the
      share prices every scene turn at full input rate. Measured 2026-09-14:
      Groq reports none on either model the scene chain can reach, and the
      Gemini key here answered "prepayment credits depleted", so the day this
      field carries a number is the day the split starts telling the truth
      rather than a day anything was charged less.
    */
    const cached = f.usage.prompt_tokens_details?.cached_tokens;
    if (cached != null) into.cachedInputTokens = cached;
    into.measured = true;
  }
}

/**
 * Ask the chain until one of them accepts, and say which one did.
 *
 * THE SPLIT BETWEEN OPENING AND READING IS THE WHOLE DESIGN HERE, and it
 * exists so the answer can be labeled. Every reason to fall back, a 429, a
 * rejected key, a provider having a bad minute, arrives in the *head* of the
 * upstream response, before a single token of the reply. So the handshake is
 * finished before this function returns, the caller knows which model is
 * about to write, and it can put that in a response header, where a header
 * still can be put. Deciding halfway through a stream would leave the name
 * of the model in a trailer, which browsers do not expose, or in a data
 * format wrapped around what is meant to be plain text.
 *
 * A provider is therefore only ever walked past before it has said anything.
 * Once text is reaching the learner, a failure is left as a failure rather
 * than restarted somewhere else: a second answer appended to half of a first
 * one is two teachers talking over each other, and nothing on screen would
 * say where one stopped.
 */
export async function openWithFallback(
  chain: ProviderConfig[],
  system: string,
  messages: ChatMessage[],
  /** Called once when the stream ends, however it ends. Tokens spent before a
   *  failure were still spent, and the spend cap has to see them. */
  onUsage?: (usage: UsageReport, config: ProviderConfig) => void,
  /*
    What is true of this learner today, sent after the static prompt rather
    than inside it. The Anthropic path caches the static block and this one
    follows it uncached; an OpenAI-compatible provider caches by prefix, so
    appending it costs the same. Either way a note that changes per person
    never invalidates the part that does not.
  */
  live = "",
  /*
    How much room the answer may take, where the caller needs more than the
    default `REPLY_TOKENS`. Set by the tutor route (`TUTOR_REPLY_TOKENS`) and
    by the scene composer (`SCENE_REPLY_TOKENS`), because several of the
    models either can be pointed at spend hundreds of tokens thinking before
    they write the sentence, and Anu's own reply is longer than one sentence.
  */
  maxTokens?: number,
  /*
    WHETHER THE SYSTEM PROMPT IS WORTH HOLDING ON THE PROVIDER'S SIDE. On a
    Gemini link this asks `lib/tutor/geminiCache.ts` to serve the static half
    off an explicit cache entry, at a tenth of the input rate, which is the
    scene route's whole saving: its prompt is nine tenths constant for a run
    and the compatible endpoint caches none of it. Off by default, because a
    prompt read once a day is not worth an entry held for ten minutes, and
    the grader runs on Groq, where there is no such entry to make; Anu asks
    for it since her primary moved to Gemini, and her prompt is the same
    2,300 tokens for everybody, which is why the level moved out of it.
    A link that will not hold the prompt answers through the plain transport
    instead, so asking for it never costs a line.
  */
  cacheSystem = false,
): Promise<OpenStream> {
  if (chain.length === 0) throw new TutorError("No AI provider is configured.", 503);

  for (let i = 0; i < chain.length; i += 1) {
    const config = chain[i]!;
    try {
      const last = i === chain.length - 1;
      if (cacheSystem && config.name === "gemini") {
        const cached = await cachedGeminiStream(config, system, messages, live, maxTokens, onUsage);
        if (cached) return cached;
      }
      const upstream =
        config.name === "anthropic"
          ? await callAnthropic(config, system, messages, live)
          : await callOpenAiCompatible(config, system, messages, last, live, maxTokens);
      // The ledger has to see the provider that actually answered, not the head
      // of the chain — falling back to a dearer model must not go unmetered.
      return { config, chunks: readStream(config, upstream, system + live, messages, onUsage) };
    } catch (error) {
      const next = chain[i + 1];
      if (!next || !worthFallingBackFrom(error, next.name === config.name)) throw error;
    }
  }

  // Unreachable: the loop either returns or throws on its last pass.
  throw new TutorError("No AI provider is configured.", 503);
}

/**
 * The cached path as an `OpenStream`, so a caller reads it exactly as it reads
 * a streamed one: the line arrives as one chunk and the usage, with its cached
 * share, reaches `onUsage` when the chunk has been read. Null where the entry
 * could not be made or used, which is the caller's cue to send the same call
 * through the plain transport on the same link; a rejected key is thrown,
 * because every transport would answer it the same way.
 */
async function cachedGeminiStream(
  config: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  live: string,
  maxTokens: number | undefined,
  onUsage?: (usage: UsageReport, config: ProviderConfig) => void,
): Promise<OpenStream | null> {
  try {
    const reply = await geminiCachedReply(config, system, messages, live, maxTokens);
    async function* one(): AsyncGenerator<string> {
      try {
        if (reply.text) yield reply.text;
      } finally {
        onUsage?.(reply.usage, config);
      }
    }
    return { config, chunks: one() };
  } catch (error) {
    if (error instanceof TutorError && error.status === 401) throw error;
    return null;
  }
}

/** Streams a reply as plain text chunks. Throws TutorError with a message worth showing. */
export async function* streamReply(
  config: ProviderConfig,
  system: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const upstream =
    config.name === "anthropic"
      ? await callAnthropic(config, system, messages)
      : await callOpenAiCompatible(config, system, messages);
  yield* readStream(config, upstream);
}

/** The frames of an already-open upstream response, as text. */
async function* readStream(
  config: ProviderConfig,
  upstream: Response,
  system = "",
  messages: ChatMessage[] = [],
  onUsage?: (usage: UsageReport, config: ProviderConfig) => void,
): AsyncGenerator<string> {
  const usage: UsageReport = { inputTokens: 0, outputTokens: 0, measured: false };
  let produced = "";
  let reported = false;

  const report = () => {
    if (reported) return;
    reported = true;
    if (!usage.measured) {
      // No usage frame arrived. Estimate over the text we know about, so an
      // unmetered call never counts as free.
      usage.inputTokens = estimateTokens(system + messages.map((m) => m.content).join(""));
      usage.outputTokens = estimateTokens(produced);
    }
    onUsage?.(usage, config);
  };

  try {
    const reader = upstream.body?.getReader();
    if (!reader) throw new TutorError("Anu sent an empty response.", 502);

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Server-sent events are separated by a blank line; a chunk can split one.
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const frame = JSON.parse(payload);
            absorbUsage(config.name, frame, usage);
            const text = extractText(config.name, frame);
            if (text) {
              produced += text;
              yield text;
            }
          } catch {
            // A malformed frame is not worth killing the stream over.
          }
        }
      }
    }
  } finally {
    report();
  }
}

/**
 * The parts of a streaming frame we actually read.
 *
 * Both shapes in one type rather than `any`: Anthropic sends
 * `content_block_delta` frames with a `delta.text`, and every OpenAI-compatible
 * provider sends `choices[0].delta.content`. Everything else in a frame is
 * ignored, so describing only these fields is both honest and enough — and it
 * means a typo in one of these paths is a compile error rather than a silently
 * empty stream.
 */
interface StreamFrame {
  type?: string;
  delta?: { type?: string; text?: string };
  choices?: { delta?: { content?: string } }[];
}

function extractText(provider: ProviderName, frame: unknown): string {
  const f = frame as StreamFrame;
  if (provider === "anthropic") {
    if (f.type === "content_block_delta" && f.delta?.type === "text_delta") return f.delta.text ?? "";
    return "";
  }
  return f.choices?.[0]?.delta?.content ?? "";
}

/**
 * Free models are aggressively rate-limited upstream, so a single 429 is
 * normal rather than fatal. Waiting a moment and asking again turns
 * most of them into an answer.
 *
 * WAITING IS ONLY THE RIGHT ANSWER WHEN THERE IS NOWHERE ELSE TO ASK, which
 * is why `patient` is a parameter rather than always true. With a second key
 * configured, sitting through 4.5 seconds of backoff against a provider that
 * has already said no, and then falling back anyway, is four and a half
 * seconds of a learner watching nothing happen for no gain at all. So
 * `openWithFallback` is patient on the last link of the chain and impatient
 * on every link before it, where moving on costs one request.
 */
async function withRetry(send: () => Promise<Response>, patient: boolean): Promise<Response> {
  const attempts = patient ? 3 : 1;
  let last: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await send();
    if (res.status !== 429) return res;
    last = res;
    if (attempt < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return last!;
}

/**
 * The OpenAI-compatible providers, and what differs between them.
 *
 * One table rather than a ternary that grew a third branch. Everything here
 * speaks the same wire format; only the address, the key and one quirk differ.
 *
 * `usageFrames` is that quirk. Asking for `stream_options: {include_usage:true}`
 * is how the ledger gets exact token counts instead of estimating from
 * characters, and a provider that does not recognize the field rejects the
 * whole request rather than ignoring it. Anthropic already cost this codebase
 * that bug once. Gemini's compatibility layer is not documented to accept it,
 * so it is not sent, and the ledger falls back to its estimate, which
 * over-counts on purpose and so keeps the cap failing closed.
 */
const OPENAI_COMPATIBLE: Record<
  "groq" | "gemini" | "openai",
  { url: string; keyEnv: string; usageFrames: boolean }
> = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    usageFrames: true,
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GEMINI_API_KEY",
    /*
      Google's OpenAI layer did not document `stream_options` when this was
      written and an unknown field there is a 400, so Gemini was not asked and
      the ledger estimated every streamed Gemini call from character counts.
      Asked on 2026-09-14 it answers with a `usage` object on every chunk,
      `total_tokens` included, and that field is the only place the endpoint
      admits to the thinking a flash model does by default (`absorbUsage`).
      An estimate from characters can never see those, so the one Gemini path
      that streams, scene composition, was the one path under-billed.
    */
    usageFrames: true,
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
    usageFrames: true,
  },
};

/**
 * The wire details for a provider that is not Anthropic.
 *
 * Exported because `lib/tutor/grader.ts` needs the same answer for its own
 * non-streaming transport and had been reaching it by a two-way ternary:
 * the one gateway the chain first held, or else OpenAI. That was true when the
 * chain held two providers and silently wrong once Groq and Gemini joined it,
 * since every config that was not the gateway was then posted to
 * `api.openai.com` with `OPENAI_API_KEY`, which on a Groq-only or Gemini-only
 * deployment is undefined. Every GRADER call on such a deployment answered
 * 401, which the screen reads as "the tutor is unavailable" rather than as a
 * routing fault. One table rather than two readings of it, which is the rule
 * this repository keeps rediscovering about a fact written down twice.
 */
export function openAiCompatible(config: ProviderConfig) {
  const entry = OPENAI_COMPATIBLE[config.name as keyof typeof OPENAI_COMPATIBLE];
  if (!entry) throw new TutorError(`${config.label} has no endpoint configured.`, 500);
  return entry;
}

async function callOpenAiCompatible(
  config: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  patient = true,
  live = "",
  maxTokens?: number,
) {
  const { url, keyEnv, usageFrames } = openAiCompatible(config);
  // Safe only because every config reaching here came from resolveProviders(),
  // which pushes a provider onto the chain exactly when this key was set.
  const key = process.env[keyEnv]!;

  const res = await withRetry(() => fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      // Without this the stream carries no usage frame and the ledger has to
      // fall back to estimating from character counts.
      ...(usageFrames ? { stream_options: { include_usage: true } } : {}),
      max_tokens: maxTokens ?? REPLY_TOKENS,
      // Only where the chain said so; a provider refuses a field it does not know.
      ...(config.reasoning ? { reasoning_effort: config.reasoning } : {}),
      messages: [{ role: "system", content: live ? `${system}\n\n${live}` : system }, ...messages],
    }),
    signal: AbortSignal.timeout(90_000),
  }), patient);

  await assertOk(res, config);
  return res;
}

/**
 * The headers every Anthropic call sends, and the one that is not optional for
 * half of the keys people actually have.
 *
 * An Anthropic key is scoped either to a workspace or to the organization. A
 * workspace key needs nothing beyond the two headers this always sent; an
 * org-scoped key is refused outright without `anthropic-workspace-id`, with a
 * 400 whose message names the header. So the app worked with one shape of key
 * and could not make a single call with the other, on any path: the tutor, the
 * scanner and the grader all built these headers separately and all three sent
 * the same two.
 *
 * WHAT THAT LOOKED LIKE RATHER THAN WHAT IT WAS. `assertOk` has no branch for a
 * 400, so it becomes a `TutorError` at 502, which `worthFallingBackFrom` treats
 * as worth trying the next provider for. So nothing broke loudly: on a chain
 * with a free provider in front, Anthropic simply never answered and the
 * fallback leg was dead with nothing on any screen to say so; on a deployment
 * where Anthropic is the only key, every AI feature degraded to its no-key
 * state while a key sat correctly configured in the environment.
 *
 * Sent only when set, because a workspace-scoped key must not carry it: the
 * header names a workspace the key may not be in, and Anthropic refuses that
 * too. Absent is the ordinary case and the one that behaves exactly as before.
 */
export function anthropicHeaders(): Record<string, string> {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  return {
    "content-type": "application/json",
    // Safe for the reason every other key read here is: a config only reaches
    // an Anthropic call site from `resolveProviders`, which adds it when set.
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
    ...(workspace ? { "anthropic-workspace-id": workspace } : {}),
  };
}

async function callAnthropic(config: ProviderConfig, system: string, messages: ChatMessage[], live = "") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: config.model,
      stream: true,
      max_tokens: REPLY_TOKENS,
      thinking: ANTHROPIC_THINKING,
      // No stream_options here: Anthropic reports usage natively on
      // message_start and message_delta, and rejects the OpenAI-shaped field.
      // The Estonian reference is identical every turn, so cache it rather than
      // paying to re-read it on each message.
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
        ...(live ? [{ type: "text", text: live }] : []),
      ],
      messages,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  await assertOk(res, config);
  return res;
}

async function assertOk(res: Response, config: ProviderConfig) {
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403) {
    throw new TutorError(`${config.label} rejected the API key. Check it in your .env file.`, 401);
  }
  if (res.status === 429) {
    throw new TutorError(
      `${config.label} is rate-limiting this model. Free models are throttled hard upstream, so ` +
      `wait a moment, or set GROQ_MODEL or GEMINI_MODEL to a paid one in .env, or add a paid ` +
      `provider key so the chain has somewhere to fall through to.`,
      429,
    );
  }
  if (res.status === 404) {
    throw new TutorError(`${config.label} does not have a model called "${config.model}".`, 404);
  }
  /*
    Out of credit, which is not the same as a rejected key and must not be
    reported as one. It is worth falling back from, because the next provider
    in the chain has its own balance, and it is worth saying plainly, because
    the person who can fix it is whoever runs the deployment rather than the
    learner reading the message.

    Found on a live deployment: a gateway answered 402 and the learner was
    shown a slice of the raw JSON, "This request requires more credits, or
    fewer max_tokens. You requested up to 1200 tokens, but can only afford
    898". Accurate, and addressed to nobody who was there.
  */
  if (res.status === 402) {
    throw new TutorError(
      `${config.label} is out of credit for this key. Add credit, or set another provider key ` +
      `in .env so the chain has somewhere to fall through to.`,
      402,
    );
  }
  /*
    Everything else. The upstream text goes to the log rather than to the
    screen: it is provider JSON, it can carry the request back verbatim, and
    it means nothing to a learner. The status is what the caller needs.
  */
  reportError(new Error(`${config.label} returned ${res.status}: ${detail.slice(0, 500)}`), {
    at: "tutor/provider",
    extra: { provider: config.label, model: config.model, status: res.status },
  });
  throw new TutorError(
    `${config.label} could not answer just now (${res.status}).`,
    502,
  );
}

// ─────────────────────────── Looking at a picture ──────────────────────────

/**
 * A photograph on its way to a model, decoded and ready to send.
 *
 * Kept as base64 rather than bytes because that is the shape both wire formats
 * want, and re-encoding it twice for one request is work for nothing.
 */
export interface ImageAttachment {
  mediaType: string;
  base64: string;
}

/** One complete answer, and who wrote it. */
export interface CompletedReply {
  config: ProviderConfig;
  text: string;
  usage: UsageReport;
}

/**
 * WHICH MODEL A CONVERSATION IS COMPOSED WITH, WHICH IS THE HARDEST READING
 * JOB IN THIS APP.
 *
 * Every other paid path here asks a model to do something bounded: translate a
 * word, mark a form, read a photograph. A scene asks it to follow a
 * conversation with a beginner, in a language most models are thin on, inside a
 * closed word list, and write one line that is about what the person actually
 * said. `runGate` then withholds the line whole if it reaches outside the list,
 * and `npm run eval:scene` has measured that at between 43 and 70 percent
 * withheld: on a free model, most of what it writes never reaches anybody, and
 * the learner gets a stage direction instead of a conversation. **Comprehension
 * is not a nicety on this path, it is most of what decides whether the module
 * works at all.**
 *
 * So a deployment may point scenes at a better model than it uses for chat,
 * and the shape is the one `visionProviders` already established: an override
 * per provider, and **nothing by default**, because turning a conversation on
 * must not move a free-model deployment onto a paid one behind the operator's
 * back. A deployment that sets none of these is composed exactly as it was.
 *
 * The one thing this does beyond substituting a name is **order**. The chat
 * chain is free first, which is the right policy when every link can do the
 * job; here an operator who has named a model for scenes has said which one
 * they want asked, and trying three free ones first would spend the turn's
 * booking on the models they were choosing against. So a provider carrying an
 * explicit scene model goes to the front, and everything else keeps its place
 * behind as the fallback it already was.
 */
export function sceneProviders(options: ChainOptions = {}): ProviderConfig[] {
  /*
    TWO SESSIONS BUILT THIS AND THIS IS BOTH OF THEM.

    Main's version read the *general* chain, applied a `*_SCENE_MODEL` override
    per provider and moved any provider carrying one to the front. This branch
    built a purpose-scoped chain instead: Groq alone, on the model
    `eval:composers` ranked, with Anthropic behind it only while the day's
    fallback budget has room. Both answer "which chain does a scene use" and a
    clean three-way merge would have shipped two of them.

    Neither is redundant, because they are about different halves. Main's is
    model *selection*: an operator who has a better model somewhere should be
    able to point conversations at it, and the comment above says why
    comprehension decides whether this module works at all. This branch's is
    cost *isolation*: a scene must not be able to spend the balance Anu runs
    on, which is what the per-purpose caps and the bounded fallback are for.

    So the override and the ordering are main's, unchanged, and what they are
    applied to is the purpose chain rather than the general one. An install that
    names no scene model gets Groq then the gated fallback; one that names a
    model gets it asked first, which is what naming it meant.

    KNOWN WART, WRITTEN DOWN RATHER THAN HIDDEN. `globalFallbackMicros` counts
    Anthropic answering a SCENE as fallback traffic, and an operator who sets
    `ANTHROPIC_SCENE_MODEL` has made it a primary. Such a deployment is
    rationed by the fallback budget when it should not be. It errs toward
    under-spending, which is the safe direction, and the honest fix is for the
    ledger to know which link was chosen rather than inferring it from the
    provider. Not built here.
  */
  /*
    AND THEN THE OVERRIDE WENT, BECAUSE THE OPERATOR PINNED THE MODEL. The
    `*_SCENE_MODEL` map that used to live here let a deployment point
    conversations at any provider and put it in front; with scenes fixed on
    `SCENE_MODELS` a second variable that can move them is the same door the
    `SCENE_MODEL` fault came through, one name over. What survives of main's
    half is the wrapper itself, which every scene path still asks so the
    briefing and the route promise the same chain, and the invariant that it
    is built on the scene purpose.
  */
  return resolveProviders({ ...options, purpose: "scene" });
}

/**
 * Which model each provider is asked to look at pictures with.
 *
 * It defaults to whatever the deployment already configured for chat, because
 * the operator picked that model and picking a different one behind their back
 * is how a deployment that chose a free model ends up with an invoice. The
 * override exists for the case that default cannot serve: a text-only model
 * cannot read a photograph, and `GROQ_VISION_MODEL` and friends are how a
 * free-model deployment points the one feature that needs eyes at something
 * that has them.
 */
export function visionProviders(options: ChainOptions = {}): ProviderConfig[] {
  /*
    THE ONE MODEL THAT WAS MEASURED READING ESTONIAN LEADS, AND THE REST OF THE
    CHAIN STAYS BEHIND IT.

    This was the general chain in whatever order it came in, which put a
    text-only model at the front and reached a reader by falling past it. What
    it fell to was inventing words off a clean rendered page: `lapsäpt`,
    `üptetoma`, `lunex`, on a task whose whole job is telling õ from o.

    `npm run eval:scan` renders the pages and counts, six runs of twenty-four
    words that every one carry a diacritic. `gemini-3.1-flash-lite` read 144 of
    144 exactly, with nothing folded, nothing invented and nothing missed, and
    `gemini-3.8-flash` and `claude-sonnet-5` matched it at three and eight
    times the price. Cheapest of three tied at perfect.

    First rather than only, because a scan has nowhere to fall: unlike a scene
    line there is no bank underneath it, so a bad minute at one provider has to
    be able to reach another. What follows is the general chain, deduplicated.
  */
  const led: ProviderConfig[] = process.env.GEMINI_API_KEY
    ? [{ name: "gemini", model: process.env.GEMINI_VISION_MODEL || VISION_MODEL, label: "Google Gemini" }]
    : [];

  const override: Record<ProviderName, string | undefined> = {
    groq: process.env.GROQ_VISION_MODEL,
    gemini: process.env.GEMINI_VISION_MODEL,
    anthropic: process.env.ANTHROPIC_VISION_MODEL,
    openai: process.env.OPENAI_VISION_MODEL,
  };

  /*
    Collapsed to one entry per model, because the chat chain is no longer one
    entry per provider: Groq and Gemini each contribute a link per free model,
    so an override would otherwise ask the same model the same question three
    times and call the third refusal a fallback. Order is kept, first
    occurrence wins.
  */
  const seen = new Set<string>();
  const chain: ProviderConfig[] = [];
  for (const config of [...led, ...resolveProviders(options)]) {
    const model = override[config.name]?.trim() || config.model;
    const key = `${config.name}:${model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chain.push({ ...config, model });
  }
  return chain;
}

/**
 * Asks the chain to read one image, and returns the whole answer at once.
 *
 * NOT STREAMED, DELIBERATELY. The reply is a JSON object that means nothing
 * until its last brace arrives, so streaming it would buy a spinner that
 * flickers and cost the ability to fall back once text has started. Since
 * nothing is shown until the answer is complete, this can keep trying
 * providers for as long as the chain lasts.
 *
 * WHY IT FALLS BACK MORE READILY THAN THE CHAT PATH DOES. `openWithFallback`
 * refuses to walk past a 400 or a 404, because a malformed request or a
 * missing model would be answered the same way by everybody and trying them
 * all turns one clear message into a slower one. That reasoning does not hold
 * for a picture: whether a model can see is a fact about that one model, and
 * "this model does not accept images" is exactly the case where the next
 * provider in the chain is worth asking. Only a rejected key stops the walk,
 * because that is a configuration mistake no amount of retrying fixes.
 */
export async function completeWithImage(
  chain: ProviderConfig[],
  system: string,
  prompt: string,
  image: ImageAttachment,
  onUsage?: (usage: UsageReport, config: ProviderConfig) => void,
): Promise<CompletedReply> {
  if (chain.length === 0) throw new TutorError("No AI provider is configured.", 503);

  let last: unknown = null;
  for (let i = 0; i < chain.length; i += 1) {
    const config = chain[i]!;
    try {
      const reply = config.name === "anthropic"
        ? await readImageAnthropic(config, system, prompt, image)
        : await readImageOpenAiCompatible(config, system, prompt, image);
      onUsage?.(reply.usage, config);
      return reply;
    } catch (error) {
      last = error;
      const fatal = error instanceof TutorError && error.status === 401;
      if (fatal || i === chain.length - 1) throw error;
    }
  }

  throw last instanceof Error ? last : new TutorError("No AI provider could read that.", 502);
}

/** Output ceiling for a page of vocabulary. Sixty pairs is well inside this. */
const IMAGE_REPLY_TOKENS = 1500;

async function readImageOpenAiCompatible(
  config: ProviderConfig,
  system: string,
  prompt: string,
  image: ImageAttachment,
): Promise<CompletedReply> {
  // Same table as the chat path, so a provider cannot be reachable for one and
  // silently pointed at OpenAI for the other.
  const { url, keyEnv } = openAiCompatible(config);
  // Same invariant as callOpenAiCompatible above: the chain only ever offers
  // a config whose key env var was set.
  const key = process.env[keyEnv]!;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: IMAGE_REPLY_TOKENS,
      thinking: ANTHROPIC_THINKING,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  await assertOk(res, config);
  const body = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const raw = body.choices?.[0]?.message?.content;
  // Some OpenAI-compatible gateways answer with the parts array rather than a
  // string, even when every part is text. Both mean the same thing.
  const text = typeof raw === "string"
    ? raw
    : Array.isArray(raw)
      ? raw.map((p) => (typeof p === "object" && p && "text" in p ? String((p as { text: unknown }).text ?? "") : "")).join("")
      : "";

  return {
    config,
    text,
    usage: usageFrom(body.usage?.prompt_tokens, body.usage?.completion_tokens, system + prompt, text),
  };
}

async function readImageAnthropic(
  config: ProviderConfig,
  system: string,
  prompt: string,
  image: ImageAttachment,
): Promise<CompletedReply> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: config.model,
      max_tokens: IMAGE_REPLY_TOKENS,
      /*
        NO `cache_control` HERE. This said the scanning instruction is worth
        caching "exactly as the Estonian system prompt is", and the two are not
        alike in the one dimension that decides it: Anthropic will not create a
        cache entry under 1,024 tokens, the tutor's prompt is about 2,275 and
        `SCAN_PROMPT` is 221. The parameter was accepted and ignored.

        And there is nothing to fix by growing it, because the instruction was
        never where a scan's cost is: a photograph is a few thousand input
        tokens and the picture is different every time, so the expensive half
        of this call is uncacheable by construction. The comment that used to
        sit here said as much in its last sentence and then cached the cheap
        half anyway.
      */
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  await assertOk(res, config);
  const body = (await res.json()) as {
    content?: { type?: string; text?: string }[];
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };

  const text = (body.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  // As in `absorbUsage`: the total for the call, and the split for its price.
  const cached = body.usage?.cache_read_input_tokens ?? 0;
  const written = body.usage?.cache_creation_input_tokens ?? 0;
  const input = (body.usage?.input_tokens ?? 0) + written + cached;

  return {
    config,
    text,
    usage: {
      ...usageFrom(input || undefined, body.usage?.output_tokens, system + prompt, text),
      cachedInputTokens: cached,
      cacheWriteTokens: written,
    },
  };
}

/**
 * Token counts as reported, or estimated over the text when they were not.
 *
 * An estimate over text alone undercounts a request carrying a photograph by
 * the entire cost of the photograph, so the caller adds the image's share on
 * top. `measured` is what tells it whether to.
 */
function usageFrom(
  input: number | undefined,
  output: number | undefined,
  sent: string,
  received: string,
): UsageReport {
  if (input != null || output != null) {
    return { inputTokens: input ?? 0, outputTokens: output ?? 0, measured: true };
  }
  return {
    inputTokens: estimateTokens(sent),
    outputTokens: estimateTokens(received),
    measured: false,
  };
}
