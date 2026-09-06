/**
 * Which model, at which thinking level, writes Estonian a person would say.
 *
 *   npm run eval:thinking                     # every combination a key reaches
 *   npm run eval:thinking -- --only gemini    # one family
 *
 * `eval:composers` ranks the models already on the chain against the gate, and
 * answers "which link should be at the front". This asks the question a learner
 * asked instead: what is the cheapest model that writes Estonian without
 * mistakes, and does letting it think first help. Those turn out to be two
 * knobs rather than one, so this sweeps both.
 *
 * WHAT IT CAN AND CANNOT DECIDE. `runGate` is the app's own gate and is the
 * only mechanical verdict here, and it is a floor rather than a score: it
 * catches a person disagreeing with their verb, a ma-infinitive where the
 * da-infinitive belongs, a line that is not a clause. It cannot catch a line
 * that is grammatical and not what anybody says, and no check in this
 * repository ever will. So every line is printed. The reader is the judge, and
 * on this question the reader has to be somebody who speaks Estonian.
 *
 * THE PROMPT IS THE ROUTE'S. `composeSystem` and `composeLive` are the ones
 * `app/api/scene/route.ts` sends, including the banked lines handed over for
 * tone and this beat's own for content, because a model ranked on a prompt it
 * will never be sent is a ranking for nothing. That is not a hypothetical: an
 * earlier version of this measurement sent a stripped-down prompt, concluded
 * that thinking was worth three times the money, and was wrong about both
 * halves once the real one was used.
 *
 * COST IS REPORTED IN TOKENS AND IN MONEY, and the money comes from
 * `lib/usage/pricing.ts` rather than from a number typed here, so a rate this
 * project has already checked against a vendor's page is the rate this prints.
 * A model with no row prices at `UNKNOWN_MODEL`, which is the dearest, and
 * says so: that is the ledger's own rule and it is the honest answer for a
 * model nobody has looked up.
 *
 * It talks to the providers directly and goes nowhere near `lib/usage/
 * ledger.ts`, like `eval:scene` and `eval:composers` beside it: the ledger
 * rations one learner's share of a deployment's budget, and nobody's allowance
 * is involved when a developer measures against their own key.
 */
import { PERSONAS } from "../lib/scenes/personas";
import { composeLive, composeSystem } from "../lib/scenes/prompt";
import { runGate } from "../lib/scenes/gate";
import { sceneById } from "../lib/scenes/catalogue";
import { scriptedFor } from "../lib/scenes/scripted";
import { SCENE_REPLY_TOKENS } from "../lib/tutor/provider";
import { UNKNOWN_MODEL, normaliseModel, priceFor } from "../lib/usage/pricing";
import { keylessContext } from "./lib/sceneDraft";

interface Combo {
  readonly label: string;
  readonly model: string;
  readonly url: string;
  readonly key: string;
  /** Anthropic's Messages API rather than an OpenAI-compatible one. */
  readonly anthropic?: boolean;
  /** Whatever this provider spells "think before you answer" as. */
  readonly extra?: Readonly<Record<string, unknown>>;
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const GROQ = "https://api.groq.com/openai/v1/chat/completions";

/*
  A LIST THAT LIVES IN A SCRIPT MEASURES THE SCRIPT, and this one is the
  exception the rule allows for: the whole question is which models to consider
  that are *not* on the chain today, so reading the chain would ask nothing.
  What it must not do is drift from what the app can actually be pointed at, so
  every model here is one `lib/tutor/provider.ts` would accept as a
  `*_SCENE_MODEL`, and the thinking spellings are each provider's own.
*/
function combos(): Combo[] {
  const out: Combo[] = [];
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const groq = process.env.GROQ_API_KEY;

  if (gemini) {
    /*
      The whole flash family, plus the lite tier and one pro as the ceiling to
      measure the cheap ones against. Thinking is swept only where a model has
      the knob and the cheap tiers are swept hardest, because the question is
      how far down the price list the language survives.
    */
    for (const model of ["gemini-3.8-flash"]) {
      out.push({ label: `${model} think:default`, model, url: GEMINI, key: gemini });
      out.push({ label: `${model} think:none`, model, url: GEMINI, key: gemini, extra: { reasoning_effort: "none" } });
    }
    for (const model of ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"]) {
      out.push({ label: `${model} think:default`, model, url: GEMINI, key: gemini });
      out.push({ label: `${model} think:none`, model, url: GEMINI, key: gemini, extra: { reasoning_effort: "none" } });
    }
    out.push({ label: "gemini-pro-latest think:default", model: "gemini-pro-latest", url: GEMINI, key: gemini });
  }
  if (anthropic) {
    for (const model of ["claude-haiku-4-5-20251001", "claude-sonnet-5"]) {
      out.push({ label: `${model} think:off`, model, url: ANTHROPIC, key: anthropic, anthropic: true });
    }
  }
  if (groq) {
    // The incumbent, as the baseline every candidate has to beat, and the
    // cheapest thing Groq serves that answered at all in an earlier pass.
    for (const model of ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
      out.push({ label: `${model} think:default`, model, url: GROQ, key: groq });
    }
  }
  return out;
}

/*
  Twelve beats across ten scenes, spread over the moves a scene actually makes:
  what is wrong, since when, where to, which floor, what to order, when you
  could start. One sample each, because the question this answers is whether a
  model writes the language at all, and a model that does not shows it in
  twelve lines.
*/
const BEATS: readonly (readonly [string, string])[] = [
  ["apteek", "what"], ["apteek", "since"], ["bussipilet", "where"],
  ["trepikoda", "floor"], ["trepikoda", "from"], ["restoranis-tellimine", "order"],
  ["toovestlus", "start"], ["kaebus", "want"], ["uuri-remont", "where"],
  ["helistamine", "what"], ["keeletund", "why"], ["ametiasutus", "what"],
];

const only = (() => {
  const at = process.argv.indexOf("--only");
  return at >= 0 ? process.argv[at + 1] ?? "" : "";
})();

/** The prompt for one beat, exactly as `app/api/scene/route.ts` builds it. */
function promptFor(sceneId: string, beatId: string) {
  const scene = sceneById(sceneId)!;
  const context = keylessContext(scene);
  const beat = scene.beats.find((one) => one.id === beatId) ?? scene.beats[1]!;
  const system = composeSystem({
    scene: scene.title, place: scene.place, persona: PERSONAS[0]!.who, situation: scene.role,
    register: scene.register, words: [...context.lexicon.byLemma.keys()],
  });
  const live = composeLive({
    move: beat.move,
    they: beat.they,
    reading: "",
    examples: scene.beats
      .filter((one) => one.id !== beat.id)
      .flatMap((one) => scriptedFor(scene, one).slice(0, 1))
      .slice(0, 6),
    asked: scriptedFor(scene, beat).slice(0, 2),
    avoid: [],
  });
  return { beat, context, system, live };
}

interface Answer {
  readonly text: string;
  readonly inTokens: number;
  readonly outTokens: number;
  readonly why: string;
}

async function ask(combo: Combo, system: string, live: string): Promise<Answer> {
  /*
    One exchange in front of the ask, because the route never composes on an
    empty conversation: it composes in answer to a turn, and a model shown no
    turn writes a different kind of line. Groq's template also refuses a
    request with no user message at all.
  */
  const turns = [
    { role: "assistant" as const, content: "Tere!" },
    { role: "user" as const, content: "tere" },
    { role: "user" as const, content: "Your line:" },
  ];
  const headers: Record<string, string> = combo.anthropic
    ? {
      "content-type": "application/json",
      "x-api-key": combo.key,
      "anthropic-version": "2023-06-01",
      ...(process.env.ANTHROPIC_WORKSPACE_ID
        ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
        : {}),
    }
    : { "content-type": "application/json", authorization: `Bearer ${combo.key}` };

  const body = combo.anthropic
    ? {
      model: combo.model,
      max_tokens: SCENE_REPLY_TOKENS,
      system: `${system}\n\n${live}`,
      messages: [{ role: "user", content: "(the conversation so far)" }, ...turns],
      ...combo.extra,
    }
    : {
      model: combo.model,
      max_tokens: SCENE_REPLY_TOKENS,
      messages: [{ role: "system", content: `${system}\n\n${live}` }, ...turns],
      ...combo.extra,
    };

  const res = await fetch(combo.url, { method: "POST", headers, body: JSON.stringify(body) });
  // The provider's own JSON, whose shape differs per provider and is read below.
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    return { text: "", inTokens: 0, outTokens: 0, why: `HTTP ${res.status} ${JSON.stringify(json).slice(0, 110)}` };
  }
  const usage = (json.usage ?? {}) as Record<string, number>;
  const text = combo.anthropic
    ? ((json.content as { type: string; text?: string }[] | undefined) ?? [])
      .find((part) => part.type === "text")?.text ?? ""
    : ((json.choices as { message?: { content?: string } }[] | undefined) ?? [])[0]?.message?.content ?? "";
  return {
    text: text.trim().split("\n").filter(Boolean)[0] ?? "",
    inTokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
    outTokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
    why: "",
  };
}

/** Dollars for one line at the app's own rates, and whether the rate is real. */
function costOf(model: string, inTokens: number, outTokens: number) {
  const price = priceFor(model);
  const guessed = price.inputPerMTok === UNKNOWN_MODEL.inputPerMTok
    && price.outputPerMTok === UNKNOWN_MODEL.outputPerMTok;
  const usd = (inTokens * price.inputPerMTok + outTokens * price.outputPerMTok) / 1_000_000;
  return { usd, guessed, priced: normaliseModel(model) };
}

async function main() {
  const chosen = combos().filter((one) => !only || one.label.includes(only));
  if (chosen.length === 0) {
    console.log("No provider key is set, so there is nothing to compare.");
    return;
  }
  console.log(`\n${chosen.length} combinations x ${BEATS.length} beats. Every line is printed: the`);
  console.log("gate is a floor, not a score, and only a person can say whether a line is Estonian.\n");

  const summary: string[] = [];
  for (const combo of chosen) {
    console.log(`\n### ${combo.label}`);
    let inTokens = 0;
    let outTokens = 0;
    let answered = 0;
    let refused = 0;
    let empty = 0;
    for (const [sceneId, beatId] of BEATS) {
      const { beat, context, system, live } = promptFor(sceneId, beatId);
      const answer = await ask(combo, system, live).catch(
        (error: unknown) => ({ text: "", inTokens: 0, outTokens: 0, why: String(error).slice(0, 80) }),
      );
      if (answer.why) {
        console.log(`  ${sceneId}/${beatId}: (${answer.why})`);
        continue;
      }
      answered += 1;
      inTokens += answer.inTokens;
      outTokens += answer.outTokens;
      if (!answer.text) {
        empty += 1;
        console.log(`  ${sceneId}/${beatId}: (nothing but thinking)`);
        continue;
      }
      const verdict = runGate(answer.text, beat, { ...context.gate, vouched: () => true });
      if (verdict.failed.length > 0) refused += 1;
      const note = verdict.failed.length > 0 ? `   <gate: ${verdict.failed.join(",")}>` : "";
      console.log(`  ${sceneId}/${beatId}: ${answer.text}${note}`);
    }
    const per = Math.max(answered, 1);
    const cost = costOf(combo.model, inTokens / per, outTokens / per);
    const line = [
      combo.label.padEnd(38),
      `answered ${String(answered).padStart(2)}/${BEATS.length}`,
      `refused ${String(refused).padStart(2)}`,
      `empty ${String(empty).padStart(2)}`,
      `in/line ${String(Math.round(inTokens / per)).padStart(5)}`,
      `out/line ${String(Math.round(outTokens / per)).padStart(5)}`,
      `$${cost.usd.toFixed(5)}/line${cost.guessed ? " (no rate on file)" : ""}`,
    ].join("  ");
    console.log(`  ${line}`);
    summary.push(line);
  }

  console.log("\n\n=== SUMMARY ===\n");
  for (const line of summary) console.log(line);
  console.log("\nRates are lib/usage/pricing.ts. A combination with no rate on file prices at");
  console.log("UNKNOWN_MODEL, which is the dearest row and the honest answer for a model");
  console.log("nobody has looked up.");
}

void main();
