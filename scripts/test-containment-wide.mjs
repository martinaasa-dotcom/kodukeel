/**
 * The wider half of `scripts/test-containment.mjs`: 1024 and 1280.
 *
 *   node scripts/test-containment-wide.mjs
 *
 * CI runs the suite in two halves on two runners, because whole it is fifteen
 * minutes and its shard sat at the twenty-minute ceiling. The narrow half is
 * the suite itself under `CONTAIN_PART=narrow`, set by its shard; this one
 * names the other half so the two can be told apart in the workflow.
 */
process.env.CONTAIN_PART = "wide";
await import("./test-containment.mjs");
