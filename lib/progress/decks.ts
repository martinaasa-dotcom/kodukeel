import { prisma } from "@/lib/db";

/**
 * A LEARNER'S OWN SHELVES, LAYERED OVER THE ONE REVIEW POOL.
 *
 * `Deck` and `DeckWord` never touch scheduling. FSRS still asks about every
 * one of a learner's cards through `Card.ownerId` alone, and every screen
 * that reads mastery, the weakest case or what is due keeps reading exactly
 * that (ADR-003/ADR-014): a deck here is a name over a word, the way a
 * Spotify playlist is a view over one library rather than a second copy of
 * the songs. A word in no deck at all is not a word outside the learner's
 * pool, it is simply unfiled, which is the ordinary state for everybody who
 * has never opened this screen.
 *
 * That is also what keeps the picker rare rather than routine: a learner
 * with zero decks of their own has one shelf, the whole of their deck, and
 * `decksFor` reports that as nothing to choose between. Only once somebody
 * has actually named a second shelf does adding a word become a question.
 */

const MAX_DECK_NAME = 60;
/** Past this a learner is organizing a spreadsheet, not a shelf of playlists. */
const MAX_DECKS = 40;

export interface DeckSummary {
  id: string;
  name: string;
  createdAt: string;
  wordCount: number;
}

/** Every deck this learner has named, with how many words sit in each. */
export async function listDecks(ownerId: string): Promise<DeckSummary[]> {
  const decks = await prisma.deck.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { _count: { select: { words: true } } },
  });
  return decks.map((d) => ({
    id: d.id,
    name: d.name,
    createdAt: d.createdAt.toISOString(),
    wordCount: d._count.words,
  }));
}

/** A name worth storing: trimmed, not blank, not absurd. */
function cleanName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, MAX_DECK_NAME);
  return trimmed.length > 0 ? trimmed : null;
}

export async function createDeck(
  ownerId: string, name: string,
): Promise<{ ok: true; deck: DeckSummary } | { ok: false; error: string }> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Give the deck a name first." };

  const existing = await prisma.deck.count({ where: { ownerId } });
  if (existing >= MAX_DECKS) {
    return { ok: false, error: `That is as many decks as one learner needs. You already have ${existing}.` };
  }

  const deck = await prisma.deck.create({ data: { ownerId, name: clean } });
  return { ok: true, deck: { id: deck.id, name: deck.name, createdAt: deck.createdAt.toISOString(), wordCount: 0 } };
}

export async function renameDeck(
  ownerId: string, deckId: string, name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Give the deck a name first." };

  const result = await prisma.deck.updateMany({ where: { id: deckId, ownerId }, data: { name: clean } });
  if (result.count === 0) return { ok: false, error: "That deck is not yours." };
  return { ok: true };
}

/**
 * Removes the shelf and nothing on it. `onDelete: Cascade` on `DeckWord.deck`
 * takes the membership rows with it; the words themselves, their cards and
 * every review of them are untouched, because a deck is a label rather than
 * a container the way `Card.ownerId` is.
 */
export async function deleteDeck(ownerId: string, deckId: string): Promise<boolean> {
  const result = await prisma.deck.deleteMany({ where: { id: deckId, ownerId } });
  return result.count > 0;
}

/** Which of this learner's decks a word is currently filed under. */
export async function decksForWord(ownerId: string, lexemeId: string): Promise<string[]> {
  const rows = await prisma.deckWord.findMany({
    where: { ownerId, lexemeId }, select: { deckId: true },
  });
  return rows.map((r) => r.deckId);
}

export interface DeckWordRow {
  lexemeId: string;
  lemma: string;
  translation: string;
}

/** Every word on one shelf, for a learner to look at and thin out. */
export async function wordsInDeck(ownerId: string, deckId: string): Promise<DeckWordRow[]> {
  const rows = await prisma.deckWord.findMany({
    where: { ownerId, deckId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { lexeme: { select: { id: true, lemma: true, translation: true } } },
  });
  return rows
    .filter((r) => r.lexeme !== null)
    .map((r) => ({ lexemeId: r.lexeme!.id, lemma: r.lexeme!.lemma, translation: r.lexeme!.translation }));
}

/** Takes one word off one shelf. The word, its cards and its history are untouched. */
export async function removeWordFromDeck(ownerId: string, deckId: string, lexemeId: string): Promise<void> {
  await prisma.deckWord.deleteMany({ where: { ownerId, deckId, lexemeId } });
}

/**
 * Files a word under the given decks, and only those: a second visit to the
 * picker with fewer boxes ticked removes the ones that were unticked, which
 * is what "these are the decks this word is in" has to mean for a checkbox
 * list to be honest about its own state.
 *
 * `deckIds` is trusted no further than any other argument to a `"use server"`
 * export: every id is checked against this owner's own decks before it is
 * written, so one learner cannot file a word into another's shelf by
 * guessing an id.
 */
export async function setDecksForWord(
  ownerId: string, lexemeId: string, deckIds: readonly string[],
): Promise<void> {
  const wanted = [...new Set(deckIds)];
  if (wanted.length === 0) {
    await prisma.deckWord.deleteMany({ where: { ownerId, lexemeId } });
    return;
  }

  const owned = await prisma.deck.findMany({
    where: { id: { in: wanted }, ownerId }, select: { id: true },
  });
  const ownedIds = new Set(owned.map((d) => d.id));

  await prisma.$transaction([
    prisma.deckWord.deleteMany({
      where: { ownerId, lexemeId, deckId: { notIn: [...ownedIds] } },
    }),
    ...([...ownedIds].map((deckId) =>
      prisma.deckWord.upsert({
        where: { deckId_lexemeId: { deckId, lexemeId } },
        create: { ownerId, lexemeId, deckId },
        update: {},
      }),
    )),
  ]);
}
