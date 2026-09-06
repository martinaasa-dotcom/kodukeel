import type { WritingTask } from "@/lib/estonian/writing";
import { estimateTokens } from "@/lib/usage/pricing";
import { anthropicHeaders, openAiCompatible, TutorError, type ProviderConfig, type UsageReport } from "./provider";

/**
 * Grading a learner's own Estonian sentence.
 *
 * This is the one place the model looks at Estonian the learner wrote, and its
 * job is carefully bounded. It does **not** decide whether the required
 * inflected form is correct — `checkForm` does that by string comparison
 * against a form from Ekilex, before this is ever called. The model judges what
 * a model is actually good at: whether the rest of the sentence hangs together,
 * whether the word is used in a sense that makes sense, and why.
 *
 * That boundary is what makes the feature compatible with ADR-005. The forms in
 * the prompt are quoted to the model, not invented by it, and nothing it returns
 * is ever written to a card. Its output is advice attached to one attempt.
 */

export type Verdict = "correct" | "almost" | "wrong";

export interface GradedSentence {
  verdict: Verdict;
  /** One or two sentences. May quote the supplied forms; may not invent new ones. */
  comment: string;
  /** The grammatical rule at issue, named. Empty when the sentence was simply right. */
  rule: string;
}

export interface GraderInput {
  task: WritingTask;
  sentence: string;
  /** Every authoritative form, so the model never has to guess one. */
  knownForms: { label: string; value: string }[];
  level: string;
}

export function buildGraderSystemPrompt(): string {
  return `You are Anu, an Estonian teacher, marking one sentence a learner has written.

WHAT YOU ARE JUDGING
The learner was asked to use one specific word in one specific grammatical case. Whether they produced the right form has ALREADY been checked mechanically against the dictionary, and the result is given to you. Do not re-litigate it and do not contradict it.

Your job is the rest of the sentence:
- Is it grammatical Estonian?
- Is the word used in a sense that makes sense?
- Is the word order natural?
- Is the object case right, if there is an object?

RULES YOU MUST NOT BREAK
- Every Estonian form you mention must be one that appears in KNOWN FORMS below, or a word the learner themselves wrote. You may not introduce an inflected form from your own knowledge. If the sentence needs a word you have not been given, describe it in English instead ("you would need the allative of 'laud' here") and do not spell it.
- If you are unsure whether something is an error, say the sentence is acceptable. A confident correction that is wrong is far more damaging than a missed nitpick, because the learner will believe you.
- Name the rule when you correct something. "Partitive, because the action is ongoing", not "it sounds better".

TONE
Direct and brief. Say what is right before what is wrong when both apply. No praise that carries no information.

OUTPUT
Reply with a single JSON object and nothing else:
{"verdict":"correct"|"almost"|"wrong","comment":"one or two sentences","rule":"the grammatical rule at issue, or an empty string"}

"correct" means the sentence works. "almost" means understandable but with an error worth naming. "wrong" means it does not mean what they intended, or is not Estonian.

Do not use an em dash or an en dash anywhere in your comment. Use a comma, a full stop, or a pair of brackets.`;
}

export function buildGraderUserPrompt(input: GraderInput, formWasUsed: boolean): string {
  const forms = input.knownForms
    .filter((f) => f.value)
    .map((f) => `  ${f.label}: ${f.value}`)
    .join("\n");

  return `LEARNER LEVEL: ${input.level}

TASK SET: use "${input.task.lemma}" (${input.task.translation}) in the ${input.task.caseEn.toLowerCase()} (${input.task.caseEt}, ${input.task.caseQuestion}).
REQUIRED FORM: ${input.task.targetForm}
MECHANICAL CHECK: the learner ${formWasUsed ? "DID" : "DID NOT"} use the required form.

KNOWN FORMS of ${input.task.lemma}, from the dictionary. These are the only forms of this word you may write:
${forms || "  (none beyond the required form)"}

THE LEARNER WROTE:
${input.sentence}`;
}

/**
 * Parses the model's reply into a verdict.
 *
 * Models wrap JSON in prose or fences however they like, so the first balanced
 * object in the response is taken rather than assuming the whole body parses.
 * Anything unparseable becomes an honest "could not grade" rather than a guess:
 * inventing a verdict here would be inventing feedback.
 */
export function parseVerdict(raw: string): GradedSentence | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) { end = i + 1; break; }
  }
  if (end === -1) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end)) as Record<string, unknown>;
    const verdict = parsed.verdict;
    if (verdict !== "correct" && verdict !== "almost" && verdict !== "wrong") return null;
    return {
      verdict,
      comment: typeof parsed.comment === "string" ? parsed.comment.slice(0, 600) : "",
      rule: typeof parsed.rule === "string" ? parsed.rule.slice(0, 200) : "",
    };
  } catch {
    return null;
  }
}

/**
 * One non-streaming call. Grading is short and the learner is waiting for a
 * single verdict, so streaming would add complexity for no perceived speed.
 */
export async function gradeSentence(
  provider: ProviderConfig | readonly ProviderConfig[],
  input: GraderInput,
  formWasUsed: boolean,
): Promise<{ graded: GradedSentence | null; usage: UsageReport; config: ProviderConfig }> {
  const { text, usage, config } = await callChainForJson(
    asChain(provider), buildGraderSystemPrompt(), buildGraderUserPrompt(input, formWasUsed),
  );
  return { graded: parseVerdict(text), usage, config };
}

/**
 * The transport, shared by the three things that ask a model for one JSON object.
 *
 * Extracted when the mock examination needed a second grader: the composition
 * task hands over a whole text rather than one sentence, and duplicating fifty
 * lines of provider plumbing to say so would have meant two places to fix the
 * next time a provider changed the shape of its usage block. The scene grader
 * is the third and added none, which is the argument for having extracted it.
 */
/**
 * A reply budget that a reasoning model can still finish a JSON object inside.
 *
 * This was 400, which is generous for the answer and not for the answer plus
 * the thinking in front of it. A model that reasons before it writes spends
 * that budget on the reasoning first, and under `response_format: json_object`
 * Groq then rejects the whole call with `json_validate_failed` and an empty
 * `failed_generation`, because there was no JSON to validate. Measured against
 * `openai/gpt-oss-120b` on this deployment's own key: 1 of 5 calls survived at
 * 400 and 5 of 5 at 1,000.
 *
 * It is a ceiling rather than a target, so nothing that was answering inside
 * 400 tokens costs a penny more: a model emits what it emits and is billed for
 * that. What it buys is the class of model that cannot answer at all under the
 * old number, which is most of the ones worth using here.
 *
 * `provider.ts` already recorded the sibling of this fault, that
 * `openai/gpt-oss-20b` "spends the whole budget in its reasoning field and
 * writes nothing into `content`". That was read as a fact about one model. It
 * is a fact about a budget.
 */
const JSON_REPLY_TOKENS = 1_000;

/**
 * NOTE ON THE TWO ABOVE AND BELOW, WHICH ARRIVED FROM TWO SESSIONS AT ONCE.
 *
 * The budget and the chain were written independently against the same
 * failure, and they are not alternatives. #175 kept the 400 and walked past a
 * model that could not answer inside it, measuring `openai/gpt-oss-120b`
 * failing `json_validate_failed` on 15 of 36 calls at that cap. That is a
 * real defence and it has a cost this file should not pay by default: the
 * next link is `qwen/qwen3.8-27b`, which on the same eight writing samples
 * invented `rahma` as the partitive of `raha`, called `raamatu` a nominative
 * and had 12 of 32 comments withheld. Falling through to it two calls in
 * five is not a fallback, it is a different grader.
 *
 * So the chain keeps its walk and starts from the budget at which the first
 * link actually answers. Measured at 1,000: 0 failures in 32 calls and 31 of
 * 32 verdicts, against 28 of 32 for the model behind it. The walk is then
 * what it was built to be, the thing that catches a bad minute, rather than
 * the ordinary path.
 */

/**
 * The three graders' last resort, and why it is a walk rather than one call.
 *
 * `callForJson` below talks to one provider. Until this existed the three
 * graders were handed `resolveProvider()`, the *head* of the chain and nothing
 * else, so a grader note had no fallback at all: Groq having a bad minute meant
 * the note simply did not arrive. That was survivable, because the verdict a
 * learner acts on is decided by string comparison against the dictionary before
 * any of this runs and only the prose was lost, and it was still the one metered
 * path with nowhere to go.
 *
 * WHAT IT MAY NOT DO IS SPEND WITHOUT A CEILING. The chain handed in is built
 * with `allowFallback`, which the ledger sets false once the day's fallback
 * budget is gone, so on a long Groq outage this walks a chain of one, fails,
 * and the note is dropped exactly as it was before. The degradation is the old
 * behaviour reached by a budget rather than by a missing key.
 *
 * It walks on any failure, unlike `openWithFallback` next door, and for the
 * reason `completeWithImage` gives about itself: nothing is streamed here, so
 * there is no half-written answer for a second attempt to talk over, and
 * whether a model can return the JSON asked for is a fact about that model.
 */
async function callChainForJson(
  chain: readonly ProviderConfig[],
  system: string,
  user: string,
  maxTokens = JSON_REPLY_TOKENS,
): Promise<{ text: string; usage: UsageReport; config: ProviderConfig }> {
  let last: unknown = null;
  for (let i = 0; i < chain.length; i += 1) {
    const config = chain[i]!;
    try {
      const { text, usage } = await callForJson(config, system, user, maxTokens);
      return { text, usage, config };
    } catch (error) {
      last = error;
      // A rejected key is a configuration mistake no amount of walking fixes.
      const fatal = error instanceof TutorError && error.status === 401;
      if (fatal || i === chain.length - 1) throw error;
    }
  }
  throw last instanceof Error ? last : new TutorError("No provider could grade that.", 502);
}

/** Accepts either, so a caller that has only one provider need not build a list. */
function asChain(input: ProviderConfig | readonly ProviderConfig[]): readonly ProviderConfig[] {
  return Array.isArray(input) ? input : [input as ProviderConfig];
}

async function callForJson(
  config: ProviderConfig,
  system: string,
  user: string,
  maxTokens = JSON_REPLY_TOKENS,
): Promise<{ text: string; usage: UsageReport }> {
  const usage: UsageReport = { inputTokens: 0, outputTokens: 0, measured: false };
  let text = "";

  if (config.name === "anthropic") {
    // config always comes from resolveProvider()/resolveProviders(), which
    // only ever offers "anthropic" when this key was set.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        /*
          NO `cache_control` HERE, AND THE REASON IS ARITHMETIC RATHER THAN
          TASTE. This carried a breakpoint under a comment saying the prompt is
          identical on every call and therefore worth caching. Identical it is;
          cacheable it is not. Anthropic will not create a cache entry for a
          prefix under 1,024 tokens, and the three system prompts this
          transport sends measure 462, 609 and 717. So the parameter was
          accepted, ignored, and read by anybody looking as though caching were
          switched on here.

          Do not add it back by measuring the prompt against a wish. The two
          honest ways to make this cacheable are a prompt that genuinely needs
          to be over a thousand tokens, which none of these does, or a model
          whose minimum is lower; padding one to reach a billing threshold is
          writing a prompt for the invoice rather than for the answer.

          The usage split below stays regardless: it costs nothing, and it is
          what would start telling the truth rather than silently over-charging
          if either of those ever changed.
        */
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new TutorError(`${config.label} returned ${res.status}.`, res.status);
    const body = await res.json() as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
    };
    text = (body.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    if (body.usage) {
      /*
        The total for the call and the split for its price, as in
        `absorbUsage`. Reported even though this transport asks for no cache
        entry at all and these two therefore read as zero on every call today:
        Anthropic still sends the fields, parsing them costs nothing, and it is
        what keeps the price honest the day somebody has a real reason to cache
        here rather than leaving a ten-times over-charge to be discovered
        afterwards.
      */
      const cached = body.usage.cache_read_input_tokens ?? 0;
      const written = body.usage.cache_creation_input_tokens ?? 0;
      usage.inputTokens = (body.usage.input_tokens ?? 0) + cached + written;
      usage.cachedInputTokens = cached;
      usage.cacheWriteTokens = written;
      usage.outputTokens = body.usage.output_tokens ?? 0;
      usage.measured = true;
    }
  } else {
    /*
      WHICH ENDPOINT AND WHICH KEY IS ONE TABLE, AND THIS READ ITS OWN.

      It was `isOpenRouter ? OpenRouter : OpenAI`, written when the chain held
      exactly those two, and `resolveProviders` has offered Groq and Gemini
      since. Neither is OpenRouter, so both fell down the else side of that
      ternary and were posted to `api.openai.com` carrying `OPENAI_API_KEY`,
      which on a deployment configured with Groq or Gemini and nothing else is
      undefined. Every GRADER call there answered 401: the writing exercise,
      the scene description, the examination composition note and the
      dictionary's translation fallback, all four of them, on the two
      providers a stranger can set up without a card. The streaming path was
      unaffected, which is why nothing looked broken.

      `openAiCompatible` in `provider.ts` is the table the chain itself reads,
      so there is one answer to "where does this provider live" rather than a
      copy here that goes stale the next time the chain grows.
    */
    const { url, keyEnv } = openAiCompatible(config);
    // Same invariant as the anthropic branch above: a config only ever reaches
    // here from `resolveProviders`, which adds a provider when its key is set.
    const key = process.env[keyEnv]!;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new TutorError(`${config.label} returned ${res.status}.`, res.status);
    const body = await res.json() as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    text = body.choices?.[0]?.message?.content ?? "";
    if (body.usage) {
      usage.inputTokens = body.usage.prompt_tokens ?? 0;
      usage.outputTokens = body.usage.completion_tokens ?? 0;
      usage.measured = true;
    }
  }

  if (!usage.measured) {
    usage.inputTokens = estimateTokens(system + user);
    usage.outputTokens = estimateTokens(text);
  }

  return { text, usage };
}

// ── The examination composition ──────────────────────────────────────────────

/**
 * Reading back a whole text from the mock examination's writing part.
 *
 * THE MARKS ARE ALREADY DECIDED BEFORE THIS RUNS, and that is the point. The
 * composition scores on length and on whether the words the task named were
 * used, both settled by `lib/exam/score.ts` against the dictionary. Nothing this
 * returns can move a mark. A model that decided whether somebody's Estonian was
 * good enough would be deciding whether they are ready to sit a real
 * examination, which is exactly the judgment it is least qualified to make.
 *
 * So the prompt asks for the thing a model is genuinely good at: reading a text
 * and saying what a teacher would say about it, in English, without spelling a
 * single Estonian form it was not given. The learner's own words are the
 * allowlist, and `verifyComment` enforces it after the fact, because a live test
 * showed a model reaching for forms unprompted despite being told not to.
 */
export function buildCompositionSystemPrompt(): string {
  return `You are Anu, an Estonian teacher, reading back a text a learner wrote in an examination.

WHAT YOU ARE DOING
Saying what you notice, the way a teacher hands a paper back. Two or three sentences, no more.

WHAT YOU ARE NOT DOING
Marking it. The marks were awarded before you saw this, mechanically, on length and on whether the required words were used. Do not award, estimate, or mention a score, and do not tell the learner whether they passed.

RULES YOU MUST NOT BREAK
- Every Estonian word you write must be one the learner themselves wrote. You may not spell a correction. If a word is wrong, name the problem in English: "the second sentence needs the partitive after that verb", never the form itself.
- If you are unsure whether something is an error, leave it. A confident correction that is wrong is far more damaging than a missed one, because the learner will believe you.
- Name the pattern, not every instance. One thing to fix beats nine.

TONE
Direct and brief. Say what works before what does not, when both apply. No praise that carries no information.

OUTPUT
Reply with a single JSON object and nothing else:
{"verdict":"correct"|"almost"|"wrong","comment":"two or three sentences","rule":"the one thing to work on, in a few words, or an empty string"}

Do not use an em dash or an en dash anywhere in your comment. Use a comma, a full stop, or a pair of brackets.`;
}

export function buildCompositionUserPrompt(text: string, level: string): string {
  return `LEARNER LEVEL: ${level}

THIS IS WHAT THEY WROTE. Every Estonian word you may use is somewhere in it:
${text}`;
}

/**
 * A composition is the longest thing this file grades, and it needs a budget
 * of its own. Both halves of that were measured rather than reasoned about.
 *
 * This call carried an explicit 500 while the other three inherited
 * `JSON_REPLY_TOKENS`, so raising the default reached `gradeSentence` and
 * `gradeDescription` and stopped at the door of the one path with the most to
 * write. Swept over twelve compositions built from attested sentences, on
 * `openai/gpt-oss-120b` through this transport, with everything but the cap
 * held still:
 *
 *   500 -> 0 of 12,  1000 -> 9 of 12,  1500 -> 12 of 12,  2000 -> 12 of 12
 *
 * So the override was not merely tight, it was under the answer's own length:
 * the mean reply is 966 tokens, which is why 1,000 clears three quarters of
 * them and no more. Groq refuses these with 400 `json_validate_failed` rather
 * than returning a truncated string, so nothing reports `finish_reason:
 * "length"` and a cap that is too small looks like a model that cannot answer.
 *
 * A second constant, then, where the note here first said one. That is the
 * right way round and the reason is the direction: the old 500 was *smaller*
 * than the shared default and nobody had measured it, so it silently undid a
 * fix; this is *larger* and measured, on its own prompt, and 2,000 buys
 * nothing over 1,500. A ceiling and not a target, so a reply that finishes in
 * 200 still costs 200 and the short paths are untouched.
 */
const COMPOSITION_REPLY_TOKENS = 1_500;

export async function gradeComposition(
  provider: ProviderConfig | readonly ProviderConfig[],
  text: string,
  level: string,
): Promise<{ graded: GradedSentence | null; usage: UsageReport; config: ProviderConfig }> {
  const { text: reply, usage, config } = await callChainForJson(
    asChain(provider), buildCompositionSystemPrompt(),
    buildCompositionUserPrompt(text, level), COMPOSITION_REPLY_TOKENS,
  );
  return { graded: parseVerdict(reply), usage, config };
}

// ── A sentence about a scene ─────────────────────────────────────────────────

/**
 * Reading back one sentence a learner wrote about a scene.
 *
 * The third prompt in this file and the third time the same boundary is drawn.
 * `lib/games/describe.ts` has already decided, against the dictionary and
 * before this runs, whether the named word carried the case the task asked for
 * and which case it carried instead. Nothing here can move that, and the
 * prompt says so, because a model that re-litigated the morphology would be
 * the one thing ADR-005 exists to prevent.
 *
 * WHAT THE SCENE BUYS. The writing grader is handed a word and a case and
 * nothing else, so the most it can say about a sentence is whether it hangs
 * together. Here the model is told what the picture is, so it can say the
 * thing a teacher would say first: that the sentence is fine Estonian and is
 * not about the picture. That is a judgment about meaning rather than about
 * morphology, which is the half a model is actually good at.
 *
 * The scene's words are given in English as well as Estonian, and the Estonian
 * is quoted rather than invented: every form in `KNOWN FORMS` came out of the
 * dictionary, and `verifyComment` checks afterwards that nothing else was
 * spelled, because a live test showed a model reaching for forms unprompted.
 */
export function buildDescribeSystemPrompt(): string {
  return `You are Anu, an Estonian teacher, reading one sentence a learner has written about a picture.

WHAT YOU ARE JUDGING
Two things, in this order:
1. Is the sentence about the picture? They were shown a situation and three things in it. A grammatical sentence about something else is the most useful thing you can point out, and nothing else in this app can see it.
2. Is it Estonian that works? Word order, the case of the object, whether the words go together.

WHAT HAS ALREADY BEEN DECIDED WITHOUT YOU
Whether they used the one word in the one case the task named. That was checked against the dictionary before you saw this and the result is given to you below. Do not re-check it, do not contradict it, and do not repeat it back as though it were your finding.

RULES YOU MUST NOT BREAK
- Every Estonian form you mention must appear in KNOWN FORMS below, or be a word the learner themselves wrote. You may not introduce an inflected form from your own knowledge. If the sentence needs a word you have not been given, say so in English ("you would need the allative here") and do not spell it.
- If you are unsure whether something is an error, say the sentence is acceptable. A confident correction that is wrong is far more damaging than a missed one, because the learner will believe you.
- Name the rule when you correct something, not the feeling. "Partitive, because the action is ongoing", never "it sounds better".
- Do not tell them to use the other two words. Only one was required.

TONE
Direct and brief. Say what works before what does not, when both apply. No praise that carries no information.

OUTPUT
Reply with a single JSON object and nothing else:
{"verdict":"correct"|"almost"|"wrong","comment":"one or two sentences","rule":"the grammatical rule at issue, or an empty string"}

"correct" means the sentence works and is about the picture. "almost" means it is understandable but has an error worth naming, or is only loosely about the picture. "wrong" means it is not Estonian, or is about something else entirely.

Do not use an em dash or an en dash anywhere in your comment. Use a comma, a full stop, or a pair of brackets.`;
}

export interface DescribeGraderInput {
  /** What is going on, in English. */
  situation: string;
  /** The three things, as the learner saw them. */
  things: { emoji: string; lemma: string; translation: string }[];
  /** The word the task named, and the case it asked for. */
  asked: { lemma: string; caseEt: string; caseQuestion: string };
  /** Whether the mechanical check found that case. Settled before this runs. */
  rightCase: boolean;
  /** Every authoritative form, so the model never has to guess one. */
  knownForms: { label: string; value: string }[];
  sentence: string;
  level: string;
}

export function buildDescribeUserPrompt(input: DescribeGraderInput): string {
  const things = input.things
    .map((t) => `  ${t.emoji}  ${t.lemma} (${t.translation})`)
    .join("\n");
  const forms = input.knownForms
    .filter((f) => f.value)
    .map((f) => `  ${f.label}: ${f.value}`)
    .join("\n");

  return `LEARNER LEVEL: ${input.level}

THE PICTURE. Situation: ${input.situation}. Three things in it:
${things}

TASK SET: write one sentence about it, with "${input.asked.lemma}" in the ${input.asked.caseEt} (${input.asked.caseQuestion}).
MECHANICAL CHECK: the learner ${input.rightCase ? "DID" : "DID NOT"} use that case.

KNOWN FORMS, from the dictionary. These are the only Estonian forms you may write:
${forms || "  (none)"}

THE LEARNER WROTE:
${input.sentence}`;
}

export async function gradeDescription(
  provider: ProviderConfig | readonly ProviderConfig[],
  input: DescribeGraderInput,
): Promise<{ graded: GradedSentence | null; usage: UsageReport; config: ProviderConfig }> {
  const { text, usage, config } = await callChainForJson(
    asChain(provider), buildDescribeSystemPrompt(), buildDescribeUserPrompt(input),
  );
  return { graded: parseVerdict(text), usage, config };
}
