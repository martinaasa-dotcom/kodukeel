import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { THINGS } from "@/lib/games/twentyThings";

/**
 * THE LEARNING LOOP, AGAINST A REAL DATABASE AND A STUBBED MODEL.
 *
 * What only a database can say: a report is counted, a real word is learned
 * once however many reports race for it, a slip of the hand is never stored,
 * another spelling of a learned word joins it for nothing, the call is written
 * in the ledger, and a retired word stops being served and is not learned again.
 */
const pending: Promise<unknown>[] = [];
vi.mock("next/server", () => ({ after: (fn: () => unknown) => { pending.push(Promise.resolve().then(fn)); } }));

const calls: string[] = [];
let reply = "";
vi.mock("@/lib/tutor/grader", () => ({
  callChainForJson: async (_chain: unknown, _system: string, user: string) => {
    calls.push(user);
    return { text: reply, usage: { inputTokens: 1000, outputTokens: 400, measured: true }, config: { name: "groq", model: "itest-model" } };
  },
}));
vi.mock("@/lib/tutor/provider", async (original) => ({
  ...(await original<object>()),
  resolveProviders: () => [{ name: "groq", model: "itest-model", label: "Groq" }],
}));

const { learnedWords, learnGap, reportGaps, retireLearned } = await import("./twentyLearned");

const OWNER = "itest-twenty-owner";
const SPELLINGS = ["mahlased", "mahlane", "mahlasele", "itestmahlnae"];
const sorted = () => JSON.stringify({
  en: "Is it juicy?", ru: "Он сочный?", uk: "Він соковитий?",
  yes: THINGS.filter((t) => t.isa.includes("puuvili")).map((t) => t.lemma),
  no: THINGS.filter((t) => !t.isa.includes("puuvili")).map((t) => t.lemma),
});

async function clean() {
  await prisma.twentyGap.deleteMany({ where: { OR: [{ spelling: { in: SPELLINGS } }, { lemma: "mahlane" }] } });
  await prisma.twentyLearned.deleteMany({ where: { lemma: "mahlane" } });
  await prisma.usageEvent.deleteMany({ where: { ownerId: OWNER } });
}

beforeEach(async () => {
  await clean();
  calls.length = 0;
  pending.length = 0;
  reply = sorted();
});
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

const settle = async () => { await Promise.all(pending.splice(0)); };

describe("an Ei tea teaches the game", () => {
  it("learns a real word once, for everybody, and writes the call down", async () => {
    expect(await reportGaps(OWNER, ["mahlased"])).toBe(true);
    // Four more reports while the first is still learning cost nothing more.
    await Promise.all([1, 2, 3, 4].map(() => reportGaps(OWNER, ["mahlased"])));
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("\"mahlane\"");

    const gap = await prisma.twentyGap.findUnique({ where: { spelling: "mahlased" } });
    expect(gap).toMatchObject({ status: "LEARNED", lemma: "mahlane", reports: 5 });

    const words = await learnedWords(Date.now() + 120_000);
    const juicy = words.find((w) => w.lemma === "mahlane");
    expect(juicy?.en).toBe("Is it juicy?");
    expect(juicy?.answers.õun).toBe("yes");
    expect(juicy?.answers.kivi).toBe("no");
    expect(juicy?.spellings).toContain("mahlased");
    expect(juicy?.spellings).toContain("mahlane");

    const ledger = await prisma.usageEvent.count({ where: { ownerId: OWNER, kind: "GRADER" } });
    expect(ledger).toBeGreaterThan(0);
  });

  it("never stores a slip of the hand", async () => {
    expect(await reportGaps(OWNER, ["itestmahlnae"])).toBe(false);
    expect(await prisma.twentyGap.findUnique({ where: { spelling: "itestmahlnae" } })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("joins another spelling to a word it has learned, without asking again", async () => {
    await reportGaps(OWNER, ["mahlased"]);
    await settle();
    await prisma.twentyLearned.update({ where: { lemma: "mahlane" }, data: { spellings: "mahlane" } });
    expect(await reportGaps(OWNER, ["mahlasele"])).toBe(true);
    await settle();
    expect(calls).toHaveLength(1);
    const row = await prisma.twentyLearned.findUnique({ where: { lemma: "mahlane" } });
    expect(row?.spellings.split(" ")).toContain("mahlasele");
  });

  it("leaves a reply it cannot read as failed, and learns nothing", async () => {
    reply = "{\"unknown\": true}";
    await reportGaps(OWNER, ["mahlased"]);
    await settle();
    expect(await prisma.twentyGap.findUnique({ where: { spelling: "mahlased" } })).toMatchObject({ status: "FAILED" });
    expect(await prisma.twentyLearned.count({ where: { lemma: "mahlane" } })).toBe(0);
  });

  it("stops serving a retired word, and does not learn it again", async () => {
    await reportGaps(OWNER, ["mahlased"]);
    await settle();
    await retireLearned("mahlane");
    expect((await learnedWords(Date.now() + 240_000)).some((w) => w.lemma === "mahlane")).toBe(false);
    expect(await learnGap(OWNER, "mahlased")).toBe("skipped");
    expect(calls).toHaveLength(1);
  });
});
