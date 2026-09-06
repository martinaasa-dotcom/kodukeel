/**
 * What a composed scene turn and a question to Anu actually cost, off the
 * prompts this repository builds rather than off anybody's estimate.
 *
 *   npx tsx scripts/measure-compose.ts               (no database, no key)
 *   npx tsx scripts/measure-compose.ts --budget 5    (dollars a month)
 *
 * No check passes or fails here. This is the instrument behind the numbers in
 * `docs/21-situations.md` §16 and behind `EXPECTED_TOKENS.SCENE`, and it exists
 * because those are the numbers that decide whether composing every beat is
 * affordable at all. It reads the shipped dictionary the way `play-scene.ts`
 * does, builds every scene's real `composeSystem` and `composeLive`, and
 * builds Anu's real system prompt and learner note, so a prompt that grows is
 * a figure that moves rather than a paragraph that goes stale.
 *
 * TOKENS ARE COUNTED FROM CHARACTERS, AT A RATIO THAT WAS MEASURED RATHER THAN
 * ASSUMED. Anthropic publishes no tokenizer, so there is no way to count these
 * exactly offline and a script claiming to would be claiming more than it can.
 * What is exact here is the character count of the actual strings. The ratio
 * was taken on 2026-09-05 by running `gpt-tokenizer` over these same built
 * prompts, which is a different vendor's tokenizer and therefore a proxy:
 *
 *   compose system block   3,340 chars   917 tokens   3.64
 *   compose live block        77 chars    20 tokens   3.83
 *   Anu system prompt     10,073 chars 2,457 tokens   4.10
 *
 * The Estonian word list is the low ratio and the English prose the high one,
 * which is what you would expect and is the reason a single app-wide ratio
 * would be wrong: `estimateTokens` in `lib/usage/pricing.ts` divides by three
 * on purpose, because over-counting is the safe direction for a spend cap, and
 * this is not a spend cap. To re-derive it: `npm i --no-save gpt-tokenizer`
 * and encode the same strings.
 */
import { SCENES } from "../lib/scenes/catalogue";
import { contextFromRows, sceneLemmas, type Row } from "../lib/progress/scene";
import { composeLive, composeSystem } from "../lib/scenes/prompt";
import { buildSystemPrompt, learnerNote } from "../lib/tutor/prompt";
import { priceFor } from "../lib/usage/pricing";
import { monthlyBudgetUsd } from "../lib/usage/quota";
import { shippedDictionary } from "./lib/dictionary";

/** Measured on these prompts. See the header. */
const CHARS_PER_TOKEN = { estonianList: 3.64, prose: 4.1 };

/**
 * Anthropic's cache multipliers on the input rate, as published 2026-06 and
 * quoted in `lib/funding/facts.ts`'s own terms: writing the cache costs a
 * quarter more than reading the tokens plainly, and reading it costs a tenth.
 */
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;

const MODEL = "claude-sonnet-5";
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
/* The shipped ceiling, so running this with no argument prices what is actually enforced. */
const defaultBudget = monthlyBudgetUsd();
const budgetPerMonth = Number(arg("budget") ?? defaultBudget);

const price = priceFor(MODEL);
const inputUsd = (tokens: number, multiplier = 1) => (tokens / 1e6) * price.inputPerMTok * multiplier;
const outputUsd = (tokens: number) => (tokens / 1e6) * price.outputPerMTok;
const usd = (n: number) => `$${n.toFixed(5)}`;

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government,
}));

/*
  A conversation as the composer sees one: six exchanges is the bound
  `COMPOSE_TRANSCRIPT_TURNS` sets, and these are the lengths a real turn runs
  to rather than the 300-character cap, because nobody types the cap.
*/
const EXCHANGES = Array.from({ length: 6 }, () => ({
  heard: "Kas te soovite aja homme hommikul?",
  said: "Jah, palun, kell üheksa sobib mulle",
}));

let systemChars = 0;
let liveChars = 0;
let beats = 0;
for (const scene of SCENES) {
  const context = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)));
  const examples = [...context.scripted.values()].flatMap((lines) => lines.slice(0, 1)).slice(0, 6);
  systemChars += composeSystem({
    register: scene.register,
    words: [...context.lexicon.byLemma.keys()],
  }).length;
  for (const beat of scene.beats) {
    liveChars += composeLive({
      move: beat.move, they: beat.they, reading: "", examples, avoid: [],
    }).length;
    beats += 1;
  }
}
const cachedTokens = Math.round(systemChars / SCENES.length / CHARS_PER_TOKEN.estonianList);
const liveTokens = Math.round(liveChars / beats / CHARS_PER_TOKEN.prose);
const turnTokens = Math.round(
  EXCHANGES.flatMap((e) => [e.heard, e.said]).join("\n").length / CHARS_PER_TOKEN.estonianList,
);
/*
  The gate refuses a line over `MAX_WORDS` words and an Estonian word is about
  three tokens, so the answer is nowhere near `COMPOSE_MAX_TOKENS` and the
  ceiling costs nothing: output is billed on what comes back.
*/
const answerTokens = 45;

const firstTurn = inputUsd(cachedTokens, CACHE_WRITE) + inputUsd(liveTokens + turnTokens) + outputUsd(answerTokens);
const laterTurn = inputUsd(cachedTokens, CACHE_READ) + inputUsd(liveTokens + turnTokens) + outputUsd(answerTokens);
/*
  ONE COMPOSED TURN IS NOT ONE CALL. §6 allows one retry with the failing words
  named, and `npm run eval:scene` measured the gate withholding a first attempt
  often enough that pricing a turn as a single call would understate it by
  nearly half. 1.4 is that rounded down towards the honest side of the estimate.
*/
const CALLS_PER_TURN = 1.4;
/* Beats a run composes: the catalogue's own length, plus curveballs and asides. */
const TURNS_PER_RUN = 10;

const runUsd = (firstTurn + (TURNS_PER_RUN - 1) * laterTurn) * CALLS_PER_TURN;
const turnUsd = runUsd / TURNS_PER_RUN;
/* What every turn would cost with the word list back in the uncached block. */
const uncachedTurn = (inputUsd(cachedTokens + liveTokens + turnTokens) + outputUsd(answerTokens)) * CALLS_PER_TURN;

const anuSystem = Math.round(buildSystemPrompt("B1").length / CHARS_PER_TOKEN.prose);
const anuNote = Math.round(learnerNote({
  level: "B1",
  weakestCase: { grammCase: "PARTITIVE", accuracy: 62, total: 140 },
  unit: { title: "Kodus", subtitle: "At home", level: "A2" },
  standing: { source: "measured", skills: { reading: "B1", listening: "A2", writing: "B1" } },
  situation: "live in Estonia",
  scene: { title: "At the health centre", missed: ["say what hurts"], gaps: ["valutama"] },
}).length / CHARS_PER_TOKEN.prose);
/* A few turns of conversation and the question itself, at the length people write. */
const anuHistory = 600;
/* About two hundred words, plus a corrected sentence and a short vocabulary list. */
const anuAnswer = 340;
const anuUsd = inputUsd(anuSystem, CACHE_READ) + inputUsd(anuNote + anuHistory) + outputUsd(anuAnswer);

const perDay = budgetPerMonth / 30;
const line = (label: string, value: string) => console.log(`  ${label.padEnd(38)}${value}`);

console.log(`\nPriced at ${MODEL}: $${price.inputPerMTok}/Mtok in, $${price.outputPerMTok}/Mtok out.\n`);
console.log("A COMPOSED SCENE TURN");
line("cached block (per scene)", `${cachedTokens} tokens`);
line("live block (per turn)", `${liveTokens} tokens`);
line("conversation so far (per turn)", `${turnTokens} tokens`);
line("answer, about", `${answerTokens} tokens`);
line("first turn of a scene", usd(firstTurn));
line("every turn after it", usd(laterTurn));
line(`with ${CALLS_PER_TURN} calls a turn, one turn`, usd(turnUsd));
line(`a run of ${TURNS_PER_RUN} composed turns`, usd(runUsd));
line("the same turn with nothing cached", `${usd(uncachedTurn)}  (${(uncachedTurn / turnUsd).toFixed(1)}x)`);

console.log("\nA QUESTION TO ANU");
line("system prompt (cached)", `${anuSystem} tokens`);
line("learner note + conversation", `${anuNote + anuHistory} tokens`);
line("her answer", `${anuAnswer} tokens`);
line("one question", usd(anuUsd));

console.log(`\nWHAT $${budgetPerMonth.toFixed(2)} A MONTH BUYS ($${perDay.toFixed(4)} a day)`);
line("scene runs, if it were only scenes", `${Math.floor(budgetPerMonth / runUsd)} a month, ${Math.floor(perDay / runUsd)} a day`);
line("composed turns, likewise", `${Math.floor(budgetPerMonth / turnUsd)} a month`);
line("Anu questions, if it were only Anu", `${Math.floor(budgetPerMonth / anuUsd)} a month, ${Math.floor(perDay / anuUsd)} a day`);
console.log("");
line("at the 50/50 split ALLOWANCE sets:", "");
line("  scene runs", `${Math.floor(budgetPerMonth / 2 / runUsd)} a month, ${Math.floor(perDay / 2 / runUsd)} a day`);
line("  Anu questions", `${Math.floor(budgetPerMonth / 2 / anuUsd)} a month, ${Math.floor(perDay / 2 / anuUsd)} a day`);
console.log(
  budgetPerMonth === defaultBudget
    ? `\nThat is the shipped default. Set AI_DAILY_USD_GLOBAL to change it: it is a daily\nfigure, so a month is that over thirty.\n`
    : `\nSet AI_DAILY_USD_GLOBAL="${perDay.toFixed(2)}" for that budget.\n`,
);
