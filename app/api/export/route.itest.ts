import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { bucketDigest, bucketForOwner } from "@/lib/security/rateLimit";

const OWNER = "itest-export-owner";

vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => OWNER }));

const { GET } = await import("./route");

/**
 * The backup carries every dictionary entry the learner's own rows point at.
 *
 * It carries the entries rather than the whole dictionary (the route's header
 * says why), so which rows it asks is the whole of whether a restore into a
 * deployment that does not hold a word can put the learner's rows back. It
 * asked the card, the review, the star and the report, and three more of the
 * learner's own tables name a lexeme: a word filed on a shelf, a word put
 * aside, and a word a conversation needed. A shelf entry can outlive the card
 * it was filed with, since a card can be deleted and a membership row is only
 * a label, and `restoreBackup` drops a `DeckWord` whose entry it cannot find.
 *
 * The last test reads the schema rather than a list, so a table that grows a
 * `lexemeId` next year fails here until somebody decides the backup carries
 * the word it names.
 */

const LEMMAS = ["ekspordiproovriiul", "ekspordiproovkõrval", "ekspordiproovlünk"] as const;

async function wipe() {
  await prisma.deckWord.deleteMany({ where: { ownerId: OWNER } });
  await prisma.deck.deleteMany({ where: { ownerId: OWNER } });
  await prisma.deferral.deleteMany({ where: { ownerId: OWNER } });
  await prisma.sceneGap.deleteMany({ where: { ownerId: OWNER } });
  await prisma.sceneRun.deleteMany({ where: { ownerId: OWNER } });
  await prisma.lexeme.deleteMany({ where: { lemma: { in: [...LEMMAS] } } });
  // Six backups an hour: this suite takes one a run, so its own count is cleared.
  await prisma.rateLimit.deleteMany({ where: { bucket: bucketDigest(`export:${bucketForOwner(OWNER)}`) } });
}

beforeEach(wipe);
afterAll(wipe);

describe("/api/export", () => {
  it("carries the entries a shelf, a deferral and a scene gap name, with no card behind them", async () => {
    const [shelved, aside, needed] = await Promise.all(
      LEMMAS.map((lemma) =>
        prisma.lexeme.create({ data: { lemma, pos: "NOUN", translation: "itest" } })),
    );
    const deck = await prisma.deck.create({ data: { ownerId: OWNER, name: "itest shelf" } });
    await prisma.deckWord.create({ data: { deckId: deck.id, ownerId: OWNER, lexemeId: shelved!.id } });
    await prisma.deferral.create({
      data: {
        ownerId: OWNER, lexemeId: aside!.id, lemma: aside!.lemma,
        reason: "DAYS", untilAt: new Date(Date.now() + 86_400_000),
      },
    });
    const run = await prisma.sceneRun.create({
      data: { ownerId: OWNER, sceneId: "poodi-piima", seed: "itest", level: "A1", difficulty: 1 },
    });
    await prisma.sceneGap.create({
      data: { ownerId: OWNER, runId: run.id, kind: "STALLED", lexemeId: needed!.id, lemma: needed!.lemma },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { lexemes: { id: string }[]; deckWords: unknown[] };

    expect(body.deckWords).toHaveLength(1);
    const carried = new Set(body.lexemes.map((l) => l.id));
    expect(carried.has(shelved!.id)).toBe(true);
    expect(carried.has(aside!.id)).toBe(true);
    expect(carried.has(needed!.id)).toBe(true);
  });

  it("knows every owner-scoped table that names a lexeme", () => {
    const naming = Prisma.dmmf.datamodel.models
      .filter((model) =>
        model.fields.some((f) => f.name === "ownerId" && f.kind === "scalar") &&
        model.fields.some((f) => f.name === "lexemeId" && f.kind === "scalar"))
      .map((model) => model.name)
      .sort();
    // The tables `app/api/export/route.ts` asks for the entries it carries.
    // A new one belongs there first and here second.
    expect(naming).toEqual(
      ["Card", "DeckWord", "Deferral", "Review", "SceneGap", "StarredWord", "Suggestion"],
    );
  });
});
