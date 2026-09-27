/**
 * Put every learner back at the start of the current planned course.
 *
 * A programme is rebuilt from the syllabus on every deploy, so a learner's
 * `CourseStep` ticks point at day ids a later version of the course may have
 * moved, merged or given to a different lesson. `npm run course:ids` keeps the
 * ids stable where it can. Where the course changed enough that the operator
 * wants everybody on the new shape from its first evening, this is the command.
 *
 * WHAT IT MAY TOUCH. Two things and nothing else:
 *
 *   - every `CourseStep` row, which is the course progress. The day somebody
 *     is on is derived from these ticks (ADR-014), so with none left the
 *     module opens at the first evening of the part their level puts them in;
 *   - a `programme` setting naming a programme id the current build does not
 *     have. `programmeFor` reads an unknown id as "no programme", so that
 *     learner would silently fall off the course. Deleting the row puts them
 *     back on the "offer it where it fits" default. A stored `off` is a
 *     learner saying no and is kept, and so is a programme id that still
 *     exists.
 *
 * Never a `Card`, a `Review`, a level, a streak or any other setting. Decks and
 * the review log stay exactly as they are for everybody.
 *
 * WHO IS LEFT ALONE. Any learner whose display name contains `--keep` (default
 * `amanda`, case ignored), as the name stored in their settings or the name they
 * joined a class under. The report lists them by name first so the operator can
 * see who the match caught before anything is deleted.
 *
 * Reports by default. `--write` deletes. Run from
 * `.github/workflows/reset-course.yml` against production, which asks for a
 * word to be typed before it passes `--write`.
 */
import { prisma } from "../lib/db";
import { programmeById } from "../lib/course";
import { SETTING_KEYS } from "../lib/settings/store";

const write = process.argv.includes("--write");
const keepArg = process.argv.find((a) => a.startsWith("--keep="));
const keep = (keepArg ? keepArg.slice("--keep=".length) : "amanda").trim();

async function main() {
  if (keep.length < 3) throw new Error(`--keep=${keep} is too short to be a name; nothing was changed.`);
  const pattern = `%${keep}%`;

  const [named, members] = await Promise.all([
    prisma.setting.findMany({
      where: { key: SETTING_KEYS.displayName, value: { contains: keep, mode: "insensitive" } },
      select: { ownerId: true, value: true },
      orderBy: { ownerId: "asc" },
    }),
    prisma.classroomMember.findMany({
      where: { displayName: { contains: keep, mode: "insensitive" } },
      select: { ownerId: true, displayName: true },
      orderBy: { ownerId: "asc" },
    }),
  ]);
  const kept = new Map<string, Set<string>>();
  for (const row of named) (kept.get(row.ownerId) ?? kept.set(row.ownerId, new Set()).get(row.ownerId)!).add(row.value);
  for (const row of members) (kept.get(row.ownerId) ?? kept.set(row.ownerId, new Set()).get(row.ownerId)!).add(row.displayName);
  const keptIds = [...kept.keys()];

  console.log(`Left alone: learners whose name matches "${pattern}", ${keptIds.length} of them.`);
  for (const [id, names] of kept) console.log(`  ${id}  ${[...names].join(", ")}`);
  if (keptIds.length === 0) console.log("  (nobody matched, so every learner would be reset)");

  const notKept = keptIds.length > 0 ? { ownerId: { notIn: keptIds } } : {};

  const [steps, learners, programmes] = await Promise.all([
    prisma.courseStep.count({ where: notKept }),
    prisma.courseStep.groupBy({ by: ["ownerId"], where: notKept, orderBy: { ownerId: "asc" } }),
    prisma.setting.findMany({
      where: { key: SETTING_KEYS.programme, ...notKept },
      select: { ownerId: true, value: true },
      orderBy: { ownerId: "asc" },
    }),
  ]);
  const stale = programmes.filter((p) => p.value !== "off" && !programmeById(p.value));

  console.log("");
  console.log(`Course progress: ${steps} ticks across ${learners.length} learners.`);
  console.log(`Programme settings naming a programme this build does not have: ${stale.length}.`);
  for (const p of stale.slice(0, 20)) console.log(`  ${p.ownerId}  ${p.value}`);
  if (stale.length > 20) console.log(`  ... and ${stale.length - 20} more`);
  console.log("Decks, review history, levels and every other setting are not touched.");

  if (!write) {
    console.log("\nNothing was changed. Re-run with --write to reset them.");
    return;
  }

  const [removedSteps, removedSettings] = await prisma.$transaction([
    prisma.courseStep.deleteMany({ where: notKept }),
    prisma.setting.deleteMany({
      where: { key: SETTING_KEYS.programme, ownerId: { in: stale.map((p) => p.ownerId) } },
    }),
  ]);
  console.log(`\nRemoved ${removedSteps.count} ticks and ${removedSettings.count} stale programme settings.`);
  console.log("Everybody else now opens the current course at the first evening of their part.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
