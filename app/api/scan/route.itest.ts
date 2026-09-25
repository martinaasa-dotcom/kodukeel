import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A page read by the model and a dictionary that will not answer.
 *
 * Everything the route talks to is stubbed, so this needs no database and no
 * key; it sits with the integration tests because that suite is the one that
 * reads `app/`. What it asks is the one thing a unit test of `lib/scan` cannot:
 * whether a failure after the model has answered comes back as a sentence or
 * as a thrown handler. A thrown handler is an empty 500, the screen fails to
 * read it as JSON, and its own catch tells the learner to check their
 * connection, which is a failure naming a cause the learner does not have.
 */

const reportError = vi.fn();

vi.mock("next/server", () => ({ after: () => undefined }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => "itest-scan-owner" }));
vi.mock("@/lib/observability/report", () => ({ reportError }));
vi.mock("@/lib/usage/ledger", () => ({
  authoriseCall: async () => ({ allowed: true, fallbackAllowed: true, reservation: null }),
  recordUsage: async () => undefined,
  releaseReservation: async () => undefined,
}));
vi.mock("@/lib/tutor/provider", () => {
  class TutorError extends Error {
    status = 502;
  }
  const config = { name: "stub", label: "Stub", model: "stub-vision" };
  return {
    TutorError,
    visionProviders: () => [config],
    completeWithImage: async () => ({ text: "kohv\ntee\n", config }),
  };
});
vi.mock("@/lib/dict/resolveScan", () => ({
  resolveScannedItems: async () => {
    throw new Error("connect ECONNREFUSED postgres://user:secret@db.internal:5432/app");
  },
}));

const { POST } = await import("./route");

// The smallest PNG there is: one transparent pixel.
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

beforeEach(() => reportError.mockReset());

describe("/api/scan", () => {
  it("answers with a sentence, and reports it, when the dictionary cannot be asked", async () => {
    const response = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: PIXEL }),
      }),
    );

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/dictionary/i);
    // What the database said stays in the log, never on the screen.
    expect(body.error).not.toMatch(/secret|postgres|ECONNREFUSED/);
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
