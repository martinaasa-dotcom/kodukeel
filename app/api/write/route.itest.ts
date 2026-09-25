import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { recordCourseLevel } from "@/lib/progress/level";

/**
 * The writing grader against a real dictionary, with the model and the ledger
 * stood in for, because what is being asked is what the route hands the grader.
 *
 * WHO IS WRITING IS THE SERVER'S TO KNOW. `/api/tutor` and `/api/describe` both
 * read the learner's level off their own log, because a level typed into a
 * client is a level anybody can type. This route read `body.level` and fell
 * back to "B1", and the one screen that calls it (`WriteSession.tsx`) never
 * sends one, so every learner who wrote a sentence was graded as B1: an A1
 * learner three weeks in got a note pitched at somebody two bands above them.
 */

const OWNER = "itest-write-route";

const graded: { level: string }[] = [];

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  // Outside a request there is no scope to defer into, so it runs now.
  after: (task: () => unknown) => { void Promise.resolve().then(task).catch(() => {}); },
}));

vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => OWNER }));

vi.mock("@/lib/usage/ledger", () => ({
  authoriseCall: async () => ({
    allowed: true, fallbackAllowed: false, reservation: { id: "r", micros: 0 },
  }),
  recordUsage: async () => {},
  releaseReservation: async () => {},
}));

vi.mock("@/lib/tutor/provider", async (original) => ({
  ...(await original<typeof import("@/lib/tutor/provider")>()),
  resolveProviders: () => [{ name: "groq", label: "Stub", model: "stub" }],
}));

vi.mock("@/lib/tutor/grader", () => ({
  gradeSentence: async (_chain: unknown, input: { level: string }) => {
    graded.push({ level: input.level });
    return {
      graded: null,
      usage: { inputTokens: 1, outputTokens: 1 },
      config: { name: "groq", label: "Stub", model: "stub" },
    };
  },
}));

const { POST } = await import("./route");

async function cleanUp() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
}

let lexemeId = "";
let caseKey = "";

beforeAll(async () => {
  await cleanUp();
  const { writingTasksFor } = await import("@/lib/estonian/writing");
  const tuba = await prisma.lexeme.findFirst({
    where: { lemma: "tuba", pos: "NOUN" },
    include: { forms: true },
    orderBy: { id: "asc" },
  });
  if (!tuba) throw new Error("the seeded dictionary has no tuba: run npm run db:seed");
  const task = writingTasksFor(tuba)[0];
  if (!task) throw new Error("tuba makes no writing task");
  lexemeId = tuba.id;
  caseKey = task.caseKey;
});

afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

function post(body: unknown) {
  return POST(new Request("http://localhost/api/write", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("/api/write", () => {
  it("grades at the learner's own level rather than at B1", async () => {
    await recordCourseLevel(OWNER, "A1");
    graded.length = 0;
    const res = await post({ lexemeId, caseKey, sentence: "Ma olen täna kodus ja loen." });
    expect(res.status).toBe(200);
    expect(graded).toEqual([{ level: "A1" }]);
  });

  it("does not believe a level the client typed", async () => {
    await recordCourseLevel(OWNER, "A2");
    graded.length = 0;
    await post({ lexemeId, caseKey, sentence: "Ma olen täna kodus ja loen.", level: "C1" });
    expect(graded).toEqual([{ level: "A2" }]);
  });
});
