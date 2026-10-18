#!/usr/bin/env tsx
/**
 * RE-MEASURE WHAT "HOW WE KNOW" CLAIMS, AND WRITE IT DOWN WITH TODAY'S DATE.
 *
 *   npm run evidence
 *
 * Runs every claim in `lib/evidence/claims.ts` that needs no server, no
 * database and no paid key, reads the figure out of what the script printed,
 * and rewrites `lib/evidence/measured.json`. The two audits that compare the
 * app's forms with Ekilex (`audit:verbs`, `audit:cases`) need EKILEX_API_KEY;
 * without it they are skipped and the figure already in the file keeps the
 * date it was measured on, which the page prints. A claim marked `recorded`
 * needs a build or a database and is written into the table by hand.
 *
 * A figure this script cannot read out of the output is an error rather than a
 * guess: the file is left as it was and the script exits non-zero, because a
 * page of figures is only worth publishing if every one of them came from the
 * command printed beside it.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { CLAIMS, type Measured } from "../lib/evidence/claims";

const FILE = "lib/evidence/measured.json";
const today = new Date().toISOString().slice(0, 10);
const n = (s: string) => Number(s.replace(/,/g, ""));
const fmt = (x: number) => x.toLocaleString("en-GB");

/** How to read each claim's figure out of what its script printed. Throws if it cannot. */
const READERS: Record<string, { needsKey?: boolean; read: (out: string, code: number) => string }> = {
  verbs: {
    needsKey: true,
    read(out) {
      const checked = /Checked (\d[\d,]*) verbs/.exec(out);
      const agree = /(\d[\d,]*) agree on every derived slot/.exec(out);
      if (!checked || !agree) throw new Error("no verb count");
      const disagree = n(checked[1]!) - n(agree[1]!);
      if (!/No disagreements\./.test(out) && disagree === 0) throw new Error("disagreements listed but none counted");
      return `${fmt(n(checked[1]!))} verbs, ${disagree === 0 ? "none" : fmt(disagree)} disagreeing`;
    },
  },
  cases: {
    needsKey: true,
    read(out) {
      const checked = /Checked (\d[\d,]*) nominals/.exec(out);
      const agree = /(\d[\d,]*) agree on every case that could be compared/.exec(out);
      if (!checked || !agree) throw new Error("no noun count");
      const lemmas = [...new Set([...out.matchAll(/^ {2}(\S+)\s+[A-Z]+\s+DERIVED\s/gm)].map((m) => m[1]!))];
      const off = n(checked[1]!) - n(agree[1]!);
      const tail = off === 0 ? "none disagreeing" : `${fmt(off)} disagreeing (${lemmas.join(", ")})`;
      return `${fmt(n(checked[1]!))} nouns, ${tail}`;
    },
  },
  questions: {
    read(out, code) {
      const m = /Asked (\d[\d,]*) questions over (\d[\d,]*) entries/.exec(out);
      if (!m || code !== 0 || !/None of them prints its own answer/.test(out)) throw new Error("audit did not pass");
      return `${m[1]} questions over ${m[2]} entries, none printing its answer`;
    },
  },
  sense: {
    read(out, code) {
      const m = /Checked (\d[\d,]*) questions and sentences over (\d[\d,]*) entries/.exec(out);
      if (!m || code !== 0) throw new Error("audit did not pass");
      return `${m[1]} questions and sentences over ${m[2]} entries, none failing`;
    },
  },
  placement: {
    read(out) {
      const section = out.split(/Says "I don't know" when unsure/)[1];
      if (!section) throw new Error("no honest-learner table");
      const rows = [...section.matchAll(/^(pre-A1|A1|A2|B1|B2|C1)\s+(\d+)%\s+(\d+)%\s+(\d+)%/gm)];
      if (rows.length !== 6) throw new Error(`expected six levels, read ${rows.length}`);
      const own = rows.map((r) => Number(r[2]));
      const above = Math.max(...rows.map((r) => Number(r[4])));
      return `At their own level ${Math.min(...own)}% to ${Math.max(...own)}% of the time across six levels, above it at most ${above}%`;
    },
  },
  typos: {
    read(out) {
      const at = (len: number) => {
        const m = new RegExp(`length ${len}: (\\d+) same-length 1-substitution pairs`).exec(out);
        if (!m) throw new Error(`no count at length ${len}`);
        return Number(m[1]);
      };
      return `${at(7)} pairs of real answers one letter apart at seven letters, ${at(8)} at eight`;
    },
  },
  licences: {
    read(out, code) {
      const m = /(\d[\d,]*) production packages/.exec(out);
      if (!m || code !== 0) throw new Error("license check did not pass");
      return `${m[1]} packages, none under a license that would bind the code`;
    },
  },
  invariants: {
    read(out, code) {
      const m = /All (\d[\d,]*) invariants hold\./.exec(out);
      if (!m || code !== 0) throw new Error("invariants did not all hold");
      return `${fmt(n(m[1]!))} checks, all holding`;
    },
  },
  unit: {
    read(out, code) {
      const tests = /Tests\s+(\d+) passed/.exec(out);
      const files = /Test Files\s+(\d+) passed/.exec(out);
      if (!tests || !files || code !== 0) throw new Error("unit suite did not pass");
      return `${fmt(Number(tests[1]))} tests in ${fmt(Number(files[1]))} files, all passing`;
    },
  },
};

const previous: Measured = JSON.parse(readFileSync(FILE, "utf8"));
const next: Record<string, { figure: string; on: string }> = { ...previous };
const hasKey = Boolean(process.env.EKILEX_API_KEY);
const errors: string[] = [];

for (const claim of CLAIMS) {
  if (claim.recorded) continue;
  const reader = READERS[claim.id];
  if (!reader) {
    errors.push(`${claim.id}: no reader for this claim in scripts/measure-evidence.ts`);
    continue;
  }
  if (reader.needsKey && !hasKey) {
    const kept = previous[claim.id];
    console.log(`skip  ${claim.id}: needs EKILEX_API_KEY; keeping ${kept ? `the figure from ${kept.on}` : "nothing"}`);
    continue;
  }
  const started = Date.now();
  const args = ["run", claim.script, ...(claim.args ? ["--", ...claim.args.split(" ")] : [])];
  const run = spawnSync("npm", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", EVIDENCE_MEASURING: "1" } });
  const out = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.replace(/\u001b\[[0-9;]*m/g, "");
  try {
    const figure = reader.read(out, run.status ?? 1);
    next[claim.id] = { figure, on: today };
    console.log(`ok    ${claim.id}: ${figure} (${((Date.now() - started) / 1000).toFixed(0)} s)`);
  } catch (error) {
    errors.push(`${claim.id}: ${error instanceof Error ? error.message : String(error)}\n${out.split("\n").slice(-12).join("\n")}`);
  }
}

if (errors.length) {
  console.error(`\nNot written. ${errors.length} figure(s) could not be read:\n\n${errors.join("\n\n")}`);
  process.exit(1);
}
const ordered = Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]]));
writeFileSync(FILE, `${JSON.stringify(ordered, null, 2)}\n`);
console.log(`\nWrote ${FILE}.`);
