import { appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, it, vi } from "vitest";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * EVERYTHING THE SCENE ROUTE SAYS AND ASKS FOR, WRITTEN DOWN (N-5).
 *
 * Run by `scripts/diff-scene-route.ts`, which runs it twice, once before a
 * change and once after, and diffs the two records. It drives the real
 * handler of `/api/scene` and the four scene actions in process, against the
 * local database, and writes one line per event: every reply, every request
 * body sent to a model, every ledger row, every help, every finish.
 *
 * Three ways per conversation, as docs/21-situations.md §79 did: keyless; with
 * a key set and the run opened to speak from the bank; and composing against a
 * stubbed `fetch` that answers like Anthropic, deterministically from the body
 * it is handed, failing on some calls, and judging and reviewing by a hash.
 *
 * Deterministic on purpose, so a diff names a change and nothing else: the
 * run's seed is drawn from a counter, the run id is derived from the scene,
 * the level and the mode, every conversation has an owner of its own (so the
 * throttles and the ledger start empty), and the burst window is a day long
 * (so the clock cannot decide whether a call is refused).
 */

const OUT = process.env.DIFF_SCENE_OUT ?? "";
const ONLY = (process.env.DIFF_SCENE_ONLY ?? "").split(",").filter(Boolean);
const TURNS = 10;

let who = "";
let fixedSeeds = false;
let seedCounter = 0;
const deferred: (() => unknown)[] = [];

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (task: () => unknown) => { deferred.push(task); },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  requireUserId: async () => who,
}));
vi.mock("node:crypto", async (original) => {
  const real = await original<typeof import("node:crypto")>();
  return {
    ...real,
    default: real,
    randomUUID: () => {
      if (!fixedSeeds) return real.randomUUID();
      seedCounter += 1;
      const hex = real.createHash("sha256").update(`seed-${seedCounter}`).digest("hex");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    },
  };
});

function createHashOf(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function record(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
}

/** A number off a string, for the stub's choices. */
function hashOf(text: string): number {
  return Number.parseInt(createHashOf(text).slice(0, 8), 16);
}

/* ── The stubbed provider ─────────────────────────────────────────────────── */

const outgoing: { url: string; body: string }[] = [];

function sse(text: string): Response {
  const frames = [
    { type: "message_start", message: { usage: { input_tokens: 400, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 20 } },
    { type: "message_stop" },
  ];
  const body = frames.map((f) => `event: ${f.type}\ndata: ${JSON.stringify(f)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function stubFetch(input: unknown, init?: { body?: unknown }): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  const body = typeof init?.body === "string" ? init.body : "";
  outgoing.push({ url, body });
  const h = hashOf(body);
  if (!url.startsWith("https://api.anthropic.com/")) {
    return Promise.resolve(new Response("{}", { status: 404 }));
  }
  if (h % 9 === 0) return Promise.resolve(new Response('{"error":"stub"}', { status: 500 }));
  const parsed = JSON.parse(body) as { stream?: boolean };
  if (parsed.stream) {
    const asked = /How this character has asked for this before: (.*?)\.(?:\\n|")/.exec(body)?.[1];
    const banked = asked ? asked.split(" | ").filter(Boolean) : [];
    const pick = h % 3;
    const line = pick === 0 && banked.length > 0 ? banked[h % banked.length]! : pick === 1 ? "Tere! Kuidas läheb?" : "Jah, hästi. Ma ei tea.";
    return Promise.resolve(sse(line));
  }
  const verdict = JSON.stringify({ done: h % 2 === 0, ok: h % 3 !== 0, why: "it says something else" });
  return Promise.resolve(Response.json({
    content: [{ type: "text", text: verdict }],
    usage: { input_tokens: 300, output_tokens: 12 },
  }));
}

/* ── The conversations ────────────────────────────────────────────────────── */

// It deletes every row it made, so it refuses a database that is not local
// before it opens one, beside the integration guard that runs first.
requireLocalDatabase("record the scene route against this database");
const { prisma } = await import("@/lib/db");
const { POST } = await import("@/app/api/scene/route");
const actions = await import("@/app/actions");
const { SCENES } = await import("@/lib/scenes/catalogue");
const { LESSON_SCENES } = await import("@/lib/scenes/lessonScenes");
const { isSpokenEstonian } = await import("@/lib/scenes/line");
const { writeSetting, SETTING_KEYS } = await import("@/lib/settings/store");

const owners: string[] = [];

async function wipe(ownerId: string) {
  await prisma.sceneGap.deleteMany({ where: { ownerId } });
  await prisma.sceneRun.deleteMany({ where: { ownerId } });
  await prisma.usageEvent.deleteMany({ where: { ownerId } });
  await prisma.setting.deleteMany({ where: { ownerId } });
}

async function drain() {
  while (deferred.length > 0) {
    const task = deferred.shift()!;
    try { await task(); } catch (error) { record({ at: "after-threw", error: String(error) }); }
  }
}

async function ledger(ownerId: string, seen: Set<string>) {
  const rows = await prisma.usageEvent.findMany({ where: { ownerId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const fresh = rows.filter((r) => !seen.has(r.id));
  for (const r of fresh) seen.add(r.id);
  return fresh
    .map((r) => `${r.entry} ${r.kind} ${r.provider} ${r.model} in=${r.inputTokens} out=${r.outputTokens} micros=${r.costMicros}`)
    .sort();
}

type Mode = "keyless" | "scripted" | "composed";

function setMode(mode: Mode) {
  if (mode === "keyless") delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = "stub-key";
}

function learnerSays(n: number, last: Record<string, unknown> | null): string {
  const picks = (last?.picks as { et: string }[] | undefined) ?? [];
  switch (n % 6) {
    case 0: return picks[0]?.et ?? "Jah.";
    case 1: return "Ma ei tea.";
    case 2: return "I would like some coffee please";
    case 3: return "Kui palju see maksab?";
    case 4: return picks[1]?.et ?? picks[0]?.et ?? "Tere, ma lähen poodi ja ostan piima.";
    default: return "Vabandust, kas te räägite aeglasemalt?";
  }
}

async function play(sceneId: string, level: string, mode: Mode, index: number) {
  const ownerId = `diff-scene-${index}`;
  owners.push(ownerId);
  who = ownerId;
  await wipe(ownerId);
  await writeSetting(ownerId, SETTING_KEYS.wordGloss, "on");
  setMode(mode);
  const seen = new Set<string>();
  const tag = `${sceneId}/${level}/${mode}`;

  fixedSeeds = true;
  seedCounter = index * 1000;
  // The keyed "scripted" mode opens the run keyless, so it speaks from the bank with a key present.
  if (mode === "scripted") delete process.env.ANTHROPIC_API_KEY;
  const begun = await actions.beginScene(sceneId, "ordinary", level);
  setMode(mode);
  fixedSeeds = false;
  if (!begun.ok) { record({ tag, begin: begun }); return; }
  const runId = `diff-${index}-${sceneId}`.slice(0, 60);
  await prisma.sceneRun.update({ where: { id: begun.runId }, data: { id: runId } });
  record({ tag, begin: { ...begun, runId: "RUN" } });

  const sent: Record<string, unknown>[] = [];
  const used: string[] = [];
  const asked: { lemma: string; lexemeId: string | null }[] = [];
  let last: Record<string, unknown> | null = null;
  let heard = "";
  let helped = false;
  for (let n = 0; n <= TURNS; n += 1) {
    if (n > 0) {
      const said = learnerSays(n, last);
      sent.push({
        beatId: (last?.beatId as string | null) ?? "",
        said, helped, heard,
        ...(n === 4 ? { spoken: { repairs: [{ from: "x", to: said.split(" ")[0], rule: "sound" }], wordsHeard: 3, wordsChanged: 1, unseen: true } } : {}),
      });
      helped = false;
    }
    if (n === 3) {
      const help = await actions.sceneHelp(runId, sent);
      record({ tag, n, help });
      if (help.ok) { helped = true; asked.push({ lemma: help.lemma, lexemeId: help.lexemeId }); }
    }
    outgoing.length = 0;
    const response = await POST(new Request("http://localhost/api/scene", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId, turns: sent, used }),
    }));
    await drain();
    const body = await response.json() as Record<string, unknown>;
    record({ tag, n, status: response.status, body, prompts: outgoing.map((o) => ({ url: o.url, body: o.body })), ledger: await ledger(ownerId, seen) });
    if (response.status !== 200) break;
    last = body;
    const lines = (body.lines as { text: string; provenance: string }[] | undefined) ?? [];
    for (const l of lines) used.push(l.text);
    const spoken = lines.filter((l) => isSpokenEstonian(l.provenance as never));
    if (spoken.length > 0) heard = spoken[spoken.length - 1]!.text;
    const at = sent.length - 1;
    if (at >= 0 && Array.isArray(body.conceded) && body.conceded.length > 0) sent[at] = { ...sent[at], conceded: body.conceded };
    if (at >= 0 && Array.isArray(body.alsoDone) && body.alsoDone.length > 0) sent[at] = { ...sent[at], alsoDone: body.alsoDone };
    if (body.over === true) break;
  }
  const finished = await actions.finishScene({ runId, turns: sent, walkedOut: last?.over !== true, asked });
  await drain();
  record({ tag, finish: finished, ledger: await ledger(ownerId, seen) });
}

afterAll(async () => {
  for (const ownerId of owners) await wipe(ownerId);
  await prisma.$disconnect();
});

it("writes down what the scene route says", async () => {
  if (OUT) writeFileSync(OUT, "");
  process.env.AI_BURST_WINDOW_SECONDS = "86400";
  globalThis.fetch = stubFetch as typeof fetch;
  const catalog = SCENES.filter((_, i) => i % 4 === 0).map((s) => s.id);
  const lessons = LESSON_SCENES.filter((_, i) => i % 2 === 0).map((s) => s.id);
  const ids = ONLY.length > 0 ? ONLY : [...catalog, ...lessons];
  let index = 0;
  for (const sceneId of ids) {
    for (const level of ["A1", "B1"]) {
      for (const mode of ["keyless", "scripted", "composed"] as const) {
        index += 1;
        await play(sceneId, level, mode, index);
      }
    }
  }
  // Today's chat, keyless and keyed: refused both ways for a learner with no evening, by different doors.
  for (const mode of ["keyless", "composed"] as const) {
    index += 1;
    who = `diff-scene-${index}`;
    owners.push(who);
    await wipe(who);
    setMode(mode);
    record({ tag: `chat/${mode}`, chat: await actions.beginChat("A1") });
  }
  delete process.env.ANTHROPIC_API_KEY;
}, 1_800_000);
