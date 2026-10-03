import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { beginRun } from "@/lib/progress/scene";

/**
 * The scene route handed a body that is JSON but not the shape the screen sends.
 *
 * Every field was read through `String(...)`, which calls whatever `toString`
 * the value carries, and JSON can put a non-function there: `{"toString": 1}`
 * has no callable conversion and `String` throws. That is a TypeError before
 * any branch that answers, so a stranger's odd body came back a 500 with a
 * digest where a refusal is the honest reply, which is the shape the server
 * actions were swept for (#480, #506). A field that is not a string is read as
 * absent now.
 */

const OWNER = "itest-scene-route";

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (task: () => unknown) => { void Promise.resolve().then(task).catch(() => {}); },
}));

vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => OWNER }));

/*
  Keyless unless a test says otherwise, so nothing leaves the process. The
  ledger is counted rather than written, which is the question the third test
  asks: every booking has to come back or be settled.
*/
const flags = {
  keyed: false,
  glossFails: false,
  booked: 0,
  released: 0,
  // What the stubbed provider answers, and every settlement written against a booking.
  line: null as string | null,
  settled: [] as { micros: number | null }[],
};
const FAKE = { name: "gemini", label: "Stub", model: "stub" };

vi.mock("@/lib/tutor/provider", async (original) => ({
  ...(await original<typeof import("@/lib/tutor/provider")>()),
  resolveProviders: () => [],
  sceneProviders: () => (flags.keyed ? [FAKE] : []),
  openWithFallback: async (
    _chain: unknown, _system: unknown, _messages: unknown,
    onUsage: (usage: { inputTokens: number; outputTokens: number }, config: typeof FAKE) => void,
  ) => {
    if (flags.line === null) throw new Error("no network in a test");
    onUsage({ inputTokens: 100, outputTokens: 10 }, FAKE);
    const text = flags.line;
    return { chunks: (async function* () { yield text; })(), config: FAKE };
  },
}));

vi.mock("@/lib/usage/ledger", () => ({
  authoriseCall: async () => {
    flags.booked += 1;
    return { allowed: true, fallbackAllowed: false, reservation: { id: `r${flags.booked}`, micros: 1 } };
  },
  recordUsage: async (input: { reservation?: { micros: number } }) => {
    flags.settled.push({ micros: input.reservation ? input.reservation.micros : null });
  },
  releaseReservation: async () => { flags.released += 1; },
}));

vi.mock("@/lib/dict/glossed", async (original) => {
  const real = await original<typeof import("@/lib/dict/glossed")>();
  return {
    ...real,
    glossSentences: async (...args: Parameters<typeof real.glossSentences>) => {
      if (flags.glossFails) throw new Error("the pooler had a bad minute");
      return real.glossSentences(...args);
    },
  };
});

const { POST } = await import("./route");

async function wipe() {
  await prisma.sceneGap.deleteMany({ where: { ownerId: OWNER } });
  await prisma.sceneRun.deleteMany({ where: { ownerId: OWNER } });
}

beforeEach(async () => {
  Object.assign(flags, { keyed: false, glossFails: false, booked: 0, released: 0, line: null, settled: [] });
  await wipe();
});
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

function post(body: string) {
  return POST(new Request("http://localhost/api/scene", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  }));
}

describe("/api/scene with a body that is not what the screen sends", () => {
  it("refuses a run id that is not a string rather than throwing", async () => {
    const res = await post(JSON.stringify({ runId: { toString: 1 }, turns: [] }));
    expect(res.status).toBe(400);
  });

  it("reads a turn field that is not a string as absent rather than throwing", async () => {
    const opened = await beginRun({
      ownerId: OWNER, sceneId: "poodi-piima", level: "A1", difficulty: "textbook", lines: "scripted",
    });
    expect(opened).not.toBeNull();
    const res = await post(JSON.stringify({
      runId: opened!.runId,
      turns: [{ beatId: { toString: 1 }, said: { toString: 1 }, heard: { valueOf: {}, toString: {} } }],
    }));
    expect(res.status).toBe(200);
  });

  it("hands a composition booking back when a read after it fails", async () => {
    const opened = await beginRun({
      ownerId: OWNER, sceneId: "poodi-piima", level: "A1", difficulty: "textbook", lines: "composed",
    });
    expect(opened).not.toBeNull();
    flags.keyed = true;
    flags.glossFails = true;
    const res = await post(JSON.stringify({
      runId: opened!.runId,
      turns: [{ beatId: "greet", said: "Tere!" }, { beatId: "going", said: "Ma lähen poodi." }],
    })).catch(() => null);
    // Let the deferred releases run.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(flags.booked, "the turn never reached the composer, so this asks nothing").toBeGreaterThan(0);
    expect(flags.released).toBe(flags.booked);
    expect(res?.status ?? 500).toBeLessThan(500);
  });

  it("settles a turn's booking once however many times the composer was asked", async () => {
    const opened = await beginRun({
      ownerId: OWNER, sceneId: "poodi-piima", level: "A1", difficulty: "textbook", lines: "composed",
    });
    expect(opened).not.toBeNull();
    flags.keyed = true;
    // A line the gate withholds every time, so every attempt reaches the provider and is billed.
    flags.line = "Blorptastik zzqqvörk mrrhnääl?";
    const res = await post(JSON.stringify({
      runId: opened!.runId,
      turns: [{ beatId: "greet", said: "Tere!" }, { beatId: "going", said: "Ma lähen poodi." }],
    }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(res.status).toBe(200);
    expect(flags.booked).toBe(1);
    expect(flags.settled.length, "the composer was asked more than once").toBeGreaterThan(1);
    // The first settlement corrects the one reserve; every retry is charged whole.
    expect(flags.settled[0]).toEqual({ micros: 1 });
    expect(flags.settled.slice(1).every((s) => s.micros === 0)).toBe(true);
    // Three completions were bought, so nothing is handed back as though none were.
    expect(flags.released).toBe(0);
  });
});
