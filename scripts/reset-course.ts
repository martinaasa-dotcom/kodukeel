/**
 * Put learners back at the start of the current planned course, from a
 * terminal. The same reset is on /admin/suggestions, one learner or everybody
 * per press, which is the easy way; this is for somebody with a checkout and
 * the database address. `lib/progress/courseReset.ts` is the one definition of
 * what it touches: course progress only, never a deck or the dictionary.
 *
 * With no flags it reports how many learners have progress and changes nothing.
 * `--owner=<id>` resets one learner (repeatable), `--all` resets everybody, and
 * `--write` resets everybody except the learners `--keep=<text>` names, which
 * is what `.github/workflows/reset-course.yml` runs.
 *
 * IT PRINTS NO NAME AND NO ID UNLESS ASKED. The workflow appends this output to
 * the run's step summary, and the repository is public, so a summary listing
 * every learner's display name beside their account id is personal data
 * published to anybody who opens the Actions tab. It did exactly that. The
 * report is counts now, and `--show-names` is the one way to see who, in a
 * terminal nobody else reads.
 */
import { prisma } from "../lib/db";
import { courseProgressRoster, resetCourseProgress } from "../lib/progress/courseReset";

const args = process.argv.slice(2);
const all = args.includes("--all");
const write = args.includes("--write");
const showNames = args.includes("--show-names");
const owners = args.filter((a) => a.startsWith("--owner=")).map((a) => a.slice("--owner=".length)).filter(Boolean);
/* An empty keep keeps nobody: every string contains "", so reading it as a
   match would leave everybody alone and report a reset that touched nobody. */
const keep = (args.find((a) => a.startsWith("--keep=")) ?? "--keep=").slice("--keep=".length).trim().toLocaleLowerCase();

async function main() {
  const roster = await courseProgressRoster();
  const kept = keep ? roster.filter((l) => (l.name ?? "").toLocaleLowerCase().includes(keep)) : [];
  const keptIds = new Set(kept.map((l) => l.ownerId));

  console.log(`${roster.length} learners have course progress.`);
  if (keep) console.log(`${kept.length} of them would be left alone, by the keep filter.`);
  if (showNames) {
    for (const l of roster) {
      console.log(`  ${l.ownerId}  ${l.name ?? "(no name)"}  ${l.ticks} ticks${keptIds.has(l.ownerId) ? "  (kept)" : ""}`);
    }
  }

  const targets: "all" | string[] | null =
    all ? "all"
      : owners.length > 0 ? owners.filter((id) => !keptIds.has(id))
      : write ? roster.filter((l) => !keptIds.has(l.ownerId)).map((l) => l.ownerId)
      : null;

  if (targets === null) {
    console.log("\nNothing was changed. Pass --write, --owner=<id> or --all to reset.");
    return;
  }
  if (targets === "all" && keptIds.size > 0) {
    console.error("\n--all resets everybody and cannot honor --keep. Use --write. Nothing was changed.");
    process.exitCode = 1;
    return;
  }
  const done = await resetCourseProgress(targets);
  console.log(`\nRemoved ${done.ticks} ticks and ${done.programmes} stale program settings.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
