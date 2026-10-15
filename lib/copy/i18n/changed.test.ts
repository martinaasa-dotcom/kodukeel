import { describe, expect, it } from "vitest";
import { changedLines } from "./changed";

describe("changedLines", () => {
  const before = { a1: "Один", b2: "Два", c3: "Три", d4: "Четыре", e5: "Пять" };

  it("lists a new key and a changed value, and ignores a removed key", () => {
    const now = { a1: "Один", b2: "Два!", c3: "Три", e5: "Пять", f6: "Шесть" };
    expect(changedLines(before, now)).toEqual({ added: ["f6"], changed: ["b2"] });
  });

  it("lists nothing when the tables are the same", () => {
    expect(changedLines(before, { ...before })).toEqual({ added: [], changed: [] });
  });

  it("lists everything as new against an empty table", () => {
    expect(changedLines({}, before).added).toEqual(Object.keys(before));
  });

  it("is not fooled by a key that is a property of every object", () => {
    expect(changedLines({}, { constructor: "x" }).added).toEqual(["constructor"]);
  });
});
