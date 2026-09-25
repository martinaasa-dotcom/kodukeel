import { prisma } from "@/lib/db";

/**
 * Tick a task a teacher assigned, or untick it, as the row on the screen asked.
 *
 * It used to be a toggle on the server: read whether the task was done, then
 * write the opposite. That answers what the database holds rather than what the
 * learner was looking at, so a Today left open on a laptop after the task was
 * ticked on a phone showed it undone, and pressing the tick there unticked it,
 * cleared when it was done, and told the teacher the homework was not handed
 * in. A quick second press did the same, since the row has no disabled state
 * between the two. The row says which state it wants, and a task already in
 * that state is left exactly as it is, including when it was completed.
 *
 * Scoped to the owner in the write itself, so an id belonging to somebody else
 * matches nothing rather than being checked and then trusted.
 */
export async function setTaskDone(
  ownerId: string, id: string, done: boolean, now = new Date(),
): Promise<boolean> {
  const moved = await prisma.task.updateMany({
    where: { id, ownerId, completed: !done },
    data: { completed: done, completedAt: done ? now : null },
  });
  if (moved.count > 0) return true;
  return (await prisma.task.count({ where: { id, ownerId } })) > 0;
}
