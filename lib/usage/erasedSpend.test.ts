import { describe, expect, it } from "vitest";
import { ERASED_PREFIX, erasedOwnerKey } from "./erasedSpend";

describe("erasedOwnerKey", () => {
  it("names one learner's day and no other, without carrying the id", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const key = erasedOwnerKey(id, "2026-10-25");
    expect(key.startsWith(ERASED_PREFIX)).toBe(true);
    expect(key).not.toContain(id);
    expect(erasedOwnerKey(id, "2026-10-25")).toBe(key);
    expect(erasedOwnerKey(id, "2026-10-26")).not.toBe(key);
    expect(erasedOwnerKey("someone-else", "2026-10-25")).not.toBe(key);
  });
});
