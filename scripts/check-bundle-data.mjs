#!/usr/bin/env node
/**
 * Fails the build if the shipped dictionary data reached the browser bundle.
 *
 * `prisma/data/` is what the seed loads: the course harvest, the Wiktionary
 * expansion and the English line for every attested sentence, a few megabytes
 * between them. Every one of those is read on the server. None of it belongs
 * in `.next/static`, and for a while all of the harvest was there: the
 * signed-in shell mounts `components/course/ModuleScope.tsx`, which took three
 * small helpers from the `lib/course` barrel, and the barrel re-exports
 * `build.ts`, which imports the harvest and runs `buildProgrammes()` when it
 * loads. A side effect at the top of a module is one thing tree-shaking cannot
 * remove, so every signed-in page downloaded 916 KB of forms, usages and
 * Russian and Ukrainian glosses, and built all 289 evenings of the course on
 * the main thread before anybody could press anything.
 *
 * A source check cannot say this. Which import survives to the browser is
 * decided by the bundler, which drops a module nothing on the client calls
 * into: the English translations are reachable from fifteen client files by
 * import and are in no chunk at all. So this asks the bundle. It samples
 * strings that exist only in the data files, never in the app's own source,
 * and fails on any that the browser would download.
 *
 * Run after `next build`, which is where the secrets job runs it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STATIC = ".next/static";
/** How many strings each file contributes, spread evenly through it. */
const PER_FILE = 300;
/** Long enough to be a sentence rather than a word some screen also prints. */
const MIN_LENGTH = 24;

function walk(dir, keep) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(full)) out.push(full);
  }
  return out;
}

function spread(values) {
  const usable = [...new Set(values)].filter((s) => s.length >= MIN_LENGTH && !/["\\\n`$]/.test(s));
  if (usable.length <= PER_FILE) return usable;
  const step = usable.length / PER_FILE;
  return Array.from({ length: PER_FILE }, (_, i) => usable[Math.floor(i * step)]);
}

/** Every double-quoted literal in a generated TypeScript data file. */
function literals(file) {
  const out = [];
  for (const m of readFileSync(file, "utf8").matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) out.push(m[1]);
  return out;
}

const expanded = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8"));
const SOURCES = {
  "prisma/data/harvested.ts": spread(literals("prisma/data/harvested.ts")),
  "prisma/data/expanded.json": spread(expanded.flatMap((e) => (e.examples ?? []).map((x) => x.et))),
  "prisma/data/example-english.json": spread(
    Object.values(JSON.parse(readFileSync("prisma/data/example-english.json", "utf8"))),
  ),
};

// A string the app's own source also holds would be found in the bundle for a
// reason that has nothing to do with the data file, such as a sentence pinned
// as a grammar example, so those are not samples.
const own = walk(".", (f) => /\.(ts|tsx|mjs)$/.test(f) && /^(app|lib|components)\//.test(f.replace(/^\.\//, "")))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
for (const [file, samples] of Object.entries(SOURCES)) {
  SOURCES[file] = samples.filter((s) => !own.includes(s));
}

let failed = false;
for (const [file, samples] of Object.entries(SOURCES)) {
  if (samples.length < 100) {
    console.error(`::error::only ${samples.length} samples from ${file}, so this stopped looking`);
    failed = true;
  }
}

const chunks = walk(STATIC, (f) => /\.(js|mjs|json|txt)$/.test(f));
if (chunks.length < 20) {
  console.error(`::error::only ${chunks.length} files under ${STATIC}. Run next build first.`);
  process.exit(1);
}
const escaped = (s) => s.replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
for (const chunk of chunks) {
  const text = readFileSync(chunk, "utf8");
  for (const [file, samples] of Object.entries(SOURCES)) {
    const hit = samples.find((s) => text.includes(s) || text.includes(escaped(s)));
    if (hit) {
      console.error(`::error::${chunk} holds ${file}, which every page loading it downloads. It carries "${hit}".`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
const total = Object.values(SOURCES).reduce((n, s) => n + s.length, 0);
console.log(`None of ${total} strings from prisma/data is in ${chunks.length} files under ${STATIC}.`);
