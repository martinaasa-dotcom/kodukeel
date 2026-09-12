import { describe, expect, it } from "vitest";
import { resumeIndex, resumeStorageKey } from "./resumePosition";

describe("resumeStorageKey", () => {
  it("keys on the path and query together, so filtered views cannot collide", () => {
    expect(resumeStorageKey("/review")).not.toBe(resumeStorageKey("/review?case=osastav"));
    expect(resumeStorageKey("/review/common/nouns")).not.toBe(resumeStorageKey("/review"));
  });
});

describe("resumeIndex", () => {
  const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("finds the saved card wherever it now sits", () => {
    expect(resumeIndex(cards, "c")).toBe(2);
    expect(resumeIndex(cards, "a")).toBe(0);
  });

  it("falls back to the start where nothing was saved", () => {
    expect(resumeIndex(cards, null)).toBe(0);
  });

  it("falls back to the start where the saved card is gone", () => {
    expect(resumeIndex(cards, "graded-already")).toBe(0);
  });

  it("falls back to the start on an empty queue", () => {
    expect(resumeIndex([], "a")).toBe(0);
  });
});
