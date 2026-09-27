/**
 * Put learners back at the start of the current planned course, from a
 * terminal. The same reset is on /admin/suggestions, one learner or everybody
 * per press, which is the easy way; this is for somebody with a checkout and
 * the database address. `lib/progress/courseReset.ts` is the one definition of
 * what it touches: course progress only, never a deck or the dictionary.
 *
 * With no flags it lists who has progress and changes nothing.
 * `--owner=<id>` resets one learner (repeatable), `--all` resets everybody.
 */
import { prisma } from "../lib/db";
import { courseProgressRoster, resetCourseProgress } from "../lib/progress/courseReset";

const all = process.argv.includes("--all");
const owners = process.argv.filter((a) => a.startsWith("--owner=")).map((a) => a.slice("--owner=".length));

async function main() {
  const roster = await courseProgressRoster();
  console.log(`${roster.length} learners have course progress:`);
  for (const l of roster) console.log(`  ${l.ownerId}  ${l.name ?? "(no name)"}  ${l.ticks} ticks`);

  if (!all && owners.length === 0) {
    console.log("\nNothing was changed. Pass --owner=<id> or --all to reset.");
    return;
  }
  const done = await resetCourseProgress(all ? "all" : owners);
  console.log(`\nRemoved ${done.ticks} ticks and ${done.programmes} stale programme settings.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
