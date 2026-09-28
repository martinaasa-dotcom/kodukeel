import { prisma } from "@/lib/db";
import { MAX_CLASS_ROWS, type RailClass } from "@/lib/ux/classRows";

/**
 * The classes a learner belongs to that are still running, for the rail.
 *
 * A membership row is the whole of "joined", and `archived` is the whole of
 * "finished": leaving deletes the row and archiving sets the flag, so this read
 * stops returning a class the moment either happens and nothing needs clearing.
 * The teacher's own class counts too, since they belong to it as well.
 *
 * Ordered by when they joined, and then by the class id so the cut at
 * `MAX_CLASS_ROWS` falls on the same rows every render.
 */
export async function railClasses(ownerId: string): Promise<RailClass[]> {
  const rows = await prisma.classroomMember.findMany({
    where: { ownerId, classroom: { archived: false } },
    select: { classroom: { select: { id: true, name: true } } },
    orderBy: [{ joinedAt: "asc" }, { classroomId: "asc" }],
    take: MAX_CLASS_ROWS,
  });
  return rows.map((r) => ({ id: r.classroom.id, name: r.classroom.name }));
}
