/**
 * Put every learner back at the start of the current planned course, from a
 * terminal. The same reset is a button on /admin/suggestions, which is the
 * easy way; this is for somebody with a checkout and the database address.
 * `lib/progress/courseReset.ts` is the one definition of what it touches.
 *
 * Reports by default. `--write` deletes. `--keep=name` leaves alone every
 * learner whose display name contains it (default `amanda`).
 */
import { prisma } from "../lib/db";
import { courseResetPlan, DEFAULT_KEEP, resetCourseProgress } from "../lib/progress/courseReset";

const write = process.argv.includes("--write");
const keepArg = process.argv.find((a) => a.startsWith("--keep="));
const keep = keepArg ? keepArg.slice("--keep=".length) : DEFAULT_KEEP;

async function main() {
  const plan = await courseResetPlan(keep);
  console.log(`Left alone: learners whose name contains "${plan.keep}", ${plan.kept.length} of them.`);
  for (const k of plan.kept) console.log(`  ${k.ownerId}  ${k.names.join(", ")}`);
  if (plan.kept.length === 0) console.log("  (nobody matched, so every learner would be reset)");
  console.log(`\nCourse progress: ${plan.ticks} ticks across ${plan.learners} learners.`);
  console.log(`Programme settings naming a programme this build does not have: ${plan.staleProgrammes}.`);
  console.log("Decks, review history, levels and every other setting are not touched.");

  if (!write) {
    console.log("\nNothing was changed. Re-run with --write to reset them.");
    return;
  }
  const done = await resetCourseProgress(keep);
  console.log(`\nRemoved ${done.ticks} ticks and ${done.programmes} stale programme settings.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
