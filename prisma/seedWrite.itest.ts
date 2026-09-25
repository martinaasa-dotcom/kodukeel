import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

import type { SeedEntry } from "./columns";
import { writeSeedEntries } from "./seedWrite";

/**
 * A full reseed over a deployment somebody has been using.
 *
 * The shared dictionary rule is that an edit may replace only the principal
 * parts and must never touch a form retrieved from Ekilex, and that a hand
 * correction wins over the built-in words. `npm run db:seed` without
 * `--only-if-empty` is how the production workflow reloads the dictionary, so
 * it is held to the same rule. Driven against the database because the fault
 * is a `deleteMany` and a conflict clause, neither of which a unit test sees.
 */

const ORDINARY = "itest-reseed-tuba";
const EDITED = "itest-reseed-hand";
const LEMMAS = [ORDINARY, EDITED];

async function wipe() {
  const rows = await prisma.lexeme.findMany({ where: { lemma: { in: LEMMAS } }, select: { id: true } });
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await prisma.form.deleteMany({ where: { lexemeId: { in: ids } } });
    await prisma.lexeme.deleteMany({ where: { id: { in: ids } } });
  }
}

function entry(lemma: string, translation: string, genSg: string, extra: SeedEntry["forms"] = []): SeedEntry {
  return {
    lemma, pos: "NOUN", translation, cefr: "A1",
    translationRu: null, translationUk: null, semanticTypes: null,
    gradation: "NONE", gradationNote: null, government: null,
    forms: [{ formType: "NOM_SG", value: lemma }, { formType: "GEN_SG", value: genSg }, ...extra],
  };
}

const formsOf = async (lemma: string) => {
  const lex = await prisma.lexeme.findUniqueOrThrow({
    where: { lemma_pos: { lemma, pos: "NOUN" } },
    include: { forms: true },
  });
  return { lex, forms: Object.fromEntries(lex.forms.map((f) => [f.formType, f])) };
};

beforeEach(async () => {
  await wipe();
  // What a deployment holds: an ordinary seeded row a live lookup has since
  // enriched, and a row a person corrected by hand.
  await writeSeedEntries(prisma, [entry(ORDINARY, "room", "toa"), entry(EDITED, "seed gloss", "seedform")]);
  const ordinary = await prisma.lexeme.findUniqueOrThrow({ where: { lemma_pos: { lemma: ORDINARY, pos: "NOUN" } } });
  await prisma.form.create({
    data: {
      lexemeId: ordinary.id, formType: "EKILEX:PlIn", value: "tubades",
      isPrincipal: false, morphCode: "PlIn", morphName: "mitmuse seesütlev",
    },
  });
  const edited = await prisma.lexeme.findUniqueOrThrow({ where: { lemma_pos: { lemma: EDITED, pos: "NOUN" } } });
  await prisma.lexeme.update({
    where: { id: edited.id },
    data: { translation: "hand gloss", editedBy: "someone", editedAt: new Date() },
  });
  await prisma.form.updateMany({
    where: { lexemeId: edited.id, formType: "GEN_SG" },
    data: { value: "handform" },
  });
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("a full reseed", () => {
  it("never deletes a form retrieved from Ekilex, and still updates an ordinary row", async () => {
    await writeSeedEntries(prisma, [entry(ORDINARY, "room, chamber", "toa2")]);
    const { lex, forms } = await formsOf(ORDINARY);
    expect(forms["EKILEX:PlIn"]?.value).toBe("tubades");
    expect(forms["EKILEX:PlIn"]?.morphCode).toBe("PlIn");
    expect(forms.GEN_SG?.value).toBe("toa2");
    expect(lex.translation).toBe("room, chamber");
  });

  it("is idempotent over its own Ekilex forms", async () => {
    const extra = [{ formType: "EKILEX:IndIpfSg3", value: "luges" }];
    await writeSeedEntries(prisma, [entry(ORDINARY, "room", "toa", extra)]);
    await writeSeedEntries(prisma, [entry(ORDINARY, "room", "toa", extra)]);
    const { lex } = await formsOf(ORDINARY);
    expect(lex.forms.filter((f) => f.formType === "EKILEX:IndIpfSg3")).toHaveLength(1);
  });

  it("leaves a hand-corrected entry's principal parts and gloss alone", async () => {
    await writeSeedEntries(prisma, [entry(EDITED, "seed gloss", "seedform"), entry(ORDINARY, "room", "toa")]);
    const { lex, forms } = await formsOf(EDITED);
    expect(lex.translation).toBe("hand gloss");
    expect(forms.GEN_SG?.value).toBe("handform");
    expect(lex.editedBy).toBe("someone");
  });
});
