import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { parseExamples, serialiseExamples } from "./examples";
import { editExamples } from "./editExamples";

/**
 * EIGHT WRITERS AT ONCE, BECAUSE THE FAULT IS ONLY VISIBLE THAT WAY.
 *
 * `Lexeme.examples` is a JSON array and every change is a read, an edit and a
 * write of the whole thing. Without the row lock two writers read the same
 * array and the second write deletes the first one's sentence. Driven against
 * a real database because nothing smaller has two connections.
 */
const LEMMA = "zzeditexamples";

async function wipe() {
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("editExamples", () => {
  it("keeps every writer's sentence when eight write at once", async () => {
    const lexeme = await prisma.lexeme.create({
      data: {
        lemma: LEMMA, translation: "test", pos: "NOUN",
        examples: serialiseExamples([{ et: "Esimene lause on siin.", en: null, source: "SEED" }]),
      },
    });
    await Promise.all(Array.from({ length: 8 }, (_, i) => editExamples(lexeme.id, (now) => ({
      next: [...now, { et: `Lause number ${i} on siin.`, en: null, source: "USER" as const }],
      result: null,
    }))));
    const row = await prisma.lexeme.findUniqueOrThrow({ where: { id: lexeme.id } });
    expect(parseExamples(row.examples)).toHaveLength(9);
  });

  it("writes nothing where the edit finds nothing to do", async () => {
    const lexeme = await prisma.lexeme.create({
      data: { lemma: LEMMA, translation: "test", pos: "NOUN", examples: serialiseExamples([]) },
    });
    const outcome = await editExamples(lexeme.id, () => ({ next: null, result: "unchanged" }));
    expect(outcome).toEqual({ found: true, changed: false, lemma: LEMMA, result: "unchanged" });
  });

  it("says so for an entry that is not there", async () => {
    expect(await editExamples("no-such-lexeme", () => ({ next: [], result: null }))).toEqual({ found: false });
  });
});
