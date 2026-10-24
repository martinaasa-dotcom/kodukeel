import { describe, expect, it } from "vitest";

import { API_ERROR_CODES, ApiErrorBody, apiError } from "./errors";

describe("apiError", () => {
  it("answers every code in one shape, never kept", async () => {
    for (const code of API_ERROR_CODES) {
      const response = apiError(code);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(ApiErrorBody.safeParse(await response.json()).success).toBe(true);
    }
  });

  it("says how long to wait on a 429 or a 503", () => {
    expect(apiError("auth_unavailable").headers.get("retry-after")).toBe("30");
    expect(apiError("rate_limited", { retryAfterSec: 7 }).headers.get("retry-after")).toBe("7");
    expect(apiError("not_found").headers.get("retry-after")).toBeNull();
  });

  it("never hands back what a database said", async () => {
    const leak = new Error("connect failed: postgresql://kodukeel:hunter2secret@db.example:5432/prod");
    const body = (await apiError("invalid", { message: leak }).json()) as { error: { message: string } };
    expect(body.error.message).not.toContain("hunter2secret");
  });
});
