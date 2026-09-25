import { Prisma } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Account deletion, against the database, through the action itself.
 *
 * The privacy page makes a specific promise about what disappears and what does
 * not. This checks the promise, table by table: a deletion that quietly misses
 * one of them is the kind of bug nobody notices until it matters.
 *
 * IT CALLS `deleteMyAccount`, NOT A COPY OF IT. The first version of this file
 * ran "the same statements `deleteMyAccount` runs" out of a list typed in here,
 * on the argument that the action needs a session. A list typed twice is a list
 * that drifts, and this one did twice. The first time three tables were missing
 * from the action and so from the copy, and the check agreed with the code it
 * was meant to catch. The second time the action grew ten more tables (the
 * calendar, shelves, reports, conversations, errands, words put aside, the
 * course, the mail log) and the copy grew none, so the file went on claiming
 * to test the erasure while testing a transaction nothing in the app runs.
 * The session is the only thing the action needs from outside, so the session
 * is what is stubbed, and the identity store behind it, which is a network call
 * to Supabase and is `lib/auth/erase.ts`'s own business.
 *
 * AND EVERY OWNER-SCOPED TABLE IS GIVEN A ROW FIRST. The DMMF check below
 * asserts every owner-scoped model is empty afterwards, which is only a check
 * if each had something in it: a table the fixture never wrote to is empty
 * after any deletion at all, including one that forgot it. That is how the
 * old copy passed while missing ten tables. So the fixture is asserted against
 * the same DMMF list before anything is deleted, and a table added next year
 * fails here until somebody writes it a row.
 */

let signedIn = "";

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  requireUserId: async () => signedIn,
}));

vi.mock("@/lib/auth/erase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/erase")>()),
  eraseAuthIdentity: async () => ({ erased: false as const, reason: "local" as const }),
}));

const { deleteMyAccount } = await import("@/app/actions");

const MINE = "itest-owner-delete";
const THEIRS = "itest-owner-keep";
const LEMMA = "itest-delete-word";

/** Every model carrying an `ownerId`, read off the schema rather than typed. */
const OWNED = Prisma.dmmf.datamodel.models
  .filter((model) => model.fields.some((f) => f.name === "ownerId" && f.kind === "scalar"))
  .map((model) => model.name);

type Table = {
  count(args: unknown): Promise<number>;
  deleteMany(args: unknown): Promise<unknown>;
};

function table(model: string): Table {
  const accessor = model.charAt(0).toLowerCase() + model.slice(1);
  return (prisma as unknown as Record<string, Table>)[accessor]!;
}

async function countsFor(ownerId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const model of OWNED) out[model] = await table(model).count({ where: { ownerId } });
  return out;
}

const emptyIn = (counts: Record<string, number>) =>
  Object.entries(counts).filter(([, n]) => n === 0).map(([model]) => model);
const heldIn = (counts: Record<string, number>) =>
  Object.entries(counts).filter(([, n]) => n > 0).map(([model]) => model);

async function wipe() {
  for (const owner of [MINE, THEIRS]) {
    // The two children first, so their parents can go in any order.
    await prisma.sceneGap.deleteMany({ where: { ownerId: owner } });
    await prisma.deckWord.deleteMany({ where: { ownerId: owner } });
    await prisma.classroomMember.deleteMany({ where: { ownerId: owner } });
    for (const model of OWNED) await table(model).deleteMany({ where: { ownerId: owner } });
  }
  const lexeme = await prisma.lexeme.findFirst({ where: { lemma: LEMMA } });
  if (lexeme) {
    await prisma.form.deleteMany({ where: { lexemeId: lexeme.id } });
    await prisma.lexeme.delete({ where: { id: lexeme.id } });
  }
}

async function populate(ownerId: string, lexemeId: string) {
  const card = await prisma.card.create({
    data: { ownerId, lexemeId, cardType: "RECOGNITION", front: "a", back: "b" },
  });
  await prisma.review.create({
    data: { ownerId, cardId: card.id, lexemeId, rating: 3 },
  });
  await prisma.task.create({ data: { ownerId, title: "homework" } });
  await prisma.studyEvent.create({ data: { ownerId, title: "class", startMinute: 18 * 60 } });
  await prisma.message.create({ data: { ownerId, role: "user", content: "tere" } });
  await prisma.starredWord.create({ data: { ownerId, lexemeId } });
  const deck = await prisma.deck.create({ data: { ownerId, name: "itest shelf" } });
  await prisma.deckWord.create({ data: { ownerId, deckId: deck.id, lexemeId } });
  await prisma.achievement.create({ data: { ownerId, key: "first-review" } });
  await prisma.setting.create({ data: { ownerId, key: "dailyGoal", value: "15" } });
  await prisma.usageEvent.create({
    data: { ownerId, kind: "TUTOR", provider: "groq", model: "gpt-4o", day: "2026-08-29" },
  });
  await prisma.scan.create({ data: { ownerId, title: "itest page", items: "[]" } });
  await prisma.assessment.create({
    data: { ownerId, overall: "A2", ceiling: "B1", confidence: "indicative", answered: 9 },
  });
  await prisma.examAttempt.create({
    data: {
      ownerId, level: "B1", seed: "itest",
      pct: 61, passed: true,
      // The shape does not matter here; that it is the learner's own prose
      // does. This is the row that used to survive "delete everything".
      result: JSON.stringify({ writing: "Ma elan Tartus." }),
    },
  });
  const room = await prisma.classroom.create({
    data: { ownerId, name: "itest class", code: `IT${ownerId.slice(-4).toUpperCase()}` },
  });
  await prisma.classroomMember.create({
    data: { classroomId: room.id, ownerId, role: "TEACHER", displayName: "itest teacher" },
  });
  await prisma.suggestion.create({
    data: { ownerId, category: "MISSING_WORD", groupKey: `itest:${ownerId}`, lemma: LEMMA },
  });
  const run = await prisma.sceneRun.create({
    data: { ownerId, sceneId: "poodi-piima", seed: "itest", level: "A1", difficulty: 1 },
  });
  await prisma.sceneGap.create({ data: { ownerId, runId: run.id, lemma: LEMMA, kind: "ASKED" } });
  await prisma.encounter.create({ data: { ownerId, outcome: "UNDERSTOOD" } });
  await prisma.deferral.create({
    data: {
      ownerId, lexemeId, lemma: LEMMA, reason: "DAYS",
      untilAt: new Date("2026-10-01T00:00:00Z"),
    },
  });
  await prisma.courseStep.create({
    data: { ownerId, programmeId: "itest", dayId: "d1", stepId: "meet" },
  });
  await prisma.emailSend.create({ data: { ownerId, kind: "evening", dayKey: "2026-09-01" } });
}

let lexemeId: string;

beforeEach(async () => {
  await wipe();
  const lexeme = await prisma.lexeme.create({
    data: { lemma: LEMMA, pos: "NOUN", translation: "x", editedBy: MINE },
  });
  lexemeId = lexeme.id;
  await populate(MINE, lexemeId);
  await populate(THEIRS, lexemeId);
  signedIn = MINE;
});

afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("deleteMyAccount", () => {
  it("is handed a row in every owner-scoped table, so the checks below can fail", async () => {
    expect(OWNED.length).toBeGreaterThanOrEqual(20);
    expect(emptyIn(await countsFor(MINE))).toEqual([]);
    expect(emptyIn(await countsFor(THEIRS))).toEqual([]);
  });

  it("refuses without the typed confirmation, and deletes nothing", async () => {
    const result = await deleteMyAccount("yes please");
    expect(result.ok).toBe(false);
    expect(emptyIn(await countsFor(MINE))).toEqual([]);
  });

  it("empties every owner-scoped table the schema has, named or not", async () => {
    // Read off the generated client rather than off a list, so a table added to
    // the schema and not to the action fails here on the day it is added.
    const result = await deleteMyAccount("delete");
    expect(result.ok).toBe(true);
    expect(heldIn(await countsFor(MINE))).toEqual([]);
  });

  it("leaves every other account untouched", async () => {
    await deleteMyAccount("delete");
    expect(emptyIn(await countsFor(THEIRS))).toEqual([]);
  });

  it("keeps the shared dictionary, which other learners have cards on", async () => {
    await deleteMyAccount("delete");
    expect(await prisma.lexeme.findUnique({ where: { id: lexemeId } })).not.toBeNull();
  });

  it("stops attributing an edited entry to the deleted account", async () => {
    await deleteMyAccount("delete");
    const lexeme = await prisma.lexeme.findUniqueOrThrow({ where: { id: lexemeId } });
    expect(lexeme.editedBy).toBeNull();
  });

  it("keeps a decision on somebody else's report, and drops the name against it", async () => {
    const theirs = await prisma.suggestion.findFirstOrThrow({ where: { ownerId: THEIRS } });
    await prisma.suggestion.update({
      where: { id: theirs.id },
      data: { status: "ACCEPTED", reviewedBy: MINE, reviewedAt: new Date() },
    });

    await deleteMyAccount("delete");

    const after = await prisma.suggestion.findUniqueOrThrow({ where: { id: theirs.id } });
    expect(after.status).toBe("ACCEPTED");
    expect(after.reviewedBy).toBeNull();
  });
});
