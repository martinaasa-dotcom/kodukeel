/**
 * Prints, or with --write writes, lib/course/lessons/fixtures/accepted.json:
 * every sentence the marker's general rules accept on the real lessons
 * (`lib/course/lessons/sweep.ts`). Read what changed before writing it;
 * `sweep.test.ts` fails until the file and the rules agree.
 *
 *   npx tsx scripts/sweep-acceptance.ts           what changed against the file
 *   npx tsx scripts/sweep-acceptance.ts --write   write it
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sweepAcceptance } from "../lib/course/lessons/sweep";

const FILE = path.join(process.cwd(), "lib", "course", "lessons", "fixtures", "accepted.json");

const now = sweepAcceptance();
const was = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as Record<string, string[]>) : {};
for (const key of ["combined", "insertions", "parallels"] as const) {
  const old = new Set(was[key] ?? []);
  const fresh = new Set(now[key]);
  const added = now[key].filter((s) => !old.has(s));
  const gone = (was[key] ?? []).filter((s) => !fresh.has(s));
  console.log(`${key}: ${now[key].length} (was ${old.size}), ${added.length} new, ${gone.length} gone`);
  for (const s of added) console.log(`  + ${s}`);
  for (const s of gone) console.log(`  - ${s}`);
}
console.log(`tried ${now.tried} pronouns put in`);
if (process.argv.includes("--write")) {
  writeFileSync(FILE, `${JSON.stringify({ combined: now.combined, insertions: now.insertions, parallels: now.parallels }, null, 1)}\n`);
  console.log(`wrote ${FILE}`);
}
