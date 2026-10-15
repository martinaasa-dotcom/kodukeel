import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * READING MODE ASKS THE DICTIONARY AND NOTHING ELSE (docs/38-third-batch.md, D13).
 *
 * A pasted letter from school is somebody's own text, and the page promises
 * it is read by the dictionary and kept nowhere. So nothing reading mode
 * imports, however many imports away, may reach the model chain or the
 * ledger, and the action itself may neither call a model nor write a row.
 * The graph is walked rather than one file's own imports read, which is the
 * shape that let a pure layer reach Prisma once without anybody seeing it.
 */
const ROOTS = ["app/(app)/read/page.tsx", "app/(app)/read/Reader.tsx", "lib/dict/glossed.ts", "lib/estonian/readingText.ts"];
const FORBIDDEN = /^lib\/(tutor|usage)\//;

function resolve(spec: string, from: string): string | null {
  const base = spec.startsWith("@/") ? spec.slice(2)
    : spec.startsWith(".") ? normalize(join(dirname(from), spec))
    : null;
  if (base === null) return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) {
    if (existsSync(candidate) && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

export default function readingAsksNoModel({ check, code }: InvariantKit) {
  check("reading mode reaches no model and writes nothing", () => {
    const seen = new Set<string>();
    const queue = [...ROOTS];
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      // The client calls the action through app/actions.ts, which is asked about below rather than walked whole.
      if (file === "app/actions.ts") continue;
      for (const m of code(file).matchAll(/from\s+"((?:@\/|\.)[^"]+)"/g)) {
        const next = resolve(m[1]!, file);
        if (next) queue.push(next);
      }
    }
    assert.ok(seen.size >= 10, `walked ${seen.size} files from reading mode, so the walk stopped resolving imports`);
    const reached = [...seen].filter((f) => FORBIDDEN.test(f));
    assert.deepEqual(reached, [], `reading mode reaches the model chain or the ledger through ${reached.join(", ")}`);

    const actions = code("app/actions.ts");
    const start = actions.indexOf("export async function readEstonian(");
    assert.ok(start >= 0, "app/actions.ts no longer has readEstonian");
    const body = actions.slice(start, actions.indexOf("\nexport ", start + 1));
    assert.doesNotMatch(body, /\bprisma\./, "readEstonian touches the database itself");
    assert.doesNotMatch(body, /authoriseCall|openWithFallback|resolveProviders|translateExample|\bask\(/,
      "readEstonian asks a model");
  });
}
