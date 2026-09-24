/**
 * What a restore does to the database, in a fixed number of round trips.
 *
 * `restoreBackup` runs inside one transaction with a two-minute deadline, and it
 * used to ask about every row on its own: a `findUnique` and then a `create` per
 * review, per card, per message. That is two round trips a row, and a hosted
 * database is a pooler in another region at about 25ms a trip, so a learner
 * with five thousand reviews spent the whole deadline on their history alone
 * and was told the restore "did not finish, and nothing was changed". The file
 * limit is 128MB, which is tens of thousands of reviews, so the backup a
 * committed learner most needs was the one it could not put back.
 *
 * Every table a restore writes here is either append-only, created if its key
 * is absent and never updated, or a card, which is created if absent and
 * updated only where it is already this learner's. Both shapes are one read
 * and one insert per chunk rather than per row: `createMany` with
 * `skipDuplicates` is `ON CONFLICT DO NOTHING`, which is exactly "created if
 * absent" on every key the table declares, the id and a composite alike.
 *
 * And the dictionary had a fault that no amount of patience would have fixed.
 * A word the backup carried under an id this deployment does not hold was
 * created with a `try`/`catch` round it, on the reasoning that a clash on
 * `(lemma, pos)` meant another row already held the word and theirs should
 * stay. The reasoning was right and the mechanism could not work: Postgres
 * marks a transaction aborted after any failed statement, so the catch caught
 * the error and every statement after it failed, and the restore was rolled
 * back whole. Seeded ids are random, so every other deployment holds every word
 * under a different id, and restoring a backup anywhere but where it was taken,
 * which is the case the export exists for, failed on its first word.
 * `restoreLexemes` looks the clash up instead of provoking it, and hands back
 * where each backed-up id now lives, so the rows pointing at a word point at
 * the entry this deployment already has.
 *
 * Nothing here decides what a row may contain: `app/actions.ts` still revives,
 * bounds and attributes every row before it arrives. This only decides how many
 * statements it takes to write them.
 */
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;
type Row = Record<string, unknown>;

/**
 * Rows a statement carries at once. Postgres binds at most 65,535 parameters,
 * and the widest table written here is a card at about twenty columns, so a
 * thousand rows is well inside it and still turns ten thousand round trips into
 * ten.
 */
export const RESTORE_CHUNK = 1000;

/** Split a list into runs of at most `size`, keeping the order. */
export function chunks<T>(items: readonly T[], size = RESTORE_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Insert every row whose keys are free and skip the rest, a chunk at a time.
 * `insert` is the table's own `createMany` with `skipDuplicates`, handed in by
 * the caller so each table is still written where it is named.
 */
export async function createAbsent(
  rows: readonly Row[],
  insert: (chunk: Row[]) => Promise<{ count: number }>,
): Promise<number> {
  let created = 0;
  for (const chunk of chunks(rows)) created += (await insert(chunk)).count;
  return created;
}

/** Which of these ids exist already, and whose they are, in one read a chunk. */
export async function ownersOf(
  ids: readonly string[],
  read: (chunk: string[]) => Promise<{ id: string; ownerId: string }[]>,
): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  for (const chunk of chunks([...new Set(ids)])) {
    for (const row of await read(chunk)) owners.set(row.id, row.ownerId);
  }
  return owners;
}

/** A word as the backup carried it: the entry and its forms, revived. */
export interface BackedUpLexeme {
  readonly data: Row;
  readonly forms: readonly Row[];
}

const key = (lemma: unknown, pos: unknown) => `${String(lemma)}\u0000${String(pos ?? "")}`;

/**
 * Put the backup's words into the shared dictionary, adding and never
 * rewriting, and say where each backed-up id lives now.
 *
 * Three outcomes for a word, and the map covers all of them: the id is already
 * here, so it stays itself; another entry already holds its `(lemma, pos)`, so
 * it maps to that entry and that entry is left exactly as it is; or it is new,
 * so it is created as the restorer's own, without the provenance or the Ekilex
 * identifiers that would claim otherwise, and its forms come with it. A word
 * the file names twice is created once.
 */
export async function restoreLexemes(
  tx: Tx,
  ownerId: string,
  words: readonly BackedUpLexeme[],
): Promise<Map<string, string>> {
  const live = new Map<string, string>();
  const ids = words.map((w) => String(w.data.id ?? "")).filter(Boolean);
  for (const chunk of chunks([...new Set(ids)])) {
    for (const row of await tx.lexeme.findMany({ where: { id: { in: chunk } }, select: { id: true } })) {
      live.set(row.id, row.id);
    }
  }

  const rest = words.filter((w) => w.data.id && !live.has(String(w.data.id)));
  const held = await holdersOf(tx, rest.map((w) => w.data.lemma));

  const create: BackedUpLexeme[] = [];
  const claimed = new Map<string, string>();
  for (const word of rest) {
    const id = String(word.data.id);
    const k = key(word.data.lemma, word.data.pos);
    const theirs = held.get(k) ?? claimed.get(k);
    if (theirs) {
      live.set(id, theirs);
      continue;
    }
    claimed.set(k, id);
    create.push(word);
  }

  await createAbsent(
    create.map(({ data }) => {
      const row: Row = { ...data };
      delete row.starred; // dropped field from a pre-multi-user backup
      // Whoever restores it is who added it, and it is not Ekilex's.
      row.provenance = "USER";
      row.editedBy = ownerId;
      delete row.ekilexWordId;
      delete row.fetchedAt;
      delete row.lookupMissAt;
      return row;
    }),
    (chunk) => tx.lexeme.createMany({ data: chunk as never, skipDuplicates: true }),
  );

  /*
    What the insert actually did is read back rather than assumed, because
    `skipDuplicates` is silent: a learner adding the same word in the second
    between the lookup and the insert would leave this row uncreated, and the
    cards below would point at an id nobody holds. So the word goes to whoever
    holds its `(lemma, pos)` now, and only a word created under its own id takes
    its forms with it.
  */
  const after = await holdersOf(tx, create.map((w) => w.data.lemma));
  const mine: BackedUpLexeme[] = [];
  for (const word of create) {
    const id = String(word.data.id);
    const holder = after.get(key(word.data.lemma, word.data.pos));
    if (!holder) continue;
    live.set(id, holder);
    if (holder === id) mine.push(word);
  }

  await createAbsent(
    mine.flatMap((w) => w.forms.map((f) => ({ ...f, lexemeId: String(w.data.id) }))),
    (chunk) => tx.form.createMany({ data: chunk as never, skipDuplicates: true }),
  );
  return live;
}

async function holdersOf(tx: Tx, lemmas: readonly unknown[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(lemmas.filter((l): l is string => typeof l === "string"))];
  for (const chunk of chunks(wanted)) {
    const rows = await tx.lexeme.findMany({
      where: { lemma: { in: chunk } },
      select: { id: true, lemma: true, pos: true },
      orderBy: { id: "asc" },
    });
    for (const row of rows) if (!out.has(key(row.lemma, row.pos))) out.set(key(row.lemma, row.pos), row.id);
  }
  return out;
}

/**
 * Where a word a backed-up row points at lives now, or null where this
 * deployment holds no such entry.
 *
 * Every id the backup's own dictionary covered is in `live`. An id it did not
 * cover is looked up once, in bulk, by `resolveLexemes`, because a restore onto
 * the deployment the backup came from points at words by their real ids.
 */
export async function resolveLexemes(
  tx: Tx,
  live: Map<string, string>,
  ids: readonly unknown[],
): Promise<(id: unknown) => string | null> {
  const unknown = [...new Set(ids.map((i) => String(i ?? "")).filter((i) => i && !live.has(i)))];
  const here = new Set<string>();
  for (const chunk of chunks(unknown)) {
    for (const row of await tx.lexeme.findMany({ where: { id: { in: chunk } }, select: { id: true } })) {
      here.add(row.id);
    }
  }
  return (id) => {
    const s = String(id ?? "");
    if (!s) return null;
    return live.get(s) ?? (here.has(s) ? s : null);
  };
}
