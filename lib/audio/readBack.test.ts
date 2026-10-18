import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
  A READ-BACK OF WHAT WAS HEARD IS NEVER KEPT (docs/41-fifth-batch.md VB-5).

  The store is content-addressed, shared by every learner and named by the
  text, so a read-back of the learner's own words may neither read it nor
  write it. Driven through the real route with the store, the ledger and the
  limiters stubbed and TartuNLP answered by a stub `fetch`.
*/
const store = vi.hoisted(() => ({ reads: [] as string[], writes: [] as string[] }));
vi.mock("@/lib/audio/store", () => ({
  readAudio: async (hash: string) => { store.reads.push(hash); return null; },
  writeAudio: async (hash: string) => { store.writes.push(hash); },
}));
vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => "learner-1" }));
const limits = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock("@/lib/usage/sharedLimit", () => ({
  checkSharedRateLimit: async (key: string) => { limits.keys.push(key); return { ok: true, remaining: 10, resetAt: 0 }; },
}));
const ledger = vi.hoisted(() => ({ asked: 0, recorded: 0 }));
vi.mock("@/lib/usage/ledger", () => ({
  authoriseCall: async () => { ledger.asked += 1; return { allowed: true, reservation: { id: "r" } }; },
  recordUsage: async () => { ledger.recorded += 1; },
  releaseReservation: async () => undefined,
}));
vi.mock("next/server", async (original) => {
  const real = await original<typeof import("next/server")>();
  return { ...real, after: (task: () => unknown) => { void task(); } };
});

/** A tiny valid WAV, which is what TartuNLP answers with. */
function wavBytes(): Uint8Array {
  const samples = 1600;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const put = (at: number, text: string) => { for (let i = 0; i < 4; i++) bytes[at + i] = text.charCodeAt(i); };
  put(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); put(8, "WAVE");
  put(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 22050, true); view.setUint32(28, 44100, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, "data"); view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.round(Math.sin(i / 5) * 8000), true);
  return bytes;
}

const realFetch = globalThis.fetch;
beforeEach(() => {
  store.reads.length = 0;
  store.writes.length = 0;
  limits.keys.length = 0;
  ledger.asked = 0;
  ledger.recorded = 0;
  globalThis.fetch = vi.fn(async () => new Response(new Blob([wavBytes().slice().buffer]), { status: 200 })) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

function post(path: string, text: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

describe("a read-back of what was heard", () => {
  it("asks TartuNLP, and reads and writes nothing in the shared store", async () => {
    const { POST } = await import("@/app/api/tts/route");
    const response = await POST(post("/api/tts?transient=1", "ma lähhen poodi"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-tts-cache")).toBe("transient");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(store.reads).toEqual([]);
    expect(store.writes).toEqual([]);
  });

  it("is metered per learner, on the shared limiter and the ledger, like a miss", async () => {
    const { POST } = await import("@/app/api/tts/route");
    await POST(post("/api/tts?transient=1", "tere"));
    expect(limits.keys).toEqual(["tts-heard:o:learner-1"]);
    expect(ledger.asked).toBe(1);
    expect(ledger.recorded).toBe(1);
  });

  it("leaves an ordinary request reading and writing the store as before", async () => {
    const { POST } = await import("@/app/api/tts/route");
    const response = await POST(post("/api/tts", "tere"));
    expect(response.status).toBe(200);
    expect(store.reads.length).toBe(1);
    expect(store.writes.length).toBe(1);
  });
});
