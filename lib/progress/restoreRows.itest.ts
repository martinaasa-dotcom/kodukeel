import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { createAbsent, ownersOf, resolveLexemes, restoreLexemes, RESTORE_CHUNK } from "./restoreRows";

/**
 * A restore, against the database, because both faults it had were facts about
 * what Postgres does rather than about the code that asked it.
 *
 * The words are invented and spelled so nobody could take them for Estonian,
 * because `Lexeme` is the shared dictionary and a fixture spelled like a real
 * word sits beside the seeded one for every suite that runs after this.
 */

const MINE = "itest-owner-restore";
const THEIRS = "itest-owner-restore-other";
const PREFIX = "zqxrestoreitest";

async function wipe() {
  await prisma.review.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
  await prisma.card.deleteMany({ where: { ownerId: { in: [MINE, THEIRS] } } });
  await prisma.lexeme.deleteMany({ where: { lemma: { startsWith: PREFIX } } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

function word(lemma: string, id: string = randomUUID()) {
  return {
    data: {
      id, lemma, pos: "NOUN", translation: "a made-up thing",
      provenance: "EKILEX", ekilexWordId: 424242, fetchedAt: new Date(),
    },
    forms: [{ id: randomUUID(), formType: "GEN_SG", value: `${lemma}q`, isPrincipal: true }],
  };
}

describe("why the old restore could not survive a word this deployment already holds", () => {
  it("a statement that fails inside a transaction takes the transaction with it, caught or not", async () => {
    const held = await prisma.lexeme.create({ data: { lemma: `${PREFIX}held`, pos: "NOUN", translation: "x" } });
    const outcome = await prisma.$transaction(async (tx) => {
      try {
        await tx.lexeme.create({ data: { lemma: held.lemma, pos: held.pos, translation: "y" } });
      } catch {
        // what the restore used to do: carry on
      }
      await tx.lexeme.count();
      return "carried on";
    }).catch(() => "rolled back");
    expect(outcome).toBe("rolled back");
  });
});

describe("restoreLexemes", () => {
  it("maps a word held under another id onto the entry that holds it, and leaves that entry alone", async () => {
    const held = await prisma.lexeme.create({
      data: { lemma: `${PREFIX}moved`, pos: "NOUN", translation: "theirs", provenance: "SEED" },
    });
    const backedUp = word(held.lemma);

    const live = await prisma.$transaction(async (tx) => {
      const map = await restoreLexemes(tx, MINE, [backedUp]);
      // The transaction is still usable, which is the whole of the fault.
      await tx.lexeme.count();
      return map;
    });

    expect(live.get(String(backedUp.data.id))).toBe(held.id);
    const after = await prisma.lexeme.findMany({ where: { lemma: held.lemma } });
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: held.id, translation: "theirs", provenance: "SEED" });
  });

  it("creates a word nobody holds as the restorer's own, with its forms, and without Ekilex's claims", async () => {
    const backedUp = word(`${PREFIX}new`);
    const live = await prisma.$transaction((tx) => restoreLexemes(tx, MINE, [backedUp]));
    const id = String(backedUp.data.id);
    expect(live.get(id)).toBe(id);

    const row = await prisma.lexeme.findUniqueOrThrow({ where: { id }, include: { forms: true } });
    expect(row).toMatchObject({ provenance: "USER", editedBy: MINE, ekilexWordId: null, fetchedAt: null });
    expect(row.forms.map((f) => f.value)).toEqual([`${PREFIX}newq`]);
  });

  it("keeps a word whose id is already here exactly as it is", async () => {
    const held = await prisma.lexeme.create({ data: { lemma: `${PREFIX}same`, pos: "NOUN", translation: "kept" } });
    const backedUp = word(held.lemma, held.id);
    backedUp.data.translation = "the file's own";
    const live = await prisma.$transaction((tx) => restoreLexemes(tx, MINE, [backedUp]));
    expect(live.get(held.id)).toBe(held.id);
    expect((await prisma.lexeme.findUniqueOrThrow({ where: { id: held.id } })).translation).toBe("kept");
  });

  it("creates a word the file names twice once, and points both ids at it", async () => {
    const first = word(`${PREFIX}twice`);
    const second = word(`${PREFIX}twice`);
    const live = await prisma.$transaction((tx) => restoreLexemes(tx, MINE, [first, second]));
    expect(await prisma.lexeme.count({ where: { lemma: `${PREFIX}twice` } })).toBe(1);
    expect(live.get(String(second.data.id))).toBe(String(first.data.id));
  });

  it("resolves an id the file did not carry to itself where it is here, and to null where it is not", async () => {
    const held = await prisma.lexeme.create({ data: { lemma: `${PREFIX}here`, pos: "NOUN", translation: "x" } });
    const wordOf = await prisma.$transaction((tx) => resolveLexemes(tx, new Map(), [held.id, "nowhere"]));
    expect(wordOf(held.id)).toBe(held.id);
    expect(wordOf("nowhere")).toBeNull();
    expect(wordOf(null)).toBeNull();
  });
});

describe("createAbsent", () => {
  it("writes a whole history in a chunk a statement, and a second pass writes nothing", async () => {
    const reviews = Array.from({ length: RESTORE_CHUNK * 2 + 500 }, (_, i) => ({
      id: randomUUID(), ownerId: MINE, cardId: randomUUID(), lexemeId: randomUUID(),
      rating: 3, reviewedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
    }));
    let statements = 0;
    const insert = (chunk: Record<string, unknown>[]) => {
      statements += 1;
      return prisma.review.createMany({ data: chunk as never, skipDuplicates: true });
    };

    expect(await createAbsent(reviews, insert)).toBe(reviews.length);
    expect(statements).toBe(3);
    expect(await prisma.review.count({ where: { ownerId: MINE } })).toBe(reviews.length);

    // Restoring the same file twice changes nothing: append-only, created if absent.
    expect(await createAbsent(reviews, insert)).toBe(0);
    expect(await prisma.review.count({ where: { ownerId: MINE } })).toBe(reviews.length);
  });

  it("never overwrites a row somebody else holds under the same id", async () => {
    const id = randomUUID();
    await prisma.review.create({
      data: { id, ownerId: THEIRS, cardId: randomUUID(), lexemeId: randomUUID(), rating: 1 } as never,
    });
    await createAbsent(
      [{ id, ownerId: MINE, cardId: randomUUID(), lexemeId: randomUUID(), rating: 4 }],
      (chunk) => prisma.review.createMany({ data: chunk as never, skipDuplicates: true }),
    );
    expect(await prisma.review.findUniqueOrThrow({ where: { id } })).toMatchObject({ ownerId: THEIRS, rating: 1 });
  });
});

describe("ownersOf", () => {
  it("says whose each id already is, and leaves out the ones nobody holds", async () => {
    const lexeme = await prisma.lexeme.create({ data: { lemma: `${PREFIX}card`, pos: "NOUN", translation: "x" } });
    const card = await prisma.card.create({
      data: { ownerId: THEIRS, lexemeId: lexeme.id, cardType: "RECOGNITION", front: "f", back: "b" } as never,
    });
    const owners = await ownersOf(
      [card.id, "nobody"],
      (chunk) => prisma.card.findMany({ where: { id: { in: chunk } }, select: { id: true, ownerId: true } }),
    );
    expect(owners.get(card.id)).toBe(THEIRS);
    expect(owners.has("nobody")).toBe(false);
  });
});
