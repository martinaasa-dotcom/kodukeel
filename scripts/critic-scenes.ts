/**
 * PLAYS EVERY SITUATION AGAINST SIMULATED LEARNERS AND HAS A CRITIC READ THE
 * TRANSCRIPTS FOR LOGIC ERRORS.
 *
 *   npx tsx scripts/critic-scenes.ts --kinds shy,chatty,offtrack --seeds 1
 *   npx tsx scripts/critic-scenes.ts --scene toovestlus --kinds confused --model-down
 *
 * A logic error is the fault a learner remembers: the other side answering a
 * question nobody asked, correcting something the learner never said, saying
 * again what was settled, ignoring a question, contradicting itself, ending or
 * stalling at the wrong moment. None of them is a wrong word, so no check in
 * the gate can see one, and reading transcripts by hand finds them one
 * screenshot at a time. This plays each scene through `play-scene.ts` with a
 * model playing the learner (`--learner`), which is the only way to say the
 * things a scene did not anticipate, and asks a second model to list every
 * moment the other side stopped making sense, as JSON, so a pass can be
 * counted before and after a fix.
 *
 * Harness only: nothing here reaches a learner, a grade or the ledger. It
 * spends Gemini credit, about a tenth of a cent a turn.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { SCENES } from "../lib/scenes/catalogue";

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const kinds = (arg("kinds") ?? "shy,chatty,offtrack,confused,english,good").split(",");
const seeds = Number(arg("seeds") ?? "1");
const only = arg("scene");
const out = arg("out") ?? "critic-report.md";
const extra = process.argv.includes("--model-down") ? ["--model-down"] : [];
const PARALLEL = Number(arg("parallel") ?? "6");
/*
  `--raw <dir>` keeps every conversation as play-scene printed it, drafts and
  withheld reasons included, so a flagged line can be traced to the rung that
  wrote it and to why the model's own attempts did not get through.
*/
const raw = arg("raw");
if (raw) mkdirSync(raw, { recursive: true });

interface Issue { turn: number; kind: string; line: string; why: string }

function play(scene: string, kind: string, seed: number): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", "scripts/play-scene.ts", "--compose", "--scene", scene, "--learner", kind, "--seed", String(seed), ...(raw ? ["--drafts"] : []), ...extra], { env: process.env });
    let text = "";
    child.stdout.on("data", (d) => { text += d; });
    child.stderr.on("data", () => {});
    child.on("close", () => resolve(text));
  });
}

/** The conversation as the learner saw it: the two sides, the goals and the readings stripped of harness detail. */
function transcript(raw: string): string {
  return raw.split("\n")
    .filter((l) => /^\s+(THEM|YOU|card):/.test(l) || /^=== /.test(l))
    .map((l) => l.replace(/\s+<[^>]*>$/, "").replace(/\s{2,}\(goal: /, "   (their objective: ").trim())
    .join("\n");
}

const CRITIC = [
  "You review a transcript of a language-learning role-play in Estonian. The learner (YOU) is a beginner; the other side (THEM) is played by the app.",
  "Find every moment where THEM stops making sense as a person in that situation. Kinds:",
  "non-sequitur (reply unrelated to what the learner said), ignored-question (learner asked something and it was not answered),",
  "repeat (asks for or says again something already settled or answered), wrong-correction (corrects or complains about something the learner did not do),",
  "contradiction (contradicts an earlier line or the facts), premature-end (ends or says goodbye before the conversation's business is done),",
  "stall (the conversation is stuck and does not move on after the learner has clearly answered), misunderstood (treats a clear answer as not understood),",
  "unnatural (Estonian a native speaker would never say, or wrong), unkind (anything that could make a learner feel stupid).",
  "Saying something again because the learner asked to hear it again, or asked the same thing again, is not a repeat.",
  "Do NOT flag the learner's own mistakes, and do not flag THEM for being simple or short. Ignore lines in English that start with 'Tip:' (app hints) and scene directions.",
  "Reply with JSON only: {\"issues\": [{\"turn\": <1-based index of the THEM line>, \"kind\": \"...\", \"line\": \"the THEM line\", \"why\": \"one short sentence\"}]}. An empty list if there are none.",
].join("\n");

async function critique(text: string): Promise<Issue[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: CRITIC }] },
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { maxOutputTokens: 1500, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    }),
  }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}") as { issues?: Issue[] };
    return parsed.issues ?? [];
  } catch { return []; }
}

(async () => {
  const jobs: { scene: string; kind: string; seed: number }[] = [];
  for (const scene of SCENES) if (!only || scene.id === only) {
    for (const kind of kinds) for (let seed = 1; seed <= seeds; seed += 1) jobs.push({ scene: scene.id, kind, seed });
  }
  const results: { job: typeof jobs[number]; text: string; issues: Issue[] }[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      const played = await play(job.scene, job.kind, job.seed);
      if (raw) writeFileSync(`${raw}/${job.scene}-${job.kind}-${job.seed}.log`, played);
      const text = transcript(played);
      const issues = await critique(text);
      results.push({ job, text, issues });
      console.log(`${job.scene} ${job.kind} #${job.seed}: ${issues.length} issue(s)`);
    }
  }));
  const byKind = new Map<string, number>();
  for (const r of results) for (const i of r.issues) byKind.set(i.kind, (byKind.get(i.kind) ?? 0) + 1);
  const total = results.reduce((n, r) => n + r.issues.length, 0);
  const lines = [
    `# Scene critic: ${results.length} conversations, ${total} issues${extra.length ? " (model down)" : ""}`,
    "", ...[...byKind].sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n}`), "",
  ];
  for (const r of results.sort((a, b) => a.job.scene.localeCompare(b.job.scene))) {
    lines.push(`## ${r.job.scene} · ${r.job.kind} · #${r.job.seed} (${r.issues.length})`, "");
    for (const i of r.issues) lines.push(`- **${i.kind}** (THEM ${i.turn}): ${i.line} ... ${i.why}`);
    lines.push("", "```", r.text, "```", "");
  }
  writeFileSync(out, lines.join("\n"));
  console.log(`\n${total} issues over ${results.length} conversations`);
  for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
  console.log(`report: ${out}`);
})();
