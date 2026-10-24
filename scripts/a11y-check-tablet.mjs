/**
 * The 768 half of `scripts/a11y-check.mjs`: every route through axe at the
 * width the rail appears at, in both themes.
 *
 *   node scripts/a11y-check-tablet.mjs
 *
 * CI runs the sweep in two halves on two runners, because whole it is twenty
 * minutes and its shard ran out of the step at the last of its checks. The
 * other half is the suite itself under `A11Y_PART=rest`, set by its shard;
 * this one names this half so the two can be told apart in the workflow.
 */
process.env.A11Y_PART = "tablet";
await import("./a11y-check.mjs");
