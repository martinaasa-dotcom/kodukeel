import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { learnBatch, learnCounts } from "./learn";
import { LADDER_CARD_TYPE } from "@/lib/learn/ladder";
import { deferWord } from "./deferrals";

/**
 * THE NUMBER ON TODAY AND THE ROUND IT OPENS ARE ONE ANSWER.
 *
 * `learnCounts` prints two numbers on two buttons and `learnBatch` fills them,
 * and the file's own comment says why they have to agree: a number the session
 * then refuses to fill reads as a counting fault rather than as a rule. Three
 * things decide what each of them serves, and all three arrived from different
 * directions within a day of each other: which kind of entry a round is over
 * (words or the fixed phrases), whether the learner put the word aside, and a
 * word list a caller names outright. Nothing asserted the three together, which
 * is why this file exists.
 *
 * It is an integration test rather than a unit one because every claim here is
 * a `where` clause. The guards are a date comparison on unseen cards and a set
 * membership on started ones, and the difference between counting a deferral
 * once and counting it against the wrong button is a `pos` filter inside a
 * `count`. None of that is reachable without rows.
 *
 * A PHRASE PUT ASIDE IS IN EVERY FIXTURE, because that is the case the two
 * counts can disagree on: subtracting it from the words button is the shape
 * this is drawn against, and it is invisible wherever a fixture holds words
 * alone.
 */

const MINE = "itest-owner-learn";
const LEMMAS = [
  "zzlearnword", "zzlearnwordb", "zzlearnphrase", "zzlearnphraseb", "zzlearngapword",
];

async function wipe() {
  await prisma.card.deleteMany({ where: { ownerId: MINE } });
  await prisma.deferral.deleteMany({ where: { ownerId: MINE } });
  await prisma.review.deleteMany({ where: { ownerId: MINE } });
  await prisma.lexeme.deleteMany({ where: { lemma: { in: LEMMAS } } });
}

/**
 * An entry of this test's own, spelled so nobody could mistake it for Estonian,
 * which is the rule every fixture that writes to the shared dictionary follows.
 */
async function entry(lemma: string, pos: "NOUN" | "PHRASE") {
  return prisma.lexeme.create({
    data: { lemma, pos, translation: `${lemma} in English`, cefr: "A1", examples: "[]" },
  });
}

/**
 * The one card a rung reads and writes. `state: 0` has never been asked and
 * `state: 1` is part way up the ladder, which is the distinction the two counts
 * are drawn on.
 */
async function ladderCard(lexemeId: string, state: 0 | 1, due: Date) {
  await prisma.card.create({
    data: {
      ownerId: MINE, lexemeId, cardType: LADDER_CARD_TYPE,
      front: "front", back: "back", due, state,
    },
  });
}

const NOW = new Date("2026-09-15T10:00:00.000Z");

beforeEach(wipe);
afterAll(async () => { await wipe(); await prisma.$disconnect(); });

describe("learnCounts", () => {
  it("counts words and phrases apart", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    await ladderCard(w.id, 0, NOW);
    await ladderCard(p.id, 0, NOW);

    const counts = await learnCounts(MINE, NOW);
    expect(counts.waiting).toBe(1);
    expect(counts.phrases.waiting).toBe(1);
  });

  /*
    A word part way up the ladder sits ten minutes out between rungs, so its
    date says nothing about whether anybody refused it. That is why the started
    count asks outright rather than reading `due`, and why this is the half a
    date-based fixture cannot see.
  */
  it("takes a word put aside off the started count", async () => {
    const a = await entry("zzlearnword", "NOUN");
    const b = await entry("zzlearnwordb", "NOUN");
    await ladderCard(a.id, 1, NOW);
    await ladderCard(b.id, 1, NOW);

    expect((await learnCounts(MINE, NOW)).started).toBe(2);

    await deferWord(MINE, a.id, "A1", "/learn", NOW);
    expect((await learnCounts(MINE, NOW)).started).toBe(1);
  });

  /*
    THE CLAIM THIS FILE WAS WRITTEN FOR. One subtraction over both kinds would
    take a phrase somebody put aside off the words button, which is a number
    the words round then refuses to fill.
  */
  it("subtracts a phrase put aside from the phrases, and not from the words", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    await ladderCard(w.id, 1, NOW);
    await ladderCard(p.id, 1, NOW);

    await deferWord(MINE, p.id, "A1", "/learn", NOW);

    const counts = await learnCounts(MINE, NOW);
    expect(counts.phrases.started).toBe(0);
    expect(counts.started).toBe(1);
  });

  // And the same rule the other way round, since a guard that reads one kind
  // for both passes the test above whenever it happens to subtract from the
  // one being looked at.
  it("subtracts a word put aside from the words, and not from the phrases", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    await ladderCard(w.id, 1, NOW);
    await ladderCard(p.id, 1, NOW);

    await deferWord(MINE, w.id, "A1", "/learn", NOW);

    const counts = await learnCounts(MINE, NOW);
    expect(counts.started).toBe(0);
    expect(counts.phrases.started).toBe(1);
  });

  /*
    An unseen card carries the moment it was written, so `due` is meaningless on
    it until somebody presses "too complicated", which is what a deferral moves.
    The waiting count reads the date for exactly that reason.
  */
  it("takes a word put aside off the waiting count", async () => {
    const w = await entry("zzlearnword", "NOUN");
    await ladderCard(w.id, 0, NOW);

    expect((await learnCounts(MINE, NOW)).waiting).toBe(1);

    await deferWord(MINE, w.id, "A1", "/learn", NOW);
    expect((await learnCounts(MINE, NOW)).waiting).toBe(0);
  });

  // Nobody has put anything aside, which is the path that never makes the
  // second round trip. It has to answer the same way as the one that does.
  it("counts the same where nothing was put aside", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    await ladderCard(w.id, 1, NOW);
    await ladderCard(p.id, 0, NOW);

    const counts = await learnCounts(MINE, NOW);
    expect(counts).toEqual({ waiting: 0, started: 1, phrases: { waiting: 1, started: 0 } });
  });
});

describe("learnBatch", () => {
  it("serves words to a words round and phrases to a phrases round", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    await ladderCard(w.id, 0, NOW);
    await ladderCard(p.id, 0, NOW);

    const words = await learnBatch(MINE, "A1", "en", 5, { kind: "word", now: NOW });
    const phrases = await learnBatch(MINE, "A1", "en", 5, { kind: "phrase", now: NOW });

    expect(words.map((x) => x.lemma)).toEqual(["zzlearnword"]);
    expect(phrases.map((x) => x.lemma)).toEqual(["zzlearnphrase"]);
  });

  it("does not serve a word that was put aside", async () => {
    const a = await entry("zzlearnword", "NOUN");
    const b = await entry("zzlearnwordb", "NOUN");
    await ladderCard(a.id, 1, NOW);
    await ladderCard(b.id, 1, NOW);

    await deferWord(MINE, a.id, "A1", "/learn", NOW);

    const served = await learnBatch(MINE, "A1", "en", 5, { kind: "word", now: NOW });
    expect(served.map((x) => x.lemma)).toEqual(["zzlearnwordb"]);
  });

  /*
    A named list is the choosing already done, so it is not narrowed by kind as
    well: a planned course day that teaches a greeting beside its nouns would
    otherwise lose the greeting, and the day would be unfinishable.
  */
  it("serves a named list whatever kind its entries are", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    await ladderCard(w.id, 0, NOW);
    await ladderCard(p.id, 0, NOW);

    const served = await learnBatch(MINE, "A1", "en", 5, {
      only: ["zzlearnword", "zzlearnphrase"], now: NOW,
    });
    expect(served.map((x) => x.lemma).sort()).toEqual(["zzlearnphrase", "zzlearnword"]);
  });

  it("serves only what a named list names", async () => {
    const a = await entry("zzlearnword", "NOUN");
    const b = await entry("zzlearnwordb", "NOUN");
    await ladderCard(a.id, 0, NOW);
    await ladderCard(b.id, 0, NOW);

    const served = await learnBatch(MINE, "A1", "en", 5, { only: ["zzlearnwordb"], now: NOW });
    expect(served.map((x) => x.lemma)).toEqual(["zzlearnwordb"]);
  });
});

/**
 * AND THE TWO ANSWER THE SAME QUESTION, which is the whole point of the file
 * and the one claim neither function can make on its own.
 */
describe("the count and the round agree", () => {
  it("serves exactly what each button promised, with a word and a phrase put aside", async () => {
    const w = await entry("zzlearnword", "NOUN");
    const wb = await entry("zzlearnwordb", "NOUN");
    const p = await entry("zzlearnphrase", "PHRASE");
    const pb = await entry("zzlearnphraseb", "PHRASE");
    await ladderCard(w.id, 1, NOW);
    await ladderCard(wb.id, 1, NOW);
    await ladderCard(p.id, 1, NOW);
    await ladderCard(pb.id, 1, NOW);

    await deferWord(MINE, w.id, "A1", "/learn", NOW);
    await deferWord(MINE, p.id, "A1", "/learn", NOW);

    const counts = await learnCounts(MINE, NOW);
    const words = await learnBatch(MINE, "A1", "en", 20, { kind: "word", now: NOW });
    const phrases = await learnBatch(MINE, "A1", "en", 20, { kind: "phrase", now: NOW });

    expect(words.length).toBe(counts.started);
    expect(phrases.length).toBe(counts.phrases.started);
    expect(words.map((x) => x.lemma)).toEqual(["zzlearnwordb"]);
    expect(phrases.map((x) => x.lemma)).toEqual(["zzlearnphraseb"]);
  });
});

/**
 * THE MEET RUNG HIDES AN A1 WORD'S SENTENCE; THE GAP RUNG, TWO SCREENS LATER,
 * BUILDS A CARD OUT OF THE SAME SENTENCE ANYWAY, UNLESS THIS IS GATED TOO.
 *
 * `sentenceAndGap` shares one sentence between both rungs by design, and
 * `WordIntro`'s own `cefr` prop only ever reaches the meet screen. Without a
 * matching gate here, a beginner shown nothing at meet would be handed a full
 * Estonian sentence with a blank in it at gap, never having read it.
 */
describe("learnBatch — an A1 word carries no gap", () => {
  /*
    `sentenceAndGap` looks for the bare lemma in the sentence, not any other
    form of it (`teachingSentence(examples, [lexeme.lemma], ...)`), so the
    fixture's sentence has to contain the lemma itself as a whole word for a
    gap to be buildable at all.
  */
  async function gapWord(cefr: string) {
    return prisma.lexeme.create({
      data: {
        lemma: "zzlearngapword", pos: "NOUN", translation: "zzlearngapword in English", cefr,
        examples: JSON.stringify([
          { et: "See on minu zzlearngapword.", en: "This is my zzlearngapword.", source: "SEED" },
        ]),
        forms: { create: [
          { formType: "NOM_SG", value: "zzlearngapword" },
          { formType: "GEN_SG", value: "zzlearngapworda" },
        ] },
      },
    });
  }

  it("builds no gap for an A1 word, though it still builds the sentence", async () => {
    const w = await gapWord("A1");
    await ladderCard(w.id, 0, NOW);

    const [word] = await learnBatch(MINE, "A1", "en", 5, { kind: "word", now: NOW });
    expect(word?.sentence?.et).toBe("See on minu zzlearngapword.");
    expect(word?.gap).toBeNull();
  });

  it("builds a gap for the same word and sentence from A2 up", async () => {
    const w = await gapWord("A2");
    await ladderCard(w.id, 0, NOW);

    const [word] = await learnBatch(MINE, "A2", "en", 5, { kind: "word", now: NOW });
    expect(word?.sentence?.et).toBe("See on minu zzlearngapword.");
    expect(word?.gap?.answer).toBe("zzlearngapword");
  });
});
