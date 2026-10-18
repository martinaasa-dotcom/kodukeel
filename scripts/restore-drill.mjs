#!/usr/bin/env node
/**
 * A RESTORE DRILL, AGAINST A LOCAL DATABASE ONLY.
 *
 *   node scripts/restore-drill.mjs            # needs a build (`npx next build`) for the last step
 *   node scripts/restore-drill.mjs --keep     # leave the restored copy behind to look at
 *
 * `docs/28-incident-response.md` says a restore is minutes of work plus however
 * long the restore takes, and that nobody had measured it. This measures the
 * half that can be measured off production: it dumps the local database with
 * `pg_dump`, restores the dump into a database of its own with `pg_restore`,
 * starts the built app against the copy, and compares the copy with the
 * original table by table and through `/api/health`. It prints how long each
 * step took, which is what the incident plan records.
 *
 * WHAT IT IS NOT. A production restore is a Supabase backup restored into a
 * project, which this cannot do and does not pretend to: the sentence in the
 * incident plan saying nobody has tested one stays true until the operator
 * does (docs/38-third-batch.md, section 9). What this proves is that the
 * schema, the data and the app survive a dump and a restore with nothing lost,
 * and how long that takes at the size of the database it ran on.
 *
 * It refuses anything not on loopback, with no override: it creates and drops
 * a database, and the one thing a drill may never do is practice on the real
 * thing. The original database is only ever read.
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { hostOf, isLocal, requireLocalDatabase } from "./lib/local-db.mjs";

const keep = process.argv.includes("--keep");
const PORT = Number(process.env.RESTORE_DRILL_PORT ?? 3230);

const source = requireLocalDatabase("run a restore drill");
if (!isLocal(source)) {
  console.error(`\nRefusing: a restore drill runs against a local database only, and ${hostOf(source)} is not one.\n`);
  process.exit(1);
}

const sourceUrl = new URL(source.replace(/^postgres(ql)?:/, "http:"));
const sourceDb = sourceUrl.pathname.replace(/^\//, "").split("?")[0];
const drillDb = `${sourceDb}_restore_drill_${Date.now()}`;
/** The same server, another database: only the path of the URL changes. */
const urlFor = (db) => source.replace(/\/[^/?]+(\?|$)/, `/${db}$1`);
const drillUrl = urlFor(drillDb);
const adminUrl = urlFor("postgres");

const timings = [];
function timed(label, run) {
  const start = Date.now();
  const value = run();
  timings.push([label, Date.now() - start]);
  return value;
}
async function timedAsync(label, run) {
  const start = Date.now();
  const value = await run();
  timings.push([label, Date.now() - start]);
  return value;
}

const psql = (url, sql) => execFileSync("psql", [url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" }).trim();

function tableCounts(url) {
  const tables = psql(url, "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    .split("\n").filter(Boolean);
  const counts = new Map();
  for (const table of tables) counts.set(table, Number(psql(url, `SELECT count(*) FROM "${table}"`)));
  return counts;
}

function get(path) {
  return new Promise((resolve) => {
    const req = request({ host: "127.0.0.1", port: PORT, path, timeout: 5000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.end();
  });
}

const work = mkdtempSync(join(tmpdir(), "restore-drill-"));
const dump = join(work, "kodukeel.dump");
let server = null;
let failed = false;

try {
  console.log(`Source: ${hostOf(source)}/${sourceDb}. Copy: ${drillDb}.\n`);
  const before = timed("count the original's rows", () => tableCounts(source));

  timed("pg_dump the original", () => {
    execFileSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", dump, source], { stdio: "inherit" });
  });
  const size = statSync(dump).size;

  timed("create an empty database", () => psql(adminUrl, `CREATE DATABASE "${drillDb}"`));
  timed("pg_restore into it", () => {
    execFileSync("pg_restore", ["--no-owner", "--no-privileges", "--exit-on-error", "--dbname", drillUrl, dump], { stdio: "inherit" });
  });

  const after = timed("count the copy's rows", () => tableCounts(drillUrl));
  const differ = [];
  for (const [table, n] of before) {
    if (after.get(table) !== n) differ.push(`${table}: ${n} in the original, ${after.get(table) ?? "missing"} in the copy`);
  }
  for (const table of after.keys()) if (!before.has(table)) differ.push(`${table}: only in the copy`);
  const rows = [...before.values()].reduce((a, b) => a + b, 0);
  console.log(`\n${before.size} tables and ${rows.toLocaleString("en-GB")} rows, in a ${(size / 1024 / 1024).toFixed(1)} MB dump.`);
  if (differ.length) {
    failed = true;
    console.log("FAIL  the copy does not match the original:\n  " + differ.join("\n  "));
  } else {
    console.log("PASS  every table in the copy has exactly the rows the original has");
  }

  const health = await timedAsync("start the app against the copy until it is healthy", async () => {
    server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      env: { ...process.env, DATABASE_URL: drillUrl, DIRECT_URL: drillUrl, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "ignore",
      detached: true,
    });
    for (let i = 0; i < 120; i++) {
      const res = await get("/api/health");
      if (res?.status === 200) return res;
      await delay(500);
    }
    return null;
  });
  if (health && /"database":"ok"/.test(health.body)) {
    console.log("PASS  /api/health answers ok against the copy");
  } else {
    failed = true;
    console.log(`FAIL  /api/health did not answer ok against the copy (${health ? health.body : "no answer"})`);
  }
} catch (error) {
  failed = true;
  console.error(`FAIL  the drill stopped: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (server) {
    try { process.kill(-server.pid, "SIGTERM"); } catch { /* already gone */ }
    await delay(500);
  }
  if (!keep) {
    try { psql(adminUrl, `DROP DATABASE IF EXISTS "${drillDb}" WITH (FORCE)`); } catch { /* reported below if it matters */ }
  }
  rmSync(work, { recursive: true, force: true });
}

console.log("\nHow long each step took:");
for (const [label, ms] of timings) console.log(`  ${(ms / 1000).toFixed(1).padStart(6)} s  ${label}`);
const total = timings.reduce((a, [, ms]) => a + ms, 0);
console.log(`  ${(total / 1000).toFixed(1).padStart(6)} s  in all, on ${new Date().toISOString().slice(0, 10)}`);
if (keep) console.log(`\nThe copy is left in ${drillDb}. Drop it with: DROP DATABASE "${drillDb}";`);
process.exit(failed ? 1 : 0);
