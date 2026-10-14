import { describe, expect, it } from "vitest";
import { errorFingerprint, messageShape } from "./fingerprint";

describe("errorFingerprint", () => {
  it("groups two reports of one fault whose messages differ by an id, a number or a quoted value", () => {
    const a = errorFingerprint("api/tutor", 'Card 3f0e6a1c-1b2d-4c3e-9f00-1a2b3c4d5e6f not found after 12 tries for "tuba"');
    const b = errorFingerprint("api/tutor", 'Card 9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d not found after 3 tries for "maja"');
    expect(a).toBe(b);
  });

  it("keeps different faults and different places apart", () => {
    expect(errorFingerprint("api/tutor", "timeout")).not.toBe(errorFingerprint("api/tutor", "rejected key"));
    expect(errorFingerprint("api/tutor", "timeout")).not.toBe(errorFingerprint("api/scan", "timeout"));
  });

  it("is short and stable", () => {
    expect(errorFingerprint("x", "y")).toMatch(/^[0-9a-f]{8}$/);
    expect(errorFingerprint("x", "y")).toBe(errorFingerprint("x", "y"));
  });

  it("shapes a message without its per-occurrence parts", () => {
    expect(messageShape("took 2500ms at 2026-10-14T16:00:00Z")).toBe("took <n>ms at <time>");
  });

  it("takes a short hex id out and leaves a word spelled in a to f alone", () => {
    expect(messageShape("no card 4f1c2a9e")).toBe(messageShape("no card 99aa00bb"));
    expect(messageShape("a decade passed")).toBe("a decade passed");
  });
});
