import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { markSitting, paperFor } from "./assessment";
import type { Answered } from "@/lib/assessment/score";
import type { Item } from "@/lib/assessment/types";

/**
 * The level check is marked on the server, against the paper rebuilt from its
 * seed, and that only works if the rebuilt paper is the paper that was sat.
 *
 * The deck is the one input a learner changes mid-sitting: a card added in
 * another tab takes its word out of the pool, so a paper rebuilt later would
 * hold different questions and every answer would be refused. So the deck is
 * read as it stood when the paper was built.
 */

const OWNER = "itest-placement-mark-a";

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: OWNER } });
}

beforeEach(wipe);
afterAll(wipe);

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/** The right answer to every question, in the shape the browser sends. */
function allRight(items: readonly Item[]): Answered[] {
  return items.map((item) => {
    if (item.kind === "choice") return { itemId: item.id, given: { kind: "picked", option: item.options[item.answer]! }, ms: 1 };
    if (item.kind === "dictation") return { itemId: item.id, given: { kind: "typed", text: item.et }, ms: 1 };
    if (item.kind === "write") return { itemId: item.id, given: { kind: "typed", text: item.targetForm }, ms: 1 };
    return { itemId: item.id, given: { kind: "rated", rating: 3 }, ms: 1 };
  });
}

describe("a sitting is marked against the paper it was sat on", () => {
  it("rebuilds the same paper after a card is added mid-sitting", async () => {
    const builtAt = Date.now() - 1000;
    const before = await paperFor(OWNER, 42, builtAt);

    // Every word the paper asks about goes into the deck after it was built.
    const lexemeIds = [...new Set(before.items.map((i) => i.id.match(UUID)?.[0]).filter((id): id is string => !!id))];
    expect(lexemeIds.length).toBeGreaterThan(10);
    await prisma.card.createMany({
      data: lexemeIds.map((lexemeId) => ({ ownerId: OWNER, lexemeId, cardType: "RECOGNITION", front: "x", back: "y" })),
    });

    const again = await paperFor(OWNER, 42, builtAt);
    expect(again.items.map((i) => i.id)).toEqual(before.items.map((i) => i.id));
  });

  it("marks the answers itself and refuses a question the paper does not hold", async () => {
    const builtAt = Date.now();
    const paper = await paperFor(OWNER, 7, builtAt);
    const answers = allRight(paper.items);

    const right = await markSitting(OWNER, 7, builtAt, answers);
    expect(right?.overall).toBe("C1");

    const wrong = await markSitting(OWNER, 7, builtAt, answers.map((a) => (
      a.given.kind === "picked" ? { ...a, given: { kind: "picked", option: "not an option" } } :
      a.given.kind === "typed" ? { ...a, given: { kind: "typed", text: "" } } : a
    )));
    expect(wrong?.overall).toBe("pre-A1");

    expect(await markSitting(OWNER, 7, builtAt, [
      ...answers,
      { itemId: "r-mean-invented", given: { kind: "picked", option: "x" }, ms: 1 },
    ])).toBeNull();
  });
});
