import { Prisma, type PrismaClient } from "@prisma/client";
import { LEXEME_COLUMNS, type SeedEntry } from "./columns";
import { PRINCIPAL_FORM_TYPES } from "../lib/estonian/types";

/*
  The seed's write, apart from `seed.ts` because that file runs its `main()` on
  import and this is the half an integration test has to be able to drive.
*/

/**
 * Writes the whole dictionary in six statements rather than three per entry.
 *
 * There are ~360 lexemes and ~1,570 forms. One entry at a time that is over a
 * thousand sequential round trips: unnoticeable over a local socket, and about
 * nine minutes against a hosted database in another region — a cost paid by
 * exactly the deploy that can least afford it, the first one, where
 * `--only-if-empty` finds an empty dictionary and has to fill it.
 *
 * It all runs in one transaction, so a seed that dies partway leaves the
 * dictionary as it was rather than half-written with some entries missing their
 * forms.
 */
export async function writeSeedEntries(prisma: PrismaClient, entries: SeedEntry[]) {
  return prisma.$transaction(async (tx) => {
    const ids = new Map<string, string>();
    /*
      A statement per ownership shape, because the update differs.

      A column marked `onlyWhenOwned` is written only for entries whose payload
      carries its key: the phrases own their English note and the harvested
      words own their Estonian definition, and everything else must leave both
      alone, since the dictionary editor and the live Ekilex lookup write them
      too. This was one hardcoded test for `notes`; a second such column made
      the shape a set rather than a boolean.
    */
    const groups = new Map<string, SeedEntry[]>();
    for (const entry of entries) {
      const shape = ownedBy(entry).join("|");
      const group = groups.get(shape) ?? [];
      group.push(entry);
      groups.set(shape, group);
    }
    for (const group of groups.values()) {
      for (const batch of chunks(group, 500)) {
        for (const row of await upsertLexemes(tx, batch)) ids.set(key(row), row.id);
      }
    }

    /*
      Replace the principal parts so a corrected seed value lands, and nothing
      else. This deleted every form on the row, which on a deployment somebody
      has been using is the whole table a live Ekilex lookup retrieved: the one
      thing on an entry that cannot be reconstructed, and the rule
      `lib/dict/upsert.ts` already keeps for a hand edit. The seed's own
      `EKILEX:` forms are then written with `skipDuplicates`, since the ones a
      previous seed wrote are still there.

      A row somebody corrected by hand is not in `ids` at all: the conflict
      clause below refuses to update it, so `RETURNING` leaves it out and
      neither its principal parts nor its gloss is touched.
    */
    await tx.form.deleteMany({
      where: { lexemeId: { in: [...ids.values()] }, formType: { in: [...PRINCIPAL_FORM_TYPES] } },
    });

    const rows = entries.flatMap((e) => {
      const lexemeId = ids.get(key(e));
      return lexemeId ? e.forms.map((f) => ({ ...f, lexemeId })) : [];
    });
    for (const batch of chunks(rows, 2000)) await tx.form.createMany({ data: batch, skipDuplicates: true });

    return { lexemes: ids.size, forms: rows.length };
  }, { timeout: 120_000 });
}

/**
 * One `INSERT ... ON CONFLICT DO UPDATE` for a batch of entries, built from the
 * column table in `columns.ts` so the column list, the `VALUES` tuples and the
 * `SET` clause cannot drift apart. The identifiers are `Prisma.raw` because they
 * are literals from that table — every value is still a bound parameter.
 */
async function upsertLexemes(tx: Prisma.TransactionClient, batch: SeedEntry[]) {
  // Every entry in a batch has the same shape: `write` grouped them by it.
  const owned = new Set(batch[0] ? ownedBy(batch[0]) : []);
  const columns = LEXEME_COLUMNS.filter((c) => !c.onlyWhenOwned || owned.has(c.name));
  const quoted = (name: string) => Prisma.raw(`"${name}"`);

  const values = batch.map((e) => Prisma.sql`(${Prisma.join([
    Prisma.sql`${crypto.randomUUID()}`,
    ...columns.map((c) => (c.cast ? Prisma.sql`${c.value(e)}::${Prisma.raw(c.cast)}` : Prisma.sql`${c.value(e)}`)),
    Prisma.sql`NOW()`,
  ])})`);

  return tx.$queryRaw<{ id: string; lemma: string; pos: string }[]>`
    INSERT INTO "Lexeme" (id, ${Prisma.join(columns.map((c) => quoted(c.name)))}, "updatedAt")
    VALUES ${Prisma.join(values)}
    ON CONFLICT (lemma, pos) DO UPDATE SET
      ${Prisma.join(
        columns
          .filter((c) => c.reseeded)
          .map((c) => Prisma.sql`${quoted(c.name)} = EXCLUDED.${quoted(c.name)}`),
      )},
      "updatedAt" = NOW()
    WHERE "Lexeme"."editedBy" IS NULL
    RETURNING id, lemma, pos
  `;
}

export const key = (e: { lemma: string; pos: string }) => `${e.lemma} ${e.pos}`;

/** Which of the owned columns this entry hands to the seed, in table order. */
const ownedBy = (e: SeedEntry) =>
  LEXEME_COLUMNS.filter((c) => c.onlyWhenOwned && Object.hasOwn(e, c.name)).map((c) => c.name);

function chunks<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
