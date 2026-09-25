/**
 * Replacing an entry's forms, one writer at a time.
 *
 * Every path that rewrites the forms of a shared entry did it as two
 * statements with nothing between them: delete the rows it owns, then insert
 * the new ones. Two writers inside that gap both delete, both insert, and
 * what comes out depends on what they were inserting. Where the two sets
 * agree, the second insert meets the first on `(lexemeId, formType, value)`
 * and throws a unique violation, which reaches the learner as an error page
 * over a dictionary lookup. Where they disagree, nothing collides, because the
 * value is part of the key, and the entry is left with two genitives: two
 * reviewers accepting two corrections, or a hand edit racing a live Ekilex
 * lookup, and the entry every learner reads carries both answers for good.
 *
 * The dictionary is shared, so the two writers are as likely to be two
 * learners on two instances as one learner pressing twice, and the in-process
 * single flight in `lookup.ts` cannot see across instances. So the delete and
 * the insert run in one transaction holding the entry's own row, which is the
 * shape `editExamples` takes for the sentences one column over: whoever comes
 * second waits, then deletes what the first wrote and writes its own, so the
 * entry ends with one set of forms, the last writer's, whole.
 *
 * `scope` limits the delete to the rows the caller owns. A hand edit replaces
 * the principal parts and never a form Ekilex supplied, and an accepted report
 * replaces one slot; neither may widen to the rest by going through here.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface FormRow {
  formType: string;
  value: string;
  morphCode?: string | null;
  isPrincipal?: boolean;
}

export async function replaceForms(
  lexemeId: string,
  forms: readonly FormRow[],
  scope: Prisma.FormWhereInput = {},
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Three seconds, the deck lock's number: a lock that cannot be had in that
    // time is something wrong further out, and a refusal beats a hang.
    await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
    await tx.$queryRaw`SELECT id FROM "Lexeme" WHERE id = ${lexemeId} FOR UPDATE`;
    await tx.form.deleteMany({ where: { ...scope, lexemeId } });
    if (forms.length > 0) {
      await tx.form.createMany({ data: forms.map((f) => ({ ...f, lexemeId })) });
    }
  });
}

/**
 * Prisma's unique violation, which is what the loser of a race to create a
 * row on a unique key is told. Read by the callers that create an entry after
 * finding none, so the loser goes back and finds the one the winner made.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}
