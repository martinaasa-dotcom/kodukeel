import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * EVERY LINE A LEARNER READS IS HOW PEOPLE TALK, AND WHAT WAS REFUSED STAYS REFUSED.
 *
 * `lib/estonian/spoken.ts` is the table of phrases a native speaker refused off
 * a lesson or a scene, each with what people say instead, and
 * `lib/course/lessons/spoken.test.ts` sweeps every line against it. The two can
 * drift apart in the quiet way this repository keeps finding: a sweep that stops
 * reading one of its sources passes on nobody, and an entry with no example is a
 * pattern nobody has seen fire. So the sweep is held to every source by name, and
 * the table to its shape.
 */
const SOURCES = [
  ["the lessons", /from\s+["']@\/lib\/course\/lessons["']/],
  ["each lesson's own lines", /estonianOf\(/],
  ["the scene bank", /from\s+["']@\/lib\/scenes\/bank["']/],
  ["the picks", /PICKS/],
  ["the curveball picks", /CURVEBALL_PICKS/],
  ["the sentences written for a beginner", /authoredRows\(/],
  ["the jokes", /JOKES/],
] as const;

export default function linesAreEverydayEstonian({ check, code }: InvariantKit) {
  check("the everyday-Estonian sweep reads every line a learner meets", () => {
    const sweep = code("lib/course/lessons/spoken.test.ts");
    for (const [what, reads] of SOURCES) assert.match(sweep, reads, `the sweep no longer reads ${what}`);
    assert.match(sweep, /notSaidIn\(/, "the sweep no longer asks the table");
  });

  check("every refused phrase says what to say instead, why, and fires on its own example", () => {
    const table = code("lib/estonian/spoken.ts");
    const entries = table.split(/\n  \{\n/).slice(1);
    assert.ok(entries.length >= 7, `the table of refused phrases shrank to ${entries.length}`);
    for (const entry of entries) {
      for (const field of ["pattern:", "example:", "say:", "why:"]) {
        assert.ok(entry.includes(field), `an entry in lib/estonian/spoken.ts has no ${field}`);
      }
    }
  });
}
