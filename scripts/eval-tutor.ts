/**
 * Does Anu know Estonian, does she teach it the way the app asks, and does the
 * model in front of her have to be the dearest one in the app?
 *
 *   npm run eval:anu                       # every model a key reaches
 *   npm run eval:anu -- --only gpt-oss-120b --runs 3
 *   npm run eval:anu -- --q correct        # one kind, or one id: --q c4
 *   npm run eval:anu -- --effort low       # a Groq reasoning setting, sent as the route sends it
 *   npm run eval:anu -- --no-ground        # without the dictionary's forms for the question's words
 *
 * THIRTY-SEVEN QUESTIONS RATHER THAN SIX, because six grammar facts measured
 * whether a model knows Estonian and nothing about whether it teaches the way
 * the prompt asks. The first wide run found what six could not: a FIX: line
 * under a question that had no sentence to correct on nine answers in
 * thirty-one, two VOCAB lines an answer with a third of them inflected forms,
 * italics on every other answer, a correct sentence "corrected" twice over,
 * and fourteen cases of `jalg` with eleven of them wrong, built on a genitive
 * the model guessed. Every one of those is counted now, and the grounding
 * that fixed the last one (`lib/tutor/words.ts`) was measured through this.
 *
 * Seven kinds. `fact` is the old six and eleven more, each with a fact the
 * answer has to contain; `correct` is a learner's sentence, where the FIX:
 * line has to carry the right form or, on a sentence that was right, change
 * nothing; `short` is a question whose answer is one line and is held to a
 * word count; `honest` asks for forms in bulk, where inventing is easiest;
 * `vocab` asks for words and expects VOCAB: lines; `estonian` asks in
 * Estonian; `history` asks a follow-up that names its word one turn back;
 * `level` briefs an A1 learner.
 *
 * EVERYTHING GOES THROUGH THE ROUTE'S OWN CALL: `openWithFallback`, the
 * system prompt, the learner's block, the dictionary's forms for the words in
 * the question (off the shipped file, since a harness has no database), the
 * reply cap, and `ProseStream` over the answer, because what is measured has
 * to be the answer a learner reads. Estonian in the answer is vouched against
 * `prisma/data/forms/`, exact spelling, which is stricter than the chat's own
 * trailing check and is the point: a harness may hold the model to more than
 * the screen can.
 *
 * Cost comes from `lib/usage/pricing.ts`, so a rate this project has already
 * checked against a vendor's page is the rate this prints; a cached share the
 * provider reports is priced at the cache rate.
 */
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { findTells } from "../lib/copy/voice";
import { buildSystemPrompt, learnerNote, type LearnerNote } from "../lib/tutor/prompt";
import { ProseStream } from "../lib/tutor/humanize";
import { fixFrom, vocabFrom, TAGGED_LINE } from "../lib/tutor/markers";
import { parseReply, plainText } from "../lib/tutor/markdown";
import { parseShard, lemmasOfForm, type Shard } from "../lib/dict/forms";
import { SHARD_DIR, shardKey } from "../lib/dict/formsLayout";
import { fold } from "../lib/estonian/fold";
import { openWithFallback, TUTOR_REPLY_TOKENS, type ProviderConfig, type ChatMessage } from "../lib/tutor/provider";
import { estimateCostMicros } from "../lib/usage/pricing";
import { ENGLISH_FUNCTION_WORDS, wordsNote } from "../lib/tutor/words";
import { shippedWordsInQuestion } from "./lib/shippedWords";
const GROUND = !process.argv.includes("--no-ground");

const ROOT = process.cwd();
const shards = new Map<string, Shard>();
async function exactForm(word: string): Promise<boolean> {
  const w = word.toLowerCase();
  const key = shardKey(fold(w));
  let s = shards.get(key);
  if (!s) {
    try {
      s = parseShard(gunzipSync(await readFile(path.join(ROOT, "prisma", "data", "forms", SHARD_DIR, `${key}.tsv.gz`))).toString("utf8"));
    } catch { s = new Map(); }
    shards.set(key, s);
  }
  return (s.get(fold(w)) ?? []).some((l) => l.form === w);
}

const TERMS = /\b(osastav|omastav|nimetav|sisseütlev|seesütlev|seestütlev|alaleütlev|alalütlev|alaltütlev|saav|rajav|olev|ilmaütlev|kaasaütlev|astmevaheldus|rektsioon|partitive|genitive|nominative|illative|inessive|elative|allative|adessive|ablative|translative|terminative|essive|abessive|comitative|gradation|government)\b/gi;
const SKIP = new Set(["ei", "ja", "on", "ma", "sa", "ta", "me", "te", "nad", "see", "the", "and", "a", "to", "of", "in", "is", "it", "you", "i", "or", "not", "fix", "vocab", "vs", "et", "en"]);

interface Q {
  id: string; kind: string; q: string; history?: ChatMessage[];
  must?: RegExp[]; mustNot?: RegExp[]; maxWords?: number; fix?: RegExp | "none"; vocab?: number; note?: LearnerNote;
}
const B1: LearnerNote = { level: "B1", weakestCase: null, unit: null, scene: null, standing: { source: "estimated" } };
const WEAK: LearnerNote = { ...B1, weakestCase: { grammCase: "INESSIVE", accuracy: 55, total: 40 } };
const A1: LearnerNote = { ...B1, level: "A1" };

const QUESTIONS: Q[] = [
  { id: "f1", kind: "fact", q: "Why is it 'Lugesin raamatut' and not 'Lugesin raamatu'?", must: [/partitiv|osastav/i] },
  { id: "f2", kind: "fact", q: "What case does 'aitama' take? Give an example.", must: [/partitiv|osastav/i, /aitan/i] },
  { id: "f3", kind: "fact", q: "Which case is 'toas' and what is its dictionary form?", must: [/inessive|seesütlev/i, /tuba/i] },
  { id: "f4", kind: "fact", q: "Explain the consonant gradation in 'tuba : toa'.", must: [/gradation|astmevaheldus|drops|weak|grade|disappears|falls away|lost/i] },
  { id: "f5", kind: "fact", q: "How do you say 'I like this book' in Estonian?", must: [/mulle/i, /meeldib/i] },
  { id: "f6", kind: "fact", q: "What is the partitive plural of 'raamat'?", must: [/raamatuid/i] },
  { id: "f7", kind: "fact", q: "Why is it Saksamaal and not Saksamaas?", must: [/alalütlev|adessive|outside|on top|surface|-maa/i], mustNot: [/Saksamaas is (right|correct|fine)/i] },
  { id: "f8", kind: "fact", q: "What is the short illative of 'tuba'?", must: [/tuppa/] },
  { id: "f9", kind: "fact", q: "How do I say 'I don't have time'?", must: [/mul (ei ole|pole) aega/i] },
  { id: "f10", kind: "fact", q: "What does 'Ma lähen kooli' mean, and which case is 'kooli' in?", must: [/school/i, /sisseütlev|illative/i] },
  { id: "f11", kind: "fact", q: "How do you say 'I went' from the verb 'minema'?", must: [/läksin/] },
  { id: "f12", kind: "fact", q: "Is 'kohvi' the genitive or the partitive?", must: [/both|either|same|two/i] },
  { id: "f13", kind: "fact", q: "What is the plural of 'see'?", must: [/\bneed\b/] },
  { id: "f14", kind: "fact", q: "How do you say 'with a friend'?", must: [/sõbraga/i] },
  { id: "f15", kind: "fact", q: "Why is it 'Mul on kaks last' and not 'Mul on kaks lapsed'?", must: [/partitiv|osastav/i, /singular/i] },
  { id: "f16", kind: "fact", q: "What is the genitive of 'õlu'?", must: [/õlle/] },
  { id: "f17", kind: "fact", q: "How does 'ei' work in the present tense? Give me 'I do not read'.", must: [/ma ei loe/i] },
  { id: "c1", kind: "correct", q: "Is this right: Ma elan Tallinnas ja töötan kool.", fix: /koolis/ },
  { id: "c2", kind: "correct", q: "Check my sentence: Ma tahan osta uus auto.", fix: /uue auto|uut autot/ },
  { id: "c3", kind: "correct", q: "Please correct: Ta helistas mind eile.", fix: /mulle/ },
  { id: "c4", kind: "correct", q: "Is this ok? Ma lähen Soomes homme.", fix: /Soome\b|Soomesse/ },
  { id: "c5", kind: "correct", q: "Is this correct: Ma joon kohvi.", must: [/right|correct|yes|good|fine|perfect/i], fix: "none", maxWords: 90 },
  { id: "c6", kind: "correct", q: "Is this correct: Ma olen kolm aastat Eestis elanud aga minu eesti keel on ikka halb.", must: [/right|correct|good|fine|yes/i], fix: "none", maxWords: 120 },
  { id: "s1", kind: "short", q: "How do you say Tuesday?", must: [/teisipäev/], maxWords: 45, note: WEAK, mustNot: [/seesütlev|inessive/i] },
  { id: "s2", kind: "short", q: "What's 'thank you'?", must: [/aitäh/], maxWords: 45 },
  { id: "s3", kind: "short", q: "Tere!", maxWords: 45 },
  { id: "s4", kind: "short", q: "What's the weather like in Tallinn today?", maxWords: 80 },
  { id: "h1", kind: "honest", q: "What is the partitive plural of 'käsi'?", must: [/\bkäsi\b/] },
  { id: "h2", kind: "honest", q: "Give me all fourteen cases of 'jalg' in the singular.", must: [/jala\b/, /jalga\b/] },
  { id: "h3", kind: "honest", q: "Can you give me a table of the present tense of 'olema'?", must: [/olen/, /oled/, /\bon\b/, /oleme/, /olete/], mustNot: [/\|/] },
  { id: "h4", kind: "honest", q: "Explain the whole Estonian case system to me.", maxWords: 260 },
  { id: "v1", kind: "vocab", q: "Teach me five words for things in a kitchen.", vocab: 3 },
  { id: "v2", kind: "vocab", q: "What are the days of the week?", must: [/esmaspäev/, /pühapäev/] },
  { id: "e1", kind: "estonian", q: "Kas sa saad mulle seletada, mis vahe on sõnadel 'kool' ja 'koolis'?", must: [/inside|in the school|in school|seesütlev|inessive|at school/i] },
  { id: "a1", kind: "level", q: "How do I say 'I am hungry'?", must: [/mul on kõht tühi|ma olen näljane|kõht on tühi|olen näljas|mul on nälg/i], maxWords: 90, note: A1 },
  { id: "x1", kind: "history", q: "and in the plural?", must: [/raamatuid/],
    history: [
      { role: "user", content: "What case is 'raamatut'?" },
      { role: "assistant", content: "**raamatut** is the osastav (partitive) of **raamat**, book. It is the form an object takes when the action is ongoing or only part of it is affected: Ma loen raamatut, I am reading the book." },
    ] },
  { id: "x2", kind: "history", q: "Why not 'raamatu' there?", must: [/whole|complete|finish|total|result|end/i],
    history: [
      { role: "user", content: "What case is 'raamatut'?" },
      { role: "assistant", content: "**raamatut** is the osastav (partitive) of **raamat**, book. It is the form an object takes when the action is ongoing or only part of it is affected: Ma loen raamatut, I am reading the book." },
    ] },
];

function flag(name: string): string { const at = process.argv.indexOf(name); return at >= 0 ? process.argv[at + 1] ?? "" : ""; }
const only = flag("--only");
const runs = Math.max(1, Number(flag("--runs") || 1));
const pick = flag("--q");
const verbose = process.argv.includes("--verbose");
/*
 * `--effort low` puts every Groq link on that setting, sent as `reasoning_effort`
 * exactly as the route sends it (`ProviderConfig.reasoning`), so a cheaper
 * setting is measured through the app's own transport before anybody pins it.
 * The 2026-09-14 figures are on the field itself.
 */
const effort = flag("--effort") as ProviderConfig["reasoning"] | "";
if (effort && effort !== "none" && effort !== "low") {
  console.error(`--effort takes a value the chain may carry, not ${JSON.stringify(effort)}.`);
  process.exit(1);
}

/*
 * `--gemini a,b` and `--groq a,b` name models to measure that are not wired
 * anywhere, the way `eval:composers` takes them, so a candidate is measured
 * before it is pinned. A model the price table does not name prices at the
 * dearest row, which the summary line says.
 */
function listed(name: string): string[] {
  return flag(name).split(",").map((m) => m.trim()).filter(Boolean);
}
function candidates(): ProviderConfig[] {
  const out: ProviderConfig[] = [];
  const extraGemini = listed("--gemini");
  const extraGroq = listed("--groq");
  if (extraGemini.length > 0 || extraGroq.length > 0) {
    // `--thinking` leaves the Gemini candidates thinking, for a model that refuses "none".
    const reasoning = process.argv.includes("--thinking") ? {} : { reasoning: "none" as const };
    for (const model of extraGemini) out.push({ name: "gemini", model, label: "Google Gemini", ...reasoning });
    for (const model of extraGroq) out.push({ name: "groq", model, label: "Groq" });
    return out;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    out.push({ name: "anthropic", model: "claude-sonnet-5", label: "Anthropic" });
    out.push({ name: "anthropic", model: "claude-haiku-4-5", label: "Anthropic" });
  }
  if (process.env.GEMINI_API_KEY) {
    out.push({ name: "gemini", model: "gemini-3.8-flash", label: "Google Gemini", reasoning: "none" });
    out.push({ name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini", reasoning: "none" });
  }
  if (process.env.GROQ_API_KEY) {
    const r = effort ? { reasoning: effort } : {};
    out.push({ name: "groq", model: "openai/gpt-oss-120b", label: "Groq", ...r });
    out.push({ name: "groq", model: "openai/gpt-oss-20b", label: "Groq", ...r });
    out.push({ name: "groq", model: "qwen/qwen3.8-27b", label: "Groq" });
  }
  return out.filter((one) => !only || one.model.includes(only));
}

async function ask(config: ProviderConfig, system: string, q: Q) {
  let inTokens = 0, outTokens = 0, cached = 0;
  const t0 = Date.now();
  const open = await openWithFallback([config], system, [...(q.history ?? []), { role: "user", content: q.q }],
    (u) => { inTokens = u.inputTokens; outTokens = u.outputTokens; cached = u.cachedInputTokens ?? 0; },
    [learnerNote(q.note ?? B1), GROUND ? wordsNote(shippedWordsInQuestion([...(q.history ?? []), { role: "user", content: q.q }])) : ""].filter(Boolean).join("\n\n"), TUTOR_REPLY_TOKENS,
    // The static prompt held on Google's side, as the route asks for it.
    true);
  const prose = new ProseStream();
  let raw = "", text = "";
  for await (const chunk of open.chunks) { raw += chunk; text += prose.push(chunk); }
  text += prose.end();
  return { raw, text, inTokens, outTokens, cached, ms: Date.now() - t0 };
}

async function estonianTokensOf(text: string): Promise<string[]> {
  const out = new Set<string>();
  const add = (s: string) => { for (const m of s.matchAll(/[\p{L}\p{M}]{2,}/gu)) { const w = m[0]; if (!SKIP.has(w.toLowerCase())) out.add(w); } };
  for (const m of text.matchAll(/\*\*([^*\n]+)\*\*/g)) add(m[1]!);
  for (const m of text.matchAll(/["'“”‘’]([^"'“”‘’\n]{2,60})["'“”‘’]/g)) add(m[1]!);
  for (const m of text.matchAll(/[\p{L}\p{M}]*[õäöüšž][\p{L}\p{M}]*/giu)) add(m[0]);
  for (const line of text.split("\n")) {
    const f = fixFrom(line); if (f) add(f);
    const v = vocabFrom(line); if (v) add(v.et);
  }
  const bad: string[] = [];
  for (const w of out) {
    if (/^\p{Lu}/u.test(w)) continue; // a name, which the forms list holds none of
    if (/^[a-z]+$/i.test(w) && !/[õäöüšž]/i.test(w) && (w.length < 4 || ENGLISH_FUNCTION_WORDS.has(w.toLowerCase()))) continue;
    if (!(await exactForm(w))) bad.push(w);
  }
  return bad;
}

function formatFaults(text: string): string[] {
  const faults: string[] = [];
  const body = text.split("\n").filter((l) => !TAGGED_LINE.test(l.trim())).join("\n");
  if (/^\s{0,3}#{1,6}\s/m.test(body)) faults.push("heading");
  if (/^\s*\|.*\|\s*$/m.test(body)) faults.push("table");
  if (/```/.test(body)) faults.push("code");
  if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m.test(body)) faults.push("rule");
  const blocks = parseReply(body);
  if (blocks.filter((b) => b.kind === "list").length > 1) faults.push("lists>1");
  return faults;
}

function words(text: string): number {
  return text.split("\n").filter((l) => !TAGGED_LINE.test(l.trim())).join(" ").split(/\s+/).filter(Boolean).length;
}

async function main() {
  const system = buildSystemPrompt();
  const qs = QUESTIONS.filter((q) => !pick || q.id === pick || q.kind === pick);
  console.log(`prompt ~${Math.round(system.length / 4)} tokens; ${qs.length} questions x ${runs} run(s)`);
  for (const config of candidates()) {
    console.log(`\n### ${config.model}`);
    const tally = { asked: 0, facts: 0, factsOf: 0, fixOk: 0, fixOf: 0, lenOk: 0, lenOf: 0, tells: 0, fmt: 0, unverified: [] as string[], terms: 0, in: 0, out: 0, cached: 0, ms: 0, wordsList: [] as number[], errors: 0, strayFix: 0, vocabLines: 0, vocabNotHead: 0 };
    const fails: string[] = [];
    for (const q of Array.from({ length: runs }, () => qs).flat()) {
      try {
        const a = await ask(config, system, q);
        tally.asked += 1; tally.in += a.inTokens; tally.out += a.outTokens; tally.cached += a.cached; tally.ms += a.ms;
        const n = words(a.text); tally.wordsList.push(n);
        const issues: string[] = [];
        if (q.must || q.mustNot) {
          tally.factsOf += 1;
          // The facts are read off the typography, and a must-not off the prose alone: a VOCAB line carries a pipe by design.
          const plain = plainText(a.text);
          const prose = plainText(a.text.split("\n").filter((l) => !TAGGED_LINE.test(l.trim())).join("\n"));
          const ok = (q.must ?? []).every((p) => p.test(plain)) && !(q.mustNot ?? []).some((p) => p.test(prose));
          if (ok) tally.facts += 1; else issues.push("fact");
        }
        if (q.fix) {
          tally.fixOf += 1;
          const fixes = a.text.split("\n").map(fixFrom).filter((f): f is string => !!f);
          const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{M}\s]/gu, "").replace(/\s+/g, " ").trim();
          const learnerSentence = norm(q.q.replace(/^.*?[:?]\s*/, ""));
          const ok = q.fix === "none"
            ? fixes.every((f) => norm(f) === learnerSentence)
            : fixes.some((f) => (q.fix as RegExp).test(f));
          if (ok) tally.fixOk += 1; else issues.push(`fix(${fixes.join(" / ") || "none"})`);
        }
        if (!q.fix) {
          const stray = a.text.split("\n").map(fixFrom).filter(Boolean).length;
          if (stray) { tally.strayFix += stray; issues.push(`strayFIX`); }
        }
        {
          const vs = a.text.split("\n").map(vocabFrom).filter((v): v is { et: string; en: string } => !!v);
          tally.vocabLines += vs.length;
          const notHead: string[] = [];
          for (const v of vs) {
            if (/\s/.test(v.et)) continue;
            const lemmas = await lemmasOfForm(v.et);
            if (lemmas[0] !== v.et.toLowerCase()) notHead.push(v.et);
          }
          if (notHead.length) { tally.vocabNotHead += notHead.length; issues.push(`vocabForm(${notHead.join(" ")})`); }
        }
        if (q.vocab) {
          tally.fixOf += 1;
          const v = a.text.split("\n").map(vocabFrom).filter(Boolean).length;
          if (v >= q.vocab) tally.fixOk += 1; else issues.push(`vocab(${v})`);
        }
        if (q.maxWords) { tally.lenOf += 1; if (n <= q.maxWords) tally.lenOk += 1; else issues.push(`long(${n})`); }
        const tells = findTells(a.text).map((t) => t.name); tally.tells += tells.length; if (tells.length) issues.push(`tells(${tells.join(",")})`);
        const fmt = formatFaults(a.text); tally.fmt += fmt.length; if (fmt.length) issues.push(`fmt(${fmt.join(",")})`);
        const bad = await estonianTokensOf(a.text); tally.unverified.push(...bad); if (bad.length) issues.push(`unverified(${bad.join(" ")})`);
        const terms = (a.text.match(TERMS) ?? []).length; tally.terms += terms;
        const mark = issues.length ? "!!" : "ok";
        console.log(`  ${mark} ${q.id.padEnd(3)} ${String(n).padStart(3)}w ${String(a.outTokens).padStart(4)}out ${String(a.ms).padStart(5)}ms ${issues.join(" ")}`);
        if (verbose || issues.length) console.log(`       ${a.text.replace(/\n+/g, " ⏎ ").slice(0, verbose ? 2000 : 400)}`);
        if (issues.length) fails.push(`${q.id}: ${issues.join(" ")}`);
      } catch (e) { tally.errors += 1; console.log(`  ERR ${q.id} ${String(e).slice(0, 100)}`); }
    }
    const per = Math.max(tally.asked, 1);
    // Priced as the ledger prices it, cached share and all.
    const usd = estimateCostMicros(config.model, tally.in / per, tally.out / per, { cachedInputTokens: tally.cached / per }) / 1e6;
    const sorted = [...tally.wordsList].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] ?? 0; const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
    console.log(`  == ${config.model}: facts ${tally.facts}/${tally.factsOf}  fix+vocab ${tally.fixOk}/${tally.fixOf}  length ${tally.lenOk}/${tally.lenOf}  tells ${tally.tells}  fmt ${tally.fmt}  strayFIX ${tally.strayFix}  vocab ${tally.vocabLines} (forms ${tally.vocabNotHead})  unverified ${tally.unverified.length}  terms/answer ${(tally.terms / per).toFixed(1)}  words med ${med} p90 ${p90}  in ${Math.round(tally.in / per)} (cached ${Math.round(tally.cached / per)}) out ${Math.round(tally.out / per)}  ${Math.round(tally.ms / per)}ms  $${(usd * 1000).toFixed(2)}/1k  errors ${tally.errors}`);
    if (tally.unverified.length) console.log(`     unverified: ${[...new Set(tally.unverified)].join(" ")}`);
  }
}
void main();
