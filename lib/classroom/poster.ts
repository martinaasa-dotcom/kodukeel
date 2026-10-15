import { prisma } from "@/lib/db";

/**
 * The class a join poster may be printed for: one this account runs and has
 * not archived. Read through the membership row, so a guessed id belongs to
 * nobody, and anything else answers null, which the page turns into the same
 * not-found a stranger meets. A student holds a membership row too and is
 * refused: the code is the teacher's to hand out, which is why the class page
 * shows it to the teacher alone.
 */
export async function posterClassFor(ownerId: string, classroomId: string) {
  if (typeof classroomId !== "string" || classroomId.length === 0) return null;
  const membership = await prisma.classroomMember.findUnique({
    where: { classroomId_ownerId: { classroomId, ownerId } },
    select: { classroom: { select: { id: true, name: true, code: true, ownerId: true, archived: true } } },
  });
  const classroom = membership?.classroom;
  if (!classroom || classroom.ownerId !== ownerId || classroom.archived) return null;
  return classroom;
}

/**
 * The class a roster file may be downloaded for: one this account runs,
 * archived or not, since a teacher may want the records of a class that has
 * ended. The same membership read as the poster's, and the same null for a
 * student, a stranger or a guessed id, so the route answers each of them with
 * one not-found.
 */
export async function rosterClassFor(ownerId: string, classroomId: string) {
  if (typeof classroomId !== "string" || classroomId.length === 0) return null;
  const membership = await prisma.classroomMember.findUnique({
    where: { classroomId_ownerId: { classroomId, ownerId } },
    select: { classroom: { select: { id: true, name: true, ownerId: true, kind: true, targetLevel: true } } },
  });
  const classroom = membership?.classroom;
  if (!classroom || classroom.ownerId !== ownerId) return null;
  return classroom;
}
