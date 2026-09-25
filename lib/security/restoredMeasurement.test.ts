import { describe, expect, it } from "vitest";
import { asRestoredMeasurement } from "./restoredMeasurement";

const now = new Date("2026-09-25T10:00:00Z");

describe("a restored measurement is always stamped", () => {
  it("stamps a row the file says was never restored", () => {
    expect(asRestoredMeasurement({ id: "a", restoredAt: null }, now).restoredAt).toEqual(now);
    expect(asRestoredMeasurement({ id: "a" }, now).restoredAt).toEqual(now);
  });

  it("keeps an earlier stamp, so a row restored twice keeps its first", () => {
    const first = "2026-01-02T03:04:05.000Z";
    expect(asRestoredMeasurement({ restoredAt: first }, now).restoredAt).toEqual(new Date(first));
  });

  it("does not take a stamp from the future or one that is not a date", () => {
    expect(asRestoredMeasurement({ restoredAt: "2099-01-01T00:00:00Z" }, now).restoredAt).toEqual(now);
    expect(asRestoredMeasurement({ restoredAt: "yesterday-ish" }, now).restoredAt).toEqual(now);
    expect(asRestoredMeasurement({ restoredAt: 0 }, now).restoredAt).toEqual(now);
  });

  it("leaves every other field exactly as the file wrote it", () => {
    const row = { id: "x", pct: 100, passed: true, result: "{}" };
    expect(asRestoredMeasurement(row, now)).toEqual({ ...row, restoredAt: now });
  });
});
