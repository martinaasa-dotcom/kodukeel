import { describe, expect, it, vi } from "vitest";

// The reader is pure; the module beside it holds a database client that this
// test never touches.
vi.mock("@/lib/db", () => ({ prisma: {} }));

const { partPercentages } = await import("./exam");

describe("partPercentages", () => {
  it("leaves out a part nothing could be set for, rather than reading it as 0%", () => {
    const json = JSON.stringify({
      parts: [
        { skill: "reading", pct: 72, rawAvailable: 10 },
        { skill: "listening", pct: 0, rawAvailable: 0 },
      ],
    });
    expect(partPercentages(json)).toEqual({ reading: 72 });
  });

  it("keeps a real 0%, which is a part that was set and got nothing right", () => {
    const json = JSON.stringify({ parts: [{ skill: "listening", pct: 0, rawAvailable: 8 }] });
    expect(partPercentages(json)).toEqual({ listening: 0 });
  });

  it("reads a row written before rawAvailable as it always did", () => {
    const json = JSON.stringify({ parts: [{ skill: "writing", pct: 40 }] });
    expect(partPercentages(json)).toEqual({ writing: 40 });
  });
});
