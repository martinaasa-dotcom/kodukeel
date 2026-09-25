import { prisma } from "@/lib/db";

/**
 * One person, one open report per thing, and that has to hold when two sends
 * land together.
 *
 * The count beside a group in the review queue is read as "this many people"
 * (`lib/suggestions/queue.ts` counts rows), so a learner's second report of
 * the same thing replaces their first rather than adding to it. That was a
 * `findFirst` and then a `create`, which is check-then-act: two sends inside
 * the gap both find nothing and both insert. Measured against a real database,
 * eight sends at once left six to eight open rows for one person and one
 * group, which a reviewer reads as six to eight people. A double press gets
 * there, since the button only disables once the next render lands, and so
 * do two tabs.
 *
 * The answer is the one `lockDeck` and the exam hand-in use: a transaction
 * advisory lock, the blocking form, keyed on the owner and the group, so two
 * people reporting the same word never wait on each other and one person's two
 * sends are one row. A unique index is the other answer and is not taken,
 * because a queue that already holds duplicates from this fault would fail the
 * push that adds it, and the deployment's own build is what runs it.
 */
export interface SuggestionFields {
  readonly category: string;
  readonly groupKey: string;
  readonly note: string;
  readonly context: string | null;
  readonly trigger: string | null;
  readonly lemma: string | null;
  readonly lexemeId: string | null;
  readonly patch: string;
}

/** Writes the report, or replaces this person's open one; says which. */
export async function recordSuggestion(
  ownerId: string, fields: SuggestionFields,
): Promise<{ repeat: boolean }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`suggestion:${ownerId}:${fields.groupKey}`}, 0))`;

    const mine = await tx.suggestion.findFirst({
      where: { ownerId, groupKey: fields.groupKey, status: "OPEN" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });

    /*
      The later report wins the note and the proposal, because it is the one
      they wrote after seeing more of the problem.
    */
    if (mine) {
      const { note, context, trigger, lemma, lexemeId, patch } = fields;
      await tx.suggestion.update({
        where: { id: mine.id },
        data: { note, context, trigger, lemma, lexemeId, patch },
      });
      return { repeat: true };
    }
    await tx.suggestion.create({ data: { ownerId, ...fields } });
    return { repeat: false };
  });
}
