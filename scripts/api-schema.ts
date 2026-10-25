/**
 * Writes `public/api/v1.schema.json` from the zod schemas in `lib/api/`, and
 * with `--baseline` adds every newly shipped route to
 * `lib/api/fixtures/v1-baseline.json` without touching an entry already there.
 *
 *   npm run api:schema
 *   npm run api:schema -- --baseline
 *
 * A unit test fails when the committed schema file is not what this writes, so
 * run it after changing a schema in `lib/api/contract.ts` or `lib/api/draft.ts`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { grownBaseline, BASELINE_COMMENT, type Baseline } from "../lib/api/baseline";
import { publishedSchemaText } from "../lib/api/schema";

const SCHEMA_FILE = "public/api/v1.schema.json";
const BASELINE_FILE = "lib/api/fixtures/v1-baseline.json";

writeFileSync(SCHEMA_FILE, publishedSchemaText());
console.log(`Wrote ${SCHEMA_FILE}.`);

if (process.argv.includes("--baseline")) {
  const previous: Baseline = existsSync(BASELINE_FILE)
    ? (JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline)
    : { $comment: BASELINE_COMMENT, version: 1, routes: {} };
  const next = grownBaseline(previous);
  const added = Object.keys(next.routes).filter((key) => !(key in previous.routes));
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(added.length > 0 ? `Added to the baseline: ${added.join(", ")}.` : "The baseline already holds every shipped route.");
}
