import { prisma } from "@/lib/db";
import { plainPhrase } from "@/lib/copy/values";

/**
 * THE WORDS A LEARNER HAS STARRED.
 *
 * `StarredWord` has existed since the dictionary did and could only be written
 * from one screen and read on that same screen, so a favorite was a thing you
 * could set and then never see again. These are the two reads that put it
 * where it is set from and where it is looked at: `starredAmong` for a session
 * that has to draw the button in the right state, and `favorites` for the
 * list on `/words/mastery`.
 *
 * OWNER-SCOPED, SO IT IS NOT A FACT ABOUT THE DICTIONARY. Nothing here may go
 * near `lib/dict/facts.ts`, which caches its answers across requests and holds
 * only what is true for everybody.
 */

/** How many favorites a list shows before it stops being a list. */
export const FAVOURITE_LIMIT = 120;

/**
 * Which of these words this learner has starred.
 *
 * One query for a whole session rather than one per card, keyed on the
 * composite primary key's leading column, which is why `StarredWord` needs no
 * index of its own.
 */
export async function starredAmong(
  ownerId: string, lexemeIds: readonly string[],
): Promise<Set<string>> {
  const ids = [...new Set(lexemeIds)];
  if (ids.length === 0) return new Set();
  const rows = await prisma.starredWord.findMany({
    where: { ownerId, lexemeId: { in: ids } },
    select: { lexemeId: true },
  });
  return new Set(rows.map((r) => r.lexemeId));
}

export interface Favorite {
  lexemeId: string;
  lemma: string;
  translation: string;
  pos: string;
  cefr: string | null;
  starredAt: Date;
}

/**
 * Every word this learner has starred, most recently starred first.
 *
 * Newest first because that is the order somebody looks for one in: a star is
 * pressed in the middle of a card about a word that has just surprised them,
 * and the thing they come back for is the one they kept last. Ordered on the
 * id as well, since two stars written in one press of "add a unit" share a
 * timestamp and a cut at the limit may not be decided by the query plan.
 */
export async function favorites(ownerId: string): Promise<Favorite[]> {
  const rows = await prisma.starredWord.findMany({
    where: { ownerId },
    select: {
      lexemeId: true,
      createdAt: true,
      lexeme: { select: { lemma: true, translation: true, pos: true, cefr: true } },
    },
    orderBy: [{ createdAt: "desc" }, { lexemeId: "asc" }],
    take: FAVOURITE_LIMIT,
  });

  return rows.map((row) => ({
    lexemeId: row.lexemeId,
    lemma: plainPhrase(row.lexeme.lemma, row.lexeme.pos),
    translation: plainPhrase(row.lexeme.translation, row.lexeme.pos),
    pos: row.lexeme.pos,
    cefr: row.lexeme.cefr,
    starredAt: row.createdAt,
  }));
}

/** How many words are starred in total, which the capped list cannot say. */
export function favoriteCount(ownerId: string): Promise<number> {
  return prisma.starredWord.count({ where: { ownerId } });
}

/**
 * Put a word on or off the favorites, as asked, and never the other way.
 *
 * The star used to be toggled on the server: read whether the word was
 * starred, then write the opposite. That is relative to what the database
 * holds rather than to what the learner was looking at, so a screen gone stale
 * in another tab read "Add to favorites" and pressing it removed the star. And
 * two presses landing together both read "not starred", one created the row
 * and the other threw on the key, and the button put itself back to unstarred
 * over a database that said starred. The button says which state it wants now,
 * and this writes that state whatever was there: `skipDuplicates` and
 * `deleteMany` are both no-ops on a row already in the wanted state, so there
 * is nothing left to race.
 */
export async function setStarred(ownerId: string, lexemeId: string, want: boolean): Promise<boolean> {
  if (want) {
    await prisma.starredWord.createMany({ data: [{ ownerId, lexemeId }], skipDuplicates: true });
  } else {
    await prisma.starredWord.deleteMany({ where: { ownerId, lexemeId } });
  }
  return want;
}
