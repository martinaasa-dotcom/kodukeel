import { hostOf, isLocal, OVERRIDE } from "./lib/local-db.mjs";

/**
 * Refuses to start `npm run test:db` against a database that is not on this
 * machine, before a single test file is loaded.
 *
 * The integration suite writes: learners, ledger rows against the shared daily
 * budget, invented dictionary entries. It opens whatever the shell exported,
 * and a shell carrying the deployment's connection string is the ordinary
 * state of a developer who copied `.env`. CI points it at `127.0.0.1` and is
 * untouched.
 *
 * What counts as local, and the one way past it, are `scripts/lib/local-db.mjs`'s,
 * the rule every script that deletes rows already asks: two definitions of
 * "local" are two answers waiting to disagree about a socket path. Unlike
 * those scripts this throws rather than exiting, since it runs inside the test
 * runner, and it checks `DIRECT_URL` too, which Prisma reaches for a push.
 * Only the host is printed, never the connection string.
 */
export default function guard(): void {
  if (process.env[OVERRIDE] === "1") return;
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = process.env[name]?.trim();
    if (!value || isLocal(value)) continue;
    throw new Error(
      `${name} points at ${hostOf(value)}, which is not this machine. `
      + "The integration suite creates and deletes rows and books ledger calls, so it runs only "
      + `against a local database. Point ${name} at one, or set ${OVERRIDE}=1 `
      + "for a test database elsewhere that you mean to write to.",
    );
  }
}
