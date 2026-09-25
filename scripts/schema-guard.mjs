import { existsSync } from "node:fs";

import { hostOf, isLocal } from "./lib/local-db.mjs";

/**
 * Refuses to let `npm run build` or `npm run setup` change a database that is
 * not on this machine, unless the machine is the deployment's own builder.
 *
 * Both scripts run `prisma db push` and then the seed, and both are right
 * where they were designed to run: Vercel's build sets the hosted schema up
 * (README, "Deploy"), CI builds against a Postgres on loopback, and `setup`
 * is a contributor's first command against their own database. What neither
 * was designed for is a shell that already carries the deployment's
 * connection string, which is the ordinary state of a deployment-linked
 * terminal and was the literal state of the agent sessions that work this
 * repository: `DATABASE_URL` pointed at the hosted pooler, so an ordinary
 * `npm run build` to check a change compiles would have pushed that
 * branch's schema into production. Prisma reads the environment before
 * `.env`, so a local `.env` would not have saved it either.
 *
 * `scripts/lib/local-db.mjs` already refuses this for the scripts that
 * delete rows. This is the same check for the two that reshape tables, and it
 * shares that module's reading of "local" so the two cannot disagree.
 *
 * What passes:
 *   - `VERCEL=1`, which the platform sets on its own builder.
 *   - `CI`, which GitHub Actions sets, since CI builds against loopback anyway.
 *   - a target on loopback.
 *   - `KODUKEEL_SCHEMA_PUSH=1`, for an operator who builds somewhere else and
 *     means it. A separate name from `KODUKEEL_ALLOW_REMOTE_DB` on purpose:
 *     a self-hosted builder that sets this permanently must not also switch
 *     off the guard on the scripts that delete `Review` rows.
 *
 * No target at all passes too, and Prisma then fails in its own words, which
 * name the missing variable better than this could.
 */

const OVERRIDE = "KODUKEEL_SCHEMA_PUSH";

// prisma.config.ts reads `.env` the same way, so this sees what Prisma sees.
if (existsSync(".env")) process.loadEnvFile(".env");

const target = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const onBuilder = process.env.VERCEL === "1" || Boolean(process.env.CI);

if (!onBuilder && target && !isLocal(target)) {
  const host = hostOf(target);
  if (process.env[OVERRIDE] === "1") {
    console.warn(`\n${OVERRIDE}=1 is set: pushing the schema to ${host}.\n`);
  } else {
    console.error(
      `\nRefusing to push the schema to ${host}, which is not a local database.` +
        `\n\n  This command runs \`prisma db push\` and then the seed, which reshape and fill` +
        `\n  whatever database ${process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL"} names. That is the deployment's` +
        `\n  own build's job, and it runs on Vercel or in CI, where this check stands aside.` +
        `\n\n  To check that the app compiles, run \`npx prisma generate && npx next build\`.` +
        `\n  To build against this database anyway, set ${OVERRIDE}=1.\n`,
    );
    process.exit(1);
  }
}
