/**
 * THE SCENE ROUTE'S TWO YES/NO CALLS, PUT TO ANOTHER MODEL ON THE QUESTIONS THEY WERE REALLY ASKED.
 *
 *   JUDGE_LOG=/tmp/judge.jsonl npx tsx scripts/play-scene.ts --compose ...   # records every question and answer
 *   npx tsx scripts/eval-judge.ts --log /tmp/judge.jsonl --budget 0.10 --limit 40 --only gemini-3.1-flash-lite --anthropic claude-haiku-5-5:off
 *
 * Both calls go through `callChainForJson`, which is what `app/api/scene/route.ts`
 * calls (`JUDGE_REPLY_TOKENS`, `CONSISTENCY_REPLY_TOKENS`, the grader chain's
 * transport), with the route's own system prompts, user prompts and parsers
 * (`lib/scenes/judge.ts`, `lib/scenes/consistency.ts`). The questions are not
 * invented here: `play-scene.ts` writes each one it put to its judge, with the
 * answer that judge gave, and this puts the identical text to other models.
 *
 * "NOT JUDGED" IS NOT A VERDICT. A call that throws, is cut off or returns
 * something `parseJudgement` / `parseConsistency` cannot read gives null, and
 * the route reads null as no concession (the judge) and as no objection (the
 * consistency check): the line stands as the dictionary and the gate left it.
 * Reported here as its own column and never counted as a yes or a no.
 *
 * Agreement is with the model that answered when the log was written, which is
 * today's grader link; it is agreement, not accuracy, since nobody has labeled
 * these.
 */
import { readFileSync } from "node:fs";
import { callChainForJson } from "../lib/tutor/grader";
import { JUDGE_REPLY_TOKENS, parseJudgement } from "../lib/scenes/judge";
import { CONSISTENCY_REPLY_TOKENS, parseConsistency } from "../lib/scenes/consistency";
import { estimateCostMicros } from "../lib/usage/pricing";
import type { ProviderConfig } from "../lib/tutor/provider";
import { installMeter } from "./lib/meter";
import { flagValue, nameOf, pickCandidates } from "./lib/anthropicArms";

installMeter({ replay: false });

interface Asked { kind: "judge" | "consistency"; system: string; user: string; raw: string }

const BUILT_IN: ProviderConfig[] = [
  { name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini" },
  { name: "groq", model: "openai/gpt-oss-120b", label: "Groq" },
];

/** Same verdict word for the logged answer and the new one: yes, no, or null for not judged. */
function readOne(kind: Asked["kind"], raw: string): "yes" | "no" | null {
  if (kind === "judge") {
    const v = parseJudgement(raw);
    return v ? (v.done ? "yes" : "no") : null;
  }
  const v = parseConsistency(raw);
  return v ? (v.ok ? "yes" : "no") : null;
}

async function main() {
  const file = flagValue("log");
  if (!file) throw new Error("--log takes the JUDGE_LOG file play-scene.ts wrote");
  const seen = new Set<string>();
  const all = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Asked)
    .filter((a) => { const k = `${a.kind}\n${a.user}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const limit = Number(flagValue("limit") || all.length);
  // Both kinds in proportion, so a small sample still holds some of each.
  const asked = [...all.filter((a) => a.kind === "judge").slice(0, Math.ceil(limit / 2)), ...all.filter((a) => a.kind === "consistency").slice(0, Math.floor(limit / 2))];
  const logged = asked.map((a) => readOne(a.kind, a.raw));
  console.log(`${asked.length} distinct questions from ${file}: ${asked.filter((a) => a.kind === "judge").length} judge, ${asked.filter((a) => a.kind === "consistency").length} consistency.`);
  console.log(`The logged answers (today's judge): ${["yes", "no", null].map((v) => `${v ?? "not judged"} ${logged.filter((l) => l === v).length}`).join(", ")}\n`);

  for (const cfg of pickCandidates(BUILT_IN)) {
    for (const kind of ["judge", "consistency"] as const) {
      const rows = asked.map((a, i) => ({ a, was: logged[i] ?? null })).filter((r) => r.a.kind === kind);
      let valid = 0, notJudged = 0, agree = 0, yes = 0, inTok = 0, outTok = 0, cached = 0, capHits = 0, ms = 0;
      for (const { a, was } of rows) {
        const cap = kind === "judge" ? JUDGE_REPLY_TOKENS : CONSISTENCY_REPLY_TOKENS;
        const t0 = Date.now();
        try {
          const res = await callChainForJson([cfg], a.system, a.user, cap);
          ms += Date.now() - t0;
          inTok += res.usage.inputTokens; outTok += res.usage.outputTokens; cached += res.usage.cachedInputTokens ?? 0;
          if (res.usage.outputTokens >= cap) capHits++;
          const now = readOne(kind, res.text);
          if (now === null) { notJudged++; continue; }
          valid++;
          if (now === "yes") yes++;
          if (was !== null && now === was) agree++;
        } catch {
          ms += Date.now() - t0;
          notJudged++;
        }
      }
      const n = Math.max(1, rows.length);
      const usd = estimateCostMicros(cfg.model, inTok, outTok, { cachedInputTokens: cached }) / 1e6;
      console.log(
        `${nameOf(cfg).padEnd(30)} ${kind.padEnd(12)} valid ${valid}/${rows.length}  not judged ${notJudged}  cap hits ${capHits}  `
        + `agrees with the logged answer ${agree}/${rows.filter((r) => r.was !== null).length}  said yes ${yes}  `
        + `${Math.round(ms / n)}ms a call  out ${Math.round(outTok / n)}  $${(usd / n * 1000).toFixed(2)}/1k calls`,
      );
    }
  }
}
main();
