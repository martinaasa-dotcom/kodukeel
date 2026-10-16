/**
 * Checks lines somebody typed for the bank, the way the drafter checks its own.
 *
 *   npx tsx scripts/check-lines.ts lines.json
 *
 * `lines.json` is a list of `[scene, beat, text]`, where a beat is a scene
 * beat id or `hurdle:<curveball id>`. Each line goes through the four checks
 * in `lib/scenes/gate.ts` against the scene's own word list and the drafter's
 * own refusals, and the verdict names what failed and which words the scene
 * cannot vouch for. Nothing is written: a line that passes goes into
 * its scene's file under `lib/scenes/bank/` by hand with `model: "authored"`, and `bank.test.ts`
 * runs the same checks again on every run of the suite.
 *
 * This is the tool a native speaker uses to add or replace a line, and it
 * exists so that "typed by a person" and "checked by the gate" are the same
 * thing rather than a promise.
 */
import { readFileSync } from "node:fs";
import { installMeter } from "./lib/meter";
import { lineRefusals } from "./lib/lineCheck";

// What this run spends, capped and said on exit (`scripts/lib/meter.ts`); replay on, because it reads transcripts, so a turn asked before is answered from the record.
installMeter({ replay: true });

const file = process.argv[2];
if (!file) {
  console.log("Usage: npx tsx scripts/check-lines.ts lines.json");
  process.exit(1);
}
const rows = JSON.parse(readFileSync(file, "utf8")) as [string, string, string][];
let failed = 0;
for (const [sceneId, beatId, text] of rows) {
  const why = lineRefusals(sceneId, beatId, text);
  if (why[0] === "no such beat") { console.log(`??   ${sceneId}/${beatId}: no such beat`); failed++; continue; }
  if (why.length > 0) failed++;
  console.log(`${why.length ? "FAIL" : "ok  "} ${sceneId}/${beatId}: ${text}${why.length ? "   <- " + why.join(", ") : ""}`);
}
console.log(`\n${rows.length - failed} of ${rows.length} pass.`);
process.exit(failed > 0 ? 1 : 0);
