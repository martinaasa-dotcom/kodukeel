import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

import { prisma } from "@/lib/db";
import {
  SceneFinishResponse,
  SceneHelpResponse,
  SceneOpenedResponse,
  SceneTurnResponse,
} from "@/lib/api/contract";
import { SCENES } from "@/lib/scenes/catalogue";
import { LESSON_SCENES } from "@/lib/scenes/lessonScenes";

/**
 * A CONVERSATION PLAYED TO ITS END OVER THE NATIVE DOORS (N-5, ADR-029).
 *
 * The five v1 routes are driven in process against the local database: a
 * scene opened from the situations list and a lesson's own role-play, every
 * turn until the other side says it is over, the help button once, the finish,
 * and today's chat on a deployment with no key. Every answer is parsed against
 * its schema in `lib/api/contract.ts` and has to come back exactly as it was
 * sent, so a field the server adds and the contract never named fails here
 * rather than being stripped in silence on a phone.
 *
 * Keyless, so nothing leaves the process and the bank answers every turn,
 * which is how a deployment with no model key plays. The bearer is the one
 * thing stubbed, to an owner of this file's own, since the token check is
 * `lib/auth/bearer.ts`'s and has tests of its own.
 */

const OWNER = "itest-v1-scenes";
const deferred: (() => unknown)[] = [];

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (task: () => unknown) => { deferred.push(task); },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("@/lib/auth/bearer", async (original) => ({
  ...(await original<typeof import("@/lib/auth/bearer")>()),
  requireBearerUser: async () => ({
    ownerId: OWNER,
    learner: { id: OWNER, name: "itest", email: null, avatarUrl: null, givenName: null },
  }),
}));

const begin = await import("@/app/api/v1/scenes/route");
const chat = await import("@/app/api/v1/chat/route");
const turns = await import("@/app/api/v1/scenes/[runId]/turns/route");
const help = await import("@/app/api/v1/scenes/[runId]/help/route");
const finish = await import("@/app/api/v1/scenes/[runId]/finish/route");

async function wipe() {
  await prisma.sceneGap.deleteMany({ where: { ownerId: OWNER } });
  await prisma.sceneRun.deleteMany({ where: { ownerId: OWNER } });
  await prisma.review.deleteMany({ where: { ownerId: OWNER } });
  await prisma.usageEvent.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
}

beforeAll(async () => {
  for (const key of ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"]) {
    delete process.env[key];
  }
  await wipe();
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

function post(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer itest" },
    body: JSON.stringify(body),
  });
}

async function drain() {
  while (deferred.length > 0) await deferred.shift()!();
}

/** The answer parsed against its schema, and refused where parsing changed anything. */
function exact<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues));
  expect(parsed.data).toEqual(raw);
  return parsed.data as z.infer<S>;
}

type Sent = {
  beatId: string;
  said: string;
  helped?: boolean;
  picked?: boolean;
  heard?: string;
  conceded?: number[];
  alsoDone?: string[];
  spoken?: { repairs?: { to: string }[]; wordsHeard?: number; wordsChanged?: number; unseen?: boolean };
};

/** One conversation, from opening to finish, through the v1 doors alone. */
async function playToEnd(sceneId: string) {
  const opened = await begin.POST(post("/api/v1/scenes", { sceneId, difficulty: "textbook", level: "A1" }));
  expect(opened.status).toBe(200);
  const run = exact(SceneOpenedResponse, await opened.json());
  const params = { params: Promise.resolve({ runId: run.runId }) };

  const sent: Sent[] = [];
  const used: string[] = [];
  let last: z.infer<typeof SceneTurnResponse> | null = null;
  let heard = "";
  let helped = false;
  const asked: { lemma: string; lexemeId: string | null }[] = [];

  for (let n = 0; n <= 40; n += 1) {
    if (n > 0) {
      const pick = last?.picks[0];
      const turn: Sent = { beatId: last?.beatId ?? "", said: pick?.et ?? "Jah.", heard, helped, ...(pick ? { picked: true } : {}) };
      // Two spoken turns: one answered by ear and one with the line shown.
      if (n === 2) turn.spoken = { repairs: [{ to: turn.said.split(/\s+/)[0]! }], wordsHeard: 2, wordsChanged: 1, unseen: true };
      if (n === 3) turn.spoken = { wordsHeard: 1, wordsChanged: 0, unseen: false };
      sent.push(turn);
      helped = false;
    }
    if (n === 1) {
      const handed = await help.POST(post(`/api/v1/scenes/${run.runId}/help`, { turns: sent.slice(0, -1) }), params);
      if (handed.status === 200) {
        const word = exact(SceneHelpResponse, await handed.json());
        asked.push({ lemma: word.lemma, lexemeId: word.lexemeId });
      } else {
        expect(handed.status).toBe(404);
      }
    }
    const answered = await turns.POST(post(`/api/v1/scenes/${run.runId}/turns`, { turns: sent, used }), params);
    await drain();
    expect(answered.status).toBe(200);
    last = exact(SceneTurnResponse, await answered.json());
    for (const line of last.lines) used.push(line.text);
    const spoken = last.lines.filter((l) => !["unspoken", "meanwhile", "coach"].includes(l.provenance));
    if (spoken.length > 0) heard = spoken[spoken.length - 1]!.text;
    const at = sent.length - 1;
    if (at >= 0 && last.conceded && last.conceded.length > 0) sent[at] = { ...sent[at]!, conceded: last.conceded };
    if (at >= 0 && last.alsoDone && last.alsoDone.length > 0) sent[at] = { ...sent[at]!, alsoDone: last.alsoDone };
    if (last.over) break;
  }
  expect(last?.over, `${sceneId} did not reach its end in forty turns`).toBe(true);

  const closed = await finish.POST(post(`/api/v1/scenes/${run.runId}/finish`, { turns: sent, walkedOut: false, asked }), params);
  expect(closed.status).toBe(200);
  const result = exact(SceneFinishResponse, await closed.json());
  return { run, sent, result };
}

describe("conversations over the v1 doors", () => {
  it("plays a scene from the situations list to its end", async () => {
    const { result, sent } = await playToEnd(SCENES[0]!.id);
    expect(result.turns.length).toBe(sent.length);
    // A turn answered by ear carries an exact true, and a turn with the line shown carries none.
    expect(result.turns[1]?.unseen).toBe(true);
    expect(result.turns[2]?.unseen).toBeUndefined();
    // A spoken turn carries its counts and never the words a recognizer heard.
    expect(result.turns[1]?.wordsHeard).toBe(2);
    expect(JSON.stringify(result)).not.toMatch(/"heardWords"|"transcript"/);
  });

  it("plays a lesson's own role-play to its end, by the id the web takes", async () => {
    const { run, result } = await playToEnd(LESSON_SCENES[0]!.id);
    expect(result.runId).toBe(run.runId);
  });

  it("refuses a run that is not the learner's", async () => {
    const answered = await turns.POST(
      post("/api/v1/scenes/no-such-run/turns", { turns: [] }),
      { params: Promise.resolve({ runId: "no-such-run" }) },
    );
    expect(answered.status).toBe(404);
  });

  it("offers today's chat only where a model can play it", async () => {
    const offered = await chat.POST(post("/api/v1/chat", { level: "A1" }));
    expect(offered.status).toBe(503);
    expect((await offered.json() as { error: { code: string } }).error.code).toBe("switched_off");
  });
});
