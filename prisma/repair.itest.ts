/**
 * The repair that widens a production card built before the dictionary knew
 * its prompt had more than one answer.
 *
 * Against a real database, because every claim it makes is a claim about rows:
 * that it matches the cards it should, leaves the ones it should not, and does
 * not disturb a scheduling column while it is in there. A unit test over the
 * SQL string would assert the string.
 *
 * The one that would hurt if it were wrong is the scheduling. A repair that
 * reset somebody's `due` or `reps` would cost more than the bug it fixes, and
 * a raw `UPDATE` is exactly the shape that quietly touches more than it says.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { sharedPrompts } from "@/lib/collections/senses";
import { repairCaseFronts, repairCardSpelling, repairProductionBacks } from "./repair";
import { generateCards, isBareCaseFront } from "@/lib/srs/cards";
import { acceptedAnswers } from "@/lib/estonian/answer";
import { plainPhrase } from "@/lib/copy/values";

const MINE = "itest-owner-repair";

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: MINE } });
}

/** A pair of dictionary entries that answer one prompt, from the seeded rows. */
async function aSharedPrompt() {
  const lexemes = await prisma.lexeme.findMany({
    select: { id: true, lemma: true, pos: true, translation: true },
  });
  const group = sharedPrompts(
    lexemes.map((l) => ({ lemma: l.lemma, pos: l.pos, gloss: l.translation })),
  ).find((g) => g.lemmas.length === 2);
  if (!group) return null;
  const rows = lexemes.filter((l) => l.pos === group.pos && group.lemmas.includes(l.lemma));
  return rows.length === 2 ? { group, rows } : null;
}

describe("repairProductionBacks", () => {
  beforeEach(wipe);
  afterAll(wipe);

  it("widens a card whose back is the bare lemma, and leaves its schedule alone", async () => {
    const found = await aSharedPrompt();
    if (!found) return; // A dictionary with no shared prompt has nothing to repair.
    const [first] = found.rows;

    const due = new Date("2027-01-01T00:00:00.000Z");
    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: first!.id, cardType: "PRODUCTION",
        front: first!.translation, back: first!.lemma, hint: first!.pos.toLowerCase(),
        due, stability: 12.5, difficulty: 6.25, reps: 9, lapses: 3, state: 2,
      },
    });

    expect(await repairProductionBacks(prisma)).toBeGreaterThan(0);

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    // Its own word still leads, and the other answer joined it.
    expect(after.back.startsWith(`${first!.lemma} / `)).toBe(true);
    for (const lemma of found.group.lemmas) expect(after.back).toContain(lemma);

    // Nothing about when it comes back, or how well it is known, moved.
    expect(after.due).toEqual(due);
    expect(after.stability).toBe(12.5);
    expect(after.difficulty).toBe(6.25);
    expect(after.reps).toBe(9);
    expect(after.lapses).toBe(3);
    expect(after.state).toBe(2);
    expect(after.front).toBe(card.front);
  });

  /*
    THE SECOND CORRECTION, AND THE ONE A WORD CARD NEEDS. While `plainPhrase`
    read the first character of whatever it was handed, it lowered a capital
    that belongs to English or to Estonian: `aprill` was taught as `april` and
    `Eesti` as `eesti`, which is the language rather than the country. The
    entry itself was never touched, so the card is put back to what the entry
    holds.
  */
  it("restores a capital the builder no longer drops", async () => {
    const word = await prisma.lexeme.findFirst({
      where: { pos: { not: "PHRASE" }, translation: { startsWith: "A", not: { startsWith: "a" } } },
      select: { id: true, lemma: true, translation: true },
    });
    if (!word) return; // A dictionary with no capitalised gloss has nothing to restore.

    const lowered = word.translation[0]!.toLowerCase() + word.translation.slice(1);
    expect(lowered).not.toBe(word.translation);

    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: word.id, cardType: "RECOGNITION",
        front: word.lemma, back: lowered,
      },
    });

    expect(await repairCardSpelling(prisma)).toBeGreaterThan(0);

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.back).toBe(word.translation);
    expect(after.front).toBe(word.lemma);
  });

  /*
    AND IT MAY ONLY EVER CHANGE THE CAPITALS AND THE MARK. A card holding a
    different word is a card this has nothing to say about: restoring one
    would be the repair deciding what a card asks, which is the builder's.
  */
  it("leaves a card holding a different answer exactly as it is", async () => {
    const word = await prisma.lexeme.findFirst({
      where: { pos: { not: "PHRASE" } },
      select: { id: true, lemma: true, translation: true },
    });
    if (!word) return;

    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: word.id, cardType: "RECOGNITION",
        front: word.lemma, back: "something else entirely",
      },
    });

    await repairCardSpelling(prisma);

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.back).toBe("something else entirely");
  });

  it("runs twice without changing anything the second time", async () => {
    const found = await aSharedPrompt();
    if (!found) return;
    const [first] = found.rows;

    await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: first!.id, cardType: "PRODUCTION",
        front: first!.translation, back: first!.lemma, hint: first!.pos.toLowerCase(),
      },
    });

    expect(await repairProductionBacks(prisma)).toBeGreaterThan(0);
    const once = await prisma.card.findMany({ where: { ownerId: MINE }, select: { back: true } });
    expect(await repairProductionBacks(prisma)).toBe(0);
    const twice = await prisma.card.findMany({ where: { ownerId: MINE }, select: { back: true } });
    expect(twice).toEqual(once);
  });

  /*
    The guard is `back = lemma`, so a card already carrying a set is one the
    new builder made or one this already widened. Touching it again would be
    how a back grows a duplicate on every deploy.
  */
  it("leaves a card that already carries the set", async () => {
    const found = await aSharedPrompt();
    if (!found) return;
    const [first] = found.rows;
    const already = found.group.lemmas.join(" / ");

    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: first!.id, cardType: "PRODUCTION",
        front: first!.translation, back: already, hint: first!.pos.toLowerCase(),
      },
    });

    await repairProductionBacks(prisma);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).back).toBe(already);
  });

  /*
    Only the production direction asks the question this fixes. A recognition
    card's back is the English, and a case card's is already a list of every
    accepted spelling; widening either would be writing a wrong answer.
  */
  it("touches no card type but production", async () => {
    const found = await aSharedPrompt();
    if (!found) return;
    const [first] = found.rows;

    const recognition = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: first!.id, cardType: "RECOGNITION",
        front: first!.lemma, back: first!.translation,
      },
    });
    // A card whose back happens to be the lemma, on a type that is not asked
    // this question: the guard has to be the type as well as the back.
    const gradation = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: first!.id, cardType: "GRADATION",
        front: first!.lemma, back: first!.lemma,
      },
    });

    await repairProductionBacks(prisma);

    expect((await prisma.card.findUniqueOrThrow({ where: { id: recognition.id } })).back)
      .toBe(first!.translation);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: gradation.id } })).back)
      .toBe(first!.lemma);
  });
});

/**
 * The repair that puts a bare case card into the sentence its form is used in.
 *
 * Against a real database for the reason the one above is: what it claims is
 * that a row's question changed and its schedule did not.
 */
describe("repairCaseFronts", () => {
  beforeEach(wipe);
  afterAll(wipe);

  /** A seeded word the builder makes at least one sentence case card for. */
  async function aSentencedWord() {
    const rows = await prisma.lexeme.findMany({
      where: { provenance: "SEED", pos: "NOUN" },
      select: {
        id: true, lemma: true, translation: true, pos: true, semanticTypes: true,
        gradation: true, gradationNote: true, government: true, examples: true,
        forms: {
          select: { formType: true, value: true, morphCode: true },
          orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { lemma: "asc" },
      take: 200,
    });
    for (const row of rows) {
      if (!row.examples) continue;
      const [built] = generateCards(row, ["CASE_FORM"]);
      if (built?.targetCase) return { row, built };
    }
    return null;
  }

  it("rewrites the question and leaves the schedule and the case alone", async () => {
    const found = await aSentencedWord();
    if (!found) return; // A dictionary with no sentences has nothing to rewrite.
    const { row, built } = found;

    const due = new Date("2027-01-01T00:00:00.000Z");
    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: row.id, cardType: "CASE_FORM",
        front: `${row.lemma} → milles? kus?`, back: acceptedAnswers(built.back, "et").join(" / "),
        hint: "seesütlev · the inessive", targetCase: built.targetCase,
        due, stability: 12.5, difficulty: 6.25, reps: 9, lapses: 3, state: 2,
      },
    });

    expect(await repairCaseFronts(prisma)).toBeGreaterThan(0);

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.front).toBe(built.front);
    expect(isBareCaseFront(after.front)).toBe(false);
    expect(after.hint).toBe(built.hint);
    expect(after.back).toBe(built.back);
    expect(after.targetCase).toBe(built.targetCase);
    expect(after.due).toEqual(due);
    expect(after.stability).toBe(12.5);
    expect(after.reps).toBe(9);
    expect(after.lapses).toBe(3);
    expect(after.state).toBe(2);

    // And a second run has nothing left to match.
    expect(await repairCaseFronts(prisma)).toBe(0);
  });

  it("leaves a bare card whose case no sentence carries, for the audit to report", async () => {
    const found = await aSentencedWord();
    if (!found) return;
    const { row } = found;
    const cases = new Set(generateCards(row, ["CASE_FORM"]).map((c) => c.targetCase));
    const missing = ["COMITATIVE", "TRANSLATIVE", "ESSIVE", "ABESSIVE", "TERMINATIVE"]
      .find((key) => !cases.has(key));
    if (!missing) return;

    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: row.id, cardType: "CASE_FORM",
        front: `${row.lemma} → millega?`, back: "x", targetCase: missing,
      },
    });
    await repairCaseFronts(prisma);
    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.front).toBe(card.front);
    expect(after.back).toBe("x");
  });
});

/**
 * The repair that puts a card back to the spelling the builder writes today.
 *
 * What it should say is `lib/srs/cardSpelling.ts` and is unit tested there,
 * over shapes no fixture reaches. What is left for a real database is what
 * only a real database can say: that the write lands, that the schedule is
 * untouched, and that a second run changes nothing.
 */
describe("repairCardSpelling", () => {
  beforeEach(wipe);
  afterAll(wipe);

  /** A seeded phrase whose lemma still carries a mark, for the fault this fixes. */
  async function aPunctuatedPhrase() {
    return prisma.lexeme.findFirst({
      where: { pos: "PHRASE", lemma: { endsWith: "!" } },
      select: { id: true, lemma: true, translation: true },
    });
  }

  it("cleans the front and back of a recognition card, and leaves its schedule alone", async () => {
    const phrase = await aPunctuatedPhrase();
    if (!phrase) return; // A dictionary with no punctuated phrase has nothing to clean.

    const due = new Date("2027-01-01T00:00:00.000Z");
    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: phrase.id, cardType: "RECOGNITION",
        front: phrase.lemma, back: phrase.translation,
        due, stability: 12.5, difficulty: 6.25, reps: 9, lapses: 3, state: 2,
      },
    });

    expect(await repairCardSpelling(prisma)).toBeGreaterThan(0);

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.front).toBe(plainPhrase(phrase.lemma, "PHRASE"));
    expect(after.back).toBe(plainPhrase(phrase.translation, "PHRASE"));
    expect(after.due).toEqual(due);
    expect(after.stability).toBe(12.5);
    expect(after.difficulty).toBe(6.25);
    expect(after.reps).toBe(9);
    expect(after.lapses).toBe(3);
    expect(after.state).toBe(2);
  });

  it("cleans every answer of a production back widened by repairProductionBacks", async () => {
    const phrase = await aPunctuatedPhrase();
    if (!phrase) return;

    const dirty = [phrase.lemma, `${phrase.lemma} synonym`].join(" / ");
    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: phrase.id, cardType: "PRODUCTION",
        front: phrase.translation, back: dirty, hint: "phrase",
      },
    });

    await repairCardSpelling(prisma);

    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.back).toBe(
      [plainPhrase(phrase.lemma, "PHRASE"), plainPhrase(`${phrase.lemma} synonym`, "PHRASE")].join(" / "),
    );
    expect(after.front).toBe(plainPhrase(phrase.translation, "PHRASE"));
  });

  it("runs twice without changing anything the second time", async () => {
    const phrase = await aPunctuatedPhrase();
    if (!phrase) return;

    await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: phrase.id, cardType: "RECOGNITION",
        front: phrase.lemma, back: phrase.translation,
      },
    });

    expect(await repairCardSpelling(prisma)).toBeGreaterThan(0);
    const once = await prisma.card.findMany({ where: { ownerId: MINE }, select: { front: true, back: true } });
    expect(await repairCardSpelling(prisma)).toBe(0);
    const twice = await prisma.card.findMany({ where: { ownerId: MINE }, select: { front: true, back: true } });
    expect(twice).toEqual(once);
  });

  it("touches no entry but a phrase", async () => {
    const found = await aSharedPrompt();
    if (!found) return; // Reuses the shared-prompt helper only for a non-phrase lexeme.
    const [first] = found.rows;
    if (first!.pos === "PHRASE") return;

    const card = await prisma.card.create({
      data: {
        ownerId: MINE, lexemeId: first!.id, cardType: "RECOGNITION",
        front: first!.lemma, back: first!.translation,
      },
    });

    await repairCardSpelling(prisma);
    const after = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.front).toBe(first!.lemma);
    expect(after.back).toBe(first!.translation);
  });
});
