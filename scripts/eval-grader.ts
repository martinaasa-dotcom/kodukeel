/*
  Which model should grade, measured through the production call path.

  Every arm calls the exported graders in `lib/tutor/grader.ts`, so every
  request goes through the real transport at the cap each caller really uses:
  `JSON_REPLY_TOKENS` for a sentence and a description, and
  `COMPOSITION_REPLY_TOKENS` for a composition. No fetch of its own, which is
  the whole point. The comparison that first chose a grader model ran at
  `max_tokens: 1200` through scripts that open their own socket, and that was a
  budget production did not grant; reading the cap from the code under test is
  what stops that happening again when the numbers move, as they since have.

  This file used to carry two shims and needs neither now. It reached Groq
  itself, because `callForJson` posted every non-OpenRouter provider to
  api.openai.com, and it added `anthropic-workspace-id`, because nothing sent
  one. Both are fixed upstream: `openAiCompatible` is the routing table the
  chain itself reads, and `anthropicHeaders` adds the workspace header when
  `ANTHROPIC_WORKSPACE_ID` is set. A harness whose job is measuring the real
  path may not keep scaffolding that makes it a different path.

  Every Estonian character in the fixtures comes out of
  prisma/data/expanded.json. Nothing is written anywhere.

    TRIALS=12 npx tsx scripts/eval-grader.ts

  runs the two Groq models, and, with ANTHROPIC_API_KEY set, sonnet and haiku
  behind them. An org-scoped Anthropic key also needs ANTHROPIC_WORKSPACE_ID,
  which the app reads for itself.
*/
import { readFileSync } from "node:fs";
import {
  gradeSentence, gradeComposition, gradeDescription,
  JSON_REPLY_TOKENS, COMPOSITION_REPLY_TOKENS,
} from "../lib/tutor/grader";
import { verifyComment } from "../lib/tutor/verify";
import { estimateCostMicros } from "../lib/usage/pricing";
import { CASES } from "../lib/estonian/cases";
import type { ProviderConfig } from "../lib/tutor/provider";


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
  { name: "groq", model: "openai/gpt-oss-120b", label: "Groq" },
  { name: "groq", model: "qwen/qwen3.8-27b", label: "Groq" },
  ...(process.env.ANTHROPIC_API_KEY
    ? ([
        { name: "anthropic", model: "claude-sonnet-5", label: "Anthropic" },
        { name: "anthropic", model: "claude-haiku-4-5", label: "Anthropic" },
      ] as ProviderConfig[])
    : []),
  /*
    And the Gemini tier, because the scene composer's own comparison found it
    writing better Estonian than the model in front of it for less money, and
    "better and cheaper on one path" is a reason to ask about the others rather
    than a reason to assume. This one is the harder question of the two: a
    grader returns JSON against a schema and a model that writes beautifully
    and closes a brace in the wrong place scores zero here, correctly.
  */
  ...(process.env.GEMINI_API_KEY
    ? ([
        { name: "gemini", model: "gemini-3.8-flash", label: "Google Gemini" },
        { name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini" },
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

/*
  The caps are read off the module under test rather than typed here. A
  harness carrying its own copy of the number it is measuring against is how
  the last one came to report a budget production had stopped granting.
*/
const SHAPES = [
  { shape: "sentence", cap: JSON_REPLY_TOKENS, caller: "gradeSentence" },
  { shape: "describe", cap: JSON_REPLY_TOKENS, caller: "gradeDescription" },
  { shape: "composition", cap: COMPOSITION_REPLY_TOKENS, caller: "gradeComposition" },
] as const;

(async () => {
  console.log(`${FIX.length} trials per cell, real production caps.\n`);
  for (const cfg of CANDIDATES) {
    console.log(`\n### ${cfg.model}   (${cfg.name})`);
    console.log("caller                    verdicts  failed  withheld  hit-cap  avg-out  $/1k calls");
    for (const s of SHAPES) {
      const t = await run(cfg, s.shape, s.cap);
      const per = estimateCostMicros(cfg.model, t.inTok / Math.max(t.calls, 1), t.outTok / Math.max(t.calls, 1));
      console.log(
        `${`${s.caller} (${s.cap})`.padEnd(25)} ${String(t.verdicts).padStart(5)}/${t.calls}` +
        `${String(t.failed).padStart(8)}${String(t.withheld).padStart(10)}` +
        `${String(t.capHits).padStart(9)}${(t.outTok / Math.max(t.calls, 1)).toFixed(0).padStart(9)}` +
        `${("$" + (per * 1000 / 1e6).toFixed(2)).padStart(12)}`,
      );
      if (t.errors.length) console.log(`    errors: ${t.errors.slice(0, 2).join(" | ").slice(0, 180)}`);
    }
  }
})();
