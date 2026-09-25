import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
  The session and the cache are the two things a Server Action reaches that
  only exist inside a request, so they are stood in for. Everything the action
  does to the dictionary is the real database.
*/
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("@/lib/auth/session", () => ({
  requireUserId: async () => "itest-create-lexeme-owner",
  currentLearner: async () => ({ id: "itest-create-lexeme-owner" }),
}));

const { prisma } = await import("@/lib/db");
const { createLexeme } = await import("@/app/actions");

/**
 * Keeping a word Anu offered, pressed in two tabs at once, or by two learners
 * who were offered the same word. The action read "is it there" and then
 * created it, so both found nothing and the second create was refused on
 * `(lemma, pos)`, which the framework answers with a 500. Fired together with
 * `Promise.all`, the only way to see it.
 */

const LEMMA = "itest-create-race";

async function wipe() {
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

beforeEach(wipe);
afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("createLexeme pressed twice at once", () => {
  it("makes one entry and answers both presses with it", async () => {
    const add = () => createLexeme({ lemma: LEMMA, translation: "a race", pos: "NOUN" });
    const settled = await Promise.allSettled([add(), add(), add(), add()]);

    const rows = await prisma.lexeme.findMany({ where: { lemma: LEMMA } });
    expect(rows).toHaveLength(1);
    for (const s of settled) {
      expect(s.status === "fulfilled" && s.value.ok && s.value.id).toBe(rows[0]?.id);
    }
    const fresh = settled.filter((s) => s.status === "fulfilled" && s.value.ok && !s.value.existed);
    expect(fresh).toHaveLength(1);
    expect(settled.filter((s) => s.status === "rejected")).toEqual([]);
  });
});
