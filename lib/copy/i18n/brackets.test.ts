import { describe, expect, it } from "vitest";
import { AREAS } from "./index";

/**
 * A lesson names a form in Estonian in square brackets, `[tud-kesksõna]`, with
 * its hint in the reader's language beside it. A translation that rewords the
 * bracket away ("the -tud form") teaches the reader a name their teacher never
 * uses, so every bracket in a lesson line's English has to survive into its
 * Russian and its Ukrainian. Other areas use brackets for link text, which is
 * translated, so this reads the lesson areas only.
 */
describe("a lesson translation", () => {
  it("keeps every [bracketed] Estonian name of its English", () => {
    const lost: string[] = [];
    let seen = 0;
    for (const [name, area] of AREAS) {
      if (!/^lesson/.test(name)) continue;
      for (const locale of ["ru", "uk"] as const) {
        for (const [en, out] of Object.entries(area[locale] ?? {})) {
          const names = [...en.matchAll(/\[[^[\]]+\]/g)].map((m) => m[0]);
          if (names.length === 0) continue;
          seen += 1;
          for (const b of names) if (!out.includes(b)) lost.push(`${name} ${locale}: ${b} in "${en.slice(0, 80)}"`);
        }
      }
    }
    expect(seen, "lesson lines with a bracketed name").toBeGreaterThan(200);
    expect(lost).toEqual([]);
  });
});
