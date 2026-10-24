import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { resolveRecipients } from "./recipients";
import { NOT_EXPORTED } from "./exportCoverage";
import { EVERY_RECIPIENT_ENV, RECIPIENT_SOURCES, TABLE_SOURCES, storeLabels } from "./storeLabels";

/*
  The store labels are derived from the same two facts /privacy prints: who
  receives anything, and what is kept about somebody. These hold the table of
  answers to both, so a new recipient or a new owner-scoped table fails here
  until somebody decides what it puts on the label.
*/

/** Every model in the schema carrying an `ownerId`, read the way the export check reads it. */
function ownerScopedTables(): string[] {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  return [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
    .filter((m) => /^\s*ownerId\s/m.test(m[2]!))
    .map((m) => m[1]!);
}

const saved = new Map(Object.keys(EVERY_RECIPIENT_ENV).map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function everyRecipient() {
  for (const [key, value] of Object.entries(EVERY_RECIPIENT_ENV)) process.env[key] = value;
  return resolveRecipients();
}

describe("the store labels", () => {
  it("decides a label for every recipient the code can name", () => {
    const recipients = everyRecipient();
    expect(recipients.length).toBeGreaterThanOrEqual(12);
    const missing = recipients.filter((r) => !Object.hasOwn(RECIPIENT_SOURCES, r.id)).map((r) => `${r.id}: ${r.name}`);
    expect(missing).toEqual([]);
    const stale = Object.keys(RECIPIENT_SOURCES).filter((id) => !recipients.some((r) => r.id === id));
    expect(stale).toEqual([]);
  });

  it("decides a label for every owner-scoped table, exported or not", () => {
    const tables = ownerScopedTables();
    expect(tables.length).toBeGreaterThanOrEqual(20);
    for (const table of Object.keys(NOT_EXPORTED)) expect(tables).toContain(table);
    expect(tables.filter((t) => !Object.hasOwn(TABLE_SOURCES, t))).toEqual([]);
    expect(Object.keys(TABLE_SOURCES).filter((t) => !tables.includes(t))).toEqual([]);
  });

  it("leaves nothing undecided for the full list, and gives every answer a reason", () => {
    const labels = storeLabels(everyRecipient(), ownerScopedTables());
    expect(labels.undecided).toEqual([]);
    for (const row of [...labels.apple.collected, ...labels.play.collected]) {
      expect(row.reasons.length, row.label).toBeGreaterThan(0);
      expect(row.purposes.length, row.label).toBeGreaterThan(0);
    }
    expect(labels.apple.tracking.answer).toBe("No");
    expect(labels.play.collected.every((r) => r.shared === false)).toBe(true);
  });

  it("says audio is not collected, and why", () => {
    const labels = storeLabels(everyRecipient(), ownerScopedTables());
    const rows = [...labels.apple.collected, ...labels.play.collected].map((r) => r.label);
    expect(rows.some((label) => /audio|voice/i.test(label))).toBe(false);
    expect(labels.notCollected.find((n) => /audio/i.test(n.what))?.why).toMatch(/ADR-028/);
  });

  it("reports a recipient or a table nobody decided rather than leaving it off", () => {
    const labels = storeLabels(
      [{ id: "brand-new", name: "A new company", what: "something", eea: false }],
      ["NewTable"],
    );
    expect(labels.undecided).toEqual(["table NewTable", "recipient brand-new (A new company)"]);
  });

  it("follows the deployment: no error endpoint configured, no diagnostics on the label", () => {
    const all = everyRecipient();
    const without = all.filter((r) => r.id !== "error-webhook");
    const labels = storeLabels(without, ownerScopedTables());
    expect(labels.apple.collected.some((r) => /Diagnostic|Crash/.test(r.label))).toBe(false);
    expect(storeLabels(all, ownerScopedTables()).apple.collected.some((r) => /Crash/.test(r.label))).toBe(true);
  });
});
