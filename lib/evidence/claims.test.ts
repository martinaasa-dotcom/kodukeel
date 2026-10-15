import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CLAIMS, commandFor, evidenceRows, measuredOn, type Measured } from "./claims";

const shipped = JSON.parse(readFileSync("lib/evidence/measured.json", "utf8")) as Measured;

describe("how we know", () => {
  /*
    The shipped file has a figure for every claim. Skipped while
    `npm run evidence` is itself re-running this suite, since the file is the
    thing being rewritten then and would otherwise be asked to hold the figure
    for the very run measuring it.
  */
  it.skipIf(process.env.EVIDENCE_MEASURING === "1")("prints a date for every row the page draws", () => {
    const rows = evidenceRows(shipped);
    expect(rows).toHaveLength(CLAIMS.length);
    for (const row of rows) {
      expect(measuredOn(row.on), row.id).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
      expect(row.figure, row.id).not.toBe("Not measured yet");
    }
  });

  it("says when a claim has never been measured rather than inventing a date", () => {
    const rows = evidenceRows({});
    const unmeasured = rows.filter((r) => r.source === "measured");
    expect(unmeasured.length).toBeGreaterThan(0);
    for (const row of unmeasured) expect(measuredOn(row.on)).toBe("not measured yet");
  });

  it("gives every claim its own id and a command a reviewer can type", () => {
    expect(new Set(CLAIMS.map((c) => c.id)).size).toBe(CLAIMS.length);
    for (const claim of CLAIMS) expect(commandFor(claim)).toMatch(/^npm run [a-z:0-9]+/);
  });

  it("writes every claim as one sentence", () => {
    for (const claim of CLAIMS) {
      expect(claim.claim.trim().endsWith("."), claim.id).toBe(true);
      expect(claim.claim.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 1)).toHaveLength(1);
    }
  });
});
