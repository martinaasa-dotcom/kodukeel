/**
 * WHETHER AN ENTRY IS EVERYBODY'S TO READ, which is a wider question than
 * whether it vouches for a spelling.
 *
 * The seed's words and Ekilex's are, and so is a word somebody typed once a
 * reviewer has passed it (`Lexeme.approvedAt`). Before that column, nothing
 * could pass one: a missing word a reviewer accepted from the queue was written
 * as `USER` under the reviewer's name, so the search found it for the reviewer
 * and the entry page opened it for nobody else, and the learner who reported it
 * never saw it arrive. It is the one rule the search, the entry page,
 * `wordReaches` and the review queue read, so none of them can disagree about
 * who may see a word.
 *
 * DELIBERATELY NOT `VOUCHED_ROW` (lib/dict/search.ts). A reviewer passing a
 * word says it is a word worth having, with a meaning a person read; it says
 * nothing a source said about the forms beside it, so the pickers that hand a
 * word to every learner as a decoy, a word of the day or an examination answer,
 * and the scanner deciding what a photographed spelling is, still draw on the
 * Institute's words alone.
 *
 * Pure and import-free, because `lib/suggestions/model.ts` is pure and reads it.
 */
export function isShared(row: { provenance: string; approvedAt?: Date | null }): boolean {
  return row.provenance === "SEED" || row.provenance === "EKILEX" || row.approvedAt != null;
}

/** `isShared` as a query. */
export const SHARED_ROW = {
  OR: [
    { provenance: { in: ["SEED", "EKILEX"] } },
    { approvedAt: { not: null } },
  ],
};

/**
 * Whose word an entry is, for the one learner looking at it. Here rather than
 * beside `entryOwnership` (lib/progress/removeWord.ts) so the entry page, which
 * is a client component, can name the shape without reaching a module that
 * reads the database.
 */
export interface EntryOwnership {
  /** This learner added it, and it is still theirs to change. */
  mine: boolean;
  /** Everybody can read it: a source supplied it or a reviewer passed it. */
  shared: boolean;
  /** This learner has asked for it to be passed and nobody has answered yet. */
  awaiting: boolean;
  /** This learner may take it out of the dictionary (lib/progress/removeWord.ts). */
  removable: boolean;
}

interface Row {
  provenance: string;
  approvedAt: Date | null;
  editedBy: string | null;
}

/**
 * Who may take a typed word back out of the dictionary, over a row already
 * read (lib/progress/removeWord.ts has the argument). Pure, so its three cases
 * are tested without a database.
 */
export function mayRemove(row: Row, ownerId: string, reviewer: boolean, othersHoldCards: boolean): boolean {
  if (row.provenance === "SEED" || row.provenance === "EKILEX") return false;
  if (reviewer) return true;
  return row.editedBy === ownerId && row.approvedAt === null && !othersHoldCards;
}
