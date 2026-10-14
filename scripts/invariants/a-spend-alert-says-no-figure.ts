import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A SPEND ALERT'S MESSAGE HOLDS NO FIGURE, BECAUSE THE MESSAGE IS THE FINGERPRINT.
 *
 * The ledger tells the operator the day's model spend crossed half, four
 * fifths or all of the cap, or that the fallback budget is spent, through the
 * error log (`lib/usage/spendAlert.ts`). The log mails the first of each kind
 * in a day, and a kind is its message, so a message carrying an amount, or the
 * percentage it crossed, would be a new kind on every booking and every
 * booking would be mailed. The figures belong in `extra`.
 *
 * Two arms: every message in the table is free of a digit, and the ledger
 * reports a spend alert only with a message from the table, never one it
 * builds with a template.
 */
export default function aSpendAlertSaysNoFigure({ check, code }: InvariantKit) {
  check("a spend alert's message holds no figure", () => {
    const source = code("lib/usage/spendAlert.ts");
    const table = source.slice(source.indexOf("export const SPEND_MESSAGE"));
    const messages = [...table.matchAll(/:\s*"([^"]*)"/g)].map((m) => m[1]!);
    assert.ok(messages.length >= 4, `only ${messages.length} messages found, so the haystack stopped matching`);
    const counted = messages.filter((m) => /\d/.test(m));
    assert.deepEqual(counted, [], `a spend alert carries a figure in its message: ${counted.join(" · ")}`);
  });

  check("the ledger reports a spend alert only with a message from the table", () => {
    const source = code("lib/usage/ledger.ts");
    const reports = [...source.matchAll(/reportError\(new Error\(([^)]*)\),\s*\{\s*at:\s*"usage\/spend"/g)].map((m) => m[1]!.trim());
    assert.ok(reports.length >= 2, `only ${reports.length} spend reports found, so the haystack stopped matching`);
    const built = reports.filter((r) => !/^SPEND_MESSAGE(\[|\.)/.test(r));
    assert.deepEqual(built, [], `a spend alert is built rather than read from SPEND_MESSAGE: ${built.join(" · ")}`);
  });
}
