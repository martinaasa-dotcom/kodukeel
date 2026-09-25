import { describe, expect, it } from "vitest";
import { shareRefusal } from "./share";

describe("shareRefusal", () => {
  it("reads a closed share sheet as the learner's choice", () => {
    expect(shareRefusal(new DOMException("Share canceled", "AbortError"))).toBe("cancelled");
  });
  it("reads anything else as the browser refusing, which the tab fallback answers", () => {
    expect(shareRefusal(new DOMException("no activation", "NotAllowedError"))).toBe("refused");
    expect(shareRefusal(new TypeError("x"))).toBe("refused");
    expect(shareRefusal(undefined)).toBe("refused");
  });
});
