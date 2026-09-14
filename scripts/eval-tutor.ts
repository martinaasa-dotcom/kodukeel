/**
 * Does Anu know Estonian, and does the model in front of her have to be the
 * dearest one in the app?
 *
 *   npm run eval:anu                 # every provider a key reaches
 *   npm run eval:anu -- --only gemini
 *
 * Six grammar questions with a fact the answer has to contain, because a wrong
 * grammar explanation is worse than none: the learner acts on it and the
 * scheduler then drills what they took away. That part is the old
 * `scripts/eval-anu.mjs` and is unchanged in substance.
 *
 * WHAT CHANGED IS WHO IT CAN ASK. That file posted to one gateway itself and
 * could only ever measure that gateway, which by its own header meant measuring
 * free models being rate-limited rather than being ignorant. Anu's chain is
 * Groq, the app can be pointed at any provider, and a comparison that
 * cannot reach them answers nothing. This goes through `openWithFallback`, the
 * transport the route uses, so what is measured is the call the app makes:
 * that is the rule `eval-grader.ts` states about itself and the reason it
 * deleted its own two shims.
 *
 * THREE THINGS ARE COUNTED AND ONLY THE FIRST IS ABOUT KNOWING ESTONIAN.
 *
 *  - The facts, as above.
 *  - Estonian the dictionary cannot vouch for, through `chatEstonianTokens`,
 *    which is the check the chat itself runs (ADR-005 amendment 2). A model
 *    that explains the partitive correctly and invents `raamatuid` in passing
 *    is not cheaper, it is wrong in the one place this app promises not to be.
 *  - The tells in `lib/copy/voice.ts`, because Anu is held to the same voice as
 *    every screen and a model that writes brochure English is one whose replies
 *    a learner stops reading.
 *
 * Cost comes from `lib/usage/pricing.ts`, so a rate this project has already
 * checked against a vendor's page is the rate this prints.
 */
import { findTells } from "../lib/copy/voice";
import { buildSystemPrompt, learnerNote } from "../lib/tutor/prompt";
import { chatEstonianTokens } from "../lib/tutor/verify";
import { openWithFallback, TUTOR_REPLY_TOKENS, type ProviderConfig } from "../lib/tutor/provider";
import { UNKNOWN_MODEL, priceFor } from "../lib/usage/pricing";

const QUESTIONS = [
  {
    q: "Why is it 'Lugesin raamatut' and not 'Lugesin raamatu'?",
    must: [/partitiv|osastav/i], why: "object case / aspect",
  },
  {
    q: "What case does 'aitama' take? Give an example.",
    must: [/partitiv|osastav/i, /aitan/i], why: "verb government",
  },
  {
    q: "Which case is 'toas' and what is its dictionary form?",
    must: [/inessive|seesütlev/i, /tuba/i], why: "case identification",
  },
  {
    q: "Explain the consonant gradation in 'tuba : toa'.",
    must: [/gradation|astmevaheldus/i], why: "gradation",
  },
  {
    q: "How do you say 'I like this book' in Estonian?",
    must: [/mulle/i, /meeldib/i], why: "meeldima construction",
  },
  {
    q: "What is the partitive plural of 'raamat'?",
    must: [/raamatuid/i], why: "irregular form",
  },
] as const;

function flag(name: string): string {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] ?? "" : "";
}
const only = flag("--only");
/*
 * `--effort low` puts every Groq link on that setting, sent as `reasoning_effort`
 * exactly as the route sends it (`ProviderConfig.reasoning`), so a cheaper
 * setting is measured through the app's own transport before anybody pins it.
 * Six questions is a thin instrument, so `--runs 3` is how a difference of one
 * fact is told from noise. The 2026-09-14 figures are on the field itself.
 */
const effort = flag("--effort") as ProviderConfig["reasoning"] | "";
const runs = Math.max(1, Number(flag("--runs") || 1));
if (effort && effort !== "none" && effort !== "low") {
  console.error(`--effort takes a value the chain may carry, not ${JSON.stringify(effort)}.`);
  process.exit(1);
}
/*
 * The route sends the learner's block after the static prompt and caps the
 * reply at `TUTOR_REPLY_TOKENS`; a harness that sent neither measured a
 * different call. The level is the middle of the scale, which is what the
 * route tells her when it could not read the learner's own log.
 */
const LIVE = learnerNote({ level: "B1", weakestCase: null, unit: null, scene: null });

function candidates(): ProviderConfig[] {
  const out: ProviderConfig[] = [];
  if (process.env.ANTHROPIC_API_KEY) {
    // The one Anu runs on today, and the cheaper sibling nobody has compared to it.
    out.push({ name: "anthropic", model: "claude-sonnet-5", label: "Anthropic" });
    out.push({ name: "anthropic", model: "claude-haiku-4-5", label: "Anthropic" });
  }
  if (process.env.GEMINI_API_KEY) {
    out.push({ name: "gemini", model: "gemini-3.8-flash", label: "Google Gemini" });
    out.push({ name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini" });
    out.push({ name: "gemini", model: "gemini-2.5-flash", label: "Google Gemini" });
    out.push({ name: "gemini", model: "gemini-2.5-flash-lite", label: "Google Gemini" });
  }
  if (process.env.GROQ_API_KEY) {
    const reasoning = effort ? { reasoning: effort } : {};
    out.push({ name: "groq", model: "openai/gpt-oss-120b", label: "Groq", ...reasoning });
    out.push({ name: "groq", model: "openai/gpt-oss-20b", label: "Groq", ...reasoning });
  }
  return out.filter((one) => !only || one.model.includes(only) || one.name.includes(only));
}

interface Tally {
  asked: number;
  right: number;
  missed: string[];
  unverified: string[];
  tells: string[];
  inTokens: number;
  outTokens: number;
  errors: string[];
}

async function askOne(config: ProviderConfig, system: string, question: string) {
  let text = "";
  let inTokens = 0;
  let outTokens = 0;
  const open = await openWithFallback(
    [config],
    system,
    [{ role: "user", content: question }],
    (usage) => { inTokens = usage.inputTokens; outTokens = usage.outputTokens; },
    LIVE,
    TUTOR_REPLY_TOKENS,
  );
  for await (const chunk of open.chunks) text += chunk;
  return { text, inTokens, outTokens };
}

async function main() {
  const chosen = candidates();
  if (chosen.length === 0) {
    console.log("No provider key is set, so there is nothing to ask.");
    return;
  }
  const system = buildSystemPrompt();
  console.log(`\n${chosen.length} models x ${QUESTIONS.length} questions x ${runs} run(s), through the route's own`);
  console.log(`transport and Anu's own prompt${effort ? `, at reasoning effort ${JSON.stringify(effort)}` : ""}.\n`);

  const summary: string[] = [];
  for (const config of chosen) {
    const tally: Tally = {
      asked: 0, right: 0, missed: [], unverified: [], tells: [], inTokens: 0, outTokens: 0, errors: [],
    };
    let visibleChars = 0;
    console.log(`\n### ${config.model}   (${config.name})`);
    for (const item of Array.from({ length: runs }, () => QUESTIONS).flat()) {
      try {
        const answer = await askOne(config, system, item.q);
        tally.asked += 1;
        tally.inTokens += answer.inTokens;
        tally.outTokens += answer.outTokens;
        visibleChars += answer.text.length;
        const ok = item.must.every((pattern) => pattern.test(answer.text));
        if (ok) tally.right += 1;
        else tally.missed.push(item.why);
        for (const token of chatEstonianTokens(answer.text)) tally.unverified.push(token);
        for (const tell of findTells(answer.text)) tally.tells.push(tell.name);
        console.log(`  ${ok ? "ok  " : "MISS"}  ${item.why}: ${answer.text.replace(/\s+/g, " ").slice(0, 110)}`);
      } catch (error) {
        tally.errors.push(String(error).slice(0, 70));
        console.log(`  ERR   ${item.why}: ${String(error).slice(0, 70)}`);
      }
    }
    const per = Math.max(tally.asked, 1);
    const price = priceFor(config.model);
    const guessed = price.inputPerMTok === UNKNOWN_MODEL.inputPerMTok
      && price.outputPerMTok === UNKNOWN_MODEL.outputPerMTok;
    const usd = (tally.inTokens / per * price.inputPerMTok
      + tally.outTokens / per * price.outputPerMTok) / 1_000_000;
    const line = [
      `${config.model} (${config.name})`.padEnd(38),
      `facts ${tally.right}/${QUESTIONS.length * runs}`,
      `unverified ${String(tally.unverified.length).padStart(2)}`,
      `tells ${String(tally.tells.length).padStart(2)}`,
      // Billed output against what reached the screen: the gap is reasoning nobody reads.
      `out/answer ${String(Math.round(tally.outTokens / per)).padStart(4)} (~${Math.round(visibleChars / per / 4)} visible)`,
      `$${(usd * 1_000).toFixed(2)}/1k answers${guessed ? " (no rate on file)" : ""}`,
    ].join("  ");
    console.log(`  ${line}`);
    if (tally.missed.length > 0) console.log(`    missed: ${tally.missed.join(", ")}`);
    if (tally.unverified.length > 0) console.log(`    unverified Estonian: ${[...new Set(tally.unverified)].join(" ")}`);
    if (tally.tells.length > 0) console.log(`    voice tells: ${[...new Set(tally.tells)].join(", ")}`);
    if (tally.errors.length > 0) console.log(`    errors: ${[...new Set(tally.errors)].join(" | ")}`);
    summary.push(line);
  }
  console.log("\n\n=== SUMMARY ===\n");
  for (const line of summary) console.log(line);
  console.log("\nA fact missed is a wrong grammar explanation, which is worse than none: the");
  console.log("learner acts on it and the scheduler drills what they took away. Unverified");
  console.log("Estonian is what the chat's own notice would flag to the reader (ADR-005");
  console.log("amendment 2), and a tell is a phrase lib/copy/voice.ts bans on every screen.");
}

void main();
