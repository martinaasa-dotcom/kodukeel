/**
 * The speech golden test without a browser (docs/44-sixth-batch.md, R-5).
 *
 *   npm run check:speech-golden
 *   npm run check:speech-golden -- --run native-turns.json
 *
 * With no run, it decides every clip in `lib/speech/fixtures/golden.json` from
 * the turns stored there and compares with what the file expects, which is the
 * check that the hearing rules have not moved under the file. With `--run`, it
 * takes the turns from a recording another engine made in the golden file's
 * shape (each clip's `file`, `sha256` and `turns`, and the `model` it loaded)
 * and compares those instead: this is what a native engine's output is fed to
 * (docs/42-native-apps.md, section 5). No browser, no model and no audio.
 *
 * Reads the golden file and never writes it; `npm run asr:golden` records it.
 */
import { readFileSync } from "node:fs";

import type { Golden } from "../lib/speech/golden";
import { checkGolden, type GoldenRun } from "../lib/speech/goldenCheck";

const GOLDEN = "lib/speech/fixtures/golden.json";

function argValue(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as Golden;
const runPath = argValue("--run");
const run = runPath ? (JSON.parse(readFileSync(runPath, "utf8")) as GoldenRun) : undefined;

const report = checkGolden(golden, run);
console.log(`Turns from ${runPath ?? GOLDEN}${run?.engine ? ` (${run.engine})` : ""}, against ${GOLDEN}:`);
for (const clip of report.clips) {
  console.log(`${clip.problems.length === 0 ? "  same " : "  DIFF "} ${clip.file}`);
  for (const problem of clip.problems) console.log(`         ${problem}`);
}
for (const problem of report.problems) console.log(`  ${problem}`);
const differ = report.clips.filter((c) => c.problems.length > 0).length;
console.log(`\n${report.clips.length} clips, ${differ} decided differently, ${report.problems.length} other problems.`);
process.exitCode = report.passed ? 0 : 1;
