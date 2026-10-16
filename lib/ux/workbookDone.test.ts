import { describe, expect, it } from "vitest";
import { SET_FOR_YOU, doneKeyFrom, doneToday, withDone } from "./workbookDone";

describe("which workbook pages are done today", () => {
  it("accepts the two kinds of choice a page can be and nothing else", () => {
    expect(doneKeyFrom(SET_FOR_YOU)).toBe("set");
    expect(doneKeyFrom("present")).toBe("present");
    expect(doneKeyFrom("case:GENITIVE")).toBe("case:GENITIVE");
    expect(doneKeyFrom("blorp")).toBeNull();
    expect(doneKeyFrom("present past")).toBeNull();
    expect(doneKeyFrom(42)).toBeNull();
    expect(doneKeyFrom(null)).toBeNull();
  });

  it("reads only the day it was written on", () => {
    const value = withDone(null, "2026-10-16", "present");
    expect([...doneToday(value, "2026-10-16")]).toEqual(["present"]);
    expect(doneToday(value, "2026-10-17").size).toBe(0);
    expect(doneToday(null, "2026-10-16").size).toBe(0);
  });

  it("adds to the day's list and starts over on a new day", () => {
    const once = withDone(null, "2026-10-16", "present");
    const twice = withDone(withDone(once, "2026-10-16", "set"), "2026-10-16", "set");
    expect([...doneToday(twice, "2026-10-16")].sort()).toEqual(["present", "set"]);
    expect(withDone(twice, "2026-10-17", "past")).toBe("2026-10-17 past");
  });
});
