#!/usr/bin/env node
/**
 * THE JAVASCRIPT A FIRST VISIT DOWNLOADS, AND HOW MUCH OF IT IS CYRILLIC.
 *
 * The landing page is the first thing a stranger meets, and for a while every
 * visitor to it downloaded the whole Russian and Ukrainian interface: one
 * chunk of 665 KB gzipped, 695,000 Cyrillic characters, for somebody reading
 * English on a phone. Nothing about the source said so, because which module
 * survives to the browser is the bundler's decision, so this asks the build.
 *
 * Two ways to run it:
 *
 *   node scripts/check-landing-weight.mjs
 *       Reads the prerendered landing pages out of the build directory and the
 *       scripts they name out of `.next/static`. Needs no server, which is what
 *       lets CI run it straight after the build in the secrets job, beside
 *       `check:bundle`. The three landing pages are static, so the build has
 *       written exactly the HTML a visitor receives.
 *
 *   node scripts/check-landing-weight.mjs http://localhost:3000 [path ...]
 *       Fetches the pages from a running server, for a route the build does
 *       not prerender (a signed-in page, say).
 *
 * `--budget` fails the run on the limits below; without it the script reports
 * and exits 0, which is the shape for measuring a change before and after.
 *
 * WHAT IT COUNTS. The scripts the HTML names, which is what loads before the
 * page can answer a tap, and the HTML itself, which on a Russian or Ukrainian
 * landing page now carries that page's own lines. A chunk loaded later by a dynamic import is not here
 * on purpose: that is a download somebody's own press asked for.
 */
import { gzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const budget = args.includes("--budget");
const positional = args.filter((a) => !a.startsWith("--"));
const base = positional[0]?.startsWith("http") ? positional[0].replace(/\/$/, "") : null;
const paths = (base ? positional.slice(1) : positional).length
  ? (base ? positional.slice(1) : positional)
  : ["/welcome", "/welcome/ru", "/welcome/uk"];
const DIST = process.env.NEXT_DIST_DIR || ".next";
const CYRILLIC = /[Ѐ-ӿ]/g;

/**
 * THE LIMITS, set from the first clean run after the tables stopped shipping
 * with every page (docs/35-launch-quick-wins.md, QW-8) plus about a quarter.
 * Measured on 2026-10-14: 239 KB gzip of script on all three pages, the
 * largest script 72 KB, 677 Cyrillic characters (the language picker's own
 * names and the machine-translation notice), and HTML of 36 KB in English and
 * 57 KB in Russian or Ukrainian, which carries that page's own lines.
 *
 * The HTML limit is what catches the other way back: a page handed the whole
 * language as a prop would put 300 KB into its HTML rather than its scripts.
 */
const LIMITS = {
  cyrillicEnglish: 1500,
  scriptKb: 300,
  largestKb: 120,
  htmlKb: 90,
};

async function text(path) {
  if (base) {
    const res = await fetch(base + path);
    if (!res.ok) throw new Error(`${path} answered ${res.status}`);
    return res.text();
  }
  const file = join(DIST, "server", "app", `${path.replace(/^\//, "")}.html`);
  if (!existsSync(file)) {
    throw new Error(`${file} does not exist: build first, or pass a server address for a page the build does not prerender`);
  }
  return readFileSync(file, "utf8");
}

async function bytes(url) {
  if (base) return Buffer.from(await (await fetch(base + url)).arrayBuffer());
  return readFileSync(join(DIST, url.replace(/^\/_next\//, "").split("?")[0]));
}

const kb = (n) => Math.round(n / 1024);
const failures = [];

for (const path of paths) {
  const html = await text(path);
  const urls = [...new Set(
    [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+?\.js[^"]*)"/g)].map((m) => m[1]),
  )];
  let gz = 0;
  let raw = 0;
  let cyr = 0;
  let largest = { name: "", gz: 0 };
  for (const url of urls) {
    const buf = await bytes(url);
    const g = gzipSync(buf).length;
    raw += buf.length;
    gz += g;
    cyr += (buf.toString("utf8").match(CYRILLIC) ?? []).length;
    if (g > largest.gz) largest = { name: url.split("/").pop(), gz: g };
  }
  const page = gzipSync(Buffer.from(html)).length;
  console.log(
    `${path.padEnd(14)} html ${`${kb(page)} KB`.padStart(6)} gzip  `
      + `${String(urls.length).padStart(2)} scripts  ${`${kb(gz)} KB`.padStart(7)} gzip  `
      + `${`${kb(raw)} KB`.padStart(8)} raw  ${String(cyr).padStart(7)} Cyrillic chars  `
      + `largest ${kb(largest.gz)} KB (${largest.name})`,
  );
  if (urls.length === 0) failures.push(`${path} names no script at all, which is a page this script cannot read`);
  const english = !/\/(ru|uk)(\/|$)/.test(path);
  if (english && cyr > LIMITS.cyrillicEnglish) {
    failures.push(`${path}: ${cyr} Cyrillic characters for a visitor reading English (limit ${LIMITS.cyrillicEnglish})`);
  }
  if (kb(gz) > LIMITS.scriptKb) failures.push(`${path}: ${kb(gz)} KB gzip of script (limit ${LIMITS.scriptKb})`);
  if (kb(largest.gz) > LIMITS.largestKb) {
    failures.push(`${path}: one script is ${kb(largest.gz)} KB gzip, ${largest.name} (limit ${LIMITS.largestKb})`);
  }
  if (kb(page) > LIMITS.htmlKb) failures.push(`${path}: the page itself is ${kb(page)} KB gzip (limit ${LIMITS.htmlKb})`);
}

if (budget) {
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exit(1);
  }
  console.log("Within the weight budget.");
}
