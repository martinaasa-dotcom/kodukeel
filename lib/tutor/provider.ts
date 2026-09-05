/**
 * Anthropic chat streaming, with the fallback chain still behind it.
 *
 * The app works with whichever keys are configured. As of 2026-09-05 that is
 * Anthropic, and OpenAI if a deployment sets its key. Nothing above this layer
 * knows which. Keys are read from the environment on the server and never
 * leave it.
 *
 * WHY THE FREE PROVIDERS WENT (2026-09-05). OpenRouter, Groq and Gemini were
 * the default chain, and the argument for them was that a stranger could set
 * this up without a card. What they were measured to do instead was fail three
 * ways that all land on a learner mid-sentence: a daily quota gone by the
 * afternoon, a per-minute burst limit on the ordinary case, and a Gemini model
 * that answered 200 with an empty `content` because its reasoning field had
 * spent the whole output budget. The third is the worst of them, because the
 * chain counts an empty string as an answer and walks past nothing. A small
 * honest bill is better than a tutor that is dead on the days somebody needs
 * it, so the chain is one paid provider and the caps in `lib/usage` are what
 * keep it small. `/funding` says what it costs; `AI_DAILY_USD_GLOBAL` is what
 * stops it.
 *
 * WHY A CHAIN AND NOT A CONSTANT, STILL. A chain of one is the ordinary case
 * here and the mechanism stays whole: `openWithFallback` walks past a provider
 * that is throttled or having a bad minute and refuses to walk past a rejected
 * key or a missing model, `withRetry` is patient only where there is nowhere
 * else to ask, and the OpenAI-compatible table below still holds every wire
 * address it ever did. Re-adding a second provider is a branch in
 * `resolveProviders` and a name in `PROVIDER_KEY_ENV`, which is the whole
 * point of leaving the rest of this file alone.
 *
 * WHICH ONE ANSWERED IS THEN A FACT ABOUT THE ANSWER, and the app says so.
 * `streamReply` reports the provider that actually served the stream, never
 * the head of the chain, because a screen naming the wrong model is worse
 * than one naming none.
 */
import { reportError } from "@/lib/observability/report";
import { estimateTokens } from "@/lib/usage/pricing";

/*
  The names the wire layer below still knows how to speak.

  Three of them are unreachable from `resolveProviders` today and are kept
  deliberately rather than tidied away: `OPENAI_COMPATIBLE` is the one table of
  where each of them lives and what quirk it has, and a table that was deleted
  and retyped from memory is how a provider comes back pointed at the wrong
  endpoint. Nothing can reach them without a branch that reads their key.
*/
export type ProviderName = "openrouter" | "groq" | "gemini" | "openai" | "anthropic";

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  label: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The model Anu and the scenes are asked with, unless a deployment says
 * otherwise.
 *
 * Sonnet 5 rather than an Opus: the two things this app asks a model for are a
 * short explanation of an Estonian point and one sentence of Estonian inside a
 * closed word list, and neither is reasoning-hard. It is the cheapest current
 * model that was measured to get the partitive right, and at $2/$10 per
 * million tokens (checked against the price list on 2026-09-05) a tutor answer
 * comes to about a cent and a half.
 */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

/**
 * The output ceiling for one reply, and why it is not the 1200 it was.
 *
 * 1200 was sized when nothing in the chain thought before it answered, and
 * that stopped being true. Sonnet 5 runs adaptive thinking **by default**: the
 * per-model table at
 * platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting lists
 * it as "Adaptive only, Default: On", so omitting the `thinking` field is not
 * the same as switching it off. And thinking tokens are output tokens: "thinking
 * tokens count toward the `max_tokens` limit for the turn", which the same page
 * spells out as a failure mode — the response "stops with `stop_reason:
 * max_tokens`, often with a truncated or missing text block".
 *
 * That is the Gemini bug this app was just bitten by, wearing different
 * clothes. It answered 200, spent the whole budget in its reasoning field and
 * wrote nothing into `content`, and `readStream` counted the empty string as an
 * answer. Nothing in this file would notice Claude doing the same thing.
 *
 * Two things stop it, and both are cheap. `ANTHROPIC_THINKING` below turns
 * thinking off, and this ceiling is set well clear of any reply this app asks
 * for so that a future model which ignores that still has room: the longest
 * thing Anu writes is a few paragraphs about one grammar point, and a scene
 * line is capped at `MAX_WORDS`, which is fourteen.
 */
export const REPLY_TOKENS = 4000;

/**
 * Thinking off, on the one path where a model could think.
 *
 * Neither thing this app asks for is reasoning-hard: an explanation of a point
 * the prompt already contains, and one Estonian sentence built from a word
 * list that is handed over in full. What thinking would buy is nothing
 * measurable and what it costs is real, because a thinking token is billed at
 * the output rate ($10 per million on Sonnet 5), on a deployment whose whole
 * daily budget is a dollar.
 *
 * Sonnet 5 accepts `disabled`; the table linked above rejects only `enabled`
 * for it. The residual risk is documented and is not this app's shape: with
 * thinking disabled, Claude Opus 5 can write a tool call into its visible text
 * or leak an internal tag, "most commonly on tool-heavy workloads such as
 * search". Nothing here declares a tool at all, and the prompts do not tell the
 * model not to reason, which the docs name as the thing that makes leakage
 * worse. A deployment that pins `ANTHROPIC_MODEL` to a model where thinking
 * cannot be turned off (Fable, Mythos) gets a 400 and a clear message, which is
 * the right way for that to fail.
 */
export const ANTHROPIC_THINKING = { type: "disabled" } as const;

/**
 * How many *independent* things can answer, which is not the length of the
 * chain.
 *
 * It used to be able to differ: OpenRouter contributed one link per free model,
 * so a chain of four could still be a single account with a single balance, and
 * when that balance ran out here every link returned 402 together and Anu went
 * down. With one provider per key the two numbers agree, and the flag is now
 * saying the plainer thing: there is one place this deployment can ask, so a
 * bad hour there is a bad hour for the tutor.
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
 * One list rather than a read scattered through `resolveProviders`, and it
 * exists for the test suite rather than for the chain: a unit test here must
 * describe a machine, not run on one. `provider.test.ts` clears exactly these
 * before each case, so a machine that happens to carry a real key in its
 * environment measures the same chain CI does.
 *
 * That is not hypothetical. `GROQ_API_KEY` and `GEMINI_API_KEY` were added to
 * the chain without being added to the test helper that cleared keys, so the
 * whole suite passed on CI, which has none, and failed thirteen ways on any
 * machine that had either. The suite was reporting the machine.
 *
 * Both of those, and `OPENROUTER_API_KEY`, came off this list on 2026-09-05
 * with the branches that read them. Taking a name off is the same class of
 * mistake as forgetting to add one, so the rule is the same either way: this
 * list is exactly the keys `resolveProviders` reads, no more and no fewer.
 * `OPENAI_API_KEY` stays because the OpenAI branch stays, and because
 * `lib/tutor/grader.ts` reads that key directly on its non-Anthropic path.
 */
export const PROVIDER_KEY_ENV = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
] as const;

/**
 * Every provider with a key, in the order they should be tried.
 *
 * Anthropic first, because it is the one this app is written against and the
 * one `/funding` prices. A deployment with only one key gets a chain of one,
 * which is what this app has always done, and **a deployment with no key at
 * all gets an empty chain**, which is not an error state: every caller checks
 * the length and runs its scripted path instead. That is what makes a keyless
 * install a complete app rather than a broken one, and it is why this returns
 * an array rather than throwing.
 */
export function resolveProviders(): ProviderConfig[] {
  const chain: ProviderConfig[] = [];
  if (process.env.ANTHROPIC_API_KEY) {
    chain.push({
      name: "anthropic",
      model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      label: "Anthropic",
    });
  }
  if (process.env.OPENAI_API_KEY) {
    chain.push({
      name: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      label: "OpenAI",
    });
  }
  return chain;
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
  // above, and is exactly what to walk past within one. That second half is
  // dormant rather than gone: no provider contributes more than one link now,
  // so `sameProviderNext` is never true today. It stays because a pinned
  // `ANTHROPIC_MODEL` is a slug that can go stale in somebody's dashboard, and
  // the day a second model is listed behind one key this is the rule that
  // reaches it. Reaching the next one costs a request; refusing costs the
  // learner their answer.
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
  inputTokens: number;
  outputTokens: number;
  /** False when the provider never sent a usage frame and this is an estimate. */
  measured: boolean;
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
  usage?: { output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
}

function absorbUsage(provider: ProviderName, frame: unknown, into: UsageReport): void {
  const f = frame as UsageFrame;

  if (provider === "anthropic") {
    if (f.type === "message_start" && f.message?.usage) {
      const u = f.message.usage;
      // Cache reads and writes are real input tokens and are billed as such.
      into.inputTokens =
        (u.input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0);
      into.measured = true;
    }
    if (f.type === "message_delta" && f.usage?.output_tokens != null) {
      into.outputTokens = f.usage.output_tokens;
      into.measured = true;
    }
    return;
  }

  if (f.usage) {
    into.inputTokens = f.usage.prompt_tokens ?? into.inputTokens;
    into.outputTokens = f.usage.completion_tokens ?? into.outputTokens;
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
): Promise<OpenStream> {
  if (chain.length === 0) throw new TutorError("No AI provider is configured.", 503);

  for (let i = 0; i < chain.length; i += 1) {
    const config = chain[i]!;
    try {
      const last = i === chain.length - 1;
      const upstream =
        config.name === "anthropic"
          ? await callAnthropic(config, system, messages, live)
          : await callOpenAiCompatible(config, system, messages, last, live);
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
 * A 429 is a bad minute rather than a verdict: an account near its
 * requests-per-minute limit answers one and then answers the next. Waiting a
 * moment and asking again turns most of them into an answer. This mattered
 * more when the default chain was free models throttled hard upstream, and it
 * is still the right thing to do on a paid key that has just been asked
 * several questions at once.
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
  "openrouter" | "groq" | "gemini" | "openai",
  { url: string; keyEnv: string; usageFrames: boolean }
> = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    usageFrames: true,
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    usageFrames: true,
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GEMINI_API_KEY",
    usageFrames: false,
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
 * Exported because `lib/tutor/grader.ts` has its own non-streaming transport
 * and was picking the address and the key with a ternary on `openrouter`: dead
 * code once the chain stopped offering that name, and worse than dead, because
 * it read `OPENROUTER_API_KEY` for one provider and `OPENAI_API_KEY` for
 * everything else. Re-adding a provider would have pointed the grader at
 * OpenAI's endpoint with OpenAI's key and called it that provider. One table,
 * which is the argument `readImageOpenAiCompatible` already makes about the
 * image path.
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
      ...(config.name === "openrouter"
        ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Kodukeel Estonian study" }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      // Without this the stream carries no usage frame and the ledger has to
      // fall back to estimating from character counts.
      ...(usageFrames ? { stream_options: { include_usage: true } } : {}),
      max_tokens: REPLY_TOKENS,
      messages: [{ role: "system", content: live ? `${system}\n\n${live}` : system }, ...messages],
    }),
    signal: AbortSignal.timeout(90_000),
  }), patient);

  await assertOk(res, config);
  return res;
}

async function callAnthropic(config: ProviderConfig, system: string, messages: ChatMessage[], live = "") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      max_tokens: REPLY_TOKENS,
      // See ANTHROPIC_THINKING: adaptive thinking is on by default on Sonnet 5
      // and its tokens come out of max_tokens, which is how a short reply ends
      // up truncated or empty.
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

/**
 * Is this refusal about money rather than about the request?
 *
 * WHAT HAPPENS AT ZERO BALANCE, WHICH IS THE THING TO KNOW BEFORE IT HAPPENS.
 * Anthropic answers a depleted account in three different shapes and only one
 * of them was recognised here (docs/en/api/errors, read 2026-09-05):
 *
 *   402 `billing_error` — a billing or payment problem. Already handled, with
 *       the sentence below, and already the right one.
 *   400 `invalid_request_error` — "The API also returns a 400 when usage
 *       reaches an organization or workspace spend limit you set." That fell
 *       through to the catch-all and reached the operator as "could not answer
 *       just now (400)", which reads as a passing upstream wobble and sends
 *       them to look at the wrong thing.
 *   429 `rate_limit_error` — a usage tier's monthly spend cap, which the docs
 *       say "has no `retry-after` header and keeps failing until access
 *       resumes". That is the one with a cost in time: `withRetry` is patient
 *       on the last link of the chain, so on a chain of one every question
 *       spends three requests and about 4.5 seconds before failing. It is
 *       bounded, and a refused request bills nothing, but a learner waits.
 *
 * None of the three loops, none of them charges anything, and all three end in
 * the caller's scripted path: a scene falls to a recorded line and hands its
 * booking back, Anu says she cannot reach anybody, and review, the dictionary
 * and every drill are untouched. What was wrong was only ever the sentence, so
 * this is what fixes the sentence.
 *
 * Read off the body rather than the status, because the status is the thing
 * that cannot tell these apart. The body itself never reaches a screen.
 */
function isAboutMoney(status: number, body: string): boolean {
  if (status === 402) return true;
  if (status !== 400 && status !== 429) return false;
  return /credit balance|spend limit|spend cap|insufficient|billing/i.test(body);
}

async function assertOk(res: Response, config: ProviderConfig) {
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403) {
    throw new TutorError(`${config.label} rejected the API key. Check it in your .env file.`, 401);
  }
  /*
    Out of credit, which is not the same as a rejected key and must not be
    reported as one. It is worth falling back from, because the next provider
    in the chain has its own balance, and it is worth saying plainly, because
    the person who can fix it is whoever runs the deployment rather than the
    learner reading the message.

    Found on a live deployment: OpenRouter answered 402 and the learner was
    shown a slice of the raw JSON, "This request requires more credits, or
    fewer max_tokens. You requested up to 1200 tokens, but can only afford
    898". Accurate, and addressed to nobody who was there.

    Ahead of the 429 branch on purpose: a spend cap is reported as a 429 and
    waiting is exactly the wrong advice for one, since the docs say it keeps
    failing until access resumes. `status` stays 402 either way, so
    `worthFallingBackFrom` treats it the way it always has.
  */
  if (isAboutMoney(res.status, detail)) {
    throw new TutorError(
      `${config.label} has no credit left on this key, or the account has hit a spend limit. ` +
      `Top it up or raise the limit; nothing else in the app is affected.`,
      402,
    );
  }
  if (res.status === 429) {
    throw new TutorError(
      `${config.label} is rate-limiting this model. Wait a moment and ask again; if it keeps ` +
      `happening, the account's requests-per-minute limit is the thing to raise.`,
      429,
    );
  }
  if (res.status === 404) {
    throw new TutorError(`${config.label} does not have a model called "${config.model}".`, 404);
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
 * Which model each provider is asked to look at pictures with.
 *
 * It defaults to whatever the deployment already configured for chat, because
 * the operator picked that model and picking a different one behind their back
 * is how a deployment ends up with an invoice it did not choose. The override
 * exists for the case that default cannot serve: a text-only model cannot read
 * a photograph, and `ANTHROPIC_VISION_MODEL` and friends are how a deployment
 * points the one feature that needs eyes at something that has them. The chat
 * default sees, so on an ordinary install nothing needs setting.
 */
export function visionProviders(): ProviderConfig[] {
  const override: Record<ProviderName, string | undefined> = {
    openrouter: process.env.OPENROUTER_VISION_MODEL,
    groq: process.env.GROQ_VISION_MODEL,
    gemini: process.env.GEMINI_VISION_MODEL,
    anthropic: process.env.ANTHROPIC_VISION_MODEL,
    openai: process.env.OPENAI_VISION_MODEL,
  };

  /*
    Collapsed to one entry per model. It is a no-op while every provider
    contributes one link, and it is what stopped an override asking one model
    the same question three times and calling the third refusal a fallback,
    back when OpenRouter contributed a link per free model. Order is kept,
    first occurrence wins.
  */
  const seen = new Set<string>();
  const chain: ProviderConfig[] = [];
  for (const config of resolveProviders()) {
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

/**
 * Output ceiling for a page of vocabulary. Sixty pairs is well inside this.
 *
 * Raised from 1500 with `REPLY_TOKENS`, for the reason given there and with
 * more at stake: the answer is a JSON object that means nothing until its last
 * brace, so a reply cut off by a thinking pass is not a short scan, it is a
 * scan that failed after the learner has already taken the photograph.
 */
const IMAGE_REPLY_TOKENS = 4000;

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
  const isOpenRouter = config.name === "openrouter";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      ...(isOpenRouter
        ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Kodukeel Estonian study" }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: IMAGE_REPLY_TOKENS,
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
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: IMAGE_REPLY_TOKENS,
      thinking: ANTHROPIC_THINKING,
      // The instruction is identical for every scan, so it is worth caching
      // exactly as the Estonian system prompt is. The picture never is.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
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

  const input =
    (body.usage?.input_tokens ?? 0) +
    (body.usage?.cache_creation_input_tokens ?? 0) +
    (body.usage?.cache_read_input_tokens ?? 0);

  return {
    config,
    text,
    usage: usageFrom(input || undefined, body.usage?.output_tokens, system + prompt, text),
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
