import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EKILEX_IN_FLIGHT, EKILEX_TRIES, backoffMs, createEkilexGate, emptyTally, type GateDeps,
} from "./client";
import { ekilexUserAgent } from "../legal/operator";

/**
 * The gate every request to Ekilex goes through, driven with a stubbed
 * transport and fake timers so nothing here reaches the Institute.
 */

type Reply = { status: number; body?: unknown; retryAfter?: string };

function stubbed(replies: (Reply | (() => Promise<Reply>))[], overrides: Partial<GateDeps> = {}) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  let i = 0;
  const deps: GateDeps = {
    fetch: async (url, init) => {
      calls.push({ url, headers: init.headers });
      const next = replies[Math.min(i++, replies.length - 1)]!;
      const reply = typeof next === "function" ? await next() : next;
      return {
        ok: reply.status >= 200 && reply.status < 300,
        status: reply.status,
        json: async () => reply.body ?? {},
        headers: { get: (name: string) => (name === "retry-after" ? reply.retryAfter ?? null : null) },
      };
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    random: () => 0,
    key: () => "test-key",
    userAgent: () => "Kodukeel/test",
    limit: EKILEX_IN_FLIGHT,
    ...overrides,
  };
  return { gate: createEkilexGate(deps), calls };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the Ekilex gate", () => {
  it("never has more than two requests in flight, however many are asked for at once", async () => {
    let open = 0;
    let most = 0;
    const slow = async (): Promise<Reply> => {
      open += 1;
      most = Math.max(most, open);
      await new Promise((resolve) => setTimeout(resolve, 100));
      open -= 1;
      return { status: 200, body: { words: [] } };
    };
    const { gate } = stubbed([slow]);
    const all = Promise.all(Array.from({ length: 7 }, (_, n) => gate.request(`/word/search/w${n}/eki`)));
    await vi.advanceTimersByTimeAsync(1_000);
    const answers = await all;
    expect(answers.every((a) => a.kind === "answered")).toBe(true);
    expect(answers).toHaveLength(7);
    expect(most).toBe(2);
    expect(gate.inFlight()).toBe(0);
  });

  it("backs off and tries again on a 429 and on a 503, then answers", async () => {
    const { gate, calls } = stubbed([{ status: 429 }, { status: 503 }, { status: 200, body: { words: [] } }]);
    const pending = gate.request("/word/search/tuba/eki");
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await pending).kind).toBe("answered");
    expect(calls).toHaveLength(3);
  });

  it("gives up after three tries and says it failed, which the harvest keeps what it had on", async () => {
    const tally = emptyTally();
    const { gate, calls } = stubbed([{ status: 503 }]);
    const pending = gate.request("/word/details/1", { kind: "details", tally });
    await vi.advanceTimersByTimeAsync(30_000);
    const answer = await pending;
    expect(answer.kind).toBe("failed");
    expect(calls).toHaveLength(EKILEX_TRIES);
    // Counted once as a request however many tries it took, and once as failed.
    expect(tally).toEqual({ search: 0, details: 1, refused: 0, failed: 1 });
  });

  it("never retries a refusal", async () => {
    const tally = emptyTally();
    const { gate, calls } = stubbed([{ status: 403 }]);
    const answer = await gate.request("/word/search/tuba/eki", { kind: "search", tally });
    expect(answer).toEqual({ kind: "refused", status: 403 });
    expect(calls).toHaveLength(1);
    expect(tally).toEqual({ search: 1, details: 0, refused: 1, failed: 0 });
  });

  it("waits out a Retry-After the service sent, rather than its own shorter backoff", async () => {
    const { gate, calls } = stubbed([{ status: 429, retryAfter: "4" }, { status: 200, body: {} }]);
    const pending = gate.request("/word/search/tuba/eki");
    await vi.advanceTimersByTimeAsync(3_900);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(200);
    expect((await pending).kind).toBe("answered");
    expect(calls).toHaveLength(2);
  });

  it("does not sleep past a page's deadline: a backoff happens inside it or not at all", async () => {
    const tally = emptyTally();
    const { gate, calls } = stubbed([{ status: 503 }]);
    // Half a second left: the first backoff is half a second or more, so no second try.
    const answer = await gate.request("/word/search/tuba/eki", { deadline: Date.now() + 400, kind: "search", tally });
    expect(answer.kind).toBe("failed");
    expect(calls).toHaveLength(1);
    expect(tally.failed).toBe(1);
  });

  it("gives up waiting for a slot at the deadline, and counts nothing Ekilex never saw", async () => {
    const tally = emptyTally();
    const hang = () => new Promise<Reply>((resolve) => setTimeout(() => resolve({ status: 200 }), 10_000));
    const { gate, calls } = stubbed([hang]);
    void gate.request("/a");
    void gate.request("/b");
    const third = gate.request("/c", { deadline: Date.now() + 2_500, kind: "search", tally });
    await vi.advanceTimersByTimeAsync(2_600);
    expect((await third).kind).toBe("failed");
    expect(calls).toHaveLength(2);
    expect(tally).toEqual(emptyTally());
    await vi.advanceTimersByTimeAsync(10_000);
  });

  it("names itself on every request and carries the key", async () => {
    const { gate, calls } = stubbed([{ status: 200, body: {} }]);
    await gate.request("/word/details/1");
    expect(calls[0]!.headers["user-agent"]).toBe("Kodukeel/test");
    expect(calls[0]!.headers["ekilex-api-key"]).toBe("test-key");
    expect(calls[0]!.url).toBe("https://ekilex.ee/api/word/details/1");
  });

  it("asks nothing without a key", async () => {
    const { gate, calls } = stubbed([{ status: 200 }], { key: () => undefined });
    expect((await gate.request("/a")).kind).toBe("refused");
    expect(calls).toHaveLength(0);
  });

  it("can be raised past two only by asking, for a script run with --past-the-limit", async () => {
    let open = 0;
    let most = 0;
    const slow = async (): Promise<Reply> => {
      open += 1;
      most = Math.max(most, open);
      await new Promise((resolve) => setTimeout(resolve, 100));
      open -= 1;
      return { status: 200, body: {} };
    };
    const { gate } = stubbed([slow]);
    gate.setLimit(4);
    const all = Promise.all(Array.from({ length: 8 }, (_, n) => gate.request(`/x${n}`)));
    await vi.advanceTimersByTimeAsync(1_000);
    await all;
    expect(most).toBe(4);
  });
});

describe("backoffMs", () => {
  it("doubles per try and adds up to half again of jitter", () => {
    expect(backoffMs(1, 0)).toBe(500);
    expect(backoffMs(2, 0)).toBe(1_000);
    expect(backoffMs(2, 1)).toBe(1_500);
  });

  it("honors a longer Retry-After, up to a cap", () => {
    expect(backoffMs(1, 0, 4_000)).toBe(4_000);
    expect(backoffMs(1, 0, 120_000)).toBe(30_000);
    expect(backoffMs(1, 0, 100)).toBe(500);
  });
});

describe("ekilexUserAgent", () => {
  it("names the version, the trust page and the operator's email on a configured deployment", () => {
    const ua = ekilexUserAgent("1.2.3", {
      NEXT_PUBLIC_SITE_URL: "https://example.org",
      OPERATOR_NAME: "Example OÜ",
      OPERATOR_ADDRESS: "Somewhere 1, Tallinn",
      OPERATOR_EMAIL: "ops@example.org",
    });
    expect(ua).toBe("Kodukeel/1.2.3 (+https://example.org/trust; ops@example.org)");
  });

  it("sends no email where the deployment names nobody", () => {
    expect(ekilexUserAgent("1.2.3", { NEXT_PUBLIC_SITE_URL: "https://fork.example" }))
      .toBe("Kodukeel/1.2.3 (+https://fork.example/trust)");
    expect(ekilexUserAgent("1.2.3", { OPERATOR_EMAIL: "half@example.org" })).toBe("Kodukeel/1.2.3");
  });

  it("names the canonical deployment's operator from the table", () => {
    expect(ekilexUserAgent("0.1.0", { NEXT_PUBLIC_SITE_URL: "https://kodukeel.ee" }))
      .toBe("Kodukeel/0.1.0 (+https://kodukeel.ee/trust; privacy@upthink.ee)");
  });
});
