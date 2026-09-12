import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { likeLiteral } from "@/lib/dict/search";
import { fold, FOLD_FROM, FOLD_TO } from "@/lib/estonian/fold";

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
 * That is what keeps the picker rare rather than routine: a learner with no
 * deck of their own is offered nothing, because the only option would be one
 * nobody has created. The gate used to be two, on the reasoning that with one
 * shelf a word goes where it was always going to go, and that was wrong in a
 * way somebody hit on the day they named their first deck: a word added
 * without the picker reaches no shelf at all, so one deck bought a name the
 * app then never offered.
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

/**
 * THE LEARNER'S OWN WORDS THAT ARE NOT YET ON THIS SHELF, NEWEST FIRST.
 *
 * Every other way into a deck files a word at the moment it is added, and
 * only the dictionary's panel ever offered the choice: a word kept from
 * Sonad, from the word of the day, from a glossed sentence or from a drill
 * lands unfiled, and until this there was no way to file it afterwards. The
 * deck screen could take a word off a shelf and never put one on.
 *
 * Newest first rather than alphabetically, because the word somebody came
 * here to file is nearly always the one they just kept, so the common case
 * is a list they do not have to search at all. That is also why it is worth
 * the group: `Card.createdAt` is when the learner took the word, and a word
 * is several cards, so the newest of them is when the word arrived.
 *
 * Bounded in SQL rather than in the client. The pairing rule about `take`
 * beside `distinct` is the reason this is raw: Prisma deduplicates in the
 * client, so `distinct` here would read every card a learner holds to hand
 * back twenty rows, on a screen where they are waiting.
 *
 * FOLDED, through the one table every other search here folds with, because
 * a learner with no diacritic key cannot type the word they are looking for
 * and this is a search box like any other. The English side is not folded,
 * since a gloss carries none of the six.
 */
export async function wordsToFile(
  ownerId: string, deckId: string, query: string, limit = 20,
): Promise<DeckWordRow[]> {
  const owns = await prisma.deck.count({ where: { id: deckId, ownerId } });
  if (owns === 0) return [];

  const q = query.trim();
  const wanted = Math.min(Math.max(limit, 1), 50);
  /*
    An empty box is the ordinary way in, so it drops the clause rather than
    binding a `true` the planner then has to be told to ignore. Branching in
    SQL on a bound boolean would also be the one part of this query whose
    behaviour depends on how the driver types a JavaScript value, which is
    exactly the kind of thing to take out of a statement nothing can unit test.
  */
  const match = q === "" ? Prisma.empty : Prisma.sql`
    AND (
      translate(lower(l.lemma), ${FOLD_FROM}, ${FOLD_TO})
          LIKE ${`%${likeLiteral(fold(q))}%`} ESCAPE '\\'
      OR lower(l.translation)
          LIKE ${`%${likeLiteral(q.toLowerCase())}%`} ESCAPE '\\'
    )`;

  return prisma.$queryRaw<DeckWordRow[]>`
    SELECT l.id AS "lexemeId", l.lemma AS lemma, l.translation AS translation
    FROM "Lexeme" l
    JOIN (
      SELECT "lexemeId", MAX("createdAt") AS added
      FROM "Card"
      WHERE "ownerId" = ${ownerId} AND "lexemeId" IS NOT NULL
      GROUP BY "lexemeId"
    ) c ON c."lexemeId" = l.id
    WHERE NOT EXISTS (
      SELECT 1 FROM "DeckWord" d
      WHERE d."lexemeId" = l.id AND d."deckId" = ${deckId}
    )
    ${match}
    -- Ordered because it is truncated, and ending on the id because it is
    -- ordered on a column that ties: a word's cards are written in one
    -- createMany with one createdAt, so two words taken in the same add
    -- share this key exactly and which of them made the cut would otherwise
    -- be the planner's to decide.
    ORDER BY c.added DESC, l.id ASC
    LIMIT ${wanted}
  `;
}

/**
 * Files one word the learner already holds under one shelf they already own.
 *
 * Both halves are checked rather than trusted, because this is reached from a
 * `"use server"` export and neither id is ours: the deck, so nobody files a
 * word onto a stranger's shelf by guessing, and the card, so a shelf only
 * ever names words that are in the learner's own review pool. Writes nothing
 * but the membership row, so it cannot move a schedule, a grade or a count.
 */
export async function fileWordInDeck(
  ownerId: string, deckId: string, lexemeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [deck, held] = await Promise.all([
    prisma.deck.count({ where: { id: deckId, ownerId } }),
    prisma.card.count({ where: { ownerId, lexemeId } }),
  ]);
  if (deck === 0) return { ok: false, error: "That deck is not yours." };
  if (held === 0) return { ok: false, error: "Add that word to your deck first." };

  await prisma.deckWord.upsert({
    where: { deckId_lexemeId: { deckId, lexemeId } },
    create: { ownerId, lexemeId, deckId },
    update: {},
  });
  return { ok: true };
}
