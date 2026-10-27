import { describe, expect, it } from "vitest";
import { readSnapshot, snapshotKey, SNAPSHOT_MAX_AGE_MS, writeSnapshot } from "./sessionSnapshot";

const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];
const NOW = 1_800_000_000_000;

describe("a review round kept across a reload", () => {
  it("reads back what was written", () => {
    const raw = writeSnapshot({ queue, index: 2, done: 21, correct: 17, met: ["w1"] }, NOW);
    expect(readSnapshot(raw, NOW + 120_000)).toEqual({
      v: 1, savedAt: NOW, queue, index: 2, done: 21, correct: 17, met: ["w1"],
    });
  });

  it("does not resume a round older than the limit, or one from the future", () => {
    const raw = writeSnapshot({ queue, index: 0, done: 0, correct: 0, met: [] }, NOW);
    expect(readSnapshot(raw, NOW + SNAPSHOT_MAX_AGE_MS)).not.toBeNull();
    expect(readSnapshot(raw, NOW + SNAPSHOT_MAX_AGE_MS + 1)).toBeNull();
    expect(readSnapshot(raw, NOW - 1)).toBeNull();
  });

  it("does not resume a finished round", () => {
    expect(readSnapshot(writeSnapshot({ queue, index: 3, done: 3, correct: 3, met: [] }, NOW), NOW)).toBeNull();
  });

  it("refuses anything it did not write", () => {
    const bad = [
      null,
      "",
      "not json",
      "[]",
      JSON.stringify({ v: 2, savedAt: NOW, queue, index: 0, done: 0, correct: 0, met: [] }),
      JSON.stringify({ v: 1, savedAt: NOW, queue: [], index: 0, done: 0, correct: 0, met: [] }),
      JSON.stringify({ v: 1, savedAt: NOW, queue: [{ name: "x" }], index: 0, done: 0, correct: 0, met: [] }),
      JSON.stringify({ v: 1, savedAt: NOW, queue, index: -1, done: 0, correct: 0, met: [] }),
      JSON.stringify({ v: 1, savedAt: NOW, queue, index: 1.5, done: 0, correct: 0, met: [] }),
      JSON.stringify({ v: 1, savedAt: NOW, queue, index: 0, done: 2, correct: 3, met: [] }),
      JSON.stringify({ v: 1, savedAt: NOW, queue, index: 0, done: 0, correct: 0, met: [1] }),
    ];
    let refused = 0;
    for (const raw of bad) {
      expect(readSnapshot(raw, NOW)).toBeNull();
      refused++;
    }
    expect(refused).toBe(bad.length);
  });

  it("keys a round on the page it belongs to, query included", () => {
    expect(snapshotKey("/review")).not.toBe(snapshotKey("/review?case=osastav"));
  });
});
