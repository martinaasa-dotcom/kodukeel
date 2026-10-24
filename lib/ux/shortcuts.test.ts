import { describe, expect, it } from "vitest";

import { DEFAULT_SINGLE_KEYS, isCharacterKey, mayActOnKey, singleKeysFrom } from "./shortcuts";

describe("single-key shortcuts (WCAG 2.1.4)", () => {
  it("are on unless somebody said off", () => {
    expect(DEFAULT_SINGLE_KEYS).toBe("on");
    expect(singleKeysFrom(undefined)).toBe("on");
    expect(singleKeysFrom("nonsense")).toBe("on");
    expect(singleKeysFrom("off")).toBe("off");
  });

  it("count a letter, a digit and punctuation as a character key, with or without Shift", () => {
    for (const key of ["1", "4", "0", "b", "B", "u", "r", "?", "õ"]) expect(isCharacterKey({ key }), key).toBe(true);
  });

  it("leave Enter, Space, Escape, the arrows and a held modifier alone", () => {
    for (const key of ["Enter", " ", "Escape", "ArrowLeft", "Tab", "Backspace"]) expect(isCharacterKey({ key }), key).toBe(false);
    expect(isCharacterKey({ key: "z", metaKey: true })).toBe(false);
    expect(isCharacterKey({ key: "k", ctrlKey: true })).toBe(false);
    expect(isCharacterKey({ key: "m", altKey: true })).toBe(false);
  });

  it("let a round act on every key while they are on, and only on the browser's keys while they are off", () => {
    expect(mayActOnKey({ key: "1" }, true)).toBe(true);
    expect(mayActOnKey({ key: "1" }, false)).toBe(false);
    expect(mayActOnKey({ key: "Enter" }, false)).toBe(true);
    expect(mayActOnKey({ key: " " }, false)).toBe(true);
    expect(mayActOnKey({ key: "z", metaKey: true }, false)).toBe(true);
  });
});
