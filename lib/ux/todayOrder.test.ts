import { describe, expect, it } from "vitest";
import { TODAY_CARDS } from "./disclosure";
import {
  DEFAULT_TODAY_ORDER, isDefaultTodayOrder, moveSlot, orderTodayCards,
  serialiseTodayOrder, TODAY_SLOTS, todayOrderFrom,
} from "./todayOrder";

describe("todayOrderFrom", () => {
  it("reads a missing row as the shipped order", () => {
    expect(todayOrderFrom(null)).toEqual(DEFAULT_TODAY_ORDER);
    expect(todayOrderFrom(undefined)).toEqual(DEFAULT_TODAY_ORDER);
    expect(todayOrderFrom("")).toEqual(DEFAULT_TODAY_ORDER);
  });

  it("keeps the order the learner set", () => {
    expect(todayOrderFrom("errand game ladder").slice(0, 3)).toEqual(["errand", "game", "ladder"]);
  });

  it("appends whatever the row left out, in the default order", () => {
    // A card added to Today after somebody set their order still appears,
    // rather than silently never being dealt.
    const order = todayOrderFrom("word");
    expect(order[0]).toBe("word");
    expect(order).toHaveLength(DEFAULT_TODAY_ORDER.length);
    expect(order.slice(1)).toEqual(DEFAULT_TODAY_ORDER.filter((s) => s !== "word"));
  });

  it("drops an id it no longer knows and keeps a duplicate once", () => {
    const order = todayOrderFrom("exam word word calendar practice");
    expect(order.slice(0, 2)).toEqual(["word", "calendar"]);
    expect(new Set(order).size).toBe(order.length);
    expect(order).toHaveLength(DEFAULT_TODAY_ORDER.length);
  });

  it("always visits every slot exactly once", () => {
    for (const value of ["", "next", "calendar errand calendar", "garbage"]) {
      expect([...todayOrderFrom(value)].sort()).toEqual([...DEFAULT_TODAY_ORDER].sort());
    }
  });
});

describe("serialiseTodayOrder", () => {
  it("round-trips through the store's own shape", () => {
    const order = todayOrderFrom("calendar word");
    expect(todayOrderFrom(serialiseTodayOrder(order))).toEqual(order);
  });

  it("writes the default as the full list, so a later default cannot reorder it", () => {
    expect(serialiseTodayOrder(DEFAULT_TODAY_ORDER).split(" ")).toEqual(DEFAULT_TODAY_ORDER);
  });
});

describe("isDefaultTodayOrder", () => {
  it("tells the shipped order from a chosen one", () => {
    expect(isDefaultTodayOrder(todayOrderFrom(null))).toBe(true);
    expect(isDefaultTodayOrder(todayOrderFrom("word"))).toBe(false);
  });
});

describe("orderTodayCards", () => {
  const cards = {
    game: "G", word: "W", calendar: "C", conversation: null, ladder: "L", errand: "E",
    plan: "P", next: "N",
  } as const;

  it("deals in the learner's order and drops what has nothing to say", () => {
    expect(orderTodayCards(cards, todayOrderFrom("next errand")))
      .toEqual(["N", "E", "G", "W", "C", "L", "P"]);
  });

  it("is the shipped order when nothing was chosen", () => {
    expect(orderTodayCards(cards, DEFAULT_TODAY_ORDER)).toEqual(["G", "W", "C", "L", "E", "P", "N"]);
  });

  it("never grows the deal past the cap by itself", () => {
    // The cap is the caller's, applied after this; what ordering changes is
    // which cards survive it, and it must not be able to produce more
    // candidates than there are slots.
    expect(orderTodayCards(cards, DEFAULT_TODAY_ORDER).length).toBeLessThanOrEqual(TODAY_SLOTS.length);
    expect(TODAY_CARDS).toBeLessThan(TODAY_SLOTS.length);
  });

  it("is the order the home page was asked for: rows of game and word, calendar and conversation, progress and out there", () => {
    expect(DEFAULT_TODAY_ORDER.slice(0, 6)).toEqual(
      ["game", "word", "calendar", "conversation", "ladder", "errand"],
    );
    expect(TODAY_CARDS).toBe(6);
  });
});

describe("moveSlot", () => {
  /*
    Asserted as a move of one place rather than against two typed indices: the
    positions shift every time a card is added to Today, and a test that has to
    be renumbered for that is a test that gets renumbered without being read.
  */
  it("moves a slot one step either way", () => {
    const order = todayOrderFrom(null);
    const at = order.indexOf("conversation");
    expect(moveSlot(order, "conversation", "up").indexOf("conversation")).toBe(at - 1);
    expect(moveSlot(order, "conversation", "down").indexOf("conversation")).toBe(at + 1);
  });

  it("does nothing at either end rather than wrapping", () => {
    const order = todayOrderFrom(null);
    expect(moveSlot(order, order[0]!, "up")).toEqual(order);
    expect(moveSlot(order, order[order.length - 1]!, "down")).toEqual(order);
  });

  it("keeps every slot", () => {
    const moved = moveSlot(todayOrderFrom(null), "word", "up");
    expect([...moved].sort()).toEqual([...DEFAULT_TODAY_ORDER].sort());
  });
});

describe("TODAY_SLOTS", () => {
  it("names every slot once with a title a reader can pick from a list", () => {
    const ids = TODAY_SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const slot of TODAY_SLOTS) {
      expect(slot.title.length).toBeGreaterThan(3);
      expect(slot.detail.length).toBeGreaterThan(10);
    }
  });
});
