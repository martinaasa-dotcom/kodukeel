/**
 * The one way to change `Lexeme.examples`: read it, edit it and write it back
 * inside one transaction, holding the row.
 *
 * The column is a JSON array rather than a table, so every change is a read,
 * an edit in JavaScript and a write of the whole array. Four writers did that
 * with nothing between the read and the write, and one of them waits seconds
 * for a model in the gap: `translateExample` read the sentences, asked Anu,
 * and wrote the array it had read. A reviewer accepting a wrong translation
 * in that window, or dropping a sentence, or a learner adding one, was undone
 * by the late write, for every learner: the refused English came back with
 * `enRefused` cleared, the dropped sentence returned, the added one vanished
 * after its action had said it was saved.
 *
 * So the slow part happens outside and the edit happens here, against the row
 * as it is now, under `SELECT … FOR UPDATE`, and an edit that finds nothing to
 * do writes nothing. Prisma's `$transaction` with a callback is an interactive
 * transaction, so the lock is held until the write lands.
 */
import { prisma } from "@/lib/db";
import { parseExamples, serialiseExamples, type Example } from "./examples";

export interface ExampleEdit<T> {
  /** The array to write, or null to leave the row as it is. */
  next: Example[] | null;
  result: T;
}

export type ExampleEditOutcome<T> =
  | { found: false }
  | { found: true; changed: boolean; lemma: string; result: T };

export async function editExamples<T>(
  lexemeId: string,
  edit: (examples: Example[]) => ExampleEdit<T>,
  also: { editedBy?: string; editedAt?: Date } = {},
): Promise<ExampleEditOutcome<T>> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Lexeme" WHERE id = ${lexemeId} FOR UPDATE`;
    const row = await tx.lexeme.findUnique({
      where: { id: lexemeId },
      select: { id: true, lemma: true, examples: true },
    });
    if (!row) return { found: false as const };
    const { next, result } = edit(parseExamples(row.examples));
    if (next) {
      await tx.lexeme.update({
        where: { id: row.id },
        data: { examples: serialiseExamples(next), ...also },
      });
    }
    return { found: true as const, changed: next !== null, lemma: row.lemma, result };
  });
}
