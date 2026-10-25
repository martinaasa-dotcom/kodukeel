import { generateKeyPairSync } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { MAX_NATIVE_DEVICES } from "@/lib/progress/nativePush";

/**
 * A phone registered and forgotten over HTTP (N-9), against a real database,
 * through the route's own handlers, with the bearer check standing in for a
 * token. What `scripts/test-api.mjs` cannot ask on a local install, which
 * sets no Firebase account: a token kept, seen again without a second row,
 * moved to whoever registered it last, bounded per learner, and forgotten.
 */
const OWNER = "itest-v1-phones";
const OTHER = "itest-v1-phones-other";
let signedIn = OWNER;

vi.mock("@/lib/auth/bearer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/bearer")>()),
  requireBearerUser: async () => ({
    ownerId: signedIn,
    learner: { id: signedIn, name: "Tess", email: null, avatarUrl: null, givenName: "Tess" },
  }),
}));

const route = await import("./route");
const URL = "http://localhost/api/v1/push-devices";
const token = (n: number) => `itest-phone-token-${String(n).padStart(4, "0")}-abcdefgh`;

function request(method: "POST" | "DELETE", body: unknown): Request {
  return new Request(URL, {
    method,
    headers: { "content-type": "application/json", "x-kodukeel-build": "android/42" },
    body: JSON.stringify(body),
  });
}

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const saved = process.env.FCM_SERVICE_ACCOUNT;

async function clean() {
  await prisma.nativePushDevice.deleteMany({ where: { ownerId: { in: [OWNER, OTHER] } } });
  await prisma.rateLimit.deleteMany({});
}

beforeEach(async () => {
  await clean();
  signedIn = OWNER;
  process.env.FCM_SERVICE_ACCOUNT = JSON.stringify({ project_id: "itest-project", client_email: "i@itest.example.invalid", private_key: privateKey });
});
afterAll(async () => {
  if (saved === undefined) delete process.env.FCM_SERVICE_ACCOUNT;
  else process.env.FCM_SERVICE_ACCOUNT = saved;
  await clean();
  await prisma.$disconnect();
});

describe("POST and DELETE /api/v1/push-devices", () => {
  it("keeps a phone, notes it seen again without a second row, and forgets it", async () => {
    const first = await route.POST(request("POST", { platform: "android", token: token(1) }));
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await first.json()).toEqual({ registered: true });
    expect(await route.POST(request("POST", { platform: "android", token: token(1) }))).toHaveProperty("status", 200);
    const rows = await prisma.nativePushDevice.findMany({ where: { ownerId: OWNER } });
    expect(rows.map((r) => [r.platform, r.appBuild])).toEqual([["android", "android/42"]]);

    const gone = await route.DELETE(request("DELETE", { token: token(1) }));
    expect(await gone.json()).toEqual({ forgotten: true });
    expect(await prisma.nativePushDevice.count({ where: { ownerId: OWNER } })).toBe(0);
    expect(await (await route.DELETE(request("DELETE", { token: token(1) }))).json()).toEqual({ forgotten: false });
  });

  it("moves a token to whoever registered it last, and forgets only the learner's own", async () => {
    await route.POST(request("POST", { platform: "ios", token: token(2) }));
    signedIn = OTHER;
    await route.POST(request("POST", { platform: "ios", token: token(2) }));
    expect(await prisma.nativePushDevice.findUnique({ where: { token: token(2) } })).toMatchObject({ ownerId: OTHER });
    signedIn = OWNER;
    expect(await (await route.DELETE(request("DELETE", { token: token(2) }))).json()).toEqual({ forgotten: false });
    expect(await prisma.nativePushDevice.count({ where: { token: token(2) } })).toBe(1);
  });

  it("keeps at most the bound per learner", async () => {
    for (let n = 0; n < MAX_NATIVE_DEVICES + 2; n++) {
      expect((await route.POST(request("POST", { platform: "android", token: token(100 + n) }))).status).toBe(200);
    }
    const kept = await prisma.nativePushDevice.findMany({ where: { ownerId: OWNER }, select: { token: true } });
    expect(kept).toHaveLength(MAX_NATIVE_DEVICES);
  });

  it("refuses a token nobody can read, and keeps nothing where no Firebase account is set", async () => {
    const bad = await route.POST(request("POST", { platform: "android", token: "short" }));
    expect(bad.status).toBe(400);
    // Inside the contract's 4,096 and past what the column's unique index holds: refused, never a 500.
    const long = await route.POST(request("POST", { platform: "android", token: "a".repeat(3000) }));
    expect(long.status).toBe(400);
    expect((await long.json()).error.code).toBe("invalid");
    expect(await (await route.DELETE(request("DELETE", { token: "a".repeat(3000) }))).json()).toEqual({ forgotten: false });
    delete process.env.FCM_SERVICE_ACCOUNT;
    const off = await route.POST(request("POST", { platform: "android", token: token(3) }));
    expect(off.status).toBe(503);
    expect((await off.json()).error.code).toBe("switched_off");
    expect(await prisma.nativePushDevice.count({ where: { ownerId: OWNER } })).toBe(0);
  });
});
