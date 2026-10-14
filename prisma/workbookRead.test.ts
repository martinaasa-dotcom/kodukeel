import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, csvCell } from "../scripts/lib/csv";
import { fromSheet, lineKey } from "../scripts/lib/workbookRead";

/**
 * The record of which workbook lines a person has read (`npm run
 * reading:workbook`, `npm run apply:workbook-review`). It decides what the
 * next reading list leaves out, so a malformed entry is a line that silently
 * never comes up for reading again.
 */
const FILE = path.join(__dirname, "data/workbook-read.json");
const { lines } = JSON.parse(readFileSync(FILE, "utf8")) as { lines: { key: string; verdict: string; on: string }[] };

describe("the record of workbook lines read", () => {
  it("holds the first reading, one entry a line, sorted, each a verdict on a day", () => {
    expect(lines.length).toBeGreaterThanOrEqual(640);
    const keys = lines.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(keys);
    for (const l of lines) {
      expect(l.key).toMatch(/^[0-9a-f]{12}\|\S.*$/u);
      expect(["keep", "refuse", "fix"]).toContain(l.verdict);
      expect(l.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keys a line on its sentence and its gap, so another gap in one sentence is another line", () => {
    expect(lineKey("Ma olen toas.", "toas")).toBe(lineKey(" ma olen toas. ", "Toas"));
    expect(lineKey("Ma olen toas.", "toas")).not.toBe(lineKey("Ma olen toas.", "olen"));
  });

  it("reads a sheet's line back into the sentence and the answer, and refuses one with no gap", () => {
    expect(fromSheet("Ma olen [toas] praegu.")).toEqual({ sentence: "Ma olen toas praegu.", answer: "toas" });
    expect(fromSheet("[Ava] uks, palun.")).toEqual({ sentence: "Ava uks, palun.", answer: "Ava" });
    expect(fromSheet("Ma olen toas.")).toBeNull();
  });

  it("round-trips a cell a spreadsheet would quote", () => {
    const cells = ['"Kurat!" vandus mees.', "a, b", "plain", "two\nlines"];
    expect(parseCsv(`﻿${cells.map(csvCell).join(",")}\n`)).toEqual([cells]);
  });
});
