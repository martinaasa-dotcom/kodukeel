import { prisma } from "@/lib/db";

/**
 * WHETHER A CONVERSATION SET AS HOMEWORK HAS BEEN DONE, READ OFF THE RUNS.
 *
 * A teacher sets one of the conversations (`assignScene`) and it lands as a
 * `Task` carrying the scene's id on every member. Done is never a tick (D4,
 * ADR-014): a learner who finished a run of that scene after the task was set
 * has done it, and the read is the run log the conversation already writes.
 * So nobody marks it, nobody can mark it without doing it, and the class
 * page's count moves on its own.
 *
 * "Finished" is a run that ended and was not walked out of: `endedAt` is set
 * on both, and somebody who left after the greeting has opened the
 * conversation rather than had it. A walked-out run's outcome is the scene's
 * `left` outcome, written into the JSON by `finishRun`.
 *
 * `SceneRun` is append-only and already in the export and the erasure; this
 * reads it and writes nothing.
 */

/** What a finished run's outcome column holds for one walked out of. */
const WALKED_OUT = '"outcome":"left"';

/** The rows a run has to match to count as the conversation done. */
function finishedRuns(sceneId: string, since: Date) {
  return {
    sceneId,
    endedAt: { not: null, gt: since },
    NOT: { outcome: { contains: WALKED_OUT } },
  };
}

export interface SceneTask {
  readonly id: string;
  readonly sceneId: string | null;
  readonly createdAt: Date;
}

/** Whether one learner has done one conversation task. */
export async function sceneHomeworkDone(ownerId: string, task: SceneTask): Promise<boolean> {
  if (!task.sceneId) return false;
  const run = await prisma.sceneRun.findFirst({
    where: { ownerId, ...finishedRuns(task.sceneId, task.createdAt) },
    select: { id: true },
  });
  return run !== null;
}

/**
 * Which of a learner's conversation tasks are done, in one query whatever the
 * number of tasks: the learner's finished runs of those scenes since the
 * oldest of them was set, matched in memory. Today reads this.
 */
export async function doneSceneTasks(ownerId: string, tasks: readonly SceneTask[]): Promise<Set<string>> {
  const scenes = tasks.filter((t): t is SceneTask & { sceneId: string } => t.sceneId !== null);
  if (scenes.length === 0) return new Set();
  const since = new Date(Math.min(...scenes.map((t) => t.createdAt.getTime())));
  const runs = await prisma.sceneRun.findMany({
    where: {
      ownerId,
      sceneId: { in: [...new Set(scenes.map((t) => t.sceneId))] },
      endedAt: { not: null, gt: since },
      NOT: { outcome: { contains: WALKED_OUT } },
    },
    select: { sceneId: true, endedAt: true },
  });
  const done = new Set<string>();
  for (const task of scenes) {
    if (runs.some((r) => r.sceneId === task.sceneId && r.endedAt !== null && r.endedAt > task.createdAt)) done.add(task.id);
  }
  return done;
}

/**
 * How many of a class have done a conversation it was set, for the class page.
 *
 * A count and never a list of names (the term report's rule): the teacher
 * learns how far the class has got, and nobody is singled out on a page that
 * gets printed and shown. Counted over the class's members as they are now,
 * against the moment the teacher set it, which is the teacher's own copy's
 * `createdAt` (they are a member of their own class).
 */
export async function sceneHomeworkCount(
  classroomId: string,
  sceneId: string,
  setAt: Date,
): Promise<{ done: number; of: number }> {
  const members = await prisma.classroomMember.findMany({
    where: { classroomId },
    select: { ownerId: true },
    orderBy: { ownerId: "asc" },
  });
  if (members.length === 0) return { done: 0, of: 0 };
  // Grouped in Postgres, so a learner who played it twelve times is one learner and no run leaves the database.
  const done = await prisma.sceneRun.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: members.map((m) => m.ownerId) }, ...finishedRuns(sceneId, setAt) },
  });
  return { done: done.length, of: members.length };
}
