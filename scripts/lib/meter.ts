/**
 * EVERY HARNESS THAT ASKS A PAID MODEL SAYS WHAT IT SPENT, STOPS AT A BUDGET,
 * AND DOES NOT PAY TWICE FOR THE SAME QUESTION.
 *
 * The app is metered by its ledger and capped at a few dollars a day. The
 * scripts that measure it call the same models on the same key and were capped
 * by nothing: thirteen rounds of `scripts/critic-scenes.ts` on 2026-10-02,
 * ninety simulated conversations each, used up `gemini-3.8-flash`'s ten
 * thousand requests a day without one line saying what any of it cost, and a
 * session then scheduled a fourteenth. `installMeter` is called once at the top
 * of every script that reaches a provider, asserted, and does three things:
 *
 * 1. REPLAY. A model call whose request is byte for byte one this machine has
 *    already paid for is answered from `.cache/model-replay/`. Iterating on a
 *    fix is the case it is for: the critic replays ninety conversations, and
 *    every turn up to the first line the fix changed is the same question, so
 *    only the turns after it are bought. It also makes a before-and-after
 *    comparison a comparison of the change rather than of two samples. A call
 *    served off a Gemini cache entry is replayed inside `lib/tutor/geminiCache.ts`
 *    (`setReplayRecord`), before any entry is made, so a replayed turn writes
 *    nothing into Google's cache either. On by default where a script reads
 *    transcripts, off where it counts a rate over samples, since a sample
 *    replayed is not a second sample; `--fresh` and `--replay` turn it either
 *    way for one run.
 *
 * 2. BUDGET. A run buys nothing unless it is told how much it may spend:
 *    `--budget` dollars, or `KODUKEEL_BUDGET_USD`, which is how the critic
 *    hands each child its share. The default is nothing, and that is the
 *    point. The production ledger for the month to 2026-10-02 shows every
 *    model call the app made, to every learner, costing $0.27 in all, while
 *    the same key ran out of `gemini-3.8-flash`'s ten thousand requests in a
 *    day: the bill was the harnesses. A dollar a run by default made spending
 *    the thing that happens when nobody thinks about it, and thirteen runs is
 *    thirteen dollars. Past the budget a call is refused with a 402, which the
 *    chain reads as a provider out of credit, so the run finishes on the bank,
 *    keyless, and the summary says how many calls were refused and why. A run
 *    that was cut short is never a clean result.
 *
 *    AND EVERY RUN ON THIS MACHINE SHARES ONE DAY. A budget per run does not
 *    stop the fourteenth run, so each paid call is appended to
 *    `.cache/model-spend/<UTC day>.log` and a call that would start past
 *    `KODUKEEL_DAY_BUDGET_USD` (default `DEFAULT_DAY_BUDGET_USD`) is refused
 *    whatever the run's own budget says. Appended rather than rewritten, one
 *    line a call, because the critic runs its children at once and a file
 *    each of them read, added to and wrote back would lose their sums to one
 *    another. It is one machine's day and not the account's: sessions run in
 *    separate containers, so the ceiling that holds across all of them is the
 *    one Google enforces on the key (a quota set on its project), which is
 *    the operator's to set and is written down in CLAUDE.md.
 *
 * 3. THE BILL. On exit, one line: what was spent, on how many calls, how many
 *    the record answered free, and how many the budget refused, priced off
 *    `lib/usage/pricing.ts`, the table the ledger reads. On stdout, because the
 *    critic adds up its children's lines.
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cacheStorageAsInputTokens, estimateCostMicros, estimateTokens } from "../../lib/usage/pricing";
import { costOf, isModelCall, modelOf, namesCacheEntry, replayKeyOf, spentIn } from "../../lib/usage/harnessSpend";
import { CACHE_TTL_SECONDS, isCacheEntryUrl, setReplayRecord } from "../../lib/tutor/geminiCache";

/** What one run may spend where nobody said otherwise: nothing. Spending is a number somebody chose. */
export const DEFAULT_BUDGET_USD = 0;

/** What every run on one machine may spend in a UTC day, added together, where nobody said otherwise. */
export const DEFAULT_DAY_BUDGET_USD = 2;

const REPLAY_DIR = join(process.cwd(), ".cache", "model-replay");
const SPEND_DIR = join(process.cwd(), ".cache", "model-spend");
const SUMMARY = "Model spend:";

export interface Meter {
  spentMicros: number;
  calls: number;
  replayed: number;
  refused: number;
  budgetMicros: number;
  dayBudgetMicros: number;
  /** Which ceiling refused the last call this run was refused, so the summary says why. */
  refusedBy: "run" | "day" | null;
  replay: boolean;
}

let installed: Meter | null = null;

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

function fileFor(key: string): string {
  const digest = createHash("sha256").update(key).digest("hex");
  return join(REPLAY_DIR, digest.slice(0, 2), `${digest}.json`);
}

function recall(key: string): { text: string; type: string } | null {
  try {
    return JSON.parse(readFileSync(fileFor(key), "utf8")) as { text: string; type: string };
  } catch {
    return null;
  }
}

function keep(key: string, text: string, type: string): void {
  const file = fileFor(key);
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify({ text, type }));
    renameSync(`${file}.tmp`, file);
  } catch {
    // A record that could not be written costs the next run a call, never this one its answer.
  }
}

function dayFile(now: Date): string {
  return join(SPEND_DIR, `${now.toISOString().slice(0, 10)}.log`);
}

/** What every run on this machine has spent today, in millionths of a dollar, off the shared log. */
export function spentTodayMicros(now: Date = new Date()): number {
  try {
    return readFileSync(dayFile(now), "utf8").split("\n").reduce((sum, line) => sum + (Number(line) || 0), 0);
  } catch {
    return 0;
  }
}

function noteSpend(micros: number): void {
  if (micros <= 0) return;
  try {
    mkdirSync(SPEND_DIR, { recursive: true });
    appendFileSync(dayFile(new Date()), `${Math.round(micros)}\n`);
  } catch {
    // A line that could not be written loosens the day's ceiling by one call; it never fails the call.
  }
}

/**
 * Patches this process's `fetch`. `replay` is the script's own default; the
 * command line wins. Returns the meter so a script can read it, which the
 * critic does to add its own spend to its children's.
 */
export function installMeter(defaults: { replay: boolean }): Readonly<Meter> {
  if (installed) return installed;
  const asked = Number(flag("budget") ?? process.env.KODUKEEL_BUDGET_USD ?? DEFAULT_BUDGET_USD);
  const replay = process.argv.includes("--fresh")
    ? false
    : process.argv.includes("--replay") || process.env.KODUKEEL_REPLAY === "1"
      ? true
      : process.env.KODUKEEL_REPLAY === "0" ? false : defaults.replay;
  const day = Number(process.env.KODUKEEL_DAY_BUDGET_USD ?? DEFAULT_DAY_BUDGET_USD);
  const meter: Meter = {
    spentMicros: 0, calls: 0, replayed: 0, refused: 0,
    budgetMicros: Math.round((Number.isFinite(asked) && asked >= 0 ? asked : DEFAULT_BUDGET_USD) * 1e6),
    dayBudgetMicros: Math.round((Number.isFinite(day) && day >= 0 ? day : DEFAULT_DAY_BUDGET_USD) * 1e6),
    refusedBy: null,
    replay,
  };
  installed = meter;

  if (replay) {
    setReplayRecord({
      get: (key) => {
        const kept = recall(`gemini-cached\n${key}`);
        if (kept) meter.replayed += 1;
        return kept?.text ?? null;
      },
      put: (key, body) => keep(`gemini-cached\n${key}`, body, "application/json"),
    });
  }

  const real = globalThis.fetch.bind(globalThis);
  const over = (): boolean => {
    if (meter.spentMicros >= meter.budgetMicros) meter.refusedBy = "run";
    else if (spentTodayMicros() >= meter.dayBudgetMicros) meter.refusedBy = "day";
    else return false;
    return true;
  };
  const refuse = () => {
    meter.refused += 1;
    return new Response(JSON.stringify({ error: { message: "The harness budget is spent." } }), { status: 402 });
  };
  const spend = (micros: number) => {
    meter.spentMicros += micros;
    noteSpend(micros);
  };

  globalThis.fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const body = typeof init.body === "string" ? init.body : "";

    /* Writing a prompt into Google's cache is paid for: the write at base and the term of storage it buys. */
    if (isCacheEntryUrl(url) && method === "POST") {
      if (over()) return refuse();
      const res = await real(input, init);
      if (res.ok) {
        const made = await res.clone().json().catch(() => ({})) as { usageMetadata?: { totalTokenCount?: number } };
        const tokens = made.usageMetadata?.totalTokenCount ?? 0;
        const model = modelOf(url, body);
        spend(estimateCostMicros(model, tokens + cacheStorageAsInputTokens(model, tokens, CACHE_TTL_SECONDS), 0));
      }
      return res;
    }

    if (!isModelCall(url, method)) return real(input, init);

    /* A call off a cache entry is replayed by `geminiCache` itself, keyed on the prompt; anything else here. */
    const key = replay && !namesCacheEntry(body) ? replayKeyOf(url, body) : null;
    if (key) {
      const kept = recall(key);
      if (kept) {
        meter.replayed += 1;
        return new Response(kept.text, { status: 200, headers: { "content-type": kept.type } });
      }
    }
    if (over()) return refuse();

    const res = await real(input, init);
    meter.calls += 1;
    const text = await res.text();
    const spent = spentIn(text);
    const model = modelOf(url, body);
    spend(spent ? costOf(model, spent) : estimateCostMicros(model, estimateTokens(body), estimateTokens(text)));
    if (res.ok && key) keep(key, text, res.headers.get("content-type") ?? "application/json");
    return new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers });
  };

  process.on("exit", () => {
    if (meter.calls + meter.replayed + meter.refused === 0) return;
    const parts = [`${meter.calls} calls`];
    if (meter.replayed > 0) parts.push(`${meter.replayed} answered from the replay record`);
    if (meter.refused > 0) parts.push(refusalNote(meter));
    console.log(`\n${SUMMARY} $${(meter.spentMicros / 1e6).toFixed(4)} (${parts.join(", ")}).`);
  });
  return meter;
}

/** Why a run was refused, in the words the summary line prints and the critic reads back (`/(\d+) refused/`). */
export function refusalNote(meter: Pick<Meter, "refused" | "refusedBy" | "budgetMicros" | "dayBudgetMicros">): string {
  if (meter.refusedBy === "day") {
    return `${meter.refused} refused at this machine's $${(meter.dayBudgetMicros / 1e6).toFixed(2)} day ceiling `
      + "(KODUKEEL_DAY_BUDGET_USD), so this run is partial";
  }
  if (meter.budgetMicros === 0) {
    return `${meter.refused} refused because no budget was given, so this run is partial; `
      + "pass --budget with the dollars it may spend";
  }
  return `${meter.refused} refused at the $${(meter.budgetMicros / 1e6).toFixed(2)} budget, so this run is partial`;
}

/** Reads the summary line a child printed, for a parent adding up its children (`critic-scenes.ts`). */
export function spendIn(output: string): { usd: number; refused: number } | null {
  const line = output.split("\n").reverse().find((l) => l.startsWith(SUMMARY));
  if (!line) return null;
  const usd = Number(/\$(\d+(?:\.\d+)?)/.exec(line)?.[1] ?? NaN);
  const refused = Number(/(\d+) refused/.exec(line)?.[1] ?? 0);
  return Number.isFinite(usd) ? { usd, refused } : null;
}
