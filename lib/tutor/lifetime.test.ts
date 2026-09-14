import { describe, expect, it } from "vitest";
import { CONVERSATION_LIFETIME_MS, conversationCutoff } from "./lifetime";

describe("how long a conversation with Anu lasts", () => {
  it("is a day, and the cutoff is exactly a day before now", () => {
    expect(CONVERSATION_LIFETIME_MS).toBe(86_400_000);
    const now = new Date("2026-09-14T10:00:00Z");
    expect(conversationCutoff(now).toISOString()).toBe("2026-09-13T10:00:00.000Z");
  });

  it("is a rolling window rather than a calendar day, so a conversation across midnight is one conversation", () => {
    const late = new Date("2026-09-14T00:05:00Z");
    expect(conversationCutoff(late).getTime()).toBeLessThan(new Date("2026-09-13T23:50:00Z").getTime());
  });
});
