import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE BROWSER CARRIES ONE LANGUAGE, AND ONLY WHEN THE LEARNER READS IT.
 *
 * Every page, the landing page a stranger meets first among them, used to
 * download the whole Russian and Ukrainian interface in one 765 KB chunk,
 * because `lib/copy/locale.ts` imported every translation area and ninety-nine
 * client files imported `locale.ts`. The tables are handed over per language
 * now (docs/35-launch-quick-wins.md, QW-8 and QW-9): `#i18n-tables` resolves to
 * an empty registry in a browser and to the full merge everywhere else, and
 * the learner's language arrives as one chunk (`lib/copy/i18n/load.ts`).
 *
 * The way back is one import: a client file, or anything a client file reaches,
 * importing an area, the merged index, the counted nouns or the full tables
 * module puts both languages back in every bundle that reaches it, silently.
 * `npm run check:landing` reads the landing page's bundle and would see it
 * there; this sees it on every page, before a build. The graph is walked rather
 * than one file's own imports, which is the shape that let the course harvest
 * reach every signed-in page through a barrel once.
 *
 * Three arms: the walk, the condition that makes `#i18n-tables` mean two
 * things, and the provider calling `use` after its hooks, which is what React
 * #467 was in the production build of three screens.
 */

const FULL_TABLES = [
  /^lib\/copy\/i18n\/index\.ts$/,
  /^lib\/copy\/i18n\/tables\.ts$/,
  /^lib\/copy\/i18n\/merged\.ts$/,
  /^lib\/copy\/i18n\/slice\.ts$/,
  /^lib\/copy\/i18n\/counted\.ts$/,
  /^lib\/copy\/i18n\/ru\.ts$/,
  /^lib\/copy\/i18n\/uk\.ts$/,
  /^lib\/copy\/i18n\/areas\//,
];

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec === "#i18n-tables") return "lib/copy/i18n/tables.browser.ts";
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate) && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

/** The modules a file loads at run time: static imports and re-exports, not types, not dynamic imports. */
function importsOf(file: string, code: (file: string) => string): string[] {
  const source = code(file);
  const out: string[] = [];
  for (const m of source.matchAll(/(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g)) {
    if (m[2]) continue;
    out.push(m[3]!);
  }
  return out;
}

export default function theBrowserCarriesOneLanguage({ check, code, APP, COMPONENTS, LIB }: InvariantKit) {
  check("no module a client file reaches imports a translation area or the full tables", () => {
    const clients = [...APP, ...COMPONENTS, ...LIB].filter(
      (f) => /\.(ts|tsx)$/.test(f) && /^\s*["']use client["']/.test(readFileSync(f, "utf8")),
    );
    assert.ok(clients.length > 150, `only ${clients.length} client files found, so the search stopped matching`);
    const seen = new Map<string, string>();
    const queue = clients.map((f) => [f, f] as const);
    for (const [f] of queue) seen.set(f, f);
    const offenders: string[] = [];
    while (queue.length) {
      const [file, root] = queue.shift()!;
      if (FULL_TABLES.some((pattern) => pattern.test(file))) {
        offenders.push(`${file}, reached from ${root}`);
        continue;
      }
      for (const spec of importsOf(file, code)) {
        const next = resolve(file, spec);
        if (next && !seen.has(next)) {
          seen.set(next, root);
          queue.push([next, root] as const);
        }
      }
    }
    assert.ok(seen.size > 400, `only ${seen.size} modules reached, so the walk stopped resolving imports`);
    assert.ok(seen.has("lib/copy/locale.ts"), "the walk never reached lib/copy/locale.ts, so it is not following imports");
    assert.deepEqual(
      [...new Set(offenders)].slice(0, 10),
      [],
      `${[...new Set(offenders)].slice(0, 10).join("\n")}\na browser bundle would carry every translation; read a line through \`tr\`, or hand a page its slice with \`areaTable\` on the server`,
    );
  });

  check("`#i18n-tables` is the registry in a browser and the full tables everywhere else", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { imports?: Record<string, Record<string, string>> };
    assert.deepEqual(pkg.imports?.["#i18n-tables"], {
      browser: "./lib/copy/i18n/tables.browser.ts",
      default: "./lib/copy/i18n/tables.ts",
    });
    assert.match(code("lib/copy/locale.ts"), /from "#i18n-tables"/);
    assert.doesNotMatch(code("lib/copy/locale.ts"), /from "\.\/i18n"|from "\.\/i18n\/index"/);
  });

  /*
    THE SERVER'S TABLE READS THE GENERATED FILE AND NEVER THE AREAS.

    Every route reaches `#i18n-tables` through `app/actions.ts`, so whatever
    `tables.ts` imports is compiled on every cold start of every route, twice,
    once for the server render and once for the client render. Importing the
    areas there put 7.4 MB of Russian and Ukrainian in front of every English
    page; the merge lives in `merged.ts`, for the generator and the tests.
  */
  check("the server's translation table reads the generated file, not the areas", () => {
    const tables = code("lib/copy/i18n/tables.ts");
    assert.match(tables, /generated/, "lib/copy/i18n/tables.ts no longer reads the generated file");
    for (const spec of importsOf("lib/copy/i18n/tables.ts", code)) {
      assert.ok(
        !/(?:^|\/)(?:index|merged|slice|counted|ru|uk)$|\/areas\//.test(spec) && spec !== "./",
        `lib/copy/i18n/tables.ts imports ${spec}, which puts every area of both languages on every cold start`,
      );
    }
    const config = readFileSync("next.config.ts", "utf8");
    assert.match(config, /lib\/copy\/i18n\/generated/, "next.config.ts no longer traces the generated tables into the deployment");
  });

  check("the locale provider waits for its table after its hooks, not before", () => {
    const source = code("components/Locale.tsx");
    const provider = source.slice(source.indexOf("export function LocaleProvider"));
    const waits = provider.indexOf("use(loadTable(");
    assert.ok(waits > 0, "the provider no longer waits for the table to load");
    for (const hook of ["useState(", "useCallback(", "useMemo("]) {
      const at = provider.indexOf(hook);
      assert.ok(at > 0 && at < waits, `${hook} comes after the wait, which React replays into #467`);
    }
  });
}
