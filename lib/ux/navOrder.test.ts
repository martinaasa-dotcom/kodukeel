import { describe, expect, it } from "vitest";
import {
  DEFAULT_NAV_ORDER, isDefaultNavOrder, MAX_PINS, moveRow, navOrderFrom, pinCount, railRows,
  serialiseNavOrder, unpinned,
} from "./navOrder";
import { PINNABLE } from "./nav";

describe("the rail's order", () => {
  it("is the six places when nothing is stored", () => {
    expect(navOrderFrom(null)).toEqual([...DEFAULT_NAV_ORDER]);
    expect(navOrderFrom("")).toEqual([...DEFAULT_NAV_ORDER]);
    expect(DEFAULT_NAV_ORDER).toHaveLength(6);
  });

  it("keeps an order somebody set, pins included", () => {
    const order = navOrderFrom("/practice / /calendar /learn /grammar /dictionary /progress");
    expect(order).toEqual(["/practice", "/", "/calendar", "/learn", "/grammar", "/dictionary", "/progress"]);
  });

  it("never loses one of the five, and puts a missing one back beside its neighbour", () => {
    const order = navOrderFrom("/ /calendar /progress");
    for (const href of DEFAULT_NAV_ORDER) expect(order).toContain(href);
    expect(order.indexOf("/learn")).toBe(order.indexOf("/") + 1);
  });

  it("drops what cannot be pinned, a duplicate and a pin past the cap", () => {
    const extra = PINNABLE.slice(0, MAX_PINS + 2).map((d) => d.href);
    const order = navOrderFrom(["/tutor", "/nowhere", "/", "/", ...extra].join(" "));
    expect(order).not.toContain("/tutor");
    expect(order).not.toContain("/nowhere");
    expect(order.filter((h) => h === "/")).toHaveLength(1);
    expect(pinCount(order)).toBe(MAX_PINS);
  });

  it("reads back what it stores", () => {
    const order = ["/learn", "/", "/grammar", "/practice", "/dictionary", "/progress"];
    expect(serialiseNavOrder(order)).toBe(order.join(" "));
    expect(isDefaultNavOrder([...DEFAULT_NAV_ORDER])).toBe(true);
    expect(isDefaultNavOrder(order)).toBe(false);
  });

  it("draws a row for every entry and offers what is not pinned", () => {
    const order = navOrderFrom("/ /learn /practice /grammar /dictionary /progress /calendar");
    expect(railRows(order).map((d) => d.href)).toEqual(order);
    expect(unpinned(order).map((d) => d.href)).not.toContain("/calendar");
    expect(unpinned(order).length).toBe(PINNABLE.length - 1);
  });

  it("moves a row", () => {
    expect(moveRow(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveRow(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});
