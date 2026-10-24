import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/*
  The gate in lib/ekilex/client.ts is real here; only the network under it is
  stubbed, and the mapper, so an invented word can be stored without Ekilex's
  whole response shape. What is asked is the one thing a unit test cannot see:
  that a live lookup lands in `EkilexDay` exactly once per request, through the
  gate, and that a stored answer lands exactly once.
*/
vi.mock("@/lib/ekilex/mapper", () => ({
  mapEkilexDetails: () => ({
    lemma: LEMMA,
    pos: "NOUN",
    ekilexWordId: 990077,
    cefr: null,
    gradation: "NONE",
    gradationNote: null,
    government: null,
    definition: null,
    semanticTypes: null,
    examples: [],
    forms: [{ formType: "NOM_SG", value: "itestekilexcountxq", isPrincipal: true }],
  }),
}));
vi.mock("@/lib/dict/wiktionary", () => ({
  fetchEnglishGloss: async () => ({ senses: ["a counted word"] }),
}));

const LEMMA = "itestekilexcountxq";

const { prisma } = await import("@/lib/db");
const { lookupAndStore, countStoredAnswer } = await import("@/lib/dict/lookup");
const { utcDay } = await import("@/lib/research/ekilexLoad");

const realFetch = globalThis.fetch;
let replies: number[] = [];
let asked: string[] = [];

function stubEkilex() {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.startsWith("https://ekilex.ee/api")) throw new Error(`unexpected request to ${url}`);
    asked.push(url);
    const status = replies.shift() ?? 200;
    const body = url.includes("/word/search/")
      ? { words: [{ wordId: 990077, wordValue: LEMMA, homonymNr: 1, lang: "est" }] }
      : { word: { wordId: 990077, wordValue: LEMMA, paradigms: [] }, lexemes: [] };
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

async function today() {
  return prisma.ekilexDay.findUnique({ where: { day: utcDay(new Date()) } });
}

async function wipe() {
  const rows = await prisma.lexeme.findMany({ where: { lemma: LEMMA }, select: { id: true } });
  await prisma.form.deleteMany({ where: { lexemeId: { in: rows.map((r) => r.id) } } });
  await prisma.lexeme.deleteMany({ where: { lemma: LEMMA } });
}

beforeAll(async () => {
  process.env.EKILEX_API_KEY = "itest-key";
  stubEkilex();
  await wipe();
});
afterEach(async () => {
  replies = [];
  asked = [];
  await wipe();
});
afterAll(async () => {
  globalThis.fetch = realFetch;
  delete process.env.EKILEX_API_KEY;
  await wipe();
  await prisma.$disconnect();
});

describe("what this installation asks of Ekilex, counted", () => {
  it("counts a live lookup once per request: one search and one details", async () => {
    const before = await today();
    const found = await lookupAndStore("itest-ekilex-owner", `${LEMMA}-a`);
    expect(found?.lemma).toBe(LEMMA);
    expect(asked).toHaveLength(2);
    const after = await today();
    expect((after?.search ?? 0) - (before?.search ?? 0)).toBe(1);
    expect((after?.details ?? 0) - (before?.details ?? 0)).toBe(1);
    expect((after?.stored ?? 0) - (before?.stored ?? 0)).toBe(0);
  });

  it("counts a request the gate tried twice once, not twice", async () => {
    replies = [503, 200, 200];
    const before = await today();
    await lookupAndStore("itest-ekilex-owner", `${LEMMA}-b`);
    expect(asked).toHaveLength(3);
    const after = await today();
    expect((after?.search ?? 0) - (before?.search ?? 0)).toBe(1);
    expect((after?.details ?? 0) - (before?.details ?? 0)).toBe(1);
    expect((after?.failed ?? 0) - (before?.failed ?? 0)).toBe(0);
  });

  it("counts a refusal as a request and as refused", async () => {
    replies = [403];
    const before = await today();
    expect(await lookupAndStore("itest-ekilex-owner", `${LEMMA}-c`)).toBeNull();
    expect(asked).toHaveLength(1);
    const after = await today();
    expect((after?.search ?? 0) - (before?.search ?? 0)).toBe(1);
    expect((after?.refused ?? 0) - (before?.refused ?? 0)).toBe(1);
  });

  it("counts a stored answer once, and nothing for an entry Ekilex never supplied", async () => {
    const before = await today();
    await countStoredAnswer({ ekilexWordId: 990077 });
    await countStoredAnswer({ ekilexWordId: null });
    await countStoredAnswer(null);
    const after = await today();
    expect((after?.stored ?? 0) - (before?.stored ?? 0)).toBe(1);
    expect((after?.search ?? 0) - (before?.search ?? 0)).toBe(0);
    expect(asked).toHaveLength(0);
  });
});
