import type { PrismaClient } from "@prisma/client";

/*
  THE FOURTH COPY OF THE ONE TABLE, AND THE ONE THAT FAILS SILENTLY.

  `lib/estonian/fold.ts` exists because there were three tables of which
  Estonian letters fold and they agreed, which is the dangerous state rather
  than the safe one. This was a fourth, written out as two strings rather than
  as a record, so neither the sweep that found the other three nor its own
  comment could see it: the comment asked to be "kept identical to `fold` in
  lib/dict/search.ts", a file that has not held the table since it moved out of
  it.

  What a drift here would cost is worse than two screens disagreeing, because
  nothing would look wrong. These are function indexes, and Postgres uses one
  only where the expression in the query matches the expression it was built
  on. A seventh letter added to `FOLD` would leave every search computing a
  seven-character `translate` against an index built on six: the same rows come
  back, and both tables are scanned end to end to find them, which is the
  35ms-to-two-seconds fault the block below says these exist to prevent.
  Correct, slow, and reported by nobody.
*/
import { FOLD_FROM as FROM, FOLD_TO as TO } from "../lib/estonian/fold";

/**
 * Indexes the dictionary search needs, which Prisma cannot express.
 *
 * Search folds the six Estonian letters that carry diacritics before comparing,
 * so `rõõm` is found by typing "room". The database does that folding with
 * `translate`, and a plain column index cannot serve an expression, so these
 * are function indexes created in SQL. Prisma has no syntax for them and this
 * project uses `db push` rather than migrations, so they are ensured here
 * instead, idempotently, every time the seed runs.
 *
 * They were not needed while the dictionary was 370 hand-written words: three
 * sequential scans over a few thousand rows is nothing. At five thousand
 * lexemes and thirty thousand forms the same search took 35ms on its own and
 * over two seconds at the 95th percentile with eight people searching at once,
 * because every one of those requests was scanning both tables end to end.
 *
 * `CREATE INDEX IF NOT EXISTS` rather than a migration, and each one in its own
 * statement, so a deployment that already has them pays nothing and a database
 * that refuses one still gets the others.
 */

const INDEXES: { name: string; sql: string }[] = [
  {
    // A stored form matched exactly, which is how "loen" finds "lugema".
    name: "Form_value_folded_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Form_value_folded_idx"
          ON "Form" (translate(lower(value), '${FROM}', '${TO}'))`,
  },
  {
    // The genitive stems a regular case form is built on. Partial, because only
    // those two form types are ever tested this way, and they are a third of
    // the table.
    name: "Form_stem_folded_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Form_stem_folded_idx"
          ON "Form" (translate(lower(value), '${FROM}', '${TO}'))
          WHERE "formType" IN ('GEN_SG', 'GEN_PL')`,
  },
  {
    /*
      The same, on the 155,000-word headword list. Its primary key is the lemma
      and would serve an exact match on its own; what it will not serve is
      `LIKE 'uud%'` under a non-C collation, and the spelling suggestion is
      entirely prefix queries. Folded, because a learner who cannot type õ
      should still be told their word exists.
    */
    name: "KnownWord_lemma_folded_idx",
    sql: `CREATE INDEX IF NOT EXISTS "KnownWord_lemma_folded_idx"
          ON "KnownWord" (translate(lower(lemma), '${FROM}', '${TO}') text_pattern_ops)`,
  },
  {
    // The stored first persons a written verb form could be derived from.
    // Partial for the reason the stems index is: one form type, tested one way.
    name: "Form_pres1sg_folded_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Form_pres1sg_folded_idx"
          ON "Form" (translate(lower(value), '${FROM}', '${TO}'))
          WHERE "formType" = 'PRES_1SG'`,
  },
  {
    // Lemma prefix matches. text_pattern_ops is what lets LIKE 'x%' use an
    // index at all; a leading wildcard still cannot, which is what the trigram
    // indexes below are for.
    name: "Lexeme_lemma_folded_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Lexeme_lemma_folded_idx"
          ON "Lexeme" (translate(lower(lemma), '${FROM}', '${TO}') text_pattern_ops)`,
  },
];

/**
 * Trigram indexes, which are the only thing that makes `LIKE '%word%'` fast.
 *
 * Separate because they need an extension, and a deployment that will not grant
 * it should still get everything above rather than failing the seed. Postgres
 * ships pg_trgm in contrib and Supabase allows it; somewhere that does not,
 * search still works and simply scans for the substring case.
 */
const TRIGRAM: { name: string; sql: string }[] = [
  {
    name: "Lexeme_lemma_trgm_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Lexeme_lemma_trgm_idx"
          ON "Lexeme" USING gin (translate(lower(lemma), '${FROM}', '${TO}') gin_trgm_ops)`,
  },
  {
    name: "Lexeme_translation_trgm_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Lexeme_translation_trgm_idx"
          ON "Lexeme" USING gin (lower(translation) gin_trgm_ops)`,
  },
];

export async function ensureSearchIndexes(prisma: PrismaClient): Promise<void> {
  for (const index of INDEXES) {
    try {
      await prisma.$executeRawUnsafe(index.sql);
    } catch (error) {
      console.warn(`  could not create ${index.name}:`, (error as Error).message.split("\n")[0]);
    }
  }

  let trigrams = false;
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    trigrams = true;
  } catch {
    console.warn("  pg_trgm is not available; substring search will scan rather than seek.");
  }

  if (!trigrams) return;
  for (const index of TRIGRAM) {
    try {
      await prisma.$executeRawUnsafe(index.sql);
    } catch (error) {
      console.warn(`  could not create ${index.name}:`, (error as Error).message.split("\n")[0]);
    }
  }
}
