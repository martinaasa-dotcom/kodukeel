import { describe, expect, it } from "vitest";
import { usageCutoffDay, USAGE_RETENTION_MONTHS } from "./retention";

describe("usageCutoffDay", () => {
  it("is thirteen months before today, on the UTC calendar", () => {
    expect(USAGE_RETENTION_MONTHS).toBe(13);
    expect(usageCutoffDay(new Date("2026-10-25T03:00:00Z"))).toBe("2025-09-25");
    expect(usageCutoffDay(new Date("2026-01-05T23:59:00Z"))).toBe("2024-12-05");
  });

  it("compares as the ledger's own day strings do", () => {
    const cut = usageCutoffDay(new Date("2026-10-25T12:00:00Z"));
    expect("2025-09-24" < cut).toBe(true);
    expect("2025-09-25" < cut).toBe(false);
  });
});
