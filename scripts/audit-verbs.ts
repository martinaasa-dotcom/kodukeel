/**
 * Checks the verb forms this app derives against the ones Ekilex records.
 *
 *   npx tsx scripts/audit-verbs.ts             # every verb in the built dictionary
 *   npx tsx scripts/audit-verbs.ts --limit 50  # a sample
 *
 * `lib/estonian/conjugate.ts` builds the present tense, the negative, the
 * conditional and the singular imperative from the stored first person. That
 * is a rule, and a rule is only worth shipping once it has been run against
 * every word it will be applied to and the exceptions written down. This does
 * that: for every verb the dictionary ships with an Ekilex word id, it fetches
 * the full paradigm the Institute records, derives the same slots, and prints
 * every disagreement by lemma and slot.
 *
 * Needs EKILEX_API_KEY and the network. Responses are cached under
 * .ekilex-cache/ in the same files the harvest uses, so re-running costs
 * Ekilex nothing, and a source that will not answer is reported as unchecked
 * rather than written down as a miss.
 */
import { PARTS } from "../lib/copy/values";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { HARVESTED } from "../prisma/data/harvested";
import expanded from "../prisma/data/expanded.json";
import { derivedVerbForms, type DerivedVerbCode } from "../lib/estonian/conjugate";
import { ekilexRequest } from "../lib/ekilex/client";
import { ekilexJobs } from "./lib/ekilexJobs";

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".ekilex-cache");
const API_KEY = process.env.EKILEX_API_KEY ?? "";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity;

interface RawDetails {
  word?: { wordId: number; wordValue: string; paradigms?: { forms?: { value: string; morphCode: string }[] }[] };
}

const cacheFile = (name: string) =>
  path.join(CACHE, `${Buffer.from(name, "utf8").toString("base64url")}.json`);

async function cached<T>(name: string, fn: () => Promise<T | null>): Promise<T | null> {
  const file = cacheFile(name);
  if (existsSync(file)) {
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch {
      /* a truncated entry is a miss */
    }
  }
  const value = await fn();
  if (value !== null) await writeFile(file, JSON.stringify(value));
  return value;
}

/**
 * One request through the gate in `lib/ekilex/client.ts`, which holds two in
 * flight, backs off on a 429 or a 5xx and gives up after three tries. A
 * refusal or a give-up is null, as it was.
 */
async function call<T>(pathname: string): Promise<T | null> {
  const answer = await ekilexRequest<T>(pathname);
  if (answer.kind === "answered") return answer.value;
  if (answer.kind === "failed") console.warn(`  ! giving up on ${pathname}: ${answer.reason}`);
  return null;
}

interface Verb {
  lemma: string;
  pres1sg: string;
  wordId: number;
}

function verbs(): Verb[] {
  const seen = new Set<string>();
  const out: Verb[] = [];
  for (const w of HARVESTED) {
    if (w.pos !== "VERB" || !w.parts.PRES_1SG || seen.has(w.lemma)) continue;
    seen.add(w.lemma);
    out.push({ lemma: w.lemma, pres1sg: w.parts.PRES_1SG, wordId: w.ekilexWordId });
  }
  for (const e of expanded as { lemma: string; pos: string; ekilexWordId?: number; forms: { formType: string; value: string }[] }[]) {
    if (e.pos !== "VERB" || !e.ekilexWordId || seen.has(e.lemma)) continue;
    const pres = e.forms.find((f) => f.formType === "PRES_1SG")?.value;
    if (!pres) continue;
    seen.add(e.lemma);
    out.push({ lemma: e.lemma, pres1sg: pres, wordId: e.ekilexWordId });
  }
  return out;
}

async function main() {
  if (!API_KEY) {
    console.error("EKILEX_API_KEY is not set; nothing can be checked.");
    process.exit(2);
  }
  await mkdir(CACHE, { recursive: true });

  const all = verbs().slice(0, LIMIT);
  console.log(`${all.length} verbs to check against Ekilex.\n`);

  let checked = 0;
  let unreachable = 0;
  let agreeing = 0;
  const disagreements: { lemma: string; code: string; derived: string; ekilex: string[] }[] = [];
  const uncovered: { lemma: string; reason: string }[] = [];
  const perSlot = new Map<string, { ok: number; bad: number }>();

  // Two at a time, the promise in docs/05-integrations.md section 1.4, unless asked past it.
  const WORKERS = ekilexJobs();
  let next = 0;
  async function worker() {
    while (next < all.length) {
      const verb = all[next++]!;
      const details = await cached<RawDetails>(`details-${verb.wordId}`, () =>
        call<RawDetails>(`/word/details/${verb.wordId}`),
      );
      const forms = details?.word?.paradigms?.flatMap((p) => p.forms ?? []) ?? [];
      if (!details || forms.length === 0) {
        unreachable++;
        continue;
      }
      checked++;
      const derived = derivedVerbForms({ lemma: verb.lemma, pres1sg: verb.pres1sg });
      if (derived.length === 0) {
        uncovered.push({ lemma: verb.lemma, reason: "rule declined to derive" });
        continue;
      }
      let clean = true;
      let compared = 0;
      for (const d of derived) {
        if (d.origin === "STORED") continue;
        const attested = forms.filter((f) => f.morphCode === d.morphCode).map((f) => f.value);
        if (attested.length === 0) continue; // Ekilex has no such slot for this word: nothing to compare.
        compared++;
        const slot = perSlot.get(d.morphCode) ?? { ok: 0, bad: 0 };
        if (attested.includes(d.value)) {
          slot.ok++;
        } else {
          slot.bad++;
          clean = false;
          disagreements.push({ lemma: verb.lemma, code: d.morphCode, derived: d.value, ekilex: attested });
        }
        perSlot.set(d.morphCode, slot);
      }
      if (compared === 0) {
        uncovered.push({ lemma: verb.lemma, reason: "Ekilex records none of the derived slots, so nothing was compared" });
        continue;
      }
      if (clean) agreeing++;
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));

  console.log(`Checked ${checked} verbs against attested paradigms; ${unreachable} could not be fetched.`);
  console.log(`${agreeing} agree on every derived slot that could be compared; ${uncovered.length} compared nothing or were declined.\n`);
  console.log("Per slot:");
  const codes: DerivedVerbCode[] = [
    "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3", "IndPrPs_",
    "KndPrSg1", "KndPrSg2", "KndPrPs", "KndPrPl1", "KndPrPl2", "KndPrPl3", "ImpPrSg2",
  ];
  for (const code of codes) {
    const s = perSlot.get(code) ?? { ok: 0, bad: 0 };
    console.log(`  ${code.padEnd(10)} ${String(s.ok).padStart(5)} agree ${String(s.bad).padStart(4)} disagree`);
  }
  if (uncovered.length) {
    console.log("\nDeclined:");
    for (const u of uncovered) console.log(`  ${u.lemma}: ${u.reason}`);
  }
  if (disagreements.length) {
    console.log(`\n${disagreements.length} disagreements:`);
    for (const d of disagreements) {
      console.log(`  ${d.lemma.padEnd(18)} ${d.code.padEnd(10)} derived ${d.derived.padEnd(22)} ekilex ${d.ekilex.join(PARTS)}`);
    }
    process.exitCode = 1;
  } else if (unreachable * 2 > checked + unreachable) {
    /*
      A run that could not read most of what it was asked about is not a pass,
      which is `audit:glosses`' own rule. With every request refused this
      printed "No disagreements." over nought checked and exited 0, a clean
      result nobody earned.
    */
    console.log(`\nFewer than half the verbs could be fetched, so this is not a pass either way.`);
    process.exitCode = 1;
  } else {
    console.log("\nNo disagreements.");
  }
}

void main();
