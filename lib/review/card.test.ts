import { describe, expect, it } from "vitest";

import { STASH_MAX_AGE_MS, stashedCards, type ReviewCard } from "./card";

const card = { id: "c1" } as ReviewCard;

describe("stashedCards", () => {
  it("offers a fresh stash's cards", () => {
    expect(stashedCards({ cards: [card], stashedAt: 1_000 }, 1_000 + STASH_MAX_AGE_MS)).toEqual([card]);
  });
  it("offers nothing once the stash is older than the schedule allows", () => {
    expect(stashedCards({ cards: [card], stashedAt: 1_000 }, 1_001 + STASH_MAX_AGE_MS)).toEqual([]);
  });
  it("offers nothing for a missing or malformed stash", () => {
    expect(stashedCards(undefined, 0)).toEqual([]);
    expect(stashedCards({ cards: "no" as unknown as ReviewCard[], stashedAt: 0 }, 0)).toEqual([]);
  });
});
