import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `docs/reviews/b1-flags.md` tells a native reader which lines to read first, and
 * its "What is still open" section quotes lines it says the app has. A quote the
 * app no longer has sends the reader to check a line nobody will meet, so every
 * quote there has to be found in a lesson, a scene or the scene bank. The later
 * sections are a history of what changed and quote old lines on purpose, so they
 * are left out.
 */

const root = process.cwd();

function sources(dir: string): string[] {
  return readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => readFileSync(join(root, dir, f), "utf8"));
}

const corpus = [...sources("lib/course/lessons"), ...sources("lib/scenes/specs"), ...sources("lib/scenes/bank")]
  .join("\n")
  .replace(/\\"/g, '"')
  .toLowerCase();

function openSection(): string {
  const doc = readFileSync(join(root, "docs/reviews/b1-flags.md"), "utf8");
  const start = doc.indexOf("## What is still open");
  const end = doc.indexOf("\n## ", start + 1);
  return doc.slice(start, end === -1 ? undefined : end).replace(/\n\s*/g, " ");
}

describe("the lines b1-flags.md says are still open", () => {
  it("are all lines the app still has", () => {
    const quotes = [...openSection().matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
    const missing: string[] = [];
    let seen = 0;
    for (const quote of quotes) {
      if (/^(b1-|docs\/|lib\/|npm )/.test(quote)) continue;
      for (const part of quote.split(/…|\//).map((p) => p.trim()).filter((p) => p.length > 1)) {
        seen += 1;
        if (!corpus.includes(part.toLowerCase())) missing.push(part);
      }
    }
    expect(seen).toBeGreaterThan(30);
    expect(missing).toEqual([]);
  });
});
