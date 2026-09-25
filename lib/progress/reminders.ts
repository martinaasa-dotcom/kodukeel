import { prisma } from "@/lib/db";
import { CLASSWORK_PREFIX } from "@/lib/ux/agenda";

/**
 * Deletes one reminder the learner wrote, and never a task a class set.
 *
 * It used to filter on `classWeek: null`, which every row carries now that
 * nothing writes the column, so a pupil's homework and a teacher's own record
 * of what the class was sent both went with one press of the calendar's bin.
 * See `isClasswork` for what marks classwork instead.
 *
 * Out here rather than inline in the Server Action so the `where` can be driven
 * against a database: the obvious spelling, `NOT: { notes: { startsWith } }`,
 * is false for a reminder with no notes at all, because `NOT (NULL LIKE ...)`
 * is NULL rather than true. So the blank note is named on its own.
 */
export async function deleteOwnReminder(ownerId: string, id: string): Promise<boolean> {
  const { count } = await prisma.task.deleteMany({
    where: {
      id,
      ownerId,
      OR: [{ notes: null }, { NOT: { notes: { startsWith: CLASSWORK_PREFIX } } }],
    },
  });
  return count > 0;
}
