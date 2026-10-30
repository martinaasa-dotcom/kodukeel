import { prisma } from "@/lib/db";
import { programmeById } from "@/lib/course";
import { forgetSettings, SETTING_KEYS } from "@/lib/settings/store";
import { choosePart, forgetRehoming, programmeFor } from "@/lib/progress/course";

/**
 * Putting a learner back at the start of the current planned course.
 *
 * What it may touch is three things and nothing else: the learner's
 * `CourseStep` ticks, which are the whole of course progress (the day
 * somebody is on is derived from them, ADR-014); a `programme` setting
 * naming a program this build no longer has, which `programmeFor` would
 * otherwise read as "on no course"; and, for a learner whose stored part is
 * read as another one (somebody moved back by B1 becoming lessons), the part
 * they are read on, written through `choosePart` with the part they were
 * moved from (`movedBackFrom`), because the ticks that said so are what the
 * reset deletes. A stored `off` is a learner saying no and is kept. Decks,
 * the words in them, the dictionary, the review log, levels and every other
 * setting are never written here.
 *
 * NOBODY IS RESET BY DEFAULT. The admin page lists the learners who have any
 * progress and resets one of them on a press, or all of them on a separate
 * press; nothing here chooses who. One module for the page and
 * `scripts/reset-course.ts`, so the two cannot disagree about what a reset is.
 */

export interface CourseLearner {
  ownerId: string;
  name: string | null;
  ticks: number;
  lastAt: Date | null;
}

/** Everybody with any course progress, most recently active first. */
export async function courseProgressRoster(): Promise<CourseLearner[]> {
  const groups = await prisma.courseStep.groupBy({
    by: ["ownerId"],
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { ownerId: "asc" },
  });
  const ids = groups.map((g) => g.ownerId);
  const names = ids.length === 0 ? [] : await prisma.setting.findMany({
    where: { key: SETTING_KEYS.displayName, ownerId: { in: ids } },
    select: { ownerId: true, value: true },
    orderBy: { ownerId: "asc" },
  });
  const nameOf = new Map(names.map((n) => [n.ownerId, n.value]));
  return groups
    .map((g) => ({
      ownerId: g.ownerId,
      name: nameOf.get(g.ownerId)?.trim() || null,
      ticks: g._count._all,
      lastAt: g._max.createdAt,
    }))
    .sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0) || a.ownerId.localeCompare(b.ownerId));
}

/**
 * Reset the named learners, or everybody when `who` is "all". Returns how
 * many ticks and stale program settings went.
 */
export async function resetCourseProgress(
  who: "all" | readonly string[],
): Promise<{ ticks: number; programmes: number }> {
  if (who !== "all" && who.length === 0) return { ticks: 0, programmes: 0 };
  const scope = who === "all" ? {} : { ownerId: { in: [...who] } };

  const programmes = await prisma.setting.findMany({
    where: { key: SETTING_KEYS.programme, ...scope },
    select: { ownerId: true, value: true },
    orderBy: { ownerId: "asc" },
  });
  const stale = programmes.filter((p) => p.value !== "off" && !programmeById(p.value)).map((p) => p.ownerId);

  /*
    THE START OF THE COURSE AS EVERY SCREEN READS IT, NOT AS IT IS STORED.
    A learner part way through the old B1 is stored on, say, B1.3 and read as
    being on B1.1 (`programmeFor` and `rehomeFrom`): what says so is their
    ticks on days B1.3 no longer holds. Deleting the ticks deletes that
    evidence, so a reset left them on B1.3's first lesson, whose ledger
    assumes fourteen lessons they never did, and the moved-back note went with
    the ticks. So where the stored part and the part read differ, the part
    read is chosen first (`choosePart`, the one door), with the part they were
    moved from kept beside it for the note (`movedBackFrom`), and only then
    are the ticks deleted. In that order a reset that dies halfway leaves them
    on the part read and stamped, which is where they were anyway.
  */
  for (const row of programmes) {
    const storedPart = row.value === "off" ? undefined : programmeById(row.value);
    if (!storedPart) continue;
    const read = await programmeFor(row.ownerId);
    if (!read || read.id === storedPart.id) continue;
    const also = read.level === storedPart.level
      ? [[SETTING_KEYS.movedBackFrom, storedPart.id] as const]
      : [];
    await choosePart(row.ownerId, read.id, new Date(), also);
    forgetRehoming(row.ownerId);
  }

  const [steps, settings] = await prisma.$transaction([
    prisma.courseStep.deleteMany({ where: scope }),
    prisma.setting.deleteMany({ where: { key: SETTING_KEYS.programme, ownerId: { in: stale } } }),
  ]);
  // The store holds one read of a learner's settings per request; tell it.
  for (const ownerId of stale) forgetSettings(ownerId);
  return { ticks: steps.count, programmes: settings.count };
}

/**
 * One learner, one part: what a level change does to the part it opens.
 *
 * Changing level starts the module over on the first evening of the new
 * level's opening part, and the day somebody is on is derived from their
 * ticks (ADR-014), so a part walked before would otherwise reopen at its old
 * furthest evening. Those ticks go, and only those: every other part's ticks,
 * and the review log they were earned on, stay. It is this module rather than
 * a filter on when a tick was written, because a tick kept and ignored still
 * holds its unique key, so pressing the same step again on the restarted
 * part wrote nothing and the evening could never be finished.
 */
export async function restartPart(ownerId: string, programmeId: string): Promise<number> {
  const gone = await prisma.courseStep.deleteMany({ where: { ownerId, programmeId } });
  return gone.count;
}
