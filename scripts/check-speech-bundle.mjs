#!/usr/bin/env node
/**
 * Fails the build if the speech engine reached a page's first load
 * (docs/41-fifth-batch.md, section 3: "The engine is never in a page's first load").
 *
 * The sherpa-onnx runtime is several megabytes of WebAssembly glue and the
 * model is 71 MB, and both are fetched only when somebody presses a
 * microphone: the worker `importScripts` them from `/asr/runtime/`, which
 * `scripts/vendor-asr-runtime.mjs` writes into `public/` beside the bundle
 * rather than into it. What a page downloads before anybody presses anything
 * is `.next/static`, so this asks that directory for strings that exist only
 * in the runtime and the worker, and fails on any it finds. A source check
 * could not say this, because whether an import survives to the browser is
 * the bundler's decision.
 *
 * Run after `next build`, beside `scripts/check-bundle-data.mjs`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STATIC = ".next/static";
/** Names only the vendored runtime and the speech worker carry. */
const RUNTIME_MARKS = [
  "SherpaOnnxCreateOnlineRecognizer",
  "createOnlineRecognizer",
  "sherpa-onnx-wasm",
  "_SherpaOnnxDecodeOnlineStream",
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|mjs|wasm)$/.test(name)) out.push(full);
  }
  return out;
}

if (!existsSync(STATIC)) {
  console.error(`${STATIC} is missing: run next build first.`);
  process.exit(1);
}
const files = walk(STATIC);
if (files.length < 10) {
  console.error(`only ${files.length} files under ${STATIC}, which is not a build this check can vouch for.`);
  process.exit(1);
}
const found = [];
for (const file of files) {
  if (file.endsWith(".wasm")) {
    found.push(`${file}: a WebAssembly file in the page bundle`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const mark of RUNTIME_MARKS) if (text.includes(mark)) found.push(`${file}: ${mark}`);
}
if (found.length > 0) {
  console.error("The speech engine is in a page's first load:\n" + found.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(`The speech engine is in no page's first load (${files.length} files read).`);
