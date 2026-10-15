#!/usr/bin/env tsx
/**
 * A READ OF THE CONVERSATION LINES, APPLIED.
 *
 *   npm run apply:scene-review -- sheet.csv            what it would do
 *   npm run apply:scene-review -- sheet.csv --write    do it
 *
 * Reads the sheet `npm run review:scenes` wrote, once the native speaker who
 * develops this app has filled it in, and edits the scene's file under
 * `lib/scenes/bank/`:
 *
 *   ok          the row gains `reviewedAt` with today's date;
 *   correction  the corrected line replaces the old one and gains
 *               `reviewedAt`, but only if it passes the gate a new line has
 *               to pass (`scripts/lib/lineCheck.ts`, the one `npm run
 *               check:lines` runs); otherwise it is printed with the reason
 *               and nothing is written for it;
 *   (neither)   left alone.
 *
 * A line not found in the bank character for character is refused and
 * printed. The generated header on each bank file is kept. This is the only
 * route by which an Estonian line in the bank changes other than drafting:
 * a reviewer's correction, gated (ADR-005, ADR-025 amendment 1). After
 * writing, run `npm test`: `bank.test.ts` gates every row again.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BANK } from "@/lib/scenes/bank";
import { applyToBankFile, decideSceneSheet, readSceneSheet, type SceneDecision } from "@/lib/review/sceneSheet";
import { parseCsv } from "./lib/csv";
import { lineRefusals } from "./lib/lineCheck";
import { installMeter } from "./lib/meter";

// The gate reads no model, and the meter is what makes that certain: it buys nothing without a budget.
installMeter({ replay: true });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const write = args.includes("--write");
if (!file) {
  console.error("Usage: npm run apply:scene-review -- sheet.csv [--write]");
  process.exit(1);
}

const { rows, problem } = readSceneSheet(parseCsv(readFileSync(file, "utf8")));
if (problem) {
  console.error(`${file}: ${problem}`);
  process.exit(1);
}
const decisions = decideSceneSheet(rows, BANK, lineRefusals);
const today = new Date().toISOString().slice(0, 10);

const byScene = new Map<string, SceneDecision[]>();
for (const d of decisions) {
  if (d.kind === "refuse") continue;
  const list = byScene.get(d.row.scene) ?? [];
  list.push(d);
  byScene.set(d.row.scene, list);
}

const refused = decisions.filter((d) => d.kind === "refuse");
let confirmed = 0;
let corrected = 0;
for (const [scene, list] of byScene) {
  const bankFile = path.join(ROOT, "lib/scenes/bank", `${scene}.ts`);
  const before = readFileSync(bankFile, "utf8");
  const { source, missing } = applyToBankFile(before, list, today);
  for (const m of missing) refused.push({ kind: "refuse", row: m.row, reason: "no row in the scene's bank file holds this line on this beat" });
  const done = list.filter((d) => !missing.includes(d));
  confirmed += done.filter((d) => d.kind === "confirm").length;
  corrected += done.filter((d) => d.kind === "correct").length;
  for (const d of done) {
    if (d.kind === "correct") console.log(`  ${scene}/${d.row.beat}: "${d.row.line}" becomes "${d.text}"${d.row.why ? ` (${d.row.why})` : ""}`);
  }
  if (write && source !== before) writeFileSync(bankFile, source);
}

console.log(`\n${confirmed} lines confirmed, ${corrected} corrected, ${refused.length} refused.`);
for (const r of refused) {
  if (r.kind === "refuse") console.log(`  row ${r.row.row}, ${r.row.scene}/${r.row.beat}: "${r.row.correction || r.row.line}": ${r.reason}`);
}
console.log(write ? "\nWritten. Run npm test, which gates every bank row again." : "\nNothing written. Add --write to apply it.");
process.exit(refused.length > 0 ? 1 : 0);
