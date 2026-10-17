import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resolveThings } from "./things";

/**
 * The things in a photo, looked up on the dictionary's English side against a
 * real dictionary (docs/41-fifth-batch.md, VB-13).
 *
 * The parsing of the model's reply is unit tested in `lib/scan/things.test.ts`.
 * What needs a database is the half that decides what the learner is offered:
 * that an English name reaches the entries whose gloss names it, the one whose
 * first sense it is leading, and that an entry the dictionary does not vouch
 * for (a model's suggestion) adds nothing, however well its gloss matches.
 */

const PREFIX = "itest-things-";
const NAME = "kodukeeltestwidget";

async function wipe() {
  const rows = await prisma.lexeme.findMany({ where: { lemma: { startsWith: PREFIX } }, select: { id: true } });
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await prisma.form.deleteMany({ where: { lexemeId: { in: ids } } });
    await prisma.lexeme.deleteMany({ where: { id: { in: ids } } });
  }
}

beforeEach(async () => {
  await wipe();
  await prisma.lexeme.createMany({
    data: [
      // Vouched: the seed's own, whose first sense is the name.
      { lemma: `${PREFIX}vidin`, pos: "NOUN", translation: NAME, cefr: "A2", provenance: "SEED" },
      // Vouched too, where the name is a later sense: offered, and after the first.
      { lemma: `${PREFIX}seade`, pos: "NOUN", translation: `device, ${NAME}`, cefr: "B1", provenance: "SEED" },
      // A model's suggestion with a perfect gloss: never offered.
      { lemma: `${PREFIX}vale`, pos: "NOUN", translation: NAME, cefr: "A1", provenance: "AI" },
    ],
  });
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("the things in a photo, looked up on the English side", () => {
  it("offers the vouched entries, the first sense leading, and never a model's", async () => {
    const [thing] = await resolveThings([NAME]);
    expect(thing!.english).toBe(NAME);
    expect(thing!.entries.map((e) => e.lemma)).toEqual([`${PREFIX}vidin`, `${PREFIX}seade`]);
  });

  it("offers nothing for a name no vouched entry carries", async () => {
    const [thing] = await resolveThings(["kodukeeltestnothingatall"]);
    expect(thing!.entries).toEqual([]);
    expect(thing!.picture).toBeNull();
  });

  it("finds an everyday thing in the shipped dictionary, with its picture", async () => {
    const [window] = await resolveThings(["window"]);
    expect(window!.entries[0]?.lemma).toBe("aken");
    expect(window!.picture).toBeTruthy();
  });
});
