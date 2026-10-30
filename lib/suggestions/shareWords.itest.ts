import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { shareOwnWords, wordsToSuggest } from "./shareWord";
import { countWaiting, forgetReviewWaiting } from "./waitingCount";

/*
  A PAGE OR A PASTE OF A LEARNER'S OWN WORDS, PUT FORWARD IN ONE PRESS, against
  a real database, because what decides the answer is three rows: whose word it
  is, whether it is everybody's already, and whether this learner has an open
  request for it. And the count a reviewer's badge reads, which is groups of
  open reports and nothing a test can see without the table.
*/

const PREFIX = "itest-share-words-";
const ME = "itest-share-words-me";
const OTHER = "itest-share-words-other";

async function wipe() {
  await prisma.suggestion.deleteMany({ where: { ownerId: { in: [ME, OTHER] } } });
  await prisma.lexeme.deleteMany({ where: { lemma: { startsWith: PREFIX } } });
  forgetReviewWaiting();
}

async function word(suffix: string, data: { editedBy?: string; provenance?: string; approvedAt?: Date | null } = {}) {
  return prisma.lexeme.create({
    data: {
      lemma: `${PREFIX}${suffix}`, pos: "NOUN", translation: `thing ${suffix}`,
      provenance: data.provenance ?? "USER", editedBy: data.editedBy ?? ME, approvedAt: data.approvedAt ?? null,
    },
  });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("suggesting a page of words at once", () => {
  it("offers only the learner's own words that nobody has passed and they have not asked about", async () => {
    const mine = await word("a");
    const asked = await word("b");
    const theirs = await word("c", { editedBy: OTHER });
    const passed = await word("d", { approvedAt: new Date() });
    const seeded = await word("e", { provenance: "SEED" });

    await shareOwnWords(ME, [asked.id]);
    const offered = await wordsToSuggest(ME, [mine.id, asked.id, theirs.id, passed.id, seeded.id]);
    expect(offered).toEqual([mine.id]);
  });

  it("files one request per word it may, and passes over the rest without failing the press", async () => {
    const a = await word("a");
    const b = await word("b");
    const theirs = await word("c", { editedBy: OTHER });

    const first = await shareOwnWords(ME, [a.id, b.id, theirs.id, a.id, "missing-id"]);
    expect(first).toMatchObject({ ok: true, sent: 2, again: 0, passed: 2, left: 0 });

    const again = await shareOwnWords(ME, [a.id]);
    expect(again).toMatchObject({ ok: true, sent: 0, again: 1 });

    expect(await prisma.suggestion.count({ where: { ownerId: ME, status: "OPEN", category: "MISSING_WORD" } })).toBe(2);
  });

  it("counts open reports for the reviewer in groups, words to add apart from the rest", async () => {
    const before = await countWaiting();
    const a = await word("a");
    const b = await word("b", { editedBy: OTHER });
    await shareOwnWords(ME, [a.id]);
    await shareOwnWords(OTHER, [b.id]);
    // The same word asked for twice is one decision.
    await prisma.suggestion.create({
      data: { ownerId: OTHER, category: "MISSING_WORD", groupKey: (await prisma.suggestion.findFirstOrThrow({ where: { ownerId: ME } })).groupKey, note: "" },
    });
    await prisma.suggestion.create({
      data: { ownerId: ME, category: "BROKEN", groupKey: `BROKEN|${PREFIX}screen`, note: "" },
    });

    forgetReviewWaiting();
    const after = await countWaiting();
    expect(after.words - before.words).toBe(2);
    expect(after.other - before.other).toBe(1);
  });
});
