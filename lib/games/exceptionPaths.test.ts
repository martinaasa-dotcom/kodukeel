import { describe, expect, it } from "vitest";
import { EXCEPTION_KINDS, KIND_NOTES } from "@/lib/estonian/exceptions";
import { FAMILY_ORDER, kindsOf, parseFamily, standingOf } from "./exceptionPaths";

describe("exception families", () => {
  it("covers every kind exactly once", () => {
    const all = FAMILY_ORDER.flatMap((f) => kindsOf(f));
    expect(all.length).toBe(EXCEPTION_KINDS.length);
    expect(new Set(all).size).toBe(all.length);
    for (const f of FAMILY_ORDER) {
      expect(kindsOf(f).length).toBeGreaterThan(0);
      for (const k of kindsOf(f)) expect(KIND_NOTES[k].family).toBe(f);
    }
  });

  it("reads a family from a query value and refuses anything else", () => {
    expect(parseFamily("verb")).toBe("VERB");
    expect(parseFamily("nope")).toBeNull();
    expect(parseFamily(undefined)).toBeNull();
  });
});

describe("standingOf", () => {
  it("is new with no answers", () => expect(standingOf(0, 0).state).toBe("new"));
  it("is never known on thin evidence", () => expect(standingOf(5, 5).state).toBe("learning"));
  it("is known at 80% over enough answers", () => expect(standingOf(8, 10).state).toBe("known"));
  it("is learning below 80%", () => expect(standingOf(7, 10).state).toBe("learning"));
});
