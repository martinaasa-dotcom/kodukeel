import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

import { applyGlossCorrections } from "./expanded";

/**
 * A corrected gloss has to reach a database that was seeded before the
 * correction existed. Unlike a part-of-speech correction, `pos` does not
 * move, so there is no conflict key at stake here — the risk is not a
 * duplicate row, it is a stale one nothing ever reaches back for, because
 * `writeExpanded` inserts with `ON CONFLICT DO NOTHING` and never updates.
 *
 * `mustikas` shipped as "blueberry" rather than "bilberry, European
 * blueberry" for three weeks before `npm run audit:glosses` caught it, and
 * a deployment seeded in that window would have kept it wrong for ever
 * without this.
 *
 * Written against the database, mirroring `posCorrections.itest.ts`.
 */

const LEMMA = "itest-gloss-mustikas";
const HOMONYM = "itest-gloss-vahe"; // same stale translation, different lemma
const EDITED = "itest-gloss-hand";
const LEMMAS = [LEMMA, HOMONYM, EDITED];

/** The corrections file's shape, as `audit-glosses.ts --write` records it. */
interface Correction {
  lemma: string;
  pos: string;
  translationFrom: string;
  translationTo: string;
  notesFrom: string | null;
  notesTo: string | null;
}
const CORRECTIONS: Correction[] = [
  {
    lemma: LEMMA, pos: "NOUN",
    translationFrom: "blueberry", translationTo: "bilberry, European blueberry",
    notesFrom: null, notesTo: null,
  },
  {
    lemma: HOMONYM, pos: "NOUN",
    translationFrom: "blueberry", translationTo: "some other correction",
    notesFrom: null, notesTo: null,
  },
  {
    lemma: EDITED, pos: "NOUN",
    translationFrom: "blueberry", translationTo: "bilberry, European blueberry",
    notesFrom: null, notesTo: null,
  },
];

async function wipe() {
  const rows = await prisma.lexeme.findMany({ where: { lemma: { in: LEMMAS } }, select: { id: true } });
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await prisma.card.deleteMany({ where: { lexemeId: { in: ids } } });
    await prisma.form.deleteMany({ where: { lexemeId: { in: ids } } });
    await prisma.lexeme.deleteMany({ where: { id: { in: ids } } });
  }
}

/**
 * `applyGlossCorrections` reads the real corrections file, so these tests
 * drive the same statement over a list they control. The real file is
 * covered by the invariant suite, which checks every correction in it
 * against the built dictionary, and by the last test below.
 */
async function apply(list: Correction[]): Promise<number> {
  const { Prisma } = await import("@prisma/client");
  const rows = list.map(
    (c) =>
      Prisma.sql`(${c.lemma}, ${c.pos}, ${c.translationFrom}, ${c.translationTo}, ${c.notesFrom}::text, ${c.notesTo}::text)`,
  );
  return prisma.$executeRaw`
    UPDATE "Lexeme" AS l
    SET translation = c.to_translation, notes = c.to_notes, "updatedAt" = NOW()
    FROM (VALUES ${Prisma.join(rows)})
      AS c(lemma, pos, from_translation, to_translation, from_notes, to_notes)
    WHERE l.lemma = c.lemma
      AND l.pos = c.pos
      AND l.translation = c.from_translation
      AND l.notes IS NOT DISTINCT FROM c.from_notes
      AND l."editedBy" IS NULL
  `;
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("applyGlossCorrections", () => {
  it("moves an existing row's gloss onto the corrected one", async () => {
    const before = await prisma.lexeme.create({
      data: { lemma: LEMMA, pos: "NOUN", translation: "blueberry", provenance: "EKILEX" },
    });

    expect(await apply([CORRECTIONS[0]!])).toBe(1);

    const rows = await prisma.lexeme.findMany({ where: { lemma: LEMMA } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.translation).toBe("bilberry, European blueberry");
    // The same row, so every card and review already pointing at it still does.
    expect(rows[0]?.id).toBe(before.id);
  });

  it("keeps the entry's own content, having only moved the gloss", async () => {
    await prisma.lexeme.create({
      data: {
        lemma: LEMMA, pos: "NOUN", translation: "blueberry", cefr: "B1",
        provenance: "EKILEX", ekilexWordId: 4242, examples: '[{"et":"Korjasime mustikaid.","en":null}]',
      },
    });

    await apply([CORRECTIONS[0]!]);

    const row = await prisma.lexeme.findFirstOrThrow({ where: { lemma: LEMMA } });
    expect(row.translation).toBe("bilberry, European blueberry");
    expect(row.cefr).toBe("B1");
    expect(row.provenance).toBe("EKILEX");
    expect(row.ekilexWordId).toBe(4242);
    expect(row.examples).toContain("Korjasime mustikaid");
  });

  it("carries the note across with the translation", async () => {
    await prisma.lexeme.create({
      data: { lemma: LEMMA, pos: "NOUN", translation: "gap", notes: "difference; distance", provenance: "EKILEX" },
    });

    const withNotes = {
      lemma: LEMMA, pos: "NOUN",
      translationFrom: "gap", translationTo: "difference",
      notesFrom: "difference; distance", notesTo: "distance; gap; space, slot",
    };
    expect(await apply([withNotes])).toBe(1);

    const row = await prisma.lexeme.findFirstOrThrow({ where: { lemma: LEMMA } });
    expect(row.translation).toBe("difference");
    expect(row.notes).toBe("distance; gap; space, slot");
  });

  it("never overwrites a gloss somebody corrected by hand", async () => {
    /*
      The dictionary is shared, so an edit is everybody's — which is exactly why
      a reseed must not walk over one. A learner who corrected this word
      themselves keeps their answer and their attribution.
    */
    await prisma.lexeme.create({
      data: {
        lemma: EDITED, pos: "NOUN", translation: "blueberry",
        provenance: "EKILEX", editedBy: "itest-someone", editedAt: new Date(),
      },
    });

    expect(await apply([CORRECTIONS[2]!])).toBe(0);
    const row = await prisma.lexeme.findFirstOrThrow({ where: { lemma: EDITED } });
    expect(row.translation).toBe("blueberry");
    expect(row.editedBy).toBe("itest-someone");
  });

  it("never touches a different word that happens to share the stale gloss", async () => {
    // `lemma` and `pos` are the match, not `translation` alone: two words can
    // have carried the same wrong gloss without being the same correction.
    await prisma.lexeme.create({
      data: { lemma: HOMONYM, pos: "ADJECTIVE", translation: "blueberry", provenance: "EKILEX" },
    });

    // Applying the NOUN correction must not touch the ADJECTIVE row.
    expect(await apply([CORRECTIONS[1]!])).toBe(0);
    const row = await prisma.lexeme.findFirstOrThrow({ where: { lemma: HOMONYM } });
    expect(row.translation).toBe("blueberry");
  });

  it("changes nothing the second time", async () => {
    await prisma.lexeme.create({
      data: { lemma: LEMMA, pos: "NOUN", translation: "blueberry", provenance: "EKILEX" },
    });

    expect(await apply([CORRECTIONS[0]!])).toBe(1);
    expect(await apply([CORRECTIONS[0]!])).toBe(0);
    const row = await prisma.lexeme.findFirstOrThrow({ where: { lemma: LEMMA } });
    expect(row.translation).toBe("bilberry, European blueberry");
  });

  it("reads the shipped corrections file without throwing", async () => {
    // The real entry point, over the real file, so a malformed ledger cannot
    // reach a deploy unnoticed.
    await expect(applyGlossCorrections(prisma)).resolves.toBeGreaterThanOrEqual(0);
  });
});
