import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
  Ekilex is the one thing stubbed, so the two lookups below can resolve two
  different queries to one headword without a network. Everything from there
  down, the reads, the writes and the unique keys, is the real database.
*/
vi.mock("@/lib/ekilex/client", () => ({
  ekilexConfigured: () => true,
  searchEkilex: async () => [{ wordId: 990001, wordValue: "itest-race-lookup" }],
  fetchEkilexDetails: async () => ({ stub: true }),
}));
vi.mock("@/lib/ekilex/mapper", () => ({
  mapEkilexDetails: () => ({
    lemma: "itest-race-lookup",
    pos: "NOUN",
    ekilexWordId: 990001,
    cefr: null,
    gradation: "NONE",
    gradationNote: null,
    government: null,
    definition: null,
    semanticTypes: null,
    examples: [],
    forms: [
      { formType: "NOM_SG", value: "itest-race-lookup", isPrincipal: true },
      { formType: "GEN_SG", value: "itest-race-lookupi", isPrincipal: true },
      { formType: "EKILEX:SgIn", value: "itest-race-lookupis", morphCode: "SgIn", isPrincipal: false },
    ],
  }),
}));
vi.mock("@/lib/dict/wiktionary", () => ({
  fetchEnglishGloss: async () => ({ senses: ["a race"] }),
}));

const { prisma } = await import("@/lib/db");
const { upsertLexemeWithForms } = await import("@/lib/dict/upsert");
const { lookupAndStore } = await import("@/lib/dict/lookup");
const { applyPatch } = await import("@/lib/suggestions/apply");

/**
 * Two writers reaching one entry of the shared dictionary at the same moment.
 *
 * Every one of these is check-then-act: read whether the entry exists, or read
 * nothing and delete its principal parts, then write. Two requests inside that
 * gap both act on what they read. The dictionary is shared, so the two writers
 * are as likely to be two learners on two instances as one learner pressing
 * twice, and nothing in front of these functions serialises either.
 *
 * Fired with `Promise.all`, which is the only way any of this is visible.
 */

const EDITOR = "itest-race-editor";
const LEMMAS = ["itest-race-tuba", "itest-race-uus", "itest-race-lookup"];

async function wipe() {
  const rows = await prisma.lexeme.findMany({ where: { lemma: { in: LEMMAS } }, select: { id: true } });
  const ids = rows.map((r) => r.id);
  await prisma.form.deleteMany({ where: { lexemeId: { in: ids } } });
  await prisma.lexeme.deleteMany({ where: { id: { in: ids } } });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

const principal = async (lemma: string, formType: string) => {
  const lexeme = await prisma.lexeme.findFirst({ where: { lemma }, select: { id: true } });
  return prisma.form.findMany({
    where: { lexemeId: lexeme?.id ?? "none", formType },
    select: { value: true },
  });
};

describe("two corrections to one entry at once", () => {
  it("leave it with one genitive, not two", async () => {
    await prisma.lexeme.create({
      data: {
        lemma: "itest-race-tuba", pos: "NOUN", translation: "room", provenance: "SEED",
        forms: { create: [
          { formType: "NOM_SG", value: "itest-race-tuba" },
          { formType: "GEN_SG", value: "itest-race-toa" },
        ] },
      },
    });

    const correct = (genSg: string) => upsertLexemeWithForms({
      lemma: "itest-race-tuba", pos: "NOUN", translation: "room",
      forms: { NOM_SG: "itest-race-tuba", GEN_SG: genSg }, editedBy: EDITOR,
    });
    const settled = await Promise.allSettled([
      correct("itest-race-toa-a"), correct("itest-race-toa-b"),
      correct("itest-race-toa-c"), correct("itest-race-toa-d"),
    ]);

    expect(await principal("itest-race-tuba", "GEN_SG")).toHaveLength(1);
    expect(await principal("itest-race-tuba", "NOM_SG")).toHaveLength(1);
    expect(settled.filter((s) => s.status === "rejected")).toEqual([]);
  });

  it("and two accepted reports setting one form leave one form", async () => {
    const lexeme = await prisma.lexeme.create({
      data: {
        lemma: "itest-race-tuba", pos: "NOUN", translation: "room", provenance: "SEED",
        forms: { create: [{ formType: "GEN_SG", value: "itest-race-toa" }] },
      },
    });
    const set = (value: string) => applyPatch(
      { kind: "SET_FORM", lexemeId: lexeme.id, formType: "GEN_SG", value } as never,
      EDITOR,
    );
    const settled = await Promise.allSettled([
      set("itest-race-toa-a"), set("itest-race-toa-b"), set("itest-race-toa-c"),
    ]);

    expect(await principal("itest-race-tuba", "GEN_SG")).toHaveLength(1);
    expect(settled.filter((s) => s.status === "rejected")).toEqual([]);
  });
});

describe("two people adding the same new word at once", () => {
  it("both land on one entry, and neither is refused with a unique violation", async () => {
    const add = () => upsertLexemeWithForms({
      lemma: "itest-race-uus", pos: "ADJECTIVE", translation: "new",
      forms: { NOM_SG: "itest-race-uus", GEN_SG: "itest-race-uue" }, editedBy: EDITOR,
    });
    const settled = await Promise.allSettled([add(), add(), add(), add()]);

    const ids = new Set(settled.map((s) => (s.status === "fulfilled" ? s.value.id : null)));
    expect(ids.size).toBe(1);
    expect(await principal("itest-race-uus", "GEN_SG")).toHaveLength(1);
    expect(settled.filter((s) => s.status === "rejected")).toEqual([]);
  });
});

describe("two live lookups resolving to one headword at once", () => {
  it("store it once and answer both", async () => {
    /*
      Two different spellings, so the in-process single flight (keyed on the
      query) does not collapse them, which is also what two instances look
      like to each other.
    */
    const settled = await Promise.allSettled([
      lookupAndStore("itest-race-owner-a", "itest-race-q1"),
      lookupAndStore("itest-race-owner-b", "itest-race-q2"),
      lookupAndStore("itest-race-owner-c", "itest-race-q3"),
    ]);

    const rows = await prisma.lexeme.findMany({ where: { lemma: "itest-race-lookup" } });
    expect(rows).toHaveLength(1);
    expect(await principal("itest-race-lookup", "GEN_SG")).toHaveLength(1);
    expect(await principal("itest-race-lookup", "EKILEX:SgIn")).toHaveLength(1);
    for (const s of settled) {
      expect(s.status === "fulfilled" && s.value?.id).toBe(rows[0]?.id);
    }
    expect(settled.filter((s) => s.status === "rejected")).toEqual([]);
  });
});
