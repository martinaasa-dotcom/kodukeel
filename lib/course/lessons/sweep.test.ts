import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sweepAcceptance } from "./sweep";

/*
  WHAT THE MARKER'S GENERAL RULES ACCEPT, HELD TO THE LIST SOMEBODY READ.
  Every combined sentence, every pronoun put in that is marked right, and
  every parallel form swapped in, on the real lessons (`sweep.ts`), against
  `fixtures/accepted.json`. A rule that starts accepting more fails here, and
  so does a lesson row that hands a rule something new to accept: read the
  new lines (`npx tsx scripts/sweep-acceptance.ts` prints them) and write the
  file again with `--write`.
*/

describe("what the marker accepts on the lessons", () => {
  const read = JSON.parse(readFileSync(path.join(process.cwd(), "lib", "course", "lessons", "fixtures", "accepted.json"), "utf8")) as Record<string, string[]>;
  const now = sweepAcceptance();

  it("tries enough to mean something", () => {
    expect(now.tried).toBeGreaterThan(40_000);
    expect(now.combined.length).toBeGreaterThan(30);
    expect(now.insertions.length).toBeGreaterThan(100);
    expect(now.parallels.length).toBeGreaterThan(10);
  });

  it("combines only what was read", () => {
    expect(now.combined).toEqual(read.combined);
  });

  it("lets a pronoun in only where it was read", () => {
    expect(now.insertions).toEqual(read.insertions);
  });

  it("reads a parallel form as was read", () => {
    expect(now.parallels).toEqual(read.parallels);
  });

  it("never lets a pronoun in across punctuation (round 3, F4)", () => {
    const across = now.insertions.filter((s) => /\b(?:ma|sa|me|te)[.,]/iu.test(s.split(" | ")[1] ?? ""));
    expect(across).toEqual([]);
  });

  it("marks every parallel form swapped into an accepted sentence right", () => {
    expect(now.parallels.filter((s) => !s.endsWith("| right"))).toEqual([]);
  });
});
