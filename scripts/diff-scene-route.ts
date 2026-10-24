/**
 * THE SCENE ROUTE BEFORE AND AFTER A CHANGE, DIFFED (N-5).
 *
 *   npx tsx scripts/diff-scene-route.ts --out before.jsonl
 *   (make the change)
 *   npx tsx scripts/diff-scene-route.ts --out after.jsonl --against before.jsonl
 *
 * Runs `scripts/diff-scene-route.harness.ts` under its own vitest config, which
 * drives the real `/api/scene` handler and the four scene actions in process
 * against the local database, keyless, keyed from the bank and composing
 * against a stubbed provider, and writes every reply, every request body sent
 * to a model and every ledger row. With `--against` it compares the new record
 * with the old one and exits non-zero on the first line that differs.
 *
 * `--scenes a,b` plays those scene ids only. The database has to be local; the
 * harness sits behind `scripts/itest-guard.ts`, as the integration suite does.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

const out = resolve(arg("--out") ?? "scene-route.jsonl");
const against = arg("--against");
const scenes = arg("--scenes") ?? "";

const run = spawnSync(
  "npx",
  ["vitest", "run", "--config", "scripts/diff-scene-route.config.mts"],
  { stdio: "inherit", env: { ...process.env, DIFF_SCENE_OUT: out, DIFF_SCENE_ONLY: scenes } },
);
if (run.status !== 0) process.exit(run.status ?? 1);

const lines = readFileSync(out, "utf8").split("\n").filter(Boolean);
console.log(`${lines.length} events written to ${out}`);
if (against) {
  const old = readFileSync(resolve(against), "utf8").split("\n").filter(Boolean);
  const length = Math.max(old.length, lines.length);
  for (let i = 0; i < length; i += 1) {
    if (old[i] !== lines[i]) {
      console.error(`First difference at event ${i + 1}:\n- ${old[i]?.slice(0, 400)}\n+ ${lines[i]?.slice(0, 400)}`);
      process.exit(1);
    }
  }
  console.log(`Identical to ${against}: ${old.length} events, byte for byte.`);
}
