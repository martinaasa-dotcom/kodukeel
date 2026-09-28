import { describe, expect, it } from "vitest";
import { classHref, classRows, MAX_CLASS_ROWS } from "./classRows";
import { litRow, CORE } from "./nav";

describe("classRows", () => {
  it("draws one row per class, to the class's own page", () => {
    const rows = classRows([{ id: "a1", name: "Tuesday group" }, { id: "b2", name: "Work" }]);
    expect(rows.map((r) => [r.href, r.label])).toEqual([
      ["/class/a1", "Tuesday group"],
      ["/class/b2", "Work"],
    ]);
  });

  it("drops a duplicate and caps the count", () => {
    const many = Array.from({ length: MAX_CLASS_ROWS + 3 }, (_, i) => ({ id: `c${i}`, name: `C${i}` }));
    const rows = classRows([...many, { id: "c0", name: "again" }]);
    expect(rows).toHaveLength(MAX_CLASS_ROWS);
    expect(new Set(rows.map((r) => r.href)).size).toBe(rows.length);
  });

  it("names a class with no visible name rather than drawing an empty row", () => {
    expect(classRows([{ id: "x", name: "  " }])[0]!.label).toBe("Your class");
  });

  it("lights the class row on the class page, not Progress", () => {
    const rows = [...CORE, ...classRows([{ id: "abc", name: "Tuesday" }])];
    expect(litRow(rows, classHref("abc"))).toBe("/class/abc");
    expect(litRow(rows, "/class")).toBe("/progress");
  });
});
