import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { accountSettingsFor } from "@/lib/settings/account";
import { dailyGoalFrom, forgetSettings, readSetting, SETTING_KEYS } from "@/lib/settings/store";

/**
 * The account over HTTP (N-8), against a real database, through the routes'
 * own handlers.
 *
 * `scripts/test-api.mjs` asks these of a running server, and on a local
 * install it cannot delete anybody: the local learner is the demo deck every
 * later suite reads. So the claims a phone relies on are asked here instead,
 * with the bearer check standing in for a token and everything behind it real:
 * a setting changed through v1 reads the same through the web's own reader, a
 * change carrying one value nobody can store changes nothing, a move up past
 * an unpassed A1 check is refused, a lesson reads in Russian once the
 * interface is Russian, the backup is the web's backup, and a deletion leaves
 * no row of the learner's behind.
 */

const OWNER = "itest-v1-account";

vi.mock("@/lib/auth/bearer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/bearer")>()),
  requireBearerUser: async () => ({
    ownerId: OWNER,
    learner: { id: OWNER, name: "Tess", email: null, avatarUrl: null, givenName: "Tess" },
  }),
}));

vi.mock("@/lib/auth/erase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/erase")>()),
  eraseAuthIdentity: async () => ({ erased: false as const, reason: "local" as const }),
}));

const me = await import("./route");
const exported = await import("../export/route");
const lesson = await import("../lessons/[id]/route");

const URL_ME = "http://localhost/api/v1/me";

function patch(body: unknown): Request {
  return new Request(URL_ME, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function clean() {
  await prisma.setting.deleteMany({ where: { ownerId: OWNER } });
  await prisma.rateLimit.deleteMany({});
  await prisma.task.deleteMany({ where: { ownerId: OWNER } });
  forgetSettings(OWNER);
}

beforeEach(clean);
afterAll(async () => { await clean(); await prisma.$disconnect(); });

describe("GET and PATCH /api/v1/me", () => {
  it("answers who is asking and the settings a phone shows", async () => {
    const res = await me.GET(new Request(URL_ME));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ id: OWNER, locale: "en", settings: { dailyGoal: 15, level: "A1" } });
  });

  it("writes a setting the web's own reader then reads", async () => {
    const res = await me.PATCH(patch({ dailyGoal: 31, reminderAt: "07:45", speech: { sendAtOnce: true } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings).toMatchObject({ dailyGoal: 31, reminderAt: "07:45", speech: { sendAtOnce: true } });
    forgetSettings(OWNER);
    expect(dailyGoalFrom(await readSetting(OWNER, SETTING_KEYS.dailyGoal))).toBe(31);
    expect(await readSetting(OWNER, SETTING_KEYS.speechSendAtOnce)).toBe("on");
    expect((await accountSettingsFor(OWNER)).dailyGoal).toBe(31);
  });

  it("clamps a goal as Settings does", async () => {
    const body = await (await me.PATCH(patch({ dailyGoal: 400 }))).json();
    expect(body.settings.dailyGoal).toBe(200);
  });

  it("changes nothing when one value cannot be stored", async () => {
    const res = await me.PATCH(patch({ dailyGoal: 40, timeZone: "Mars/Olympus" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid");
    forgetSettings(OWNER);
    expect(await readSetting(OWNER, SETTING_KEYS.dailyGoal)).toBeNull();
    const kind = await me.PATCH(patch({ dailyGoal: 40, letters: { system: false } }));
    expect(kind.status).toBe(400);
    forgetSettings(OWNER);
    expect(await readSetting(OWNER, SETTING_KEYS.dailyGoal)).toBeNull();
  });

  it("refuses a move up past an unpassed A1 check, and writes nothing", async () => {
    const res = await me.PATCH(patch({ level: "B1", dailyGoal: 40 }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
    forgetSettings(OWNER);
    expect(await readSetting(OWNER, SETTING_KEYS.dailyGoal)).toBeNull();
    expect(await readSetting(OWNER, SETTING_KEYS.cefrPlacement)).toBeNull();
  });

  it("reads a lesson in Russian once the interface is Russian", async () => {
    const changed = await (await me.PATCH(patch({ locale: "ru" }))).json();
    expect(changed.locale).toBe("ru");
    // The meaning language follows where the learner never chose one.
    expect(changed.settings.glossLanguage).toBe("ru");
    forgetSettings(OWNER);
    const res = await lesson.GET(new Request("http://localhost/api/v1/lessons/a1-01-hello"), { params: Promise.resolve({ id: "a1-01-hello" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locale).toBe("ru");
    expect(Object.keys(body.translations).length).toBeGreaterThan(0);
  });
});

describe("GET /api/v1/export and DELETE /api/v1/me", () => {
  it("hands over the web's backup", async () => {
    await prisma.task.create({ data: { ownerId: OWNER, title: "itest homework" } });
    const res = await exported.GET(new Request("http://localhost/api/v1/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.format).toBe("kodukeel-v1");
    expect(body.counts.tasks).toBe(1);
    expect(body.tasks[0].title).toBe("itest homework");
  });

  it("refuses without the typed word, and deletes everything with it", async () => {
    await me.PATCH(patch({ dailyGoal: 22 }));
    await prisma.task.create({ data: { ownerId: OWNER, title: "itest homework" } });
    const del = (body: unknown) => new Request(URL_ME, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

    const refused = await me.DELETE(del({ confirmation: "yes" }));
    expect(refused.status).toBe(400);
    expect(await prisma.task.count({ where: { ownerId: OWNER } })).toBe(1);

    const gone = await me.DELETE(del({ confirmation: "delete" }));
    expect(gone.status).toBe(200);
    expect(await gone.json()).toEqual({ deleted: true, identityErased: false, remaining: null });
    expect(await prisma.task.count({ where: { ownerId: OWNER } })).toBe(0);
    expect(await prisma.setting.count({ where: { ownerId: OWNER } })).toBe(0);
  });
});
