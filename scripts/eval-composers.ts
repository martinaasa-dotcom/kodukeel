/**
 * Which free model writes the best Estonian for a scene line, measured.
 *
 *   npm run eval:composers                      # every free model with a key
 *   npm run eval:composers -- --samples 3
 *   npm run eval:composers -- --model gemini-3.6-flash
 *
 * `eval:scene` asks what share of composed lines the gate withholds, over the
 * whole chain, and answers a question about the gate and the course. This asks
 * a different question with the same instrument: given the chain is what it
 * is, which link should be at the front of it. So it forces one model at a
 * time, which `eval:scene` deliberately does not do (a single model measures a
 * rate limit rather than a gate), and it reports per model rather than in
 * total.
 *
 * IT REPLICATES THE ROUTE'S PROMPT RATHER THAN THE EVAL'S. `scripts/lib/
 * sceneDraft.ts` carries the prompt the drafter and the rejection-rate eval
 * share, and it is not the one production sends: the route merges system and
 * live into one system message, hands the banked lines of the scene's other
 * beats over for tone, sets no temperature and allows 1200 tokens. A model
 * ranked on a prompt it will never be sent is a ranking for nothing, so the
 * prompt below is `compose` in `app/api/scene/route.ts`, kept in step with it.
 *
 * The judging is the shipped gate (`lib/scenes/gate.ts`) and nothing else
 * decides pass or fail, for the reason `eval:scene` reads the same module: a
 * number measured against a check that is not going to ship is a number about
 * the script. What is added beside the verdict is diagnostic rather than
 * scoring, and each is a way a line is unusable that the gate is not built to
 * see: English in the output, markdown, more than one sentence, a translation
 * offered after the line.
 *
 * It talks to the providers directly and goes nowhere near `lib/usage/
 * ledger.ts`, like `eval-scene.ts` and `eval-anu.mjs` beside it: the ledger
 * rations one learner's share of a deployment's budget, and nobody's allowance
 * is involved when a developer measures against their own key.
 *
 * Every call is written to a JSONL file as it lands, so a run that dies on a
 * rate limit halfway is still worth what it already spent, and the reading of
 * the transcripts is done over the file rather than by asking again.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { COMPOSE_SYSTEM, composeLive } from "../lib/scenes/prompt";
import { runGate, type Check } from "../lib/scenes/gate";
import { SCENES } from "../lib/scenes/catalogue";
import { scriptedFor } from "../lib/scenes/scripted";
import { stageFor } from "../lib/scenes/reply";
import { words } from "../lib/scenes/lexicon";
import type { BeatSpec, SceneSpec } from "../lib/scenes/types";
import {
  FREE_GEMINI_MODELS, FREE_GROQ_MODELS, FREE_OPENROUTER_MODELS,
} from "../lib/tutor/provider";
import { keylessContext, lacksFiniteVerb } from "./lib/sceneDraft";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const SAMPLES = Number(arg("samples", "2"));
const ONLY_MODEL = process.argv.includes("--model") ? arg("model", "") : "";
const OUT = arg("out", "/tmp/composers.jsonl");

/*
  Three scenes rather than fourteen, and these three.

  A level each and both registers: `poodi-piima` is A1 and the only `sina`
  scene in the catalogue, `arsti-aeg` is A2 at a health centre, `uuri-remont`
  is B1 and the one whose beats need a time and a day off the role card. Twenty
  beats between them, which at two samples is forty calls per model, and the
  point of forty rather than four is that a free tier's behaviour under a burst
  is one of the things being measured.
*/
const SCENE_IDS = arg("scenes", "poodi-piima,arsti-aeg,uuri-remont").split(",");

/** Every free model of every provider whose key is set, one link each. */
interface Link { provider: string; model: string; url: string; key: string }
function links(): Link[] {
  const out: Link[] = [];
  const add = (provider: string, url: string, keyEnv: string, models: readonly string[]) => {
    const key = process.env[keyEnv];
    if (!key) return;
    for (const model of models) out.push({ provider, model, url, key });
  };
  add("OpenRouter", "https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY", FREE_OPENROUTER_MODELS);
  add("Groq", "https://api.groq.com/openai/v1/chat/completions", "GROQ_API_KEY", FREE_GROQ_MODELS);
  add("Gemini", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "GEMINI_API_KEY", FREE_GEMINI_MODELS);
  return out.filter((l) => !ONLY_MODEL || l.model === ONLY_MODEL);
}

/**
 * The prompt `compose` in `app/api/scene/route.ts` sends, with no conversation
 * behind it.
 *
 * READ FROM `lib/scenes/prompt.ts` RATHER THAN COPIED. This said "character for
 * character, with `said` empty" and then wrote the prompt out again, which is
 * the fault this file's own header warns about one paragraph up: a list that
 * lives in a script measures the script. A copy is character for character on
 * the day it is written and is a different prompt the first time the route's
 * wording moves, and the measurement then ranks models on something nobody is
 * ever sent. The module is pure, so a script may import it.
 *
 * The conversation is empty rather than invented here: what a learner said
 * before this beat is a variable, and one made up for the measurement would be
 * a variable every model is judged under without any of them having earned it.
 * The opening state is the one state every beat genuinely has in common.
 */
function promptFor(scene: SceneSpec, beat: BeatSpec, lemmas: readonly string[]) {
  const examples = scene.beats
    .filter((b) => b.id !== beat.id)
    .flatMap((b) => scriptedFor(scene, b).slice(0, 1))
    .slice(0, 6);

  const live = composeLive({
    move: beat.move,
    they: stageFor(beat, null),
    register: scene.register,
    reading: "",
    words: lemmas,
    examples,
    avoid: [],
  });

  return { system: `${COMPOSE_SYSTEM}\n\n${live}`, user: "Your line:" };
}

/* ------------------------------------------------------------------ *
 * The four things the gate is not built to see, each a way a line is
 * unusable on a card whatever the four checks say.
 * ------------------------------------------------------------------ */

/**
 * An English word in an Estonian line.
 *
 * Deliberately a small closed list of function words rather than a dictionary
 * lookup: an English content word is often a loan Estonian also has, and
 * `test`, `bussi` and `probleem` would each be flagged by a wider net. What
 * these catch is the shape that actually happens, a model answering in English
 * or appending a gloss, and every one of them is a word no Estonian sentence
 * contains.
 */
const ENGLISH = new Set([
  "the", "is", "are", "you", "your", "what", "would", "with", "for", "and", "have",
  "this", "that", "please", "can", "i", "we", "it", "to", "of", "do", "does", "here",
]);
const drifted = (text: string) => words(text).filter((w) => ENGLISH.has(w));

/** Markdown the prompt forbids: emphasis, a fence, a bullet, a heading. */
const markdown = (text: string) => /\*\*|__|```|^\s*[-*+]\s|^#{1,6}\s/m.test(text);

/** More than one sentence, which the prompt forbids and the card has no room for. */
function sentences(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
}

/**
 * A translation offered after the line, which is the commonest way a model
 * obeys "one sentence" and breaks "nothing else": a parenthetical, a line
 * break, or a dash with English behind it.
 */
const translated = (text: string) =>
  /\((?=[^)]*[a-z]{3})[^)]*\)/i.test(text) && drifted(text).length > 0
  || (/\n/.test(text) && drifted(text).length > 0);

interface Row {
  provider: string; model: string; scene: string; beat: string; sample: number;
  status: number; ms: number; text: string;
  /** How long this call spent waiting out a 429, and how many it hit. */
  waited: number; rateLimits: number;
  failed: Check[]; unknown: string[];
  english: string[]; markdown: boolean; sentences: number; translated: boolean;
  noFiniteVerb: boolean; wordCount: number;
}

/**
 * How long to wait out a 429, and how many times.
 *
 * The first version of this fired forty calls back to back with no pacing and
 * reported that two of Groq's three models refused every one of them. They had
 * not: Groq's free tier limits requests per minute, all three answered a probe
 * a minute later, and what had been measured was the harness. A rate limit a
 * caller walks into by bursting is a fact about the caller, and reporting it as
 * a fact about the model is how a measurement produces the wrong reordering.
 *
 * So a 429 is waited out rather than counted as a refusal, and both numbers are
 * kept: whether the model eventually answered, which is about the model, and
 * how much waiting it took, which is about the tier. `Retry-After` is honoured
 * where the provider sends one, because a guess is worse than the answer.
 */
const RETRIES = 4;
const BACKOFF_MS = [2_000, 6_000, 15_000, 30_000];
/**
 * How long to leave between calls, and why it is not one second.
 *
 * Groq's free tier binds on TOKENS per minute rather than requests: the live
 * headers read `x-ratelimit-limit-tokens: 8000` against
 * `x-ratelimit-limit-requests: 1000`, so what runs out is the token budget and
 * it runs out first. A scene prompt is large because the word list *is* the
 * prompt, a few hundred lemmas, and the route reserves `max_tokens: 1200` on
 * top; at roughly 2,200 tokens a call that is about three calls a minute.
 * Pacing at one a second therefore measured the harness again, one layer below
 * where the first version did.
 *
 * So the pace is a flag with a default per provider, and the number for each
 * came off that provider's own headers rather than a guess.
 */
const PACE_MS = Number(arg("pace", "0"));
const DEFAULT_PACE: Record<string, number> = {
  // 8,000 tokens a minute against ~2,200 a call.
  Groq: 18_000,
  // Requests per minute, and generous: measured comfortable at one a second.
  Gemini: 1_500,
  OpenRouter: 3_000,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Answer { status: number; text: string; ms: number; waited: number; rateLimits: number }

async function ask(link: Link, system: string, user: string): Promise<Answer> {
  let waited = 0;
  let rateLimits = 0;
  let status = 0;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(link.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${link.key}`,
          ...(link.provider === "OpenRouter"
            ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Kodukeel Estonian study" }
            : {}),
        },
        // The route's own body, minus the stream: what is judged here is the
        // finished line, and a stream would only add a reassembly step.
        body: JSON.stringify({
          model: link.model,
          max_tokens: 1200,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const ms = Date.now() - started;
      status = res.status;

      if (res.status === 429 && attempt < RETRIES) {
        rateLimits++;
        /*
          `retry-after` where a provider sends one, and Groq's own
          `x-ratelimit-reset-tokens` where it does not: Groq answers a 429 with
          the seconds until the token bucket refills, in its own spelling
          ("47.655s"), and waiting exactly that long is the difference between
          one wait and four.
        */
        const header = Number(res.headers.get("retry-after"));
        const tokens = /^([\d.]+)s$/.exec(res.headers.get("x-ratelimit-reset-tokens") ?? "");
        const pause = Number.isFinite(header) && header > 0
          ? Math.min(header * 1_000, 60_000)
          : tokens
            ? Math.min(Number(tokens[1]) * 1_000 + 1_000, 70_000)
            : BACKOFF_MS[attempt]!;
        waited += pause;
        await sleep(pause);
        continue;
      }
      if (!res.ok) return { status, text: "", ms, waited, rateLimits };

      const data = await res.json() as { choices?: { message?: { content?: string } }[] };
      return { status: 200, text: (data.choices?.[0]?.message?.content ?? "").trim(), ms, waited, rateLimits };
    } catch {
      // A timeout and a dropped socket are the same fact about the free tier.
      if (attempt >= RETRIES) return { status: 0, text: "", ms: Date.now() - started, waited, rateLimits };
      await sleep(BACKOFF_MS[attempt]!);
      waited += BACKOFF_MS[attempt]!;
    }
  }
  return { status, text: "", ms: 0, waited, rateLimits };
}

async function main() {
  const chain = links();
  if (chain.length === 0) {
    console.log("No free provider key is set, so there is nothing to measure.");
    console.log("Set OPENROUTER_API_KEY, GROQ_API_KEY or GEMINI_API_KEY.");
    return;
  }
  const scenes = SCENES.filter((s) => SCENE_IDS.includes(s.id));
  const beats = scenes.reduce((n, s) => n + s.beats.length, 0);
  mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });

  console.log(`\n${chain.length} models, ${scenes.length} scenes, ${beats} beats, ${SAMPLES} samples each`);
  console.log(`= ${chain.length * beats * SAMPLES} calls. Writing every one to ${OUT}\n`);

  for (const link of chain) {
    const rows: Row[] = [];
    const t0 = Date.now();
    for (const scene of scenes) {
      const { lexicon, gate } = keylessContext(scene);
      const lemmas = [...lexicon.byLemma.keys()];
      for (const beat of scene.beats) {
        const { system, user } = promptFor(scene, beat, lemmas);
        for (let sample = 0; sample < SAMPLES; sample++) {
          const { status, text, ms, waited, rateLimits } = await ask(link, system, user);
          await sleep(PACE_MS || DEFAULT_PACE[link.provider] || 2_000);
          const verdict = text ? runGate(text, beat, gate) : null;
          const row: Row = {
            provider: link.provider, model: link.model, scene: scene.id, beat: beat.id, sample,
            status, ms, text, waited, rateLimits,
            failed: verdict ? [...verdict.failed] : [],
            unknown: verdict ? [...verdict.unknown] : [],
            english: drifted(text), markdown: markdown(text), sentences: sentences(text),
            translated: translated(text),
            noFiniteVerb: text ? lacksFiniteVerb(text, beat) : false,
            wordCount: words(text).length,
          };
          // Appended as it lands rather than at the end of the model: a run
          // that dies on a daily cap halfway through has still spent what it
          // spent, and the reading is done over the file.
          rows.push(row);
          appendFileSync(OUT, JSON.stringify(row) + "\n");
        }
      }
    }

    const answered = rows.filter((r) => r.status === 200 && r.text);
    const clean = answered.filter((r) => r.failed.length === 0);
    const secs = Math.round((Date.now() - t0) / 1000);
    const median = answered.length
      ? answered.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(answered.length / 2)]
      : 0;
    const statuses = new Map<number, number>();
    for (const r of rows) if (r.status !== 200) statuses.set(r.status, (statuses.get(r.status) ?? 0) + 1);
    console.log(
      `${link.model.padEnd(36)} answered ${String(answered.length).padStart(2)}/${rows.length}` +
      `  passed gate ${String(clean.length).padStart(2)}` +
      `  median ${String(median).padStart(5)}ms  ${secs}s` +
      `  429s ${rows.reduce((n, r) => n + r.rateLimits, 0)}` +
      (statuses.size ? `  [${[...statuses].map(([s, n]) => `${s}x${n}`).join(" ")}]` : ""),
    );
  }
  console.log(`\nDone. Read ${OUT}.\n`);
}

main();
