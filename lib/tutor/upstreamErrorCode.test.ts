import { describe, expect, it } from "vitest";
import { upstreamErrorCode } from "./provider";

describe("what a provider's error body leaves in the log", () => {
  it("keeps the provider's own code and none of its text", () => {
    expect(upstreamErrorCode(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Mul on kõht tühi" } }))).toBe("overloaded_error");
    expect(upstreamErrorCode(JSON.stringify({ error: { code: "context_length_exceeded", message: "your text: ..." } }))).toBe("context_length_exceeded");
    expect(upstreamErrorCode(JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT", message: "x" } }))).toBe("400");
  });

  it("keeps nothing where the code is prose or the body is not JSON", () => {
    expect(upstreamErrorCode("<html>Bad gateway</html>")).toBeNull();
    expect(upstreamErrorCode(JSON.stringify({ error: { type: "the learner wrote: ma olen kodus" } }))).toBeNull();
    expect(upstreamErrorCode("")).toBeNull();
  });
});
