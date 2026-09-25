import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordSuggestion, type SuggestionFields } from "./record";

/**
 * One person's reports of one thing are one row, even when the sends land
 * together. Run concurrently on purpose: the fault was entirely in what two
 * connections do inside the gap between a read and an insert, so no unit test
 * can see it. Without the lock, eight sends at once left six to eight rows.
 */

const MINE = "itest-owner-suggest";
const THEIRS = "itest-owner-suggest-other";

function report(groupKey: string, note = ""): SuggestionFields {
  return { category: "WRONG_GLOSS", groupKey, note, context: null, trigger: null, lemma: null, lexemeId: null, patch: "{}" };
}

async function wipe() {
  await prisma.suggestion.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("recordSuggestion", () => {
  it("keeps eight sends landing together as one open row", async () => {
    for (let run = 0; run < 3; run++) {
      const key = `itest-group-${run}`;
      const results = await Promise.all(Array.from({ length: 8 }, () => recordSuggestion(MINE, report(key))));
      expect(await prisma.suggestion.count({ where: { ownerId: MINE, groupKey: key } })).toBe(1);
      expect(results.filter((r) => !r.repeat)).toHaveLength(1);
    }
  });

  it("lets the later report replace the note of the open one", async () => {
    await recordSuggestion(MINE, report("itest-note", "first"));
    const again = await recordSuggestion(MINE, report("itest-note", "second, having seen more"));
    expect(again.repeat).toBe(true);
    const rows = await prisma.suggestion.findMany({ where: { ownerId: MINE, groupKey: "itest-note" } });
    expect(rows.map((r) => r.note)).toEqual(["second, having seen more"]);
  });

  it("counts two people reporting one thing as two", async () => {
    await Promise.all([recordSuggestion(MINE, report("itest-shared")), recordSuggestion(THEIRS, report("itest-shared"))]);
    expect(await prisma.suggestion.count({ where: { groupKey: "itest-shared" } })).toBe(2);
  });

  it("opens a new report once the old one has been dealt with", async () => {
    await recordSuggestion(MINE, report("itest-closed"));
    await prisma.suggestion.updateMany({ where: { ownerId: MINE, groupKey: "itest-closed" }, data: { status: "DECLINED" } });
    expect((await recordSuggestion(MINE, report("itest-closed"))).repeat).toBe(false);
    expect(await prisma.suggestion.count({ where: { ownerId: MINE, groupKey: "itest-closed" } })).toBe(2);
  });
});
