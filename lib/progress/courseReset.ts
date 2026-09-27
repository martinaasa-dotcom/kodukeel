import { prisma } from "@/lib/db";
import { programmeById } from "@/lib/course";
import { forgetSettings, SETTING_KEYS } from "@/lib/settings/store";

/**
 * Putting every learner back at the start of the current planned course.
 *
 * What it may touch is two things and nothing else: every `CourseStep` tick,
 * which is the whole of course progress (the day somebody is on is derived
 * from them, ADR-014), and a `programme` setting naming a programme this build
 * no longer has, which `programmeFor` would otherwise read as "on no course".
 * A stored `off` is a learner saying no and is kept. Decks, the review log,
 * levels and every other setting are never read here, let alone written.
 *
 * Learners whose display name contains `keep` are left alone entirely, and
 * the plan names them so whoever presses the button can see who the match
 * caught. One module for the admin page and `scripts/reset-course.ts`, so the
 * button and the command cannot disagree about who is reset.
 */

export const DEFAULT_KEEP = "amanda";

export interface CourseResetPlan {
  keep: string;
  kept: { ownerId: string; names: string[] }[];
  ticks: number;
  learners: number;
  staleProgrammes: number;
}

async function keptOwners(keep: string): Promise<Map<string, Set<string>>> {
  const [named, members] = await Promise.all([
    prisma.setting.findMany({
      where: { key: SETTING_KEYS.displayName, value: { contains: keep, mode: "insensitive" } },
      select: { ownerId: true, value: true },
      orderBy: { ownerId: "asc" },
    }),
    prisma.classroomMember.findMany({
      where: { displayName: { contains: keep, mode: "insensitive" } },
      select: { ownerId: true, displayName: true },
      orderBy: [{ ownerId: "asc" }, { classroomId: "asc" }],
    }),
  ]);
  const kept = new Map<string, Set<string>>();
  const add = (id: string, name: string) => {
    const names = kept.get(id) ?? new Set<string>();
    names.add(name);
    kept.set(id, names);
  };
  for (const row of named) add(row.ownerId, row.value);
  for (const row of members) add(row.ownerId, row.displayName);
  return kept;
}

function cleanKeep(keep: string): string {
  const trimmed = keep.trim();
  if (trimmed.length < 3) throw new Error("The name to leave alone is too short to be a name.");
  return trimmed;
}

async function staleProgrammeOwners(notKept: object): Promise<string[]> {
  const rows = await prisma.setting.findMany({
    where: { key: SETTING_KEYS.programme, ...notKept },
    select: { ownerId: true, value: true },
    orderBy: { ownerId: "asc" },
  });
  return rows.filter((row) => row.value !== "off" && !programmeById(row.value)).map((row) => row.ownerId);
}

export async function courseResetPlan(keepInput: string = DEFAULT_KEEP): Promise<CourseResetPlan> {
  const keep = cleanKeep(keepInput);
  const kept = await keptOwners(keep);
  const notKept = kept.size > 0 ? { ownerId: { notIn: [...kept.keys()] } } : {};
  const [ticks, learners, stale] = await Promise.all([
    prisma.courseStep.count({ where: notKept }),
    prisma.courseStep.groupBy({ by: ["ownerId"], where: notKept, orderBy: { ownerId: "asc" } }),
    staleProgrammeOwners(notKept),
  ]);
  return {
    keep,
    kept: [...kept].map(([ownerId, names]) => ({ ownerId, names: [...names] })),
    ticks,
    learners: learners.length,
    staleProgrammes: stale.length,
  };
}

export async function resetCourseProgress(
  keepInput: string = DEFAULT_KEEP,
): Promise<{ kept: number; ticks: number; programmes: number }> {
  const keep = cleanKeep(keepInput);
  const kept = await keptOwners(keep);
  const notKept = kept.size > 0 ? { ownerId: { notIn: [...kept.keys()] } } : {};
  const stale = await staleProgrammeOwners(notKept);
  const [steps, settings] = await prisma.$transaction([
    prisma.courseStep.deleteMany({ where: notKept }),
    prisma.setting.deleteMany({ where: { key: SETTING_KEYS.programme, ownerId: { in: stale } } }),
  ]);
  // The store holds one read of a learner's settings per request; tell it.
  for (const ownerId of stale) forgetSettings(ownerId);
  return { kept: kept.size, ticks: steps.count, programmes: settings.count };
}
