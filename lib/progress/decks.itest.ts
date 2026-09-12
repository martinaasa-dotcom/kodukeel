import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createDeck, decksForWord, deleteDeck, fileWordInDeck, listDecks,
  removeWordFromDeck, renameDeck, setDecksForWord, wordsInDeck, wordsToFile,
} from "./decks";

/**
 * `Deck` and `DeckWord` against a real database, because the fault this
 * feature actually had could only show up against one: a caller of
 * `setDecksForWord` that does not first read what a word is already filed
 * under treats "add this one more deck" and "these are the only decks now"
 * as the same call, and the second is what the function does. The bug was
 * in the picker that called this, not in this function; these tests pin
 * down the one property that made the picker safe to fix — that the
 * function really does replace, in both directions, and that it can never
 * be pointed at somebody else's shelf.
 *
 * Two owners, so the ownership boundary is provable rather than assumed.
 */

const MINE = "itest-owner-decks";
const OTHER = "itest-owner-decks-other";

async function wipe(owner: string) {
  await prisma.deckWord.deleteMany({ where: { ownerId: owner } });
  await prisma.deck.deleteMany({ where: { ownerId: owner } });
  await prisma.card.deleteMany({ where: { ownerId: owner } });
}

/**
 * A card for a word, which is what makes it one of the learner's own. Takes
 * the moment it was added, because `wordsToFile` orders on exactly that and a
 * test that let two words share a timestamp would be asserting the planner's
 * answer rather than the function's.
 */
async function hold(owner: string, lexemeId: string, addedAt: Date) {
  await prisma.card.create({
    data: {
      ownerId: owner, lexemeId, cardType: "RECOGNITION",
      front: "x", back: "y", createdAt: addedAt,
    },
  });
}

beforeEach(async () => { await wipe(MINE); await wipe(OTHER); });
afterAll(async () => { await wipe(MINE); await wipe(OTHER); await prisma.$disconnect(); });

/** Two real, distinct words from the shipped dictionary. Nothing is invented. */
async function twoWords() {
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: ["õpetaja", "kohv"] } },
    select: { id: true, lemma: true },
  });
  const first = rows.find((r) => r.lemma === "õpetaja");
  const second = rows.find((r) => r.lemma === "kohv");
  if (!first || !second) throw new Error("seed the dictionary before running this suite");
  return { first: first.id, second: second.id };
}

describe("createDeck / listDecks / renameDeck / deleteDeck", () => {
  it("creates a deck, lists it with a zero word count, renames it and removes it", async () => {
    const created = await createDeck(MINE, "  Work Estonian  ");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.deck.name).toBe("Work Estonian"); // trimmed
    expect(created.deck.wordCount).toBe(0);

    let decks = await listDecks(MINE);
    expect(decks).toHaveLength(1);
    expect(decks[0]!.name).toBe("Work Estonian");

    const renamed = await renameDeck(MINE, created.deck.id, "Office words");
    expect(renamed.ok).toBe(true);
    decks = await listDecks(MINE);
    expect(decks[0]!.name).toBe("Office words");

    const removed = await deleteDeck(MINE, created.deck.id);
    expect(removed).toBe(true);
    decks = await listDecks(MINE);
    expect(decks).toHaveLength(0);
  });

  it("refuses a blank name rather than storing an empty shelf", async () => {
    const result = await createDeck(MINE, "    ");
    expect(result.ok).toBe(false);
  });

  it("will not rename or delete a deck that belongs to somebody else", async () => {
    const theirs = await createDeck(OTHER, "Not yours");
    expect(theirs.ok).toBe(true);
    if (!theirs.ok) return;

    const renamed = await renameDeck(MINE, theirs.deck.id, "Mine now");
    expect(renamed.ok).toBe(false);

    const removed = await deleteDeck(MINE, theirs.deck.id);
    expect(removed).toBe(false);

    // Untouched: still theirs, still under the original name.
    const decks = await listDecks(OTHER);
    expect(decks).toHaveLength(1);
    expect(decks[0]!.name).toBe("Not yours");
  });
});

describe("setDecksForWord", () => {
  it("replaces membership rather than adding to it, in both directions", async () => {
    const { first: word } = await twoWords();
    const a = await createDeck(MINE, "Deck A");
    const b = await createDeck(MINE, "Deck B");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    // Filed under A alone.
    await setDecksForWord(MINE, word, [a.deck.id]);
    expect((await decksForWord(MINE, word)).sort()).toEqual([a.deck.id]);

    /*
      THE CALL THE PICKER'S BUG WOULD HAVE GOTTEN WRONG.

      Passing [B] here is what a picker sends when the checkboxes read the
      word's *current* membership before anybody clicks anything and the
      learner then ticks a second box on top of the one that was already
      checked — the picker fix means B arrives here already carrying A. If
      it did not, this call alone (only B, A dropped) is indistinguishable
      from a learner who genuinely unfiled it from A, which is exactly the
      case this function has no way to tell apart from the bug: the
      contract is "this is the whole list now", so the safety has to live
      in whoever calls it with an honest list, not here.
    */
    await setDecksForWord(MINE, word, [a.deck.id, b.deck.id]);
    expect((await decksForWord(MINE, word)).sort()).toEqual([a.deck.id, b.deck.id].sort());

    // Down to B alone: A is dropped, B stays, nothing duplicated.
    await setDecksForWord(MINE, word, [b.deck.id]);
    expect(await decksForWord(MINE, word)).toEqual([b.deck.id]);

    // Empty list clears every shelf.
    await setDecksForWord(MINE, word, []);
    expect(await decksForWord(MINE, word)).toEqual([]);

    // Card counts on the two decks reflect exactly that history.
    const decks = await listDecks(MINE);
    expect(decks.find((d) => d.id === a.deck.id)!.wordCount).toBe(0);
    expect(decks.find((d) => d.id === b.deck.id)!.wordCount).toBe(0);
  });

  it("cannot file a word into a deck that is not the caller's own", async () => {
    const { first: word } = await twoWords();
    const theirs = await createDeck(OTHER, "Somebody else's shelf");
    expect(theirs.ok).toBe(true);
    if (!theirs.ok) return;

    // MINE tries to use OTHER's deck id, guessed or otherwise.
    await setDecksForWord(MINE, word, [theirs.deck.id]);

    expect(await decksForWord(MINE, word)).toEqual([]);
    const others = await listDecks(OTHER);
    expect(others[0]!.wordCount).toBe(0); // nothing landed on their shelf either
  });

  it("keeps two words on the same deck apart", async () => {
    const { first, second } = await twoWords();
    const deck = await createDeck(MINE, "Both");
    expect(deck.ok).toBe(true);
    if (!deck.ok) return;

    await setDecksForWord(MINE, first, [deck.deck.id]);
    await setDecksForWord(MINE, second, [deck.deck.id]);

    const decks = await listDecks(MINE);
    expect(decks[0]!.wordCount).toBe(2);

    const words = await wordsInDeck(MINE, deck.deck.id);
    expect(words.map((w) => w.lexemeId).sort()).toEqual([first, second].sort());

    await removeWordFromDeck(MINE, deck.deck.id, first);
    expect((await wordsInDeck(MINE, deck.deck.id)).map((w) => w.lexemeId)).toEqual([second]);
  });
});

describe("deleteDeck", () => {
  it("takes the shelf label off a word without touching the word itself", async () => {
    const { first: word } = await twoWords();
    const deck = await createDeck(MINE, "Temporary");
    expect(deck.ok).toBe(true);
    if (!deck.ok) return;
    await setDecksForWord(MINE, word, [deck.deck.id]);

    const before = await prisma.lexeme.findUnique({ where: { id: word }, select: { id: true } });
    expect(before).not.toBeNull();

    const removed = await deleteDeck(MINE, deck.deck.id);
    expect(removed).toBe(true);

    // The membership row is gone with the deck (ON DELETE CASCADE)...
    const rows = await prisma.deckWord.findMany({ where: { ownerId: MINE, lexemeId: word } });
    expect(rows).toHaveLength(0);
    // ...and the shared dictionary entry never moved.
    const after = await prisma.lexeme.findUnique({ where: { id: word }, select: { id: true } });
    expect(after).toEqual(before);
  });
});

/**
 * FILING A WORD AFTER THE FACT.
 *
 * Against a real database because the query is raw: the ordering, the fold and
 * the "not on this shelf" exclusion are all in SQL, so nothing smaller than
 * Postgres can say whether any of them is true. The ordering especially, since
 * a wrong one still returns the right rows and only ever shows up as a list
 * that puts the word somebody just kept somewhere down the page.
 */
describe("wordsToFile / fileWordInDeck", () => {
  it("offers the learner's own words, newest first, and drops each as it is filed", async () => {
    const { first, second } = await twoWords();
    await hold(MINE, first, new Date("2026-01-01T00:00:00Z"));
    await hold(MINE, second, new Date("2026-02-01T00:00:00Z"));
    const deck = await createDeck(MINE, "Work Estonian");
    if (!deck.ok) throw new Error("deck");

    const before = await wordsToFile(MINE, deck.deck.id, "");
    expect(before.map((w) => w.lexemeId)).toEqual([second, first]); // newest first

    const filed = await fileWordInDeck(MINE, deck.deck.id, second);
    expect(filed.ok).toBe(true);

    // Off the candidate list and onto the shelf, which are the same fact read
    // from the two sides that have to agree.
    const after = await wordsToFile(MINE, deck.deck.id, "");
    expect(after.map((w) => w.lexemeId)).toEqual([first]);
    expect((await wordsInDeck(MINE, deck.deck.id)).map((w) => w.lexemeId)).toEqual([second]);
  });

  it("finds a word typed without its diacritics", async () => {
    const { first } = await twoWords(); // õpetaja
    await hold(MINE, first, new Date("2026-01-01T00:00:00Z"));
    const deck = await createDeck(MINE, "Work Estonian");
    if (!deck.ok) throw new Error("deck");

    // The learner with no õ key is the whole reason this folds.
    expect((await wordsToFile(MINE, deck.deck.id, "opetaja")).map((w) => w.lexemeId)).toEqual([first]);
    expect((await wordsToFile(MINE, deck.deck.id, "õpetaja")).map((w) => w.lexemeId)).toEqual([first]);
  });

  it("finds a word by its English, and matches nothing on a word nobody holds", async () => {
    const { second } = await twoWords(); // kohv, coffee
    await hold(MINE, second, new Date("2026-01-01T00:00:00Z"));
    const deck = await createDeck(MINE, "Work Estonian");
    if (!deck.ok) throw new Error("deck");

    expect((await wordsToFile(MINE, deck.deck.id, "coffee")).map((w) => w.lexemeId)).toEqual([second]);
    expect(await wordsToFile(MINE, deck.deck.id, "qwertyx")).toEqual([]);
  });

  it("never offers or files a word the learner holds no card for", async () => {
    const { first } = await twoWords();
    const deck = await createDeck(MINE, "Work Estonian");
    if (!deck.ok) throw new Error("deck");

    // No card, so the word is not in this learner's pool and a shelf may not
    // name it: a deck is a label over what somebody is learning.
    expect(await wordsToFile(MINE, deck.deck.id, "")).toEqual([]);
    const refused = await fileWordInDeck(MINE, deck.deck.id, first);
    expect(refused.ok).toBe(false);
    expect(await wordsInDeck(MINE, deck.deck.id)).toEqual([]);
  });

  it("cannot file a word onto somebody else's shelf, or read what is missing from one", async () => {
    const { first } = await twoWords();
    await hold(MINE, first, new Date("2026-01-01T00:00:00Z"));
    const theirs = await createDeck(OTHER, "Not mine");
    if (!theirs.ok) throw new Error("deck");

    const refused = await fileWordInDeck(MINE, theirs.deck.id, first);
    expect(refused.ok).toBe(false);
    expect(await wordsInDeck(OTHER, theirs.deck.id)).toEqual([]);
    // And the candidate list gives away nothing about a shelf that is not ours.
    expect(await wordsToFile(MINE, theirs.deck.id, "")).toEqual([]);
  });

  it("files the same word twice without complaining or duplicating it", async () => {
    const { first } = await twoWords();
    await hold(MINE, first, new Date("2026-01-01T00:00:00Z"));
    const deck = await createDeck(MINE, "Work Estonian");
    if (!deck.ok) throw new Error("deck");

    expect((await fileWordInDeck(MINE, deck.deck.id, first)).ok).toBe(true);
    expect((await fileWordInDeck(MINE, deck.deck.id, first)).ok).toBe(true);
    expect(await wordsInDeck(MINE, deck.deck.id)).toHaveLength(1);
  });

  it("leaves the schedule alone: filing writes a membership row and nothing else", async () => {
    const { first } = await twoWords();
    await hold(MINE, first, new Date("2026-01-01T00:00:00Z"));
    const deck = await createDeck(MINE, "Work Estonian");
    if (!deck.ok) throw new Error("deck");

    const before = await prisma.card.findMany({ where: { ownerId: MINE }, orderBy: { id: "asc" } });
    await fileWordInDeck(MINE, deck.deck.id, first);
    const after = await prisma.card.findMany({ where: { ownerId: MINE }, orderBy: { id: "asc" } });
    expect(after).toEqual(before);
  });
});
