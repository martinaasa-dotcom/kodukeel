import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { bucketDigest, bucketForOwner } from "@/lib/security/rateLimit";

/**
 * The roster file against a real Postgres: who may have it, and that an
 * archived class still answers for its owner.
 *
 * The caller is whoever `requireUserId` says, so the test swaps that one
 * function and drives the real route with the real ownership read.
 */

const TEACHER = "itest-roster-teacher";
const PUPIL = "itest-roster-pupil";
const STRANGER = "itest-roster-stranger";
let caller = TEACHER;

vi.mock("@/lib/auth/session", () => ({ requireUserId: async () => caller }));

const { GET } = await import("./route");

let classroomId = "";

async function wipe() {
  await prisma.classroom.deleteMany({ where: { ownerId: TEACHER } });
  for (const who of [TEACHER, PUPIL, STRANGER]) {
    await prisma.rateLimit.deleteMany({ where: { bucket: bucketDigest(`roster:${bucketForOwner(who)}`) } });
  }
}

beforeEach(async () => {
  await wipe();
  caller = TEACHER;
  const classroom = await prisma.classroom.create({
    data: {
      name: "Eesti keel, teisipäev", code: "ITRST2", ownerId: TEACHER,
      members: {
        create: [
          { ownerId: TEACHER, role: "TEACHER", displayName: "Õpetaja" },
          { ownerId: PUPIL, displayName: "Мария" },
        ],
      },
    },
  });
  classroomId = classroom.id;
});

afterAll(wipe);

const ask = () => GET(new Request(`http://localhost/api/class/${classroomId}/roster`), {
  params: Promise.resolve({ classroomId }),
});

describe("/api/class/[classroomId]/roster", () => {
  it("gives the owner a file with a row for every member", async () => {
    const response = await ask();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="kodukeel-eestikeelteisipaev-roster-\d{4}-\d{2}-\d{2}\.csv"$/);
    // Read as bytes: a UTF-8 decoder strips the byte order mark a spreadsheet needs.
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    const rows = text.split("\r\n").filter((l) => l && !l.startsWith("#") && !l.startsWith("\uFEFF#"));
    expect(rows).toHaveLength(3);
    expect(text).toContain("Мария");
    expect(text).toContain("Õpetaja");
  });

  it("is a not-found for a member who is not the owner, and for a stranger", async () => {
    for (const who of [PUPIL, STRANGER]) {
      caller = who;
      const response = await ask();
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain("Мария");
    }
  });

  it("still answers its owner once the class is archived", async () => {
    await prisma.classroom.update({ where: { id: classroomId }, data: { archived: true } });
    expect((await ask()).status).toBe(200);
  });

  it("refuses past the hour's allowance the way the export does", async () => {
    // The in-process half of the limiter remembers the owner's earlier calls in
    // this file, so count the answers until the first refusal rather than
    // assuming a fresh six.
    let allowed = 0;
    let refused = await ask();
    while (refused.status === 200 && allowed < 10) { allowed++; refused = await ask(); }
    expect(allowed).toBeLessThanOrEqual(6);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toMatch(/^\d+$/);
    const body = (await refused.json()) as { error: string };
    expect(body.error).toMatch(/limit/);
  });
});
