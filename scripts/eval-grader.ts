/*
  Which model should grade, measured through the production call path.

  Every arm here calls the exported graders in `lib/tutor/grader.ts`, so every
  request goes through `callForJson` at the max_tokens each caller really uses:
  400 for gradeSentence and gradeDescription, 500 for gradeComposition. No
  fetch of its own, which is the whole point: the earlier comparison was run at
  1200 by scripts that open their own socket, and that is a budget production
  never grants.

  Every Estonian character in the fixtures comes out of prisma/data/expanded.json.
  Nothing is written anywhere.

  Reproducing the three arms:

    TRIALS=12 npx tsx scripts/eval-grader.ts
      qwen at Groq, gpt-oss at OpenRouter, and, with ANTHROPIC_API_KEY and
      ANTHROPIC_WORKSPACE_ID set, sonnet and haiku at Anthropic.

    ONLY_OSS=1 GROQ_NATIVE=openai/gpt-oss-120b TRIALS=12 npx tsx scripts/eval-grader.ts
      gpt-oss at Groq instead, which is where it fails loudly rather than
      quietly: Groq answers 400 with "max completion tokens reached before
      generating a valid document" where OpenRouter returns a truncated body
      that parseVerdict then refuses.

    SHOW_ERR=1 prints the provider's own error body, which is how that
    sentence was read rather than inferred.
*/
import { readFileSync } from "node:fs";
import { gradeSentence, gradeComposition, gradeDescription } from "../lib/tutor/grader";
import { verifyComment } from "../lib/tutor/verify";
import { estimateCostMicros } from "../lib/usage/pricing";
import { CASES } from "../lib/estonian/cases";
import type { ProviderConfig } from "../lib/tutor/provider";


/*
  Two shims, and each one is a production gap rather than a convenience.

  1. `callForJson` sends no `anthropic-workspace-id`. A workspace-scoped key
     (which is what this account issues) is answered 400 by every request the
     grader makes. The header is added here so the model can be measured at all;
     production needs the same header before it can reach Anthropic.

  2. `callForJson` has no branch for Groq: `config.name` that is not
     "anthropic" and not "openrouter" is posted to api.openai.com with
     OPENAI_API_KEY. So a Groq model is unreachable through the grader today.
     The two Groq-native models are addressed at Groq here, with the request
     body callForJson built, unchanged.

  Everything else, the prompts, the caps, the parse and the verify, is the
  production path untouched.
*/
const realFetch = globalThis.fetch;
const GROQ_NATIVE = new Set((process.env.GROQ_NATIVE ?? "qwen/qwen3.8-27b").split(","));
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("api.anthropic.com") && process.env.ANTHROPIC_WORKSPACE_ID) {
    const headers = new Headers(init?.headers);
    headers.set("anthropic-workspace-id", process.env.ANTHROPIC_WORKSPACE_ID);
    return realFetch(input, { ...init, headers });
  }
  if (url.includes("openrouter.ai") && process.env.GROQ_API_KEY) {
    const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
    if (body.model && GROQ_NATIVE.has(body.model)) {
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${process.env.GROQ_API_KEY}`);
      const r = await realFetch("https://api.groq.com/openai/v1/chat/completions", { ...init, headers });
      if (!r.ok && process.env.SHOW_ERR) console.error("GROQ", r.status, (await r.clone().text()).slice(0, 300));
      return r;
    }
  }
  return realFetch(input, init);
}) as typeof fetch;

type Entry = {
  lemma: string; pos: string; translation: string; cefr: string | null;
  examples: { et: string; en: string | null }[];
  forms: { formType: string; value: string }[];
};

const FORM_CASE: Record<string, string> = {
  GEN_SG: "GENITIVE", PART_SG: "PARTITIVE", ILL_SG_SHORT: "ILLATIVE",
};

const entries = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as Entry[];

/** Real entries with a real sentence and enough forms to ask about one. */
function fixtures(n: number) {
  const out: { entry: Entry; formType: string; target: string; sentence: string; wrong: string }[] = [];
  for (const e of entries) {
    if (out.length >= n) break;
    if (e.pos !== "NOUN" || !e.cefr || !e.examples?.length) continue;
    const byType = new Map(e.forms.map((f) => [f.formType, f.value]));
    const nom = byType.get("NOM_SG");
    for (const ft of ["GEN_SG", "PART_SG"]) {
      const target = byType.get(ft);
      // The sentence has to carry the form, and the two forms have to differ,
      // or "used the wrong case" is the same string as "used the right one".
      if (!target || !nom || target === nom) continue;
      const sentence = e.examples.find((x) => x.et.includes(target))?.et;
      if (!sentence || sentence.length < 12 || sentence.length > 90) continue;
      out.push({ entry: e, formType: ft, target, sentence, wrong: sentence.replace(target, nom) });
      break;
    }
  }
  return out;
}

const TRIALS = Number(process.env.TRIALS ?? 10);
const FIX = fixtures(TRIALS);

const CANDIDATES: ProviderConfig[] = [
  ...(process.env.ONLY_OSS ? [] : [{ name: "openrouter", model: "qwen/qwen3.8-27b", label: "OpenRouter" } as ProviderConfig]),
  { name: "openrouter", model: "openai/gpt-oss-120b", label: "OpenRouter" },
  ...(process.env.ANTHROPIC_API_KEY
    ? ([
        { name: "anthropic", model: "claude-sonnet-5", label: "Anthropic" },
        { name: "anthropic", model: "claude-haiku-4-5", label: "Anthropic" },
      ] as ProviderConfig[])
    : []),
];

type Tally = {
  calls: number; verdicts: number; failed: number; withheld: number;
  inTok: number; outTok: number; capHits: number; errors: string[];
};
const blank = (): Tally => ({ calls: 0, verdicts: 0, failed: 0, withheld: 0, inTok: 0, outTok: 0, capHits: 0, errors: [] });

async function run(cfg: ProviderConfig, shape: "sentence" | "describe" | "composition", cap: number) {
  const t = blank();
  for (const [i, f] of FIX.entries()) {
    const spec = CASES.find((c) => c.key === FORM_CASE[f.formType])!;
    const forms = f.entry.forms.map((x) => ({ label: x.formType, value: x.value }));
    // Half right, half a real case error, so a verdict has something to be.
    const learner = i % 2 === 0 ? f.sentence : f.wrong;
    const usedForm = i % 2 === 0;
    t.calls++;
    try {
      let res;
      if (shape === "sentence") {
        res = await gradeSentence(cfg, {
          task: {
            lemma: f.entry.lemma, translation: f.entry.translation, caseKey: spec.key,
            caseEn: spec.en, caseEt: spec.et, caseQuestion: spec.question,
            targetForm: f.target, alsoRight: null, provenance: "ekilex",
          } as never,
          sentence: learner, knownForms: forms, level: f.entry.cefr ?? "A1",
        }, usedForm);
      } else if (shape === "describe") {
        res = await gradeDescription(cfg, {
          situation: "at home in the morning",
          things: [{ emoji: "*", lemma: f.entry.lemma, translation: f.entry.translation }],
          asked: { lemma: f.entry.lemma, caseEt: spec.et, caseQuestion: spec.question },
          rightCase: usedForm, knownForms: forms, sentence: learner, level: f.entry.cefr ?? "A1",
        });
      } else {
        res = await gradeComposition(cfg, `${learner} ${f.sentence}`, f.entry.cefr ?? "A1");
      }
      t.inTok += res.usage.inputTokens;
      t.outTok += res.usage.outputTokens;
      if (res.usage.outputTokens >= cap) t.capHits++;
      if (!res.graded) { t.failed++; continue; }
      t.verdicts++;
      const v = verifyComment(res.graded.comment, forms.map((x) => x.value), learner, [f.entry.translation]);
      if (v.reason) t.withheld++;
    } catch (e) {
      t.failed++;
      const m = e instanceof Error ? e.message : String(e);
      if (!t.errors.includes(m)) t.errors.push(m);
    }
  }
  return t;
}

const SHAPES = [
  { shape: "sentence", cap: 400, caller: "gradeSentence  (400)" },
  { shape: "describe", cap: 400, caller: "gradeDescription (400)" },
  { shape: "composition", cap: 500, caller: "gradeComposition (500)" },
] as const;

(async () => {
  console.log(`${FIX.length} trials per cell, real production caps.\n`);
  for (const cfg of CANDIDATES) {
    console.log(`\n### ${cfg.model}   (${cfg.name} branch of callForJson)`);
    console.log("caller                    verdicts  failed  withheld  hit-cap  avg-out  $/1k calls");
    for (const s of SHAPES) {
      const t = await run(cfg, s.shape, s.cap);
      const per = estimateCostMicros(cfg.model, t.inTok / Math.max(t.calls, 1), t.outTok / Math.max(t.calls, 1));
      console.log(
        `${s.caller.padEnd(25)} ${String(t.verdicts).padStart(5)}/${t.calls}` +
        `${String(t.failed).padStart(8)}${String(t.withheld).padStart(10)}` +
        `${String(t.capHits).padStart(9)}${(t.outTok / Math.max(t.calls, 1)).toFixed(0).padStart(9)}` +
        `${("$" + (per * 1000 / 1e6).toFixed(2)).padStart(12)}`,
      );
      if (t.errors.length) console.log(`    errors: ${t.errors.slice(0, 2).join(" | ").slice(0, 180)}`);
    }
  }
})();
