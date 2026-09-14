/**
 * WHERE THE MODEL MONEY WENT, BY KIND, BY MODEL AND BY DAY.
 *
 * The ledger (`lib/usage/ledger.ts`) writes every call down so that a cap can
 * bind, and the Settings meter reads one learner's share of it back. Nothing
 * read the deployment's whole bill, so the only way to know whether the money
 * was going on scenes, on Anu or on the scanner was the provider's own
 * dashboard, which prices in its own units and says nothing about which of
 * this app's paths asked. A cost cannot be cut until it is attributed.
 *
 *   npm run report:spend                 # the last 30 days
 *   npm run report:spend -- --days 7
 *
 * TWO FIGURES PER LINE, AND THEY ARE NOT THE SAME NUMBER. "Booked" is what the
 * ledger charged, `costMicros` summed over the call, its settlement and any
 * release, which is what the daily cap saw and is the figure to compare against
 * `AI_DAILY_USD_GLOBAL`. "Priced" is the tokens the provider actually reported,
 * re-priced off `lib/usage/pricing.ts` today, which is what the vendor's
 * invoice should come to at the rates on file. Where the two disagree the table
 * is stale or a call was never settled, and both are worth knowing.
 *
 * OUTPUT IS PRICED APART FROM INPUT on purpose: every model here bills output at
 * four to six times its input rate, and a model that thinks before it writes
 * bills the thinking as output. A line whose output share is most of its cost
 * on a job that returns thirty tokens is a line paying for reasoning nobody
 * reads (`docs/21-situations.md`, `npm run eval:thinking`).
 *
 * A COMMAND RATHER THAN A SCREEN, for the reason `report:impact` gives: it reads
 * the whole deployment, and an operator running it has the database password.
 * It names no learner, and it may not grow a per-owner section: one person's
 * spend beside their id is a record of who was awake and when.
 */
import { prisma } from "../lib/db";
import { estimateCostMicros } from "../lib/usage/pricing";

const PENDING = "pending";

interface Row {
  day: string;
  kind: string;
  model: string;
  entry: string;
  rows: number;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
}

function days(): number {
  const at = process.argv.indexOf("--days");
  const n = at >= 0 ? Number(process.argv[at + 1]) : 30;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

function usd(micros: number): string {
  return `$${(micros / 1e6).toFixed(4)}`;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function lpad(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

/** A model's share of the bill, from the tokens it reported, in and out apart. */
interface ModelLine {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  inputMicros: number;
  outputMicros: number;
}

function priceApart(model: string, inputTokens: number, outputTokens: number) {
  return {
    inputMicros: estimateCostMicros(model, inputTokens, 0),
    outputMicros: estimateCostMicros(model, 0, outputTokens),
  };
}

async function main() {
  const window = days();
  const since = new Date(Date.now() - window * 86_400_000);
  const sinceDay = since.toISOString().slice(0, 10);

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "day", "kind", "model", "entry",
           count(*)::int AS "rows",
           coalesce(sum("inputTokens"), 0)::int AS "inputTokens",
           coalesce(sum("outputTokens"), 0)::int AS "outputTokens",
           coalesce(sum("costMicros"), 0)::int AS "costMicros"
    FROM "UsageEvent"
    WHERE "day" >= ${sinceDay}
    GROUP BY "day", "kind", "model", "entry"
    ORDER BY "day" ASC, "kind" ASC, "model" ASC, "entry" ASC
  `;

  console.log(`Model spend over the last ${window} days (since ${sinceDay}), read ${new Date().toISOString().slice(0, 10)}.`);
  console.log("Booked is what the ledger charged and the cap saw; priced is the reported tokens at today's rates.\n");

  if (rows.length === 0) {
    console.log("No calls in the window. Nothing was spent, or the ledger was never reached.");
    return;
  }

  /* By kind: calls that happened, and what the cap charged for them. */
  const byKind = new Map<string, { calls: number; released: number; booked: number; priced: number }>();
  const byModel = new Map<string, ModelLine>();
  const byDay = new Map<string, { booked: number; priced: number; calls: number }>();

  for (const row of rows) {
    const kind = byKind.get(row.kind) ?? { calls: 0, released: 0, booked: 0, priced: 0 };
    const day = byDay.get(row.day) ?? { booked: 0, priced: 0, calls: 0 };
    kind.booked += row.costMicros;
    day.booked += row.costMicros;
    if (row.entry === "CALL") { kind.calls += row.rows; day.calls += row.rows; }
    if (row.entry === "RELEASE") { kind.released += row.rows; day.calls -= row.rows; }

    /*
      A row naming a real model carries the tokens the provider reported: a
      settlement, or a call written straight through with no reservation in
      front of it. A `pending` row is the reservation itself and reports none.
    */
    if (row.model !== PENDING && (row.entry === "SETTLEMENT" || row.entry === "CALL")) {
      const priced = priceApart(row.model, row.inputTokens, row.outputTokens);
      const line = byModel.get(row.model) ?? {
        model: row.model, calls: 0, inputTokens: 0, outputTokens: 0, inputMicros: 0, outputMicros: 0,
      };
      line.calls += row.rows;
      line.inputTokens += row.inputTokens;
      line.outputTokens += row.outputTokens;
      line.inputMicros += priced.inputMicros;
      line.outputMicros += priced.outputMicros;
      byModel.set(row.model, line);
      kind.priced += priced.inputMicros + priced.outputMicros;
      day.priced += priced.inputMicros + priced.outputMicros;
    }
    byKind.set(row.kind, kind);
    byDay.set(row.day, day);
  }

  console.log("BY KIND OF CALL");
  console.log(`  ${pad("kind", 8)} ${lpad("calls", 7)} ${lpad("released", 9)} ${lpad("booked", 10)} ${lpad("priced", 10)}`);
  for (const [kind, k] of [...byKind].sort((a, b) => b[1].booked - a[1].booked)) {
    console.log(`  ${pad(kind, 8)} ${lpad(String(k.calls - k.released), 7)} ${lpad(String(k.released), 9)} ${lpad(usd(k.booked), 10)} ${lpad(usd(k.priced), 10)}`);
  }

  console.log("\nBY MODEL, priced off the reported tokens (output is where a thinking model spends)");
  console.log(`  ${pad("model", 28)} ${lpad("calls", 6)} ${lpad("in tok", 10)} ${lpad("out tok", 9)} ${lpad("in $", 9)} ${lpad("out $", 9)} ${lpad("per call", 9)} ${lpad("out share", 9)}`);
  for (const line of [...byModel.values()].sort((a, b) => (b.inputMicros + b.outputMicros) - (a.inputMicros + a.outputMicros))) {
    const total = line.inputMicros + line.outputMicros;
    const share = total > 0 ? `${Math.round((line.outputMicros / total) * 100)}%` : "n/a";
    const per = line.calls > 0 ? usd(total / line.calls) : "n/a";
    console.log(`  ${pad(line.model, 28)} ${lpad(String(line.calls), 6)} ${lpad(String(line.inputTokens), 10)} ${lpad(String(line.outputTokens), 9)} ${lpad(usd(line.inputMicros), 9)} ${lpad(usd(line.outputMicros), 9)} ${lpad(per, 9)} ${lpad(share, 9)}`);
  }

  console.log("\nBY DAY");
  console.log(`  ${pad("day", 11)} ${lpad("calls", 6)} ${lpad("booked", 10)} ${lpad("priced", 10)}`);
  let bookedAll = 0;
  let pricedAll = 0;
  for (const [day, d] of [...byDay].sort()) {
    bookedAll += d.booked;
    pricedAll += d.priced;
    console.log(`  ${pad(day, 11)} ${lpad(String(d.calls), 6)} ${lpad(usd(d.booked), 10)} ${lpad(usd(d.priced), 10)}`);
  }
  console.log(`  ${pad("total", 11)} ${lpad("", 6)} ${lpad(usd(bookedAll), 10)} ${lpad(usd(pricedAll), 10)}`);
  console.log(`\nAbout ${usd(bookedAll / window)} a day booked. The caps are AI_DAILY_USD_GLOBAL and the per-kind`);
  console.log("AI_DAILY_USD_* variables (lib/usage/quota.ts); a day above them is a day the cap did not bind.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
