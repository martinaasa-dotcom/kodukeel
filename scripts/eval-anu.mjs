/**
 * Does Anu actually know Estonian? Connection working is not the same as correct.
 * Each question has a fact the answer must contain; a wrong grammar explanation is
 * worse than none, because the SRS then drills it.
 */
import { ANTHROPIC_THINKING, DEFAULT_ANTHROPIC_MODEL } from "../lib/tutor/provider.ts";
import { buildSystemPrompt } from "../lib/tutor/prompt.ts";

const QUESTIONS = [
  { q: "Why is it 'Lugesin raamatut' and not 'Lugesin raamatu'?",
    must: [/partitiv/i], why: "object case / aspect" },
  { q: "What case does 'aitama' take? Give an example.",
    must: [/partitiv/i, /aitan/i], why: "verb government" },
  { q: "Which case is 'toas' and what is its dictionary form?",
    must: [/inessive|seesütlev/i, /tuba/i], why: "case identification" },
  { q: "Explain the consonant gradation in 'tuba : toa'.",
    must: [/gradation|astmevaheldus/i], why: "gradation" },
  { q: "How do you say 'I like this book' in Estonian?",
    must: [/mulle/i, /meeldib/i], why: "meeldima construction" },
  { q: "What is the partitive plural of 'raamat'?",
    must: [/raamatuid/i], why: "irregular form" },
];

// Anu's own prompt rather than a one-line stand-in, or this measures a model and not her.
const system = buildSystemPrompt("B1");
const key = process.env.ANTHROPIC_API_KEY;

/*
  THE MODEL THIS ASKS IS THE ONE THE APP WOULD ASK, WHICH IT USED NOT TO BE.

  It read `OPENROUTER_MODEL` and stopped there, where the app fell back to a
  list of free models when that was unset — and unset was the default. So on
  any deployment that had not pinned a model, every request went out as
  `"model": undefined`, came back 400, and the script printed `0/0 correct on
  undefined`. It refuses to score a refusal, so it failed honestly rather than
  reporting a model that knew nothing; but the one check there is on whether
  Anu knows any Estonian could not be run at all by the deployment shape that
  most needs it.

  Imported from `provider.ts` rather than retyped here, which is the argument
  `PROVIDER_KEY_ENV` already makes: a second copy is the same drift waiting to
  happen. That is what the `tsx` in this script's `package.json` entry buys.

  ONE MODEL RATHER THAN A CHAIN, since the free providers were withdrawn on
  2026-09-05. The walk below survives a list of one and is kept for the reason
  `openWithFallback` is: `ANTHROPIC_MODEL` takes a name, and a comma-separated
  one would still be walked.
*/
const pinned = (process.env.ANTHROPIC_MODEL ?? "")
  .split(",").map((m) => m.trim()).filter(Boolean);
const chain = pinned.length ? pinned : [DEFAULT_ANTHROPIC_MODEL];

// Six requests to be told six times that there is no key is not a measurement,
// and the answer is one line rather than a stack trace.
if (!key) {
  console.log("Set ANTHROPIC_API_KEY and run this again. It asks a real model six grammar");
  console.log("questions with known answers, so without a key there is nothing to ask.");
  console.log(`It would have asked ${chain[0]}. Set ANTHROPIC_MODEL to pin a different one.`);
  process.exit(1);
}

/*
  A REFUSAL IS NOT A WRONG ANSWER, AND THIS SCRIPT USED TO SCORE THEM THE SAME.

  It read `data.choices[0].message.content` without ever looking at the status,
  so a 429 produced an empty string, every `must` pattern failed against it,
  and the model was marked wrong six times out of six. Free models are
  rate-limited hard upstream, which means every free model measured here
  scored zero for being busy rather than for being ignorant. Those models are
  gone from the chain now (2026-09-05) and the reading survives them: a paid
  key is rate-limited too, and a 429 is still a fact about the minute rather
  than about whether the model knows Estonian.

  So: the status is read, a refusal is its own outcome and never counted as
  knowledge, and a 429 is waited out rather than recorded, because being told
  to come back in a moment is the ordinary state of a free model and not a
  fact about whether it knows Estonian.
*/
async function askOne(model, question) {
  for (let attempt = 0; attempt < 4; attempt++) {
    /*
      Anthropic's own shape, and the app's own two guards with it: thinking off
      and a ceiling with room under it. 320 tokens with adaptive thinking on is
      the empty-answer case this script already knows how to report, and it
      would have reported it as the model knowing no Estonian.
    */
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 1200,
        thinking: ANTHROPIC_THINKING,
        system,
        messages: [{ role: "user", content: question }] }),
      signal: AbortSignal.timeout(90_000),
    });
    if (res.ok) {
      const data = await res.json();
      const answer = (data.content ?? [])
        .filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      if (answer.trim()) return { answer };
      return { refused: "answered with nothing at all" };
    }
    if (res.status !== 429) {
      return { refused: `HTTP ${res.status}` };
    }
    await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
  }
  return { refused: "rate-limited on every attempt" };
}

/**
 * The same chain the app walks, for the same reason.
 *
 * `openWithFallback` moves past a link that is throttled or having a bad minute
 * rather than reporting it as the answer, and this has to agree with it or it
 * measures something a learner never meets. That mattered most when the head
 * of the chain was a free model and being busy was its ordinary state; with
 * one paid model it is a walk over a list of one, kept because the list can
 * still grow from `ANTHROPIC_MODEL`.
 *
 * Once one model has answered, every later question goes to that one, so the
 * score at the end belongs to a model rather than being a blend of three.
 */
let answering = null;

async function ask(question) {
  if (answering) return askOne(answering, question);
  let last = { refused: "no model was asked" };
  for (const model of chain) {
    const outcome = await askOne(model, question);
    if (outcome.answer) {
      answering = model;
      return outcome;
    }
    last = outcome;
  }
  return last;
}

let pass = 0;
let refused = 0;

for (const { q, must, why } of QUESTIONS) {
  const { answer, refused: why_not } = await ask(q);
  if (why_not) {
    refused++;
    console.log(`SKIP  ${why} (${why_not})`);
    continue;
  }
  const ok = must.every((re) => re.test(answer));
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${why}`);
  if (!ok) console.log(`      Q: ${q}\n      A: ${answer.replace(/\n/g, " ").slice(0, 200)}`);
}

const asked = QUESTIONS.length - refused;
// The model that answered, never the head of the chain, which is the same rule
// the chat follows when it labels a reply.
console.log(`\n${pass}/${asked} correct on ${answering ?? `${chain[0]}, which would not answer`}` +
  (refused ? `, and ${refused} it would not answer, which says nothing about what it knows.` : "."));
// A model that would not answer half its questions has not been measured.
process.exit(refused * 2 > QUESTIONS.length || pass < asked ? 1 : 0);
