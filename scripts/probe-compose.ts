/**
 * One beat, every free model, the route's own prompt: which of them can do
 * this job at all.
 *
 * `eval:scene` measures the gate over the whole catalogue and takes an hour;
 * this asks the narrower question a decision about model ordering actually
 * needs, which is whether a given free model answers, stays inside the word
 * list, writes one sentence, and writes Estonian. It prints what each wrote so
 * the answer is readable rather than a percentage.
 *
 *   npx tsx scripts/probe-compose.ts [--tokens 200]
 */
import { sceneById } from "../lib/scenes/catalogue";
import { contextFromRows, sceneLemmas, type Row } from "../lib/progress/scene";
import { COMPOSE_SYSTEM, composeLive } from "../lib/scenes/prompt";
import { runGate } from "../lib/scenes/gate";
import { chain } from "./lib/sceneDraft";
import { REPLY_TOKENS } from "../lib/tutor/provider";
import { shippedDictionary } from "./lib/dictionary";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const TOKENS = Number(arg("tokens") ?? REPLY_TOKENS);

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government,
}));

(async () => {
  const scene = sceneById("bussipilet")!;
  const context = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)));
  const beat = scene.beats.find((b) => b.id === "when")!;
  const ask = {
    move: beat.move, they: beat.they, register: scene.register, reading: "",
    words: [...context.lexicon.byLemma.keys()],
    examples: [...context.scripted.entries()].filter(([id]) => id !== beat.id)
      .flatMap(([, l]) => l.slice(0, 1)).slice(0, 6),
    avoid: [] as string[],
  };
  // Half a conversation, so the line has something to be about.
  const talk = [
    { role: "assistant" as const, content: "Tere! Mida te soovite?" },
    { role: "user" as const, content: "ma tahan piletit" },
    { role: "assistant" as const, content: "Kuhu te lähete?" },
    { role: "user" as const, content: "jaama, aga mul on kiire" },
  ];

  for (const link of chain()) {
    const started = Date.now();
    let out = "";
    try {
      const res = await fetch(link.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${link.key}` },
        body: JSON.stringify({
          model: link.model, temperature: 0.8, max_tokens: TOKENS,
          messages: [
            { role: "system", content: COMPOSE_SYSTEM },
            { role: "user", content: composeLive(ask) },
            ...talk,
            { role: "user", content: "Your line:" },
          ],
        }),
      });
      if (!res.ok) out = `HTTP ${res.status}`;
      else {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        out = data.choices?.[0]?.message?.content?.trim() || "(empty content)";
      }
    } catch (e) {
      out = `threw: ${(e as Error).message}`;
    }
    const ms = Date.now() - started;
    const verdict = /^(HTTP|threw|\(empty)/.test(out)
      ? "-"
      : (runGate(out, beat, { ...context.gate, dealt: new Set(["20:00"]) }).failed.join(",") || "PASSES");
    console.log(`${link.model.padEnd(38)} ${String(ms).padStart(6)}ms  [${verdict}]  ${out.replace(/\n/g, " ⏎ ")}`);
  }
})();
