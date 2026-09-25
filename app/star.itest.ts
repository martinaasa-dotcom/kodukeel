import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/auth/mode";

/**
 * A star is set to what was pressed for, and a bad id is refused rather than
 * thrown, against the real action. Local mode resolves the owner, so the
 * cleanup is keyed on this file's own word.
 */

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { toggleStar } = await import("./actions");

const LEMMA = "itestzzstar";

async function wipe() {
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

async function word() {
  return prisma.lexeme.create({ data: { lemma: LEMMA, pos: "NOUN", translation: "itest" } });
}

const held = (lexemeId: string) =>
  prisma.starredWord.count({ where: { ownerId: LOCAL_USER_ID, lexemeId } });

describe("toggleStar", () => {
  it("keeps a word starred when a stale button asks to star it again", async () => {
    const { id } = await word();
    expect(await toggleStar(id, true)).toEqual({ ok: true, starred: true });
    // The second card of the same word, drawn from the page's snapshot.
    expect(await toggleStar(id, true)).toEqual({ ok: true, starred: true });
    expect(await held(id)).toBe(1);
  });

  it("removes it when the press asks for that", async () => {
    const { id } = await word();
    await toggleStar(id, true);
    expect(await toggleStar(id, false)).toEqual({ ok: true, starred: false });
    expect(await held(id)).toBe(0);
  });

  it("refuses an id that is not a word, rather than throwing", async () => {
    expect((await toggleStar(42)).ok).toBe(false);
    expect((await toggleStar("no-such-lexeme")).ok).toBe(false);
  });
});
