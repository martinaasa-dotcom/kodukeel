import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { ALERTS_PER_DAY, KEEP_DAYS, storeError } from "./store";
import type { ErrorRecord } from "./report";

/**
 * The error store against a real database, because both of its rules are
 * questions about rows: has this kind been seen today, and how many alerts
 * went out. The mail is stubbed at `fetch`, which is the one thing
 * `sendToOperator` reaches.
 */

const AT = "itest/observability-store";
const DAY = 24 * 60 * 60 * 1000;

function record(message: string): ErrorRecord {
  return { level: "error", at: AT, message, stack: "Error: x\n    at here", ownerId: "someone", ts: new Date().toISOString() };
}

const sent: string[] = [];
const saved = { admins: process.env.ADMIN_EMAILS, key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };

async function wipe() {
  await prisma.errorEvent.deleteMany({ where: { at: { startsWith: "itest/" } } });
}

beforeEach(async () => {
  await wipe();
  sent.length = 0;
  process.env.ADMIN_EMAILS = "ops@example.test";
  process.env.RESEND_API_KEY = "re_itest_not_a_key";
  process.env.EMAIL_FROM = "Kodukeel <noreply@example.test>";
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    sent.push(String(init.body));
    return new Response("{}", { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.ADMIN_EMAILS = saved.admins;
  process.env.RESEND_API_KEY = saved.key;
  process.env.EMAIL_FROM = saved.from;
});

afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("storeError", () => {
  it("keeps the error, with no learner id, and mails the first of its kind once", async () => {
    await storeError(record("Something broke on card 4f1c2a9e"));
    await storeError(record("Something broke on card 99aa00bb"));
    const rows = await prisma.errorEvent.findMany({ where: { at: AT }, orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.fingerprint).toBe(rows[1]!.fingerprint);
    expect(rows.map((r) => r.alerted)).toEqual([true, false]);
    expect(JSON.stringify(rows)).not.toContain("someone");
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!).to).toEqual(["ops@example.test"]);
  });

  it("sends no mail where nobody is named, and still keeps the error", async () => {
    process.env.ADMIN_EMAILS = "";
    await storeError(record("Nobody is told about this"));
    expect(await prisma.errorEvent.count({ where: { at: AT } })).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it("stops mailing once the day's alerts are spent", async () => {
    const now = new Date();
    await prisma.errorEvent.createMany({
      data: Array.from({ length: ALERTS_PER_DAY }, (_, i) => ({
        at: `itest/filler-${i}`, message: `filler ${i}`, fingerprint: `itest${i}`, alerted: true, createdAt: now,
      })),
    });
    const before = await prisma.errorEvent.count({ where: { alerted: true, createdAt: { gte: new Date(now.getTime() - DAY) } } });
    await storeError(record("One kind too many"), now);
    // Only meaningful where this database holds no other alerted rows today, which the filler guarantees is over the cap.
    expect(before).toBeGreaterThanOrEqual(ALERTS_PER_DAY);
    expect(sent).toHaveLength(0);
  });

  it("deletes its own rows once they are older than the keeping period", async () => {
    const old = new Date(Date.now() - (KEEP_DAYS + 1) * DAY);
    await prisma.errorEvent.create({
      data: { at: "itest/old", message: "old", fingerprint: "itestold", createdAt: old },
    });
    await storeError(record("A fresh one"));
    expect(await prisma.errorEvent.count({ where: { at: "itest/old" } })).toBe(0);
  });

  it("never throws, whatever it is handed", async () => {
    await expect(storeError({ ...record("x"), extra: { cyclic: undefined } }, new Date(Number.NaN))).resolves.toBeUndefined();
  });
});
