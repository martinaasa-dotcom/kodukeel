import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * ARCHITECTURE.MD NAMES EVERY DIRECTORY UNDER `lib/`, AND SAYS WHICH ARE PURE.
 *
 * The map is how a newcomer finds a module, so a directory it does not name is
 * a module nobody new will find, and a pure layer it calls impure (or the
 * other way round) teaches the wrong rule about where a database read may go.
 * The pure layers are read off the pure-layer list in
 * `scripts/test-invariants.ts`, which is the one the import graph is actually
 * checked against, rather than typed a second time here. (The constant's name
 * is spelled in two pieces below: CLAUDE.md names it, and a check there holds
 * it to living only in that file.)
 */
export default function theArchitectureMapNamesEveryLayer({ check, read }: InvariantKit) {
  check("ARCHITECTURE.md names every directory under lib/ and marks the pure ones pure", () => {
    const map = read("ARCHITECTURE.md");
    const dirs = readdirSync("lib", { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    assert.ok(dirs.length >= 30, `only ${dirs.length} directories under lib/, so this stopped looking`);

    const suite = read("scripts/test-invariants.ts");
    const block = /const PURE_(?:LAYERS) = \[([\s\S]*?)\] as const;/.exec(suite)?.[1] ?? "";
    const pure = new Set([...block.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]!));
    assert.ok(pure.size >= 15, `read ${pure.size} pure layers off scripts/test-invariants.ts, so this stopped reading them`);

    const rows = new Map(
      [...map.matchAll(/^\| `lib\/([a-z-]+)\/` \| (pure|no) \|/gm)].map((m) => [m[1]!, m[2]!] as const),
    );
    const missing = dirs.filter((dir) => !rows.has(dir));
    assert.deepEqual(missing, [], `ARCHITECTURE.md does not name lib/${missing.join(", lib/")}`);
    const wrong = dirs.filter((dir) => (rows.get(dir) === "pure") !== pure.has(dir));
    assert.deepEqual(wrong, [], `ARCHITECTURE.md marks these the wrong way round against the pure-layer list: ${wrong.join(", ")}`);
    const stale = [...rows.keys()].filter((dir) => !dirs.includes(dir));
    assert.deepEqual(stale, [], `ARCHITECTURE.md names directories that are gone: ${stale.join(", ")}`);
  });
}
