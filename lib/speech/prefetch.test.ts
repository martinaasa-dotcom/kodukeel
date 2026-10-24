import { describe, expect, it } from "vitest";
import { mayPrefetch } from "./prefetch";

const TYPES = [null, "", "unknown", "wifi", "ethernet", "cellular", "bluetooth", "wimax", "mixed", "other", "none", "WiFi"] as const;

describe("mayPrefetch", () => {
  it("answers every combination of type, Save-Data and pointer by the rule in D10", () => {
    let asked = 0;
    for (const type of TYPES) {
      for (const saveData of [false, true]) {
        for (const coarsePointer of [false, true]) {
          asked += 1;
          const got = mayPrefetch({ type, saveData, coarsePointer });
          const said = type === null ? null : type.toLowerCase();
          const expected = saveData
            ? false
            : said === null || said === "" || said === "unknown"
              ? !coarsePointer
              : said === "wifi" || said === "ethernet";
          expect(got, `${String(type)} saveData=${saveData} coarse=${coarsePointer}`).toBe(expected);
        }
      }
    }
    expect(asked).toBe(TYPES.length * 4);
  });

  it("never downloads on mobile data, on a phone or a computer", () => {
    expect(mayPrefetch({ type: "cellular", saveData: false, coarsePointer: true })).toBe(false);
    expect(mayPrefetch({ type: "cellular", saveData: false, coarsePointer: false })).toBe(false);
  });

  it("never downloads with Save-Data on, even on Wi-Fi", () => {
    expect(mayPrefetch({ type: "wifi", saveData: true, coarsePointer: false })).toBe(false);
    expect(mayPrefetch({ type: "ethernet", saveData: true, coarsePointer: false })).toBe(false);
  });

  it("downloads on Wi-Fi or wired, phone or computer", () => {
    expect(mayPrefetch({ type: "wifi", saveData: false, coarsePointer: true })).toBe(true);
    expect(mayPrefetch({ type: "ethernet", saveData: false, coarsePointer: false })).toBe(true);
  });

  it("reads a browser that says nothing as a computer only where the pointer is fine", () => {
    // Every iPhone: no Network Information API and a coarse pointer.
    expect(mayPrefetch({ type: null, saveData: false, coarsePointer: true })).toBe(false);
    // Safari or Firefox on a laptop.
    expect(mayPrefetch({ type: null, saveData: false, coarsePointer: false })).toBe(true);
  });
});
